"""Validated models for source-grounded executive summaries."""

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class ExecutiveFocus(str, Enum):
    BALANCED = "Balanced"
    RISKS_BLOCKERS = "Risks & Blockers"
    PROGRESS_DELIVERY = "Progress & Delivery"
    DECISIONS_REQUIRED = "Decisions Required"
    CLIENT_IMPACT = "Client Impact"


class ExecutiveDetailLevel(str, Enum):
    BRIEF = "Brief"
    CONCISE = "Concise"
    DETAILED = "Detailed"


class ExecutiveSummaryRequest(BaseModel):
    """Source material and presentation settings for an executive brief."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    summary_title: str | None = Field(default=None, max_length=200)
    audience: str = Field(min_length=2, max_length=200)
    focus: ExecutiveFocus
    detail_level: ExecutiveDetailLevel = ExecutiveDetailLevel.CONCISE
    source_content: str = Field(min_length=50, max_length=25000)

    @field_validator("summary_title", mode="before")
    @classmethod
    def normalize_optional_title(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("audience", "source_content", mode="before")
    @classmethod
    def reject_blank_required_text(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            raise ValueError("This field must not be blank.")
        return value


ExecutiveText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=1600),
]


class ExecutiveMetric(BaseModel):
    """One explicit metric retained from the supplied source."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    label: str = Field(min_length=1, max_length=300)
    value: str = Field(min_length=1, max_length=300)


class ExecutiveRisk(BaseModel):
    """One source-supported risk with conservative severity."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    risk: str = Field(min_length=1, max_length=1200)
    impact: str = Field(min_length=1, max_length=1200)
    severity: Literal["Low", "Medium", "High", "Critical", "Not specified"]

    @field_validator("impact", mode="before")
    @classmethod
    def normalize_missing_impact(cls, value: object) -> object:
        if isinstance(value, str) and value.strip().lower() in {
            "", "none", "n/a", "unknown", "not provided", "none specified",
        }:
            return "Not specified"
        return value


class ExecutiveSummaryDraft(BaseModel):
    """Structured management brief returned by the language model."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    summary_title: str = Field(min_length=1, max_length=200)
    overall_status: Literal["On Track", "At Risk", "Blocked", "Not specified"]
    executive_summary: str = Field(min_length=1, max_length=3500)
    key_progress: list[ExecutiveText] = Field(max_length=40)
    key_risks: list[ExecutiveRisk] = Field(max_length=30)
    important_metrics: list[ExecutiveMetric] = Field(max_length=30)
    decisions_required: list[ExecutiveText] = Field(min_length=1, max_length=30)
    immediate_priorities: list[ExecutiveText] = Field(max_length=30)
    client_or_business_impact: list[ExecutiveText] = Field(min_length=1, max_length=30)
    missing_information: list[ExecutiveText] = Field(max_length=40)
    review_notes: list[ExecutiveText] = Field(max_length=30)

    @field_validator(
        "key_progress",
        "key_risks",
        "important_metrics",
        "immediate_priorities",
        "missing_information",
        "review_notes",
        mode="before",
    )
    @classmethod
    def normalize_empty_lists(cls, value: object) -> object:
        if value is None or (
            isinstance(value, str) and value.strip().lower() in {"", "none", "null"}
        ):
            return []
        return value


class ExecutiveSummaryResponse(BaseModel):
    """Safe API response for a reviewable executive summary."""

    success: Literal[True] = True
    summary: ExecutiveSummaryDraft
    review_required: Literal[True] = True
