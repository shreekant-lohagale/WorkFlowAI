"""Validated models for the Meeting Summarizer workflow."""

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from backend.models.knowledge import KnowledgeSource


class SummaryStyle(str, Enum):
    """Supported meeting-summary detail levels."""

    CONCISE = "Concise"
    STANDARD = "Standard"
    DETAILED = "Detailed"


class MeetingSummaryRequest(BaseModel):
    """User-supplied meeting source material."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    meeting_title: str | None = Field(default=None, max_length=200)
    meeting_context: str | None = Field(default=None, max_length=1000)
    participants: str | None = Field(default=None, max_length=1000)
    meeting_content: str = Field(min_length=30, max_length=20000)
    summary_style: SummaryStyle = SummaryStyle.STANDARD
    knowledge_grounding: bool = False

    @field_validator("meeting_content", mode="before")
    @classmethod
    def reject_blank_content(cls, value: object) -> object:
        """Reject meeting content containing only whitespace."""
        if isinstance(value, str) and not value.strip():
            raise ValueError("Meeting content must not be blank.")
        return value

    @field_validator("meeting_title", "meeting_context", "participants", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        """Treat optional whitespace-only metadata as absent."""
        if isinstance(value, str) and not value.strip():
            return None
        return value


SummaryItem = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1200)]


class MeetingDecision(BaseModel):
    """A decision explicitly confirmed by the meeting source."""

    model_config = ConfigDict(extra="forbid")

    decision: str = Field(min_length=1, max_length=1200)
    evidence: str = Field(min_length=1, max_length=1200)


class MeetingActionItem(BaseModel):
    """A source-grounded meeting action with explicit missing-value markers."""

    model_config = ConfigDict(extra="forbid")

    task: str = Field(min_length=1, max_length=1200)
    owner: str = Field(min_length=1, max_length=300)
    deadline: str = Field(min_length=1, max_length=300)
    status: Literal["Open", "In Progress", "Completed", "Blocked", "Not specified"]


class MeetingSummaryDraft(BaseModel):
    """Structured meeting intelligence returned by the language model."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    meeting_overview: str = Field(min_length=1, max_length=5000)
    key_discussion_points: list[SummaryItem] = Field(max_length=50)
    confirmed_decisions: list[MeetingDecision] = Field(max_length=30)
    action_items: list[MeetingActionItem] = Field(max_length=50)
    risks_and_blockers: list[SummaryItem] = Field(max_length=30)
    open_questions: list[SummaryItem] = Field(max_length=30)
    ambiguities: list[SummaryItem] = Field(max_length=30)
    review_notes: list[SummaryItem] = Field(max_length=30)

    @field_validator("meeting_overview")
    @classmethod
    def reject_blank_overview(cls, value: str) -> str:
        """Ensure the overview contains meaningful text."""
        if not value.strip():
            raise ValueError("Meeting overview must not be blank.")
        return value.strip()


class MeetingPolicyAlert(BaseModel):
    """A policy consideration linked to retrieved evidence."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    message: str = Field(min_length=1, max_length=2000)
    severity: Literal["info", "warning", "critical"]
    sources: list[str] = Field(max_length=8)


class MeetingKnowledgeFinding(BaseModel):
    """Related knowledge or a cautious potential conflict."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    message: str = Field(min_length=1, max_length=2000)
    sources: list[str] = Field(max_length=8)


class MeetingContextAnalysis(BaseModel):
    """Structured output produced by the organizational context analyst."""

    model_config = ConfigDict(extra="forbid")

    policy_alerts: list[MeetingPolicyAlert] = Field(default_factory=list, max_length=20)
    related_knowledge: list[MeetingKnowledgeFinding] = Field(default_factory=list, max_length=20)
    potential_conflicts: list[MeetingKnowledgeFinding] = Field(default_factory=list, max_length=20)
    knowledge_notes: list[SummaryItem] = Field(default_factory=list, max_length=20)
    sources_used: list[str] = Field(default_factory=list, max_length=8)

    @field_validator(
        "policy_alerts",
        "related_knowledge",
        "potential_conflicts",
        "knowledge_notes",
        "sources_used",
        mode="before",
    )
    @classmethod
    def normalize_empty_context_lists(cls, value: object) -> object:
        if value is None or (isinstance(value, str) and value.strip().lower() in {"", "none", "null"}):
            return []
        return value


class MeetingKnowledgeMetadata(BaseModel):
    """Organizational context kept separate from transcript facts."""

    requested: bool = False
    grounded: bool = False
    status: Literal["not_requested", "grounded", "no_relevant_context"] = "not_requested"
    message: str | None = None
    policy_alerts: list[MeetingPolicyAlert] = Field(default_factory=list)
    related_knowledge: list[MeetingKnowledgeFinding] = Field(default_factory=list)
    potential_conflicts: list[MeetingKnowledgeFinding] = Field(default_factory=list)
    knowledge_notes: list[SummaryItem] = Field(default_factory=list)
    sources: list[KnowledgeSource] = Field(default_factory=list)


class MeetingSummaryResponse(BaseModel):
    """Safe API response for a generated meeting summary."""

    success: Literal[True] = True
    summary: MeetingSummaryDraft
    knowledge: MeetingKnowledgeMetadata = Field(default_factory=MeetingKnowledgeMetadata)
    review_required: Literal[True] = True
