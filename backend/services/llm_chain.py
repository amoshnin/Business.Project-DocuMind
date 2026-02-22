import json
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.documents import Document
from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ValidationError

from config import get_settings
from schemas import ChatResponse, Citation


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


class CitationTool(BaseModel):
    citations: list[Citation]


_tool_llm = _llm.bind_tools([CitationTool])

_reformulation_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    api_key=settings.openai_api_key,
)

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

_stream_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            (
                "You are an expert technical assistant. Answer the user's question "
                "using ONLY the provided context. If the answer is not in the "
                "context, say so. You must provide exact citations matching the "
                "source metadata.\n\n"
                "Streaming mode requirements:\n"
                "1) Stream only the answer text in normal assistant content.\n"
                "2) After the answer text is complete, call CitationTool exactly "
                "once with a `citations` list.\n"
                "3) Every citation must match context metadata exactly "
                "(`document_id`, `filename`, `page_number`) and use verbatim "
                "`source_text`.\n"
                "4) If context is insufficient, state that clearly in answer text "
                "and call CitationTool with an empty citations list."
            ),
        ),
        MessagesPlaceholder("chat_history"),
        (
            "human",
            "Context:\n{context}\n\nUser question:\n{query}",
        ),
    ]
)

_reformulation_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            (
                "Given the chat history and the latest user query, formulate a "
                "standalone query that can be understood without the chat history. "
                "Do NOT answer the question, just reformulate it."
            ),
        ),
        MessagesPlaceholder("chat_history"),
        ("human", "Latest user query:\n{raw_query}"),
    ]
)


async def generate_answer(query: str, retrieved_docs: list[Document]) -> ChatResponse:
    context = _format_context(retrieved_docs)
    chain = _prompt | _structured_llm
    result = await chain.ainvoke({"context": context, "query": query})

    if isinstance(result, ChatResponse):
        return result

    return ChatResponse.model_validate(result)


def _extract_text_from_content(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                text_parts.append(part)
            elif isinstance(part, dict):
                part_text = part.get("text")
                if isinstance(part_text, str):
                    text_parts.append(part_text)
        return "".join(text_parts)

    return ""


def _extract_text_from_chunk(chunk: Any) -> str:
    content = getattr(chunk, "content", "")
    return _extract_text_from_content(content)


async def reformulate_query(raw_query: str, chat_history: list[BaseMessage]) -> str:
    if not chat_history:
        return raw_query

    chain = _reformulation_prompt | _reformulation_llm
    result = await chain.ainvoke({"chat_history": chat_history, "raw_query": raw_query})
    reformulated = _extract_text_from_content(getattr(result, "content", "")).strip()
    return reformulated or raw_query


def _accumulate_tool_call_args(chunk: Any, buffers: dict[int, str]) -> None:
    tool_call_chunks = getattr(chunk, "tool_call_chunks", None) or []
    for tool_chunk in tool_call_chunks:
        if isinstance(tool_chunk, dict):
            name = tool_chunk.get("name")
            index = tool_chunk.get("index")
            args_piece = tool_chunk.get("args")
        else:
            name = getattr(tool_chunk, "name", None)
            index = getattr(tool_chunk, "index", None)
            args_piece = getattr(tool_chunk, "args", None)

        if name not in (None, "", "CitationTool"):
            continue
        if isinstance(args_piece, dict):
            args_piece = json.dumps(args_piece)
        if not isinstance(args_piece, str) or not args_piece:
            continue

        key = index if isinstance(index, int) else 0
        buffers[key] = f"{buffers.get(key, '')}{args_piece}"


def _parse_citations_from_buffers(buffers: dict[int, str]) -> list[Citation]:
    parsed_citations: list[Citation] = []
    for key in sorted(buffers):
        raw_args = buffers[key].strip()
        if not raw_args:
            continue

        try:
            payload = json.loads(raw_args)
        except json.JSONDecodeError:
            continue

        try:
            tool_payload = CitationTool.model_validate(payload)
        except ValidationError:
            if isinstance(payload, list):
                try:
                    tool_payload = CitationTool.model_validate({"citations": payload})
                except ValidationError:
                    continue
            else:
                continue

        parsed_citations.extend(tool_payload.citations)

    return parsed_citations


async def stream_answer_events(
    query: str, retrieved_docs: list[Document], chat_history: list[BaseMessage]
) -> AsyncIterator[dict[str, Any]]:
    context = _format_context(retrieved_docs)
    chain = _stream_prompt | _tool_llm
    answer_parts: list[str] = []
    tool_call_argument_buffers: dict[int, str] = {}

    async for chunk in chain.astream(
        {"chat_history": chat_history, "context": context, "query": query}
    ):
        token = _extract_text_from_chunk(chunk)
        if token:
            answer_parts.append(token)
            yield {"type": "token", "token": token}

        _accumulate_tool_call_args(chunk, tool_call_argument_buffers)

    citations = _parse_citations_from_buffers(tool_call_argument_buffers)
    response = ChatResponse(answer="".join(answer_parts), citations=citations)
    yield {"type": "final", "payload": response.model_dump(mode="json")}
