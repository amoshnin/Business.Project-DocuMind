import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from functools import lru_cache

from fastapi import Depends, FastAPI, File, HTTPException, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI

try:
    from openai import (
        AuthenticationError as OpenAIAuthenticationError,
        BadRequestError as OpenAIBadRequestError,
        RateLimitError as OpenAIRateLimitError,
    )
except Exception:  # pragma: no cover
    class OpenAIAuthenticationError(Exception):
        pass

    class OpenAIBadRequestError(Exception):
        pass

    class OpenAIRateLimitError(Exception):
        pass

try:
    from groq import RateLimitError as GroqRateLimitError
except Exception:  # pragma: no cover
    class GroqRateLimitError(Exception):
        pass

try:
    from langchain_groq import ChatGroq
except Exception:  # pragma: no cover
    ChatGroq = None

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except Exception:  # pragma: no cover
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
    except Exception:  # pragma: no cover
        HuggingFaceEmbeddings = None

from config import get_settings
from services.document_processor import process_pdf
from schemas import ChatRequest, ChatResponse
from services.llm_chain import generate_answer, reformulate_query, stream_answer_events
from services.retriever import (
    add_documents_to_store,
    get_hybrid_retriever,
    initialize_retriever_from_disk,
    retrieve_documents,
)

settings = get_settings()
PROVIDER_GROQ = "groq"
PROVIDER_OPENAI = "openai"
INVALID_KEY_DETAIL = "Invalid or expired OpenAI API Key"
GROQ_RATE_LIMIT_DETAIL = (
    "Groq is rate-limited right now. Please wait a minute or switch to OpenAI."
)
GROQ_MODEL_UNAVAILABLE_DETAIL = (
    "The configured Groq model is unavailable. Set a supported `GROQ_MODEL` and retry."
)


async def get_model_provider(
    X_Model_Provider: str = Header(PROVIDER_GROQ, alias="X-Model-Provider"),
) -> str:
    provider = X_Model_Provider.strip().lower()
    if provider not in {PROVIDER_GROQ, PROVIDER_OPENAI}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported model provider. Use 'groq' or 'openai'.",
        )
    return provider


async def get_openai_key(
    X_OpenAI_Key: str | None = Header(default=None, alias="X-OpenAI-Key"),
) -> str | None:
    if X_OpenAI_Key is None:
        return None

    api_key = X_OpenAI_Key.strip()
    return api_key or None


async def get_provider_context(
    provider: str = Depends(get_model_provider),
    openai_key: str | None = Depends(get_openai_key),
) -> tuple[str, str | None]:
    if provider == PROVIDER_OPENAI:
        if openai_key is None or not openai_key.startswith("sk-"):
            raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL)
    elif not settings.groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not configured on the server.",
        )

    return provider, openai_key


def get_llm(provider: str, openai_key: str | None = None) -> BaseChatModel:
    if provider == PROVIDER_OPENAI:
        return ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=openai_key)

    if ChatGroq is None:
        return ChatOpenAI(
            model=settings.groq_model,
            temperature=0,
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )

    return ChatGroq(
        model_name=settings.groq_model,
        temperature=0,
        groq_api_key=settings.groq_api_key,
    )


def map_provider_error(exc: Exception) -> HTTPException | None:
    if isinstance(exc, OpenAIAuthenticationError):
        return HTTPException(status_code=401, detail=INVALID_KEY_DETAIL)

    if isinstance(exc, (GroqRateLimitError, OpenAIRateLimitError)):
        return HTTPException(status_code=429, detail=GROQ_RATE_LIMIT_DETAIL)

    if isinstance(exc, OpenAIBadRequestError):
        detail = str(exc)
        if "model" in detail.lower() and "decommission" in detail.lower():
            return HTTPException(status_code=503, detail=GROQ_MODEL_UNAVAILABLE_DETAIL)
        return HTTPException(status_code=400, detail=detail)

    return None


@lru_cache
def get_embeddings_model() -> Embeddings:
    if HuggingFaceEmbeddings is None:
        raise HTTPException(
            status_code=500,
            detail="HuggingFace embeddings dependency is not installed.",
        )

    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await initialize_retriever_from_disk()
    yield


