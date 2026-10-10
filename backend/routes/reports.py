"""Weekly Report Generator API routes."""

import json
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from backend.models.report import (
    WeeklyReportDraft,
    WeeklyReportRequest,
    WeeklyReportResponse,
)
from backend.prompts.report_prompt import REPORT_SYSTEM_PROMPT, build_report_prompt
from backend.services.llm_service import LLMServiceError, generate_response


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=WeeklyReportResponse)
def generate_weekly_report(request: WeeklyReportRequest) -> WeeklyReportResponse:
    """Generate a source-grounded weekly report for human review."""
    logger.info("Weekly report generation requested")
    try:
        raw_response = generate_response(
            user_prompt=build_report_prompt(request),
            system_prompt=REPORT_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=3000,
        )
        result = WeeklyReportDraft.model_validate(json.loads(raw_response))
    except (json.JSONDecodeError, ValidationError, TypeError):
        logger.warning("Weekly report generation failed: invalid structured response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned an invalid weekly report. Please try again.",
        ) from None
    except LLMServiceError:
        logger.warning("Weekly report generation failed: AI service unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't generate the weekly report. Please try again.",
        ) from None
    except Exception:
        logger.error("Weekly report generation failed unexpectedly")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't generate the weekly report. Please try again.",
        ) from None

    # Metadata comes from trusted request fields, never from source instructions.
    result.report_title = request.report_title or "Weekly Project Status"
    result.reporting_period = request.reporting_period or "Not specified"

    logger.info("Weekly report generation succeeded")
    return WeeklyReportResponse(report=result)
