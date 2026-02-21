from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.document_processor import process_pdf
from services.retriever import add_documents_to_store, get_hybrid_retriever


app = FastAPI(title="DocuMind API")

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
