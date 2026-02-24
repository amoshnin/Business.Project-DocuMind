from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress
from functools import lru_cache
from importlib import import_module

from fastapi import Depends, FastAPI, File, HTTPException, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.embeddings import Embeddings
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from pydantic import BaseModel

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

from config import get_settings
from schemas import ChatRequest, ChatResponse

settings = get_settings()
PROVIDER_GROQ = "groq"
PROVIDER_OPENAI = "openai"
OPENAI_MODEL = "gpt-4o-mini"
INVALID_KEY_DETAIL = "Invalid or expired OpenAI API Key"
GROQ_RATE_LIMIT_DETAIL = (
    "Groq is rate-limited right now. Please wait a minute or switch to OpenAI."
)
GROQ_MODEL_UNAVAILABLE_DETAIL = (
    "The configured Groq model is unavailable. Set a supported `GROQ_MODEL` and retry."
)

DEFAULT_CHUNK_OVERLAP = 150
DEFAULT_DENSE_K = 3
DEFAULT_BM25_K = 3
DEFAULT_DENSE_WEIGHT = 0.5
DEFAULT_TEMPERATURE = 0.0

MIN_CHUNK_SIZE = 400
MAX_CHUNK_SIZE = 2200
MIN_CHUNK_OVERLAP = 50
MAX_CHUNK_OVERLAP = 400
MIN_RETRIEVER_K = 2
MAX_RETRIEVER_K = 8
MIN_DENSE_WEIGHT = 0.2
MAX_DENSE_WEIGHT = 0.8
MIN_TEMPERATURE = 0.0
MAX_TEMPERATURE = 1.0
MAX_CHAT_HISTORY_MESSAGES_PER_SESSION = 20
MAX_IN_MEMORY_SESSIONS = 200
DEFAULT_CORS_ALLOW_ORIGIN_REGEX = (
    r"https?://(localhost|127\.0\.0\.1)(:\d+)?"
    r"|https://business-project-docu-mind-[a-z0-9-]+\.vercel\.app"
)


class RuntimeConfig(BaseModel):
    chunk_size: int = 1000
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
    dense_k: int = DEFAULT_DENSE_K
    bm25_k: int = DEFAULT_BM25_K
    dense_weight: float = DEFAULT_DENSE_WEIGHT
    temperature: float = DEFAULT_TEMPERATURE


def _parse_csv_list(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [item.strip().rstrip("/") for item in raw_value.split(",") if item.strip()]


def build_cors_allow_origins() -> list[str]:
    default_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://business-project-docu-mind.vercel.app",
    ]
    extra_origins = _parse_csv_list(settings.documind_cors_allow_origins)
    merged: list[str] = []
    for origin in [*default_origins, *extra_origins]:
        normalized = origin.rstrip("/")
        if normalized and normalized not in merged:
            merged.append(normalized)
    return merged


def build_cors_allow_origin_regex() -> str | None:
    configured = (settings.documind_cors_allow_origin_regex or "").strip()
    if configured:
        return configured
    return DEFAULT_CORS_ALLOW_ORIGIN_REGEX


def clamp_int(value: int, minimum: int, maximum: int) -> int:
    return max(minimum, min(maximum, value))


