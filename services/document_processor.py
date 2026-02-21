import asyncio
from typing import List
from uuid import uuid4

import fitz
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import get_settings


def _extract_pages(file_bytes: bytes, filename: str) -> List[Document]:
    documents: List[Document] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
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

    return documents


def _chunk_pages(
    page_documents: List[Document], filename: str, chunk_size: int
) -> List[Document]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=150,
    )
    chunked_documents = text_splitter.split_documents(page_documents)

    for chunk in chunked_documents:
        chunk.metadata["source"] = filename
        chunk.metadata["chunk_id"] = str(uuid4())

    return chunked_documents


async def process_pdf(file_bytes: bytes, filename: str) -> List[Document]:
    page_documents = await asyncio.to_thread(_extract_pages, file_bytes, filename)
    settings = get_settings()
    return await asyncio.to_thread(
        _chunk_pages, page_documents, filename, settings.chunk_size
    )
