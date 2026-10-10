"""Validated models for measured productivity benchmarks."""

from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator


class AnalyticsWorkflow(str, Enum):
    EMAIL_ASSISTANT = "Email Assistant"
    MEETING_SUMMARIZER = "Meeting Summarizer"
    ACTION_ITEM_EXTRACTOR = "Action Item Extractor"
    WEEKLY_REPORT_GENERATOR = "Weekly Report Generator"
    EXECUTIVE_SUMMARY_GENERATOR = "Executive Summary Generator"


class AnalyticsRecordCreate(BaseModel):
    """Raw measurements supplied for one comparable benchmark run."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    workflow: AnalyticsWorkflow
    sample_name: str = Field(min_length=2, max_length=200)
    manual_time_minutes: float = Field(gt=0, allow_inf_nan=False)
    ai_time_minutes: float = Field(gt=0, allow_inf_nan=False)
    quality_score: float = Field(ge=0, le=100, allow_inf_nan=False)
    corrections: int = Field(ge=0)
    approved: StrictBool
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("sample_name", mode="before")
    @classmethod
    def reject_blank_sample_name(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            raise ValueError("Sample name must not be blank.")
        return value

    @field_validator("manual_time_minutes", "ai_time_minutes", "quality_score", mode="before")
    @classmethod
    def reject_boolean_numbers(cls, value: object) -> object:
        if isinstance(value, bool):
            raise ValueError("A numeric measurement is required.")
        return value

    @field_validator("corrections", mode="before")
    @classmethod
    def reject_boolean_corrections(cls, value: object) -> object:
        if isinstance(value, bool):
            raise ValueError("Corrections must be an integer.")
        return value

    @field_validator("notes", mode="before")
    @classmethod
    def normalize_optional_notes(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value


class AnalyticsRecord(AnalyticsRecordCreate):
    """Stored measurements with deterministic derived productivity metrics."""

    record_id: str
    measured_at: datetime
    time_saved_minutes: float
    time_reduction_percent: float
    speedup: float


class AnalyticsRecordsResponse(BaseModel):
    records: list[AnalyticsRecord]


class AnalyticsRecordResponse(BaseModel):
    success: Literal[True] = True
    record: AnalyticsRecord


class AnalyticsDeleteResponse(BaseModel):
    success: Literal[True] = True


class WorkflowAnalytics(BaseModel):
    workflow: AnalyticsWorkflow
    tests: int
    manual_minutes: float
    ai_minutes: float
    time_saved_minutes: float
    time_reduction_percent: float
    average_quality_score: float
    approval_rate_percent: float
    average_corrections: float


class AnalyticsSummaryResponse(BaseModel):
    total_tests: int
    total_manual_minutes: float
    total_ai_minutes: float
    total_time_saved_minutes: float
    average_time_reduction_percent: float | None
    average_quality_score: float | None
    approval_rate_percent: float | None
    total_corrections: int
    average_corrections: float | None
    best_workflow: AnalyticsWorkflow | None
    workflow_breakdown: list[WorkflowAnalytics]
    message: str | None = None
