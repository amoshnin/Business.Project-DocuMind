from collections.abc import AsyncIterator

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import get_settings
from schemas import ChatResponse


def _format_context(retrieved_docs: list[Document]) -> str:
    if not retrieved_docs:
        return "No context provided."

    sections: list[str] = []
    for index, doc in enumerate(retrieved_docs, start=1):
        metadata = doc.metadata or {}
        document_id = (
            metadata.get("document_id")
            or metadata.get("chunk_id")
            or "00000000-0000-0000-0000-000000000000"
        )
        filename = metadata.get("filename") or metadata.get("source") or "unknown"
        page_number = metadata.get("page_number") or metadata.get("page") or 0

        sections.append(
            "\n".join(
                [
                    f"[Chunk {index}]",
                    f"document_id: {document_id}",
                    f"filename: {filename}",
                    f"page_number: {page_number}",
                    "content:",
                    doc.page_content,
                ]
            )
        )

    return "\n\n".join(sections)


settings = get_settings()

_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    api_key=settings.openai_api_key,
)

_structured_llm = _llm.with_structured_output(ChatResponse, method="function_calling")

_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            (
                "You are an expert technical assistant. Answer the user's question "
                "using ONLY the provided context. If the answer is not in the "
                "context, say so. You must provide exact citations matching the "
                "source metadata.\n\n"
                "Rules:\n"
                "1) Never use outside knowledge.\n"
                "2) `citations` must contain only citations that exactly match "
                "metadata shown in context (`document_id`, `filename`, "
                "`page_number`).\n"
                "3) `source_text` must be a verbatim snippet from the cited chunk.\n"
                "4) If context is insufficient, set answer to a clear statement that "
                "the context does not contain the answer and return an empty citations "
                "list."
            ),
        ),
        (
            "human",
            "Context:\n{context}\n\nUser question:\n{query}",
        ),
    ]
)


async def generate_answer(query: str, retrieved_docs: list[Document]) -> ChatResponse:
    context = _format_context(retrieved_docs)
    chain = _prompt | _structured_llm
    result = await chain.ainvoke({"context": context, "query": query})

    if isinstance(result, ChatResponse):
        return result

    return ChatResponse.model_validate(result)


async def stream_answer_tokens(
    query: str, retrieved_docs: list[Document]
) -> AsyncIterator[str]:
    context = _format_context(retrieved_docs)
    chain = _prompt | _llm

    async for chunk in chain.astream({"context": context, "query": query}):
        content = getattr(chunk, "content", "")
        if isinstance(content, str) and content:
            yield content
