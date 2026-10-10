"""Productivity Analytics API routes."""

import logging

from fastapi import APIRouter, HTTPException, status

from backend.models.analytics import (
    AnalyticsDeleteResponse,
    AnalyticsRecordCreate,
    AnalyticsRecordResponse,
    AnalyticsRecordsResponse,
    AnalyticsSummaryResponse,
)
from backend.services.analytics_service import (
    AnalyticsStorageError,
    calculate_summary,
    delete_record,
    load_records,
    save_record,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/records", response_model=AnalyticsRecordsResponse)
def get_records() -> AnalyticsRecordsResponse:
    """Return benchmark history with derived metrics."""
    try:
        return AnalyticsRecordsResponse(records=load_records())
    except AnalyticsStorageError:
        logger.warning("Productivity records could not be loaded")
        raise HTTPException(status_code=500, detail="Productivity records are temporarily unavailable.") from None


@router.post("/records", response_model=AnalyticsRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(payload: AnalyticsRecordCreate) -> AnalyticsRecordResponse:
    """Store one metric-only manual-versus-AI benchmark."""
    try:
        response = AnalyticsRecordResponse(record=save_record(payload))
        logger.info("Productivity benchmark saved")
        return response
    except AnalyticsStorageError:
        logger.warning("Productivity record could not be saved")
        raise HTTPException(status_code=500, detail="The benchmark could not be saved. Please try again.") from None


@router.delete("/records/{record_id}", response_model=AnalyticsDeleteResponse)
def remove_record(record_id: str) -> AnalyticsDeleteResponse:
    """Delete one benchmark record without exposing bulk deletion."""
    try:
        if not delete_record(record_id):
            raise HTTPException(status_code=404, detail="Benchmark record not found.")
        logger.info("Productivity benchmark deleted")
        return AnalyticsDeleteResponse()
    except HTTPException:
        raise
    except AnalyticsStorageError:
        logger.warning("Productivity record could not be deleted")
        raise HTTPException(status_code=500, detail="The benchmark could not be deleted. Please try again.") from None


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_summary() -> AnalyticsSummaryResponse:
    """Return deterministic aggregate productivity measurements."""
    try:
        return calculate_summary()
    except AnalyticsStorageError:
        logger.warning("Productivity summary could not be calculated")
        raise HTTPException(status_code=500, detail="Productivity analytics are temporarily unavailable.") from None
