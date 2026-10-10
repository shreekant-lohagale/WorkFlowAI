"""Validated request and response models for Company Knowledge."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class _QueryBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    top_k: int = Field(default=4, ge=1, le=8)

    @field_validator("top_k", mode="before")
    @classmethod
    def reject_boolean_top_k(cls, value: object) -> object:
        if isinstance(value, bool):
            raise ValueError("top_k must be an integer.")
        return value


class KnowledgeSearchRequest(_QueryBase):
    query: str = Field(min_length=3, max_length=1000)


class KnowledgeAskRequest(_QueryBase):
    question: str = Field(min_length=3, max_length=1000)


class KnowledgeDocument(BaseModel):
    document_id: str
    filename: str
    file_type: str
    chunks: int
    uploaded_at: str


class UploadDocument(BaseModel):
    document_id: str
    filename: str
    file_type: str
    chunks_indexed: int


class UploadResponse(BaseModel):
    success: Literal[True] = True
    document: UploadDocument


class KnowledgeStatusResponse(BaseModel):
    status: Literal["ready"] = "ready"
    document_count: int
    chunk_count: int
    embedding_model: str


class DocumentsResponse(BaseModel):
    documents: list[KnowledgeDocument]


class DeleteResponse(BaseModel):
    success: Literal[True] = True


class KnowledgeSource(BaseModel):
    source_id: str
    document_id: str
    filename: str
    page: int | None = None
    chunk_index: int
    content: str
    similarity: float


class SearchResponse(BaseModel):
    results: list[KnowledgeSource]


class RagModelOutput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    answer: str = Field(min_length=1, max_length=10000)
    sources_used: list[str] = Field(max_length=8)
    insufficient_context: bool
    review_notes: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("review_notes", mode="before")
    @classmethod
    def normalize_empty_review_notes(cls, value: object) -> object:
        """Accept common empty markers while keeping non-empty data strict."""
        if value is None or (isinstance(value, str) and value.strip().lower() in {"", "none", "null"}):
            return []
        return value


class AskResponse(BaseModel):
    success: Literal[True] = True
    grounded: bool
    answer: str
    sources: list[KnowledgeSource]
    insufficient_context: bool
    review_required: Literal[True] = True
    review_notes: list[str] = Field(default_factory=list)
