import json
import re
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.documents import Document
from langchain_core.messages import BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from pydantic import BaseModel, ValidationError

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


def _sanitize_answer_text(answer: str) -> str:
    citation_tool_index = re.search(r"\bCitationTool\b", answer, re.IGNORECASE)
    if citation_tool_index:
        answer = answer[: citation_tool_index.start()]

    return answer.strip()


def _contains_citation_tool_marker(answer: str) -> bool:
    return re.search(r"\bCitationTool\b", answer, re.IGNORECASE) is not None


class CitationTool(BaseModel):
    citations: list[Citation]

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


async def generate_answer(
    query: str, retrieved_docs: list[Document], llm: BaseChatModel
) -> ChatResponse:
    context = _format_context(retrieved_docs)
    structured_llm = llm.with_structured_output(ChatResponse, method="function_calling")
    chain = _prompt | structured_llm
    result = await chain.ainvoke({"context": context, "query": query})

    if isinstance(result, ChatResponse):
        result.answer = _sanitize_answer_text(result.answer)
        return result

    validated = ChatResponse.model_validate(result)
    validated.answer = _sanitize_answer_text(validated.answer)
    return validated


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


async def reformulate_query(
    raw_query: str, chat_history: list[BaseMessage], llm: BaseChatModel
) -> str:
    if not chat_history:
        return raw_query

    chain = _reformulation_prompt | llm
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


def _coerce_document_id(raw_id: Any) -> str:
    if raw_id is None:
        return "00000000-0000-0000-0000-000000000000"

    value = str(raw_id).strip()
    if not value:
        return "00000000-0000-0000-0000-000000000000"

    try:
        return str(UUID(value))
    except ValueError:
        return "00000000-0000-0000-0000-000000000000"


def _coerce_page_number(raw_page: Any) -> int:
    try:
        return int(raw_page)
    except (TypeError, ValueError):
        return 0


def _fallback_citations_from_docs(
    retrieved_docs: list[Document], max_items: int = 3
) -> list[Citation]:
    fallback_citations: list[Citation] = []
    for doc in retrieved_docs[:max_items]:
        snippet = doc.page_content.strip()
        if not snippet:
            continue

        metadata = doc.metadata or {}
        citation_payload = {
            "source_text": snippet[:600],
            "metadata": {
                "document_id": _coerce_document_id(
                    metadata.get("document_id") or metadata.get("chunk_id")
                ),
                "filename": str(
                    metadata.get("filename") or metadata.get("source") or "unknown"
                ),
                "page_number": _coerce_page_number(
                    metadata.get("page_number") or metadata.get("page")
                ),
            },
        }
        fallback_citations.append(Citation.model_validate(citation_payload))

    return fallback_citations


async def stream_answer_events(
    query: str,
    retrieved_docs: list[Document],
    chat_history: list[BaseMessage],
    llm: BaseChatModel,
) -> AsyncIterator[dict[str, Any]]:
    context = _format_context(retrieved_docs)
    tool_llm = llm.bind_tools([CitationTool])
    chain = _stream_prompt | tool_llm
    tool_call_argument_buffers: dict[int, str] = {}
    fallback_citations = _fallback_citations_from_docs(retrieved_docs)
    streamed_text_buffer = ""
    emitted_length = 0
    marker_guard_length = len("CitationTool") - 1

    try:
        async for chunk in chain.astream(
            {"chat_history": chat_history, "context": context, "query": query}
        ):
            token = _extract_text_from_chunk(chunk)
            if token:
                streamed_text_buffer += token
                clean_text = _sanitize_answer_text(streamed_text_buffer)
                marker_found = _contains_citation_tool_marker(streamed_text_buffer)
                safe_target_length = (
                    len(clean_text)
                    if marker_found
                    else max(0, len(clean_text) - marker_guard_length)
                )

                if safe_target_length > emitted_length:
                    safe_token = clean_text[emitted_length:safe_target_length]
                    if safe_token:
                        yield {"type": "token", "token": safe_token}
                    emitted_length = safe_target_length

            _accumulate_tool_call_args(chunk, tool_call_argument_buffers)
    except Exception:
        fallback_answer = _sanitize_answer_text(streamed_text_buffer)
        if fallback_answer:
            response = ChatResponse(
                answer=fallback_answer,
                citations=fallback_citations,
            )
            yield {"type": "final", "payload": response.model_dump(mode="json")}
            return
        raise

    citations = _parse_citations_from_buffers(tool_call_argument_buffers)
    final_answer = _sanitize_answer_text(streamed_text_buffer)
    if not final_answer.strip():
        try:
            fallback_response = await generate_answer(query, retrieved_docs, llm)
            final_answer = _sanitize_answer_text(fallback_response.answer)
            if not citations:
                citations = fallback_response.citations
        except Exception:
            final_answer = (
                "I can provide citations for the answer, but the response text "
                "could not be streamed for this provider."
            )

    response = ChatResponse(
        answer=final_answer,
        citations=citations or fallback_citations,
    )
    yield {"type": "final", "payload": response.model_dump(mode="json")}
