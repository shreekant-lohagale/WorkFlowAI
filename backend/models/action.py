"""Validated models for workplace action-item extraction."""

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class ActionSourceType(str, Enum):
    MEETING_NOTES = "Meeting Notes"
    EMAIL = "Email"
    PROJECT_UPDATE = "Project Update"
    CHAT_DISCUSSION = "Chat / Discussion"
    GENERAL_NOTES = "General Notes"


class ExtractionStyle(str, Enum):
    CONCISE = "Concise"
    STANDARD = "Standard"
    DETAILED = "Detailed"


class ActionExtractionRequest(BaseModel):
    """Unstructured workplace source content supplied for extraction."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    source_type: ActionSourceType
    content: str = Field(min_length=20, max_length=15000)
    extraction_style: ExtractionStyle = ExtractionStyle.STANDARD

    @field_validator("content", mode="before")
    @classmethod
    def reject_blank_content(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            raise ValueError("Source content must not be blank.")
        return value


ActionText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]


class ActionItem(BaseModel):
    """One source-grounded workplace responsibility."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    task: str = Field(min_length=1, max_length=1000)
    owner: str = Field(min_length=1, max_length=300)
    deadline: str = Field(min_length=1, max_length=300)
    priority: Literal["High", "Medium", "Low", "Not specified"]
    dependency: str = Field(min_length=1, max_length=1000)
    status: Literal["Open", "In Progress", "Blocked", "Completed", "Not specified"]
    evidence: str = Field(min_length=1, max_length=600)

    @field_validator("owner", "deadline", "dependency", mode="before")
    @classmethod
    def normalize_missing_values(cls, value: object) -> object:
        if isinstance(value, str) and value.strip().lower() in {
            "none",
            "n/a",
            "not provided",
            "none specified",
            "unknown",
        }:
            return "Not specified"
        return value


class ActionExtractionDraft(BaseModel):
    """Structured action extraction returned by the language model."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    summary: str = Field(min_length=1, max_length=1200)
    action_items: list[ActionItem] = Field(max_length=50)
    non_actionable_points: list[ActionText] = Field(max_length=50)
    ambiguities: list[ActionText] = Field(max_length=50)
    review_notes: list[ActionText] = Field(max_length=30)

    @field_validator("action_items", "non_actionable_points", "ambiguities", "review_notes", mode="before")
    @classmethod
    def normalize_empty_lists(cls, value: object) -> object:
        if value is None or (isinstance(value, str) and value.strip().lower() in {"", "none", "null"}):
            return []
        return value


class ActionExtractionResponse(BaseModel):
    """Safe API response for reviewable extracted actions."""

    success: Literal[True] = True
    result: ActionExtractionDraft
    review_required: Literal[True] = True
