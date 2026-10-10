"""Action Item Extractor API routes."""

import json
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from backend.models.action import (
    ActionExtractionDraft,
    ActionExtractionRequest,
    ActionExtractionResponse,
)
from backend.prompts.action_prompt import ACTION_SYSTEM_PROMPT, build_action_prompt
from backend.services.llm_service import LLMServiceError, generate_response


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/actions", tags=["actions"])


@router.post("/extract", response_model=ActionExtractionResponse)
def extract_actions(request: ActionExtractionRequest) -> ActionExtractionResponse:
    """Extract source-grounded, reviewable workplace action items."""
    logger.info("Action extraction requested")
    try:
        raw_response = generate_response(
            user_prompt=build_action_prompt(request),
            system_prompt=ACTION_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=2200,
        )
        result = ActionExtractionDraft.model_validate(json.loads(raw_response))
    except (json.JSONDecodeError, ValidationError, TypeError):
        logger.warning("Action extraction failed: invalid structured response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned invalid action items. Please try again.",
        ) from None
    except LLMServiceError:
        logger.warning("Action extraction failed: AI service unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't extract action items. Please try again.",
        ) from None
    except Exception:
        logger.error("Action extraction failed unexpectedly")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't extract action items. Please try again.",
        ) from None

    logger.info("Action extraction succeeded")
    return ActionExtractionResponse(result=result)
