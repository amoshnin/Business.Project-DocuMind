import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, HTTPException, Header, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

try:
    from openai import AuthenticationError as OpenAIAuthenticationError
except Exception:  # pragma: no cover
    class OpenAIAuthenticationError(Exception):
        pass

from services.document_processor import process_pdf
from schemas import ChatRequest, ChatResponse
from services.llm_chain import generate_answer, reformulate_query, stream_answer_events
from services.retriever import (
    add_documents_to_store,
    get_hybrid_retriever,
    initialize_retriever_from_disk,
    retrieve_documents,
)

INVALID_KEY_DETAIL = "Invalid or expired OpenAI API Key"


async def get_openai_key(
    X_OpenAI_Key: str = Header(..., alias="X-OpenAI-Key"),
) -> str:
    api_key = X_OpenAI_Key.strip()
    if not api_key.startswith("sk-"):
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL)
    return api_key


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await initialize_retriever_from_disk()
    yield


app = FastAPI(title="DocuMind API", lifespan=lifespan)
session_store: dict[str, list[BaseMessage]] = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    file: UploadFile = File(...), api_key: str = Depends(get_openai_key)
) -> dict[str, int]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    chunks = await process_pdf(file_bytes=file_bytes, filename=file.filename)
    try:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        if chunks:
            await add_documents_to_store(chunks, embeddings)
            get_hybrid_retriever(chunks, embeddings)
    except OpenAIAuthenticationError as exc:
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc

    return {"chunks_generated": len(chunks)}


@app.post("/query", response_model=ChatResponse)
@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, api_key: str = Depends(get_openai_key)
) -> ChatResponse:
    try:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=api_key)
    except OpenAIAuthenticationError as exc:
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc

    try:
        retrieved_docs = await retrieve_documents(request.query, embeddings)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OpenAIAuthenticationError as exc:
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc

    try:
        return await generate_answer(request.query, retrieved_docs, llm)
    except OpenAIAuthenticationError as exc:
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc


@app.post("/process")
@app.post("/api/v1/chat/stream")
async def chat_stream(
    request: ChatRequest, api_key: str = Depends(get_openai_key)
) -> StreamingResponse:
    session_id = str(request.session_id)
    chat_history = session_store.get(session_id, [])
    retrieval_query = request.query
    try:
        embeddings = OpenAIEmbeddings(api_key=api_key)
        reformulation_llm = ChatOpenAI(
            model="gpt-4o-mini", temperature=0, api_key=api_key
        )
        stream_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=api_key)
    except OpenAIAuthenticationError as exc:
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc

    if chat_history:
        try:
            retrieval_query = await reformulate_query(
                raw_query=request.query,
                chat_history=chat_history,
                llm=reformulation_llm,
            )
        except OpenAIAuthenticationError as exc:
            raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc

    try:
        retrieved_docs = await retrieve_documents(retrieval_query, embeddings)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OpenAIAuthenticationError as exc:
        raise HTTPException(status_code=401, detail=INVALID_KEY_DETAIL) from exc

    async def event_generator() -> AsyncIterator[str]:
        final_answer = ""
        try:
            async for event in stream_answer_events(
                query=request.query,
                retrieved_docs=retrieved_docs,
                chat_history=chat_history,
                llm=stream_llm,
            ):
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
        except OpenAIAuthenticationError:
            error_payload = {"detail": INVALID_KEY_DETAIL}
            yield f"data: {json.dumps(error_payload)}\n\n"
        except Exception as exc:  # pragma: no cover
            error_payload = {"type": "error", "message": str(exc)}
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
