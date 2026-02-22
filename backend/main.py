import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from services.document_processor import process_pdf
from schemas import ChatRequest, ChatResponse
from services.llm_chain import generate_answer, stream_answer_events
from services.retriever import (
    add_documents_to_store,
    get_hybrid_retriever,
    initialize_retriever_from_disk,
    retrieve_documents,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    await initialize_retriever_from_disk()
    yield


app = FastAPI(title="DocuMind API", lifespan=lifespan)

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


@app.post("/api/v1/documents/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, int]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    chunks = await process_pdf(file_bytes=file_bytes, filename=file.filename)
    if chunks:
        await add_documents_to_store(chunks)
        get_hybrid_retriever(chunks)

    return {"chunks_generated": len(chunks)}


@app.post("/api/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    try:
        retrieved_docs = await retrieve_documents(request.query)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return await generate_answer(request.query, retrieved_docs)


@app.post("/api/v1/chat/stream")
async def chat_stream(request: ChatRequest) -> StreamingResponse:
    try:
        retrieved_docs = await retrieve_documents(request.query)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    async def event_generator() -> AsyncIterator[str]:
        try:
            async for event in stream_answer_events(request.query, retrieved_docs):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:  # pragma: no cover
            error_payload = {"type": "error", "message": str(exc)}
            yield f"data: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
