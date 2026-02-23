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
    from langchain_core.retrievers import BaseRetriever
except Exception:  # pragma: no cover
    BaseRetriever = object  # type: ignore[assignment]
try:
    from langchain_community.retrievers import BM25Retriever
except ImportError:  # pragma: no cover
    from langchain.retrievers import BM25Retriever
from langchain_core.embeddings import Embeddings
from langchain_core.documents import Document

from config import get_settings

_bm25_documents: list[Document] = []
_settings = get_settings()
_chroma_class: type | None = None
_store_has_docs: bool | None = None


def _get_chroma_class() -> type:
    global _chroma_class
    if _chroma_class is not None:
        return _chroma_class

    try:
        from langchain_chroma import Chroma as ChromaClass
    except ImportError:  # pragma: no cover
        try:
            from langchain_community.vectorstores import Chroma as ChromaClass
        except ImportError:  # pragma: no cover
            from langchain.vectorstores import Chroma as ChromaClass

    _chroma_class = ChromaClass
    return _chroma_class


def _new_vector_store(embeddings: Embeddings | None = None) -> Any:
    kwargs: dict[str, Any] = {
        "collection_name": "documind",
        "persist_directory": _settings.chroma_persist_dir,
    }
    if embeddings is not None:
        kwargs["embedding_function"] = embeddings

    chroma_class = _get_chroma_class()
    return chroma_class(**kwargs)

def _coerce_positive_int(value: int | None, default: int) -> int:
    if value is None:
        return default
    if value <= 0:
        return default
    return value


def _detect_store_has_documents() -> bool:
    """Best-effort check to preserve old behavior: error before any upload.

    Uses a small get() to avoid loading the whole corpus into memory.
    """
    global _store_has_docs
    vector_store = _new_vector_store()
    stored_data: Any
    try:
        stored_data = vector_store.get(include=["documents"], limit=1, offset=0)
    except TypeError:
        try:
            stored_data = vector_store.get(include=["documents"])
        except Exception:
            _store_has_docs = False
            return False
    except Exception:
        _store_has_docs = False
        return False

    if not isinstance(stored_data, dict):
        _store_has_docs = False
        return False

    documents = stored_data.get("documents") or []
    has_docs = any(isinstance(item, str) and item.strip() for item in documents)
    _store_has_docs = has_docs
    return has_docs


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
    global _store_has_docs
    _store_has_docs = True

    persist_fn = getattr(vector_store, "persist", None)
    if callable(persist_fn):
        persist_fn()


async def add_documents_to_store(
    chunks: list[Document], embeddings: Embeddings
) -> None:
    await asyncio.to_thread(_add_documents, chunks, embeddings)

def maybe_add_documents_to_bm25(chunks: list[Document]) -> None:
    if not _settings.documind_bm25_enabled:
        return
    if not chunks:
        return

    _bm25_documents.extend(chunks)
    max_docs = _coerce_positive_int(_settings.documind_bm25_max_docs, 5000)
    if len(_bm25_documents) > max_docs:
        # Keep the most recent documents to bound memory usage.
        del _bm25_documents[: len(_bm25_documents) - max_docs]


def _build_hybrid_retriever(
    embeddings: Embeddings,
    dense_k: int,
    bm25_k: int,
    dense_weight: float,
) -> BaseRetriever:
    dense_retriever = _new_vector_store(embeddings).as_retriever(
        search_kwargs={"k": dense_k}
    )

    if not _settings.documind_bm25_enabled or not _bm25_documents:
        return dense_retriever

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
) -> BaseRetriever:
    maybe_add_documents_to_bm25(chunks_for_bm25)
    return _build_hybrid_retriever(embeddings, dense_k, bm25_k, dense_weight)


def _extract_documents_from_store(max_documents: int | None = None) -> list[Document]:
    vector_store = _new_vector_store()
    max_docs = None
    if max_documents is not None:
        max_docs = max(0, int(max_documents))

    rebuilt_documents: list[Document] = []

    include = ["documents", "metadatas"]
    batch_size = 512
    offset = 0
    supports_paging = True

    while True:
        if max_docs is not None and len(rebuilt_documents) >= max_docs:
            break

        limit = batch_size
        if max_docs is not None:
            limit = min(limit, max_docs - len(rebuilt_documents))
            if limit <= 0:
                break

        try:
            stored_data = vector_store.get(include=include, limit=limit, offset=offset)
        except TypeError:
            supports_paging = False
            break
        except Exception:
            break

        if not isinstance(stored_data, dict):
            break

        stored_documents = stored_data.get("documents") or []
        stored_metadatas = stored_data.get("metadatas") or []
        if not stored_documents:
            break

        for index, page_content in enumerate(stored_documents):
            if max_docs is not None and len(rebuilt_documents) >= max_docs:
                break
            if not isinstance(page_content, str) or not page_content.strip():
                continue

            metadata: dict[str, object] = {}
            if index < len(stored_metadatas) and isinstance(stored_metadatas[index], dict):
                metadata = dict(stored_metadatas[index])

            rebuilt_documents.append(Document(page_content=page_content, metadata=metadata))

        offset += len(stored_documents)

    if not supports_paging:
        try:
            stored_data = vector_store.get(include=include)
        except TypeError:
            stored_data = vector_store.get()
        if isinstance(stored_data, dict):
            stored_documents = stored_data.get("documents") or []
            stored_metadatas = stored_data.get("metadatas") or []
            for index, page_content in enumerate(stored_documents):
                if max_docs is not None and len(rebuilt_documents) >= max_docs:
                    break
                if not isinstance(page_content, str) or not page_content.strip():
                    continue
                metadata: dict[str, object] = {}
                if index < len(stored_metadatas) and isinstance(stored_metadatas[index], dict):
                    metadata = dict(stored_metadatas[index])
                rebuilt_documents.append(Document(page_content=page_content, metadata=metadata))

    return rebuilt_documents


def _initialize_retriever_from_disk(max_documents: int | None = None) -> None:
    global _bm25_documents
    if not _settings.documind_bm25_enabled:
        _bm25_documents = []
        return

    max_docs = _coerce_positive_int(_settings.documind_bm25_max_docs, 5000)
    if max_documents is not None:
        max_docs = min(max_docs, int(max_documents))
    _bm25_documents = _extract_documents_from_store(max_documents=max_docs)


async def initialize_retriever_from_disk(max_documents: int | None = None) -> None:
    await asyncio.to_thread(_initialize_retriever_from_disk, max_documents)


def _retrieve_documents(
    query: str,
    embeddings: Embeddings,
    dense_k: int,
    bm25_k: int,
    dense_weight: float,
) -> list[Document]:
    global _store_has_docs
    if not _bm25_documents:
        if _store_has_docs is None:
            if not _detect_store_has_documents():
                raise RuntimeError(
                    "Hybrid retriever is not initialized. Upload documents first."
                )
        elif _store_has_docs is False:
            raise RuntimeError("Hybrid retriever is not initialized. Upload documents first.")

    retriever = _build_hybrid_retriever(embeddings, dense_k, bm25_k, dense_weight)
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
