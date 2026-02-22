import asyncio
import json
from typing import Any
from uuid import uuid4

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel, Field

from config import get_settings
from services.llm_chain import generate_answer
from services.retriever import (
    add_documents_to_store,
    get_hybrid_retriever,
    retrieve_documents,
)

GOLDEN_DATASET: list[dict[str, str]] = [
    {
        "query": "What region did Acme launch in first?",
        "expected_answer": "Acme launched in North America first.",
        "document_text": (
            "Acme Product Rollout Plan:\n"
            "- Phase 1 launch region: North America\n"
            "- Phase 2 expansion: Western Europe"
        ),
    },
    {
        "query": "What uptime target is defined for the API?",
        "expected_answer": "The API uptime target is 99.9%.",
        "document_text": (
            "Service Level Objectives:\n"
            "The public API has a monthly uptime target of 99.9%.\n"
            "P95 latency target is under 300 ms."
        ),
    },
]


class JudgeScore(BaseModel):
    Faithfulness: int = Field(ge=1, le=5)
    Answer_Relevance: int = Field(ge=1, le=5)


def build_judge_chain(api_key: str) -> Any:
    judge_llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        api_key=api_key,
    )
    structured_judge = judge_llm.with_structured_output(
        JudgeScore, method="function_calling"
    )
    judge_prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                (
                    "You are an objective RAG evaluator. Evaluate the generated answer "
                    "against the expected answer and document text.\n"
                    "Score from 1-5 for:\n"
                    "- faithfulness: 1 means fabricated/unsupported, 5 means fully "
                    "supported by document_text.\n"
                    "- answer_relevance: 1 means does not answer query, 5 means fully "
                    "answers query.\n"
                    "Return only scores in the required schema."
                ),
            ),
            (
                "human",
                (
                    "Query:\n{query}\n\n"
                    "Expected answer:\n{expected_answer}\n\n"
                    "Document text:\n{document_text}\n\n"
                    "Generated answer:\n{generated_answer}"
                ),
            ),
        ]
    )
    return judge_prompt | structured_judge


async def run_rag_pipeline(
    query: str, document_text: str, sample_id: int, api_key: str
) -> str:
    filename = f"golden-sample-{sample_id}.txt"
    embeddings = OpenAIEmbeddings(api_key=api_key)
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=api_key)
    chunk = Document(
        page_content=document_text,
        metadata={
            "document_id": str(uuid4()),
            "chunk_id": str(uuid4()),
            "filename": filename,
            "source": filename,
            "page": 1,
            "page_number": 1,
        },
    )

    await add_documents_to_store([chunk], embeddings)
    get_hybrid_retriever([chunk], embeddings)
    retrieved_docs = await retrieve_documents(query, embeddings)
    response = await generate_answer(query, retrieved_docs, llm)
    return response.answer


async def evaluate() -> None:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("Set OPENAI_API_KEY to run evaluation.")

    api_key = settings.openai_api_key
    judge_chain = build_judge_chain(api_key)

    total_faithfulness = 0
    total_relevance = 0

    for index, item in enumerate(GOLDEN_DATASET, start=1):
        generated_answer = await run_rag_pipeline(
            query=item["query"],
            document_text=item["document_text"],
            sample_id=index,
            api_key=api_key,
        )

        judge_result = await judge_chain.ainvoke(
            {
                "query": item["query"],
                "expected_answer": item["expected_answer"],
                "document_text": item["document_text"],
                "generated_answer": generated_answer,
            }
        )
        if not isinstance(judge_result, JudgeScore):
            judge_result = JudgeScore.model_validate(judge_result)

        total_faithfulness += judge_result.Faithfulness
        total_relevance += judge_result.Answer_Relevance

        print(
            json.dumps(
                {
                    "sample": index,
                    "generated_answer": generated_answer,
                    "Faithfulness": judge_result.Faithfulness,
                    "Answer_Relevance": judge_result.Answer_Relevance,
                },
                ensure_ascii=True,
            )
        )

    count = len(GOLDEN_DATASET)
    avg_faithfulness = total_faithfulness / count
    avg_relevance = total_relevance / count
    overall_avg = (avg_faithfulness + avg_relevance) / 2

    print("\nFinal Average Scores")
    print(f"Faithfulness: {avg_faithfulness:.2f}/5")
    print(f"Answer_Relevance: {avg_relevance:.2f}/5")
    print(f"Overall: {overall_avg:.2f}/5")


if __name__ == "__main__":
    asyncio.run(evaluate())
