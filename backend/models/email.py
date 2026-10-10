"""Validated request and response models for the Email Assistant."""

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from backend.models.knowledge import KnowledgeSource


class EmailTone(str, Enum):
    """Supported workplace email tones."""

    PROFESSIONAL = "Professional"
    CONCISE = "Concise"
    FRIENDLY_PROFESSIONAL = "Friendly Professional"
    FORMAL = "Formal"


class EmailGenerationRequest(BaseModel):
    """Input supplied by a user to generate an email draft."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    purpose: str = Field(min_length=3, max_length=300)
    recipient_context: str = Field(min_length=2, max_length=200)
    tone: EmailTone
    key_points: str = Field(min_length=10, max_length=6000)
    additional_context: str | None = Field(default=None, max_length=2000)
    knowledge_grounding: bool = False

    @field_validator("purpose", "recipient_context", "key_points", mode="before")
    @classmethod
    def reject_blank_required_fields(cls, value: object) -> object:
        """Reject required string fields containing only whitespace."""
        if isinstance(value, str) and not value.strip():
            raise ValueError("Field must not be blank.")
        return value

    @field_validator("additional_context", mode="before")
    @classmethod
    def normalize_optional_context(cls, value: object) -> object:
        """Treat blank optional context as absent."""
        if isinstance(value, str) and not value.strip():
            return None
        return value


DraftItem = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class EmailDraft(BaseModel):
    """Structured email draft returned by the language model."""

    model_config = ConfigDict(extra="forbid")

    subject: str = Field(min_length=1, max_length=300)
    body: str = Field(min_length=1, max_length=12000)
    missing_information: list[DraftItem] = Field(max_length=20)
    review_notes: list[DraftItem] = Field(max_length=20)
    knowledge_alerts: list[DraftItem] = Field(default_factory=list, max_length=20)
    sources_used: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("missing_information", "review_notes", "knowledge_alerts", mode="before")
    @classmethod
    def normalize_empty_lists(cls, value: object) -> object:
        """Normalize common empty markers while preserving strict list validation."""
        if value is None or (isinstance(value, str) and value.strip().lower() in {"", "none", "null"}):
            return []
        return value

    @field_validator("subject", "body")
    @classmethod
    def strip_draft_text(cls, value: str) -> str:
        """Normalize surrounding whitespace without altering draft content."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("Draft text must not be blank.")
        return stripped


class EmailGenerationResponse(BaseModel):
    """Safe API response for a generated email draft."""

    success: Literal[True] = True
    draft: EmailDraft
    knowledge: "EmailKnowledgeMetadata" = Field(default_factory=lambda: EmailKnowledgeMetadata())
    review_required: Literal[True] = True


class EmailKnowledgeMetadata(BaseModel):
    """Safe grounding state and source evidence returned with an email draft."""

    requested: bool = False
    grounded: bool = False
    status: Literal["not_requested", "grounded", "no_relevant_context"] = "not_requested"
    message: str | None = None
    sources: list[KnowledgeSource] = Field(default_factory=list)


EmailGenerationResponse.model_rebuild()
