import asyncio
from uuid import uuid4

import fitz
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import get_settings


def _extract_pages(file_bytes: bytes, filename: str) -> tuple[list[Document], int]:
    documents: list[Document] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
        total_pages = pdf.page_count
        for page_number, page in enumerate(pdf, start=1):
            page_text = page.get_text("text") or ""
            if not page_text.strip():
                continue

            documents.append(
                Document(
                    page_content=page_text,
                    metadata={"source": filename, "page": page_number},
                )
            )

    return documents, total_pages


def _chunk_pages(
    page_documents: list[Document],
    filename: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[Document]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    chunked_documents = text_splitter.split_documents(page_documents)

    for chunk in chunked_documents:
        chunk.metadata["source"] = filename
        chunk.metadata["chunk_id"] = str(uuid4())

    return chunked_documents


async def process_pdf(
    file_bytes: bytes,
    filename: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> tuple[list[Document], int]:
    page_documents, total_pages = await asyncio.to_thread(
        _extract_pages, file_bytes, filename
    )
    settings = get_settings()
    effective_chunk_size = chunk_size if chunk_size is not None else settings.chunk_size
    effective_chunk_overlap = 150 if chunk_overlap is None else chunk_overlap
    chunks = await asyncio.to_thread(
        _chunk_pages,
        page_documents,
        filename,
        effective_chunk_size,
        effective_chunk_overlap,
    )
    return chunks, total_pages
