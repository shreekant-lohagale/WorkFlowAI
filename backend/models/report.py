"""Validated models for source-grounded weekly report generation."""

from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator


class ReportSourceType(str, Enum):
    WEEKLY_ACTIVITY_LOG = "Weekly Activity Log"
    PROJECT_UPDATES = "Project Updates"
    TEAM_NOTES = "Team Notes"
    MIXED_WORKPLACE_NOTES = "Mixed Workplace Notes"


class ReportDetailLevel(str, Enum):
    CONCISE = "Concise"
    STANDARD = "Standard"
    DETAILED = "Detailed"


class WeeklyReportRequest(BaseModel):
    """User-supplied settings and source material for a weekly report."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    report_title: str | None = Field(default=None, max_length=200)
    reporting_period: str | None = Field(default=None, max_length=200)
    audience: str = Field(min_length=2, max_length=200)
    source_type: ReportSourceType
    detail_level: ReportDetailLevel = ReportDetailLevel.STANDARD
    source_content: str = Field(min_length=30, max_length=20000)

    @field_validator("report_title", "reporting_period", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("audience", "source_content", mode="before")
    @classmethod
    def reject_blank_required_text(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            raise ValueError("This field must not be blank.")
        return value


ReportText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=1600),
]


class ReportMetric(BaseModel):
    """One metric stated explicitly in the source material."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    label: str = Field(min_length=1, max_length=300)
    value: str = Field(min_length=1, max_length=300)


class ReportRisk(BaseModel):
    """One blocker or risk and only its source-supported attributes."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    item: str = Field(min_length=1, max_length=1000)
    impact: str = Field(min_length=1, max_length=1000)
    owner: str = Field(min_length=1, max_length=300)

    @field_validator("impact", "owner", mode="before")
    @classmethod
    def normalize_missing_values(cls, value: object) -> object:
        if isinstance(value, str) and value.strip().lower() in {
            "", "none", "n/a", "unknown", "not provided", "none specified",
        }:
            return "Not specified"
        return value


class WeeklyReportDraft(BaseModel):
    """Structured, reviewable weekly report returned by the language model."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    report_title: str = Field(min_length=1, max_length=200)
    reporting_period: str = Field(min_length=1, max_length=200)
    overall_status: Literal["On Track", "At Risk", "Blocked", "Not specified"]
    executive_overview: str = Field(min_length=1, max_length=3000)
    completed_work: list[ReportText] = Field(max_length=50)
    work_in_progress: list[ReportText] = Field(max_length=50)
    blockers_and_risks: list[ReportRisk] = Field(max_length=30)
    metrics: list[ReportMetric] = Field(max_length=30)
    decisions_and_updates: list[ReportText] = Field(max_length=50)
    next_period_plan: list[ReportText] = Field(max_length=50)
    missing_information: list[ReportText] = Field(max_length=50)
    review_notes: list[ReportText] = Field(max_length=30)

    @field_validator(
        "completed_work",
        "work_in_progress",
        "blockers_and_risks",
        "metrics",
        "decisions_and_updates",
        "next_period_plan",
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


class WeeklyReportResponse(BaseModel):
    """Safe API response for a generated weekly report."""

    success: Literal[True] = True
    report: WeeklyReportDraft
    review_required: Literal[True] = True
