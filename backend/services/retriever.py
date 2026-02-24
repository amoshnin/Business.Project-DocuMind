import asyncio
import json
from pathlib import Path
from typing import Any
from uuid import uuid4

try:
    from langchain_core.retrievers import BaseRetriever
except Exception:  # pragma: no cover
    BaseRetriever = object  # type: ignore[assignment]
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from config import get_settings

_bm25_documents: list[Document] = []
_settings = get_settings()
_chroma_class: type | None = None
_ensemble_retriever_class: type | None = None
_bm25_retriever_class: type | None = None
_store_has_docs: bool | None = None


def _dense_retrieval_enabled() -> bool:
    return bool(_settings.documind_dense_enabled)


def _sparse_store_path() -> Path:
    return Path(_settings.chroma_persist_dir) / "documind_chunks.jsonl"


def _ensure_persist_directory() -> None:
    Path(_settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)


def _serialize_document(doc: Document) -> dict[str, object]:
    metadata = doc.metadata if isinstance(doc.metadata, dict) else {}
    return {
        "page_content": doc.page_content,
        "metadata": metadata,
    }


def _append_documents_to_sparse_store(chunks: list[Document]) -> None:
    if not chunks:
        return

    _ensure_persist_directory()
    store_path = _sparse_store_path()
    with store_path.open("a", encoding="utf-8") as handle:
        for chunk in chunks:
            handle.write(json.dumps(_serialize_document(chunk), ensure_ascii=True))
            handle.write("\n")


def _extract_documents_from_sparse_store(
    max_documents: int | None = None,
) -> list[Document]:
    store_path = _sparse_store_path()
    if not store_path.exists():
        return []

    limit = None if max_documents is None else max(0, int(max_documents))
    documents: list[Document] = []
    try:
        with store_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if limit is not None and len(documents) >= limit:
                    break
                raw = line.strip()
                if not raw:
                    continue
                try:
                    payload = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                page_content = payload.get("page_content")
                metadata = payload.get("metadata")
                if not isinstance(page_content, str) or not page_content.strip():
                    continue
                if not isinstance(metadata, dict):
                    metadata = {}
                documents.append(
                    Document(page_content=page_content, metadata=dict(metadata))
                )
    except OSError:
        return []

    return documents


def _sparse_store_has_documents() -> bool:
    store_path = _sparse_store_path()
    if not store_path.exists():
        return False
    try:
        with store_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    return True
    except OSError:
        return False
    return False


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


def _get_ensemble_retriever_class() -> type:
    global _ensemble_retriever_class
    if _ensemble_retriever_class is not None:
        return _ensemble_retriever_class

    try:
        from langchain.retrievers import EnsembleRetriever as EnsembleRetrieverClass
    except ImportError:  # pragma: no cover
        try:
            from langchain.retrievers.ensemble import (
                EnsembleRetriever as EnsembleRetrieverClass,
            )
        except ImportError:  # pragma: no cover
            from langchain_classic.retrievers import (
                EnsembleRetriever as EnsembleRetrieverClass,
            )

    _ensemble_retriever_class = EnsembleRetrieverClass
    return _ensemble_retriever_class


def _get_bm25_retriever_class() -> type:
    global _bm25_retriever_class
    if _bm25_retriever_class is not None:
        return _bm25_retriever_class

    try:
        from langchain_community.retrievers import BM25Retriever as BM25RetrieverClass
    except ImportError:  # pragma: no cover
        from langchain.retrievers import BM25Retriever as BM25RetrieverClass

    _bm25_retriever_class = BM25RetrieverClass
    return _bm25_retriever_class


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


def _detect_vector_store_has_documents() -> bool:
    vector_store = _new_vector_store()
    stored_data: Any
    try:
        stored_data = vector_store.get(include=["documents"], limit=1, offset=0)
    except TypeError:
        try:
            stored_data = vector_store.get(include=["documents"])
        except Exception:
            return False
    except Exception:
        return False

    if not isinstance(stored_data, dict):
        return False

    documents = stored_data.get("documents") or []
    return any(isinstance(item, str) and item.strip() for item in documents)


def _detect_store_has_documents() -> bool:
    """Best-effort check to preserve old behavior: error before any upload."""
    global _store_has_docs

    if _sparse_store_has_documents():
        _store_has_docs = True
        return True

    if not _dense_retrieval_enabled():
        _store_has_docs = False
        return False

    has_docs = _detect_vector_store_has_documents()
    _store_has_docs = has_docs
    return has_docs


