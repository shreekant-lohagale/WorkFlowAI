"""Executive Summary Generator API routes."""

import json
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from backend.models.executive import (
    ExecutiveSummaryDraft,
    ExecutiveSummaryRequest,
    ExecutiveSummaryResponse,
)
from backend.prompts.executive_prompt import EXECUTIVE_SYSTEM_PROMPT, build_executive_prompt
from backend.services.llm_service import LLMServiceError, generate_response


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/executive", tags=["executive"])


@router.post("/summarize", response_model=ExecutiveSummaryResponse)
def summarize_for_executives(request: ExecutiveSummaryRequest) -> ExecutiveSummaryResponse:
    """Compress supplied workplace information into a reviewable executive brief."""
    logger.info("Executive summary generation requested")
    try:
        raw_response = generate_response(
            user_prompt=build_executive_prompt(request),
            system_prompt=EXECUTIVE_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=2800,
        )
        summary = ExecutiveSummaryDraft.model_validate(json.loads(raw_response))
    except (json.JSONDecodeError, ValidationError, TypeError):
        logger.warning("Executive summary generation failed: invalid structured response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned an invalid executive summary. Please try again.",
        ) from None
    except LLMServiceError:
        logger.warning("Executive summary generation failed: AI service unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't generate the executive summary. Please try again.",
        ) from None
    except Exception:
        logger.error("Executive summary generation failed unexpectedly")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't generate the executive summary. Please try again.",
        ) from None

    summary.summary_title = request.summary_title or "Executive Project Brief"
    logger.info("Executive summary generation succeeded")
    return ExecutiveSummaryResponse(summary=summary)
