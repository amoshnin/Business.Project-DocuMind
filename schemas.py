from uuid import UUID

from pydantic import BaseModel


class DocumentMetadata(BaseModel):
    document_id: UUID
    filename: str
    page_number: int


class ChatRequest(BaseModel):
    session_id: UUID
    query: str


class Citation(BaseModel):
    source_text: str
    metadata: DocumentMetadata


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