app = FastAPI(title="DocuMind API", lifespan=lifespan)
session_store: dict[str, list[BaseMessage]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/upload")
@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    provider_ctx: tuple[str, str | None] = Depends(get_provider_context),
) -> dict[str, int | str]:
    _provider, _openai_key = provider_ctx

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    chunks, total_pages = await process_pdf(file_bytes=file_bytes, filename=file.filename)
    embeddings = get_embeddings_model()
    try:
        if chunks:
            await add_documents_to_store(chunks, embeddings)
            get_hybrid_retriever(chunks, embeddings)
    except OpenAIAuthenticationError as exc:
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc

    return {
        "filename": file.filename,
        "total_pages": total_pages,
        "chunks_generated": len(chunks),
        "indexed_chunks": len(chunks),
    }


@app.post("/query", response_model=ChatResponse)
@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    provider_ctx: tuple[str, str | None] = Depends(get_provider_context),
) -> ChatResponse:
    provider, openai_key = provider_ctx
    embeddings = get_embeddings_model()
    try:
        llm = get_llm(provider, openai_key)
    except Exception as exc:
        mapped_error = map_provider_error(exc)
        if mapped_error:
            raise mapped_error from exc
        raise

    try:
        retrieved_docs = await retrieve_documents(request.query, embeddings)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        mapped_error = map_provider_error(exc)
        if mapped_error:
            raise mapped_error from exc
        raise

    try:
        return await generate_answer(request.query, retrieved_docs, llm)
    except Exception as exc:
        mapped_error = map_provider_error(exc)
        if mapped_error:
            raise mapped_error from exc
        raise


@app.post("/process")
@app.post("/api/v1/chat/stream")
async def chat_stream(
    request: ChatRequest,
    provider_ctx: tuple[str, str | None] = Depends(get_provider_context),
) -> StreamingResponse:
    provider, openai_key = provider_ctx
    session_id = str(request.session_id)
    chat_history = session_store.get(session_id, [])
    retrieval_query = request.query
    embeddings = get_embeddings_model()
    try:
        reformulation_llm = get_llm(provider, openai_key)
        stream_llm = get_llm(provider, openai_key)
    except Exception as exc:
        mapped_error = map_provider_error(exc)
        if mapped_error:
            raise mapped_error from exc
        raise

    try:
        if chat_history:
            retrieval_query = await reformulate_query(
                raw_query=request.query,
                chat_history=chat_history,
                llm=reformulation_llm,
            )

        retrieved_docs = await retrieve_documents(retrieval_query, embeddings)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        mapped_error = map_provider_error(exc)
        if mapped_error:
            raise mapped_error from exc
        raise

    stream_events = stream_answer_events(
        query=request.query,
        retrieved_docs=retrieved_docs,
        chat_history=chat_history,
        llm=stream_llm,
    )

    try:
        first_event = await anext(stream_events)
    except StopAsyncIteration:
        first_event = {"type": "final", "payload": {"answer": "", "citations": []}}
    except Exception as exc:
        mapped_error = map_provider_error(exc)
        if mapped_error:
            raise mapped_error from exc
        raise

    async def event_generator() -> AsyncIterator[str]:
        final_answer = ""
        try:
            if isinstance(first_event, dict):
                if first_event.get("type") == "final":
                    payload = first_event.get("payload")
                    if isinstance(payload, dict):
                        answer = payload.get("answer")
                        if isinstance(answer, str):
                            final_answer = answer
                yield f"data: {json.dumps(first_event)}\n\n"

            async for event in stream_events:
                if event.get("type") == "final":
                    payload = event.get("payload")
                    if isinstance(payload, dict):
                        answer = payload.get("answer")
                        if isinstance(answer, str):
                            final_answer = answer
                yield f"data: {json.dumps(event)}\n\n"

            history = session_store.setdefault(session_id, [])
            history.append(HumanMessage(content=request.query))
            history.append(AIMessage(content=final_answer))
            yield "data: [DONE]\n\n"
        except Exception as exc:
            mapped_error = map_provider_error(exc)
            if mapped_error:
                error_payload = {"detail": mapped_error.detail}
                yield f"data: {json.dumps(error_payload)}\n\n"
                return
        except Exception as exc:  # pragma: no cover
            error_payload = {"type": "error", "message": str(exc)}
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
