import asyncio
from typing import Any
from uuid import uuid4

try:
    from langchain.retrievers import EnsembleRetriever
except ImportError:  # pragma: no cover
    try:
        from langchain.retrievers.ensemble import EnsembleRetriever
    except ImportError:  # pragma: no cover
        from langchain_classic.retrievers import EnsembleRetriever
try:
    from langchain_community.retrievers import BM25Retriever
except ImportError:  # pragma: no cover
    from langchain.retrievers import BM25Retriever
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document

try:
    from langchain_chroma import Chroma
except ImportError:  # pragma: no cover
    try:
        from langchain_community.vectorstores import Chroma
    except ImportError:  # pragma: no cover
        from langchain.vectorstores import Chroma

from config import get_settings

_bm25_documents: list[Document] = []
_settings = get_settings()


def _new_vector_store(embeddings: Embeddings | None = None) -> Chroma:
    kwargs: dict[str, Any] = {
        "collection_name": "documind",
        "persist_directory": _settings.chroma_persist_dir,
    }
    if embeddings is not None:
        kwargs["embedding_function"] = embeddings

    return Chroma(**kwargs)


def _add_documents(chunks: list[Document], embeddings: Embeddings) -> None:
    if not chunks:
        return

    vector_store = _new_vector_store(embeddings)
    ids: list[str] = []

    for chunk in chunks:
        chunk_id = chunk.metadata.get("chunk_id")
        if not chunk_id:
            chunk_id = str(uuid4())
            chunk.metadata["chunk_id"] = chunk_id
        ids.append(chunk_id)

    vector_store.add_documents(documents=chunks, ids=ids)

    persist_fn = getattr(vector_store, "persist", None)
    if callable(persist_fn):
        persist_fn()


async def add_documents_to_store(
    chunks: list[Document], embeddings: Embeddings
) -> None:
    await asyncio.to_thread(_add_documents, chunks, embeddings)


def _build_hybrid_retriever(
    embeddings: Embeddings,
    dense_k: int,
    bm25_k: int,
    dense_weight: float,
) -> EnsembleRetriever | None:
    if not _bm25_documents:
        return None

    dense_retriever = _new_vector_store(embeddings).as_retriever(
        search_kwargs={"k": dense_k}
    )
    bm25_retriever = BM25Retriever.from_documents(_bm25_documents)
    bm25_retriever.k = bm25_k

    return EnsembleRetriever(
        retrievers=[dense_retriever, bm25_retriever],
        weights=[dense_weight, 1 - dense_weight],
    )


def get_hybrid_retriever(
    chunks_for_bm25: list[Document],
    embeddings: Embeddings,
    dense_k: int = 3,
    bm25_k: int = 3,
    dense_weight: float = 0.5,
) -> EnsembleRetriever:
    if chunks_for_bm25:
        _bm25_documents.extend(chunks_for_bm25)

    hybrid_retriever = _build_hybrid_retriever(
        embeddings, dense_k, bm25_k, dense_weight
    )
    if hybrid_retriever is None:
        raise RuntimeError("Hybrid retriever is not initialized. Upload documents first.")

    return hybrid_retriever


def _extract_documents_from_store() -> list[Document]:
    vector_store = _new_vector_store()
    try:
        stored_data = vector_store.get(include=["documents", "metadatas"])
    except TypeError:
        stored_data = vector_store.get()

    if not isinstance(stored_data, dict):
        return []

    stored_documents = stored_data.get("documents") or []
    stored_metadatas = stored_data.get("metadatas") or []
    rebuilt_documents: list[Document] = []

    for index, page_content in enumerate(stored_documents):
        if not isinstance(page_content, str) or not page_content.strip():
            continue

        metadata: dict[str, object] = {}
        if index < len(stored_metadatas) and isinstance(stored_metadatas[index], dict):
            metadata = dict(stored_metadatas[index])

        rebuilt_documents.append(
            Document(page_content=page_content, metadata=metadata)
        )

    return rebuilt_documents


def _initialize_retriever_from_disk() -> None:
    global _bm25_documents
    _bm25_documents = _extract_documents_from_store()


async def initialize_retriever_from_disk() -> None:
    await asyncio.to_thread(_initialize_retriever_from_disk)


def _retrieve_documents(
    query: str,
    embeddings: Embeddings,
    dense_k: int,
    bm25_k: int,
    dense_weight: float,
) -> list[Document]:
    retriever = _build_hybrid_retriever(embeddings, dense_k, bm25_k, dense_weight)
    if retriever is None:
        raise RuntimeError("Hybrid retriever is not initialized. Upload documents first.")
    return retriever.invoke(query)


async def retrieve_documents(
    query: str,
    embeddings: Embeddings,
    dense_k: int = 3,
    bm25_k: int = 3,
    dense_weight: float = 0.5,
) -> list[Document]:
    return await asyncio.to_thread(
        _retrieve_documents, query, embeddings, dense_k, bm25_k, dense_weight
    )