def _add_documents(chunks: list[Document], embeddings: Embeddings | None) -> None:
    if not chunks:
        return

    for chunk in chunks:
        chunk_id = chunk.metadata.get("chunk_id")
        if not chunk_id:
            chunk_id = str(uuid4())
            chunk.metadata["chunk_id"] = chunk_id

    _append_documents_to_sparse_store(chunks)

    if _dense_retrieval_enabled() and embeddings is not None:
        vector_store = _new_vector_store(embeddings)
        ids = [str(chunk.metadata["chunk_id"]) for chunk in chunks]
        vector_store.add_documents(documents=chunks, ids=ids)
        persist_fn = getattr(vector_store, "persist", None)
        if callable(persist_fn):
            persist_fn()

    global _store_has_docs
    _store_has_docs = True


async def add_documents_to_store(
    chunks: list[Document], embeddings: Embeddings | None
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


def _build_bm25_retriever(bm25_k: int) -> BaseRetriever:
    BM25Retriever = _get_bm25_retriever_class()
    bm25_retriever = BM25Retriever.from_documents(_bm25_documents)
    bm25_retriever.k = bm25_k
    return bm25_retriever


def _build_hybrid_retriever(
    embeddings: Embeddings | None,
    dense_k: int,
    bm25_k: int,
    dense_weight: float,
) -> BaseRetriever:
    dense_retriever: BaseRetriever | None = None
    if _dense_retrieval_enabled() and embeddings is not None:
        dense_retriever = _new_vector_store(embeddings).as_retriever(
            search_kwargs={"k": dense_k}
        )

    use_bm25 = bool(_settings.documind_bm25_enabled and _bm25_documents)
    if use_bm25 and dense_retriever is None:
        return _build_bm25_retriever(bm25_k)

    if dense_retriever is not None and not use_bm25:
        return dense_retriever

    if dense_retriever is None and not use_bm25:
        raise RuntimeError("No retriever is available. Upload documents first.")

    EnsembleRetriever = _get_ensemble_retriever_class()
    bm25_retriever = _build_bm25_retriever(bm25_k)
    return EnsembleRetriever(
        retrievers=[dense_retriever, bm25_retriever],
        weights=[dense_weight, 1 - dense_weight],
    )


def get_hybrid_retriever(
    chunks_for_bm25: list[Document],
    embeddings: Embeddings | None,
    dense_k: int = 3,
    bm25_k: int = 3,
    dense_weight: float = 0.5,
) -> BaseRetriever:
    maybe_add_documents_to_bm25(chunks_for_bm25)
    return _build_hybrid_retriever(embeddings, dense_k, bm25_k, dense_weight)


def _extract_documents_from_vector_store(max_documents: int | None = None) -> list[Document]:
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


def _extract_documents_from_store(max_documents: int | None = None) -> list[Document]:
    sparse_docs = _extract_documents_from_sparse_store(max_documents=max_documents)
    if sparse_docs:
        return sparse_docs

    if not _dense_retrieval_enabled():
        return []

    return _extract_documents_from_vector_store(max_documents=max_documents)


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
    embeddings: Embeddings | None,
    dense_k: int,
    bm25_k: int,
    dense_weight: float,
) -> list[Document]:
    global _store_has_docs

    if _settings.documind_bm25_enabled and not _bm25_documents:
        _initialize_retriever_from_disk()

    if not _bm25_documents and _store_has_docs is None:
        if not _detect_store_has_documents():
            raise RuntimeError("Hybrid retriever is not initialized. Upload documents first.")
    elif not _bm25_documents and _store_has_docs is False and not _dense_retrieval_enabled():
        raise RuntimeError("Hybrid retriever is not initialized. Upload documents first.")

    retriever = _build_hybrid_retriever(embeddings, dense_k, bm25_k, dense_weight)
    return retriever.invoke(query)


async def retrieve_documents(
    query: str,
    embeddings: Embeddings | None,
    dense_k: int = 3,
    bm25_k: int = 3,
    dense_weight: float = 0.5,
) -> list[Document]:
    return await asyncio.to_thread(
        _retrieve_documents, query, embeddings, dense_k, bm25_k, dense_weight
    )
