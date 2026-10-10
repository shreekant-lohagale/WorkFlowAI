"""CSV persistence and deterministic productivity calculations."""

import csv
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

from backend.config import settings
from backend.models.analytics import (
    AnalyticsRecord,
    AnalyticsRecordCreate,
    AnalyticsSummaryResponse,
    AnalyticsWorkflow,
    WorkflowAnalytics,
)


DATA_PATH = settings.productivity_csv_path
CSV_FIELDS = [
    "record_id",
    "workflow",
    "sample_name",
    "manual_time_minutes",
    "ai_time_minutes",
    "quality_score",
    "corrections",
    "approved",
    "measured_at",
    "notes",
]
_FILE_LOCK = RLock()


class AnalyticsStorageError(RuntimeError):
    """Raised when benchmark records cannot be read or written safely."""


def _round(value: float) -> float:
    return round(value, 2)


def _with_derived(raw: dict[str, object]) -> AnalyticsRecord:
    manual = float(raw["manual_time_minutes"])
    assisted = float(raw["ai_time_minutes"])
    saved = manual - assisted
    return AnalyticsRecord(
        **raw,
        time_saved_minutes=_round(saved),
        time_reduction_percent=_round((saved / manual) * 100),
        speedup=_round(manual / assisted),
    )


def initialize_analytics_storage() -> None:
    """Create the configured CSV and header without overwriting existing data."""
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DATA_PATH.exists() and DATA_PATH.stat().st_size > 0:
        return
    with DATA_PATH.open("w", encoding="utf-8", newline="") as handle:
        csv.DictWriter(handle, fieldnames=CSV_FIELDS).writeheader()


def _serialize(record: AnalyticsRecord) -> dict[str, object]:
    return {
        "record_id": record.record_id,
        "workflow": record.workflow.value,
        "sample_name": record.sample_name,
        "manual_time_minutes": record.manual_time_minutes,
        "ai_time_minutes": record.ai_time_minutes,
        "quality_score": record.quality_score,
        "corrections": record.corrections,
        "approved": str(record.approved).lower(),
        "measured_at": record.measured_at.isoformat(),
        "notes": record.notes or "",
    }


def _write_records(records: list[AnalyticsRecord]) -> None:
    temporary_path = DATA_PATH.with_suffix(".tmp")
    try:
        with temporary_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
            writer.writeheader()
            writer.writerows(_serialize(record) for record in records)
        temporary_path.replace(DATA_PATH)
    except OSError as error:
        temporary_path.unlink(missing_ok=True)
        raise AnalyticsStorageError("Productivity records could not be saved.") from error


def load_records() -> list[AnalyticsRecord]:
    """Load benchmark records and derive calculated values."""
    with _FILE_LOCK:
        try:
            initialize_analytics_storage()
            with DATA_PATH.open("r", encoding="utf-8", newline="") as handle:
                rows = list(csv.DictReader(handle))
            records = [
                _with_derived({
                    "record_id": row["record_id"],
                    "workflow": row["workflow"],
                    "sample_name": row["sample_name"],
                    "manual_time_minutes": float(row["manual_time_minutes"]),
                    "ai_time_minutes": float(row["ai_time_minutes"]),
                    "quality_score": float(row["quality_score"]),
                    "corrections": int(row["corrections"]),
                    "approved": row["approved"].strip().lower() == "true",
                    "measured_at": datetime.fromisoformat(row["measured_at"]),
                    "notes": row["notes"] or None,
                })
                for row in rows
            ]
        except (OSError, KeyError, TypeError, ValueError) as error:
            raise AnalyticsStorageError("Productivity records could not be loaded.") from error
    return sorted(records, key=lambda record: record.measured_at, reverse=True)


def save_record(payload: AnalyticsRecordCreate) -> AnalyticsRecord:
    """Persist a new raw benchmark and return its derived metrics."""
    record = _with_derived({
        **payload.model_dump(),
        "record_id": str(uuid4()),
        "measured_at": datetime.now(timezone.utc),
    })
    with _FILE_LOCK:
        records = load_records()
        _write_records([*records, record])
    return record


def delete_record(record_id: str) -> bool:
    """Delete one benchmark by generated identifier."""
    with _FILE_LOCK:
        records = load_records()
        remaining = [record for record in records if record.record_id != record_id]
        if len(remaining) == len(records):
            return False
        _write_records(remaining)
    return True


def _workflow_summary(workflow: AnalyticsWorkflow, records: list[AnalyticsRecord]) -> WorkflowAnalytics:
    tests = len(records)
    manual = sum(record.manual_time_minutes for record in records)
    assisted = sum(record.ai_time_minutes for record in records)
    saved = manual - assisted
    return WorkflowAnalytics(
        workflow=workflow,
        tests=tests,
        manual_minutes=_round(manual),
        ai_minutes=_round(assisted),
        time_saved_minutes=_round(saved),
        time_reduction_percent=_round((saved / manual) * 100),
        average_quality_score=_round(sum(record.quality_score for record in records) / tests),
        approval_rate_percent=_round((sum(record.approved for record in records) / tests) * 100),
        average_corrections=_round(sum(record.corrections for record in records) / tests),
    )


def calculate_summary(records: list[AnalyticsRecord] | None = None) -> AnalyticsSummaryResponse:
    """Calculate aggregate and workflow metrics from raw measurements."""
    records = load_records() if records is None else records
    if not records:
        return AnalyticsSummaryResponse(
            total_tests=0,
            total_manual_minutes=0,
            total_ai_minutes=0,
            total_time_saved_minutes=0,
            average_time_reduction_percent=None,
            average_quality_score=None,
            approval_rate_percent=None,
            total_corrections=0,
            average_corrections=None,
            best_workflow=None,
            workflow_breakdown=[],
            message="No benchmark data recorded yet.",
        )

    total_tests = len(records)
    total_manual = sum(record.manual_time_minutes for record in records)
    total_assisted = sum(record.ai_time_minutes for record in records)
    total_saved = total_manual - total_assisted
    breakdown = [
        _workflow_summary(workflow, [record for record in records if record.workflow == workflow])
        for workflow in AnalyticsWorkflow
        if any(record.workflow == workflow for record in records)
    ]
    best = max(breakdown, key=lambda item: item.time_reduction_percent)
    return AnalyticsSummaryResponse(
        total_tests=total_tests,
        total_manual_minutes=_round(total_manual),
        total_ai_minutes=_round(total_assisted),
        total_time_saved_minutes=_round(total_saved),
        average_time_reduction_percent=_round((total_saved / total_manual) * 100),
        average_quality_score=_round(sum(record.quality_score for record in records) / total_tests),
        approval_rate_percent=_round((sum(record.approved for record in records) / total_tests) * 100),
        total_corrections=sum(record.corrections for record in records),
        average_corrections=_round(sum(record.corrections for record in records) / total_tests),
        best_workflow=best.workflow,
        workflow_breakdown=breakdown,
    )
