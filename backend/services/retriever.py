import asyncio
from uuid import uuid4

from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

try:
    from langchain_chroma import Chroma
except ImportError:  # pragma: no cover
    from langchain_community.vectorstores import Chroma

from config import get_settings

_vector_store: Chroma | None = None
_bm25_documents: list[Document] = []
_hybrid_retriever: EnsembleRetriever | None = None


def _get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is None:
        settings = get_settings()
        embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
        _vector_store = Chroma(
            collection_name="documind",
            embedding_function=embeddings,
            persist_directory=settings.chroma_persist_dir,
        )

    return _vector_store


def _add_documents(chunks: list[Document]) -> None:
    if not chunks:
        return

    vector_store = _get_vector_store()
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


async def add_documents_to_store(chunks: list[Document]) -> None:
    await asyncio.to_thread(_add_documents, chunks)


def _build_hybrid_retriever() -> EnsembleRetriever | None:
    global _hybrid_retriever
    if not _bm25_documents:
        _hybrid_retriever = None
        return None

    dense_retriever = _get_vector_store().as_retriever(search_kwargs={"k": 3})
    bm25_retriever = BM25Retriever.from_documents(_bm25_documents)
    bm25_retriever.k = 3

    _hybrid_retriever = EnsembleRetriever(
        retrievers=[dense_retriever, bm25_retriever],
        weights=[0.5, 0.5],
    )
    return _hybrid_retriever


def get_hybrid_retriever(chunks_for_bm25: list[Document]) -> EnsembleRetriever:
    if chunks_for_bm25:
        _bm25_documents.extend(chunks_for_bm25)

    hybrid_retriever = _build_hybrid_retriever()
    if hybrid_retriever is None:
        raise RuntimeError("Hybrid retriever is not initialized. Upload documents first.")

    return hybrid_retriever


def _extract_documents_from_store() -> list[Document]:
    vector_store = _get_vector_store()
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
    _build_hybrid_retriever()


async def initialize_retriever_from_disk() -> None:
    await asyncio.to_thread(_initialize_retriever_from_disk)


def _get_active_retriever() -> EnsembleRetriever:
    if _hybrid_retriever is None:
        raise RuntimeError("Hybrid retriever is not initialized. Upload documents first.")

    return _hybrid_retriever


def _retrieve_documents(query: str) -> list[Document]:
    retriever = _get_active_retriever()
    return retriever.invoke(query)


async def retrieve_documents(query: str) -> list[Document]:
    return await asyncio.to_thread(_retrieve_documents, query)