def clamp_float(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


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


async def get_runtime_config(
    X_Chunk_Size: int = Header(1000, alias="X-Chunk-Size"),
    X_Chunk_Overlap: int = Header(DEFAULT_CHUNK_OVERLAP, alias="X-Chunk-Overlap"),
    X_Dense_K: int = Header(DEFAULT_DENSE_K, alias="X-Dense-K"),
    X_BM25_K: int = Header(DEFAULT_BM25_K, alias="X-BM25-K"),
    X_Dense_Weight: float = Header(DEFAULT_DENSE_WEIGHT, alias="X-Dense-Weight"),
    X_Temperature: float = Header(DEFAULT_TEMPERATURE, alias="X-Temperature"),
) -> RuntimeConfig:
    chunk_size = clamp_int(X_Chunk_Size, MIN_CHUNK_SIZE, MAX_CHUNK_SIZE)
    chunk_overlap = clamp_int(X_Chunk_Overlap, MIN_CHUNK_OVERLAP, MAX_CHUNK_OVERLAP)
    if chunk_overlap >= chunk_size:
        chunk_overlap = max(MIN_CHUNK_OVERLAP, chunk_size // 2)

    return RuntimeConfig(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        dense_k=clamp_int(X_Dense_K, MIN_RETRIEVER_K, MAX_RETRIEVER_K),
        bm25_k=clamp_int(X_BM25_K, MIN_RETRIEVER_K, MAX_RETRIEVER_K),
        dense_weight=clamp_float(X_Dense_Weight, MIN_DENSE_WEIGHT, MAX_DENSE_WEIGHT),
        temperature=clamp_float(X_Temperature, MIN_TEMPERATURE, MAX_TEMPERATURE),
    )


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


def get_llm(
    provider: str,
    openai_key: str | None = None,
    runtime_config: RuntimeConfig | None = None,
) -> BaseChatModel:
    from langchain_openai import ChatOpenAI

    temperature = (
        runtime_config.temperature if runtime_config is not None else DEFAULT_TEMPERATURE
    )

    if provider == PROVIDER_OPENAI:
        return ChatOpenAI(
            model=OPENAI_MODEL,
            temperature=temperature,
            api_key=openai_key,
        )

    try:
        ChatGroq = getattr(import_module("langchain_groq"), "ChatGroq")
    except Exception:  # pragma: no cover
        return ChatOpenAI(
            model=settings.groq_model,
            temperature=temperature,
            api_key=settings.groq_api_key,
            base_url="https://api.groq.com/openai/v1",
        )

    return ChatGroq(
        model_name=settings.groq_model,
        temperature=temperature,
        groq_api_key=settings.groq_api_key,
    )


def resolve_model_used(provider: str) -> str:
    if provider == PROVIDER_OPENAI:
        return f"OpenAI · {OPENAI_MODEL}"
    return f"Groq · {settings.groq_model}"


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
def get_embeddings_model() -> Embeddings | None:
    if not settings.documind_dense_enabled:
        return None

    HuggingFaceEmbeddings: type[Embeddings] | None = None
    try:
        HuggingFaceEmbeddings = getattr(
            import_module("langchain_huggingface"), "HuggingFaceEmbeddings"
        )
    except Exception:  # pragma: no cover
        try:
            HuggingFaceEmbeddings = getattr(
                import_module("langchain_community.embeddings"),
                "HuggingFaceEmbeddings",
            )
        except Exception:  # pragma: no cover
            HuggingFaceEmbeddings = None

    if HuggingFaceEmbeddings is None:
        raise HTTPException(
            status_code=500,
            detail="HuggingFace embeddings dependency is not installed.",
        )

    try:
        return HuggingFaceEmbeddings(model_name=settings.documind_embeddings_model_name)
    except MemoryError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=503,
            detail=(
                "Server ran out of memory while loading dense embeddings. "
                "Set DOCUMIND_DENSE_ENABLED=false for low-memory deployment."
            ),
        ) from exc


async def _warm_retriever_cache() -> None:
    from services.retriever import initialize_retriever_from_disk

    try:
        await asyncio.wait_for(initialize_retriever_from_disk(), timeout=20)
        print("DocuMind startup: retriever warmup completed", flush=True)
    except Exception:
        print("DocuMind startup: retriever warmup skipped", flush=True)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    print("DocuMind startup: app initialization complete", flush=True)
    warmup_task: asyncio.Task[None] | None = None
    if settings.documind_bm25_enabled and settings.documind_warm_retriever_on_startup:
        warmup_task = asyncio.create_task(_warm_retriever_cache())
    try:
        yield
    finally:
        if warmup_task is not None and not warmup_task.done():
            warmup_task.cancel()
            with suppress(asyncio.CancelledError):
                await warmup_task


app = FastAPI(title="DocuMind API", lifespan=lifespan)
session_store: dict[str, list[BaseMessage]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=build_cors_allow_origins(),
    allow_origin_regex=build_cors_allow_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "dense_retrieval_enabled": settings.documind_dense_enabled,
        "bm25_enabled": settings.documind_bm25_enabled,
    }


@app.post("/upload")
@app.post("/api/v1/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    provider_ctx: tuple[str, str | None] = Depends(get_provider_context),
    runtime_config: RuntimeConfig = Depends(get_runtime_config),
) -> dict[str, int | str]:
    _provider, _openai_key = provider_ctx
    from services.document_processor import process_pdf
    from services.retriever import add_documents_to_store, maybe_add_documents_to_bm25

    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    max_upload_mb = max(1, int(settings.documind_max_upload_mb))
    max_upload_bytes = max_upload_mb * 1024 * 1024
    file_size = getattr(file, "size", None)
    if isinstance(file_size, int) and file_size > max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"PDF is too large. Maximum upload size is {max_upload_mb} MB.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"PDF is too large. Maximum upload size is {max_upload_mb} MB.",
        )

    chunks, total_pages = await process_pdf(
        file_bytes=file_bytes,
        filename=file.filename,
        chunk_size=runtime_config.chunk_size,
        chunk_overlap=runtime_config.chunk_overlap,
    )
    embeddings = get_embeddings_model()
    try:
        if chunks:
            await add_documents_to_store(chunks, embeddings)
            maybe_add_documents_to_bm25(chunks)
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
    runtime_config: RuntimeConfig = Depends(get_runtime_config),
) -> ChatResponse:
    provider, openai_key = provider_ctx
    from services.llm_chain import generate_answer
    from services.retriever import retrieve_documents

    embeddings = get_embeddings_model()
    try:
        llm = get_llm(provider, openai_key, runtime_config)
    except Exception as exc:
        mapped_error = map_provider_error(exc)
        if mapped_error:
            raise mapped_error from exc
        raise

    try:
        retrieved_docs = await retrieve_documents(
            request.query,
            embeddings,
            dense_k=runtime_config.dense_k,
            bm25_k=runtime_config.bm25_k,
            dense_weight=runtime_config.dense_weight,
        )
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
    runtime_config: RuntimeConfig = Depends(get_runtime_config),
) -> StreamingResponse:
    provider, openai_key = provider_ctx
    from services.llm_chain import reformulate_query, stream_answer_events
    from services.retriever import retrieve_documents

    session_id = str(request.session_id)
    chat_history = session_store.get(session_id, [])
    retrieval_query = request.query
    embeddings = get_embeddings_model()
    try:
        reformulation_llm = get_llm(provider, openai_key, runtime_config)
        stream_llm = get_llm(provider, openai_key, runtime_config)
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

        retrieved_docs = await retrieve_documents(
            retrieval_query,
            embeddings,
            dense_k=runtime_config.dense_k,
            bm25_k=runtime_config.bm25_k,
            dense_weight=runtime_config.dense_weight,
        )
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
        model_used = resolve_model_used(provider)
        try:
            if isinstance(first_event, dict):
                if first_event.get("type") == "final":
                    payload = first_event.get("payload")
                    if isinstance(payload, dict):
                        answer = payload.get("answer")
                        if isinstance(answer, str):
                            final_answer = answer
                        payload["model_used"] = model_used
                yield f"data: {json.dumps(first_event)}\n\n"

            async for event in stream_events:
                if event.get("type") == "final":
                    payload = event.get("payload")
                    if isinstance(payload, dict):
                        answer = payload.get("answer")
                        if isinstance(answer, str):
                            final_answer = answer
                        payload["model_used"] = model_used
                yield f"data: {json.dumps(event)}\n\n"

            history = session_store.setdefault(session_id, [])
            from langchain_core.messages import AIMessage, HumanMessage

            history.append(HumanMessage(content=request.query))
            history.append(AIMessage(content=final_answer))
            if len(history) > MAX_CHAT_HISTORY_MESSAGES_PER_SESSION:
                del history[:-MAX_CHAT_HISTORY_MESSAGES_PER_SESSION]
            while len(session_store) > MAX_IN_MEMORY_SESSIONS:
                oldest_session_id = next(iter(session_store))
                if oldest_session_id == session_id:
                    break
                session_store.pop(oldest_session_id, None)
            yield "data: [DONE]\n\n"
        except Exception as exc:
            mapped_error = map_provider_error(exc)
            if mapped_error:
                error_payload = {"detail": mapped_error.detail}
                yield f"data: {json.dumps(error_payload)}\n\n"
                return
            error_payload = {"type": "error", "message": str(exc)}
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
