import asyncio
from collections.abc import Callable
from uuid import uuid4

import fitz
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import get_settings


def _extract_and_chunk_pages(
    file_bytes: bytes,
    filename: str,
    chunk_size: int,
    chunk_overlap: int,
    progress_callback: Callable[[dict[str, object]], None] | None = None,
) -> tuple[list[Document], int]:
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    chunked_documents: list[Document] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as pdf:
        total_pages = pdf.page_count
        pages_processed = 0
        if progress_callback is not None:
            progress_callback(
                {
                    "total_pages": total_pages,
                    "pages_processed": 0,
                    "chunks_generated_so_far": 0,
                }
            )
        for page_number, page in enumerate(pdf, start=1):
            page_text = page.get_text("text") or ""
            if page_text.strip():
                page_document = Document(
                    page_content=page_text,
                    metadata={"source": filename, "page": page_number},
                )
                page_chunks = text_splitter.split_documents([page_document])
                for chunk in page_chunks:
                    chunk.metadata["source"] = filename
                    chunk.metadata["chunk_id"] = str(uuid4())
                    chunked_documents.append(chunk)

            pages_processed += 1
            if progress_callback is not None:
                progress_callback(
                    {
                        "total_pages": total_pages,
                        "pages_processed": pages_processed,
                        "chunks_generated_so_far": len(chunked_documents),
                        "last_processed_page": page_number,
                    }
                )

    return chunked_documents, total_pages


async def process_pdf(
    file_bytes: bytes,
    filename: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    progress_callback: Callable[[dict[str, object]], None] | None = None,
) -> tuple[list[Document], int]:
    settings = get_settings()
    effective_chunk_size = chunk_size if chunk_size is not None else settings.chunk_size
    effective_chunk_overlap = 150 if chunk_overlap is None else chunk_overlap
    return await asyncio.to_thread(
        _extract_and_chunk_pages,
        file_bytes,
        filename,
        effective_chunk_size,
        effective_chunk_overlap,
        progress_callback,
    )
