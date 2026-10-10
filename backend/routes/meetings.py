"""Meeting summarization API routes."""

import json
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from backend.models.meeting import (
    MeetingKnowledgeMetadata,
    MeetingSummaryDraft,
    MeetingSummaryRequest,
    MeetingSummaryResponse,
)
from backend.prompts.meeting_prompt import MEETING_SYSTEM_PROMPT, build_meeting_prompt
from backend.services.llm_service import LLMServiceError, generate_response
from backend.services.meeting_context_service import (
    MeetingContextResponseError,
    analyze_meeting_context,
    retrieve_meeting_knowledge,
)
from backend.services.vector_service import knowledge_counts


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.post("/summarize", response_model=MeetingSummaryResponse)
def summarize_meeting(request: MeetingSummaryRequest) -> MeetingSummaryResponse:
    """Create a source-grounded, structured meeting summary draft."""
    logger.info("Meeting summarization requested")

    if request.knowledge_grounding:
        try:
            document_count, _ = knowledge_counts()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Company Knowledge is temporarily unavailable. Please try again.",
            ) from None
        if document_count == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Company Knowledge is empty. Upload organizational policies, SOPs or project documents "
                    "before enabling knowledge-aware meeting analysis."
                ),
            )

    try:
        raw_response = generate_response(
            user_prompt=build_meeting_prompt(request),
            system_prompt=MEETING_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=2400,
        )
        summary = MeetingSummaryDraft.model_validate(json.loads(raw_response))
    except (json.JSONDecodeError, ValidationError, TypeError):
        logger.warning("Meeting summarization failed: invalid structured response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned an invalid meeting summary. Please try again.",
        ) from None
    except LLMServiceError:
        logger.warning("Meeting summarization failed: AI service unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't summarize the meeting. Please try again.",
        ) from None
    except Exception:
        logger.error("Meeting summarization failed unexpectedly")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't summarize the meeting. Please try again.",
        ) from None

    knowledge = MeetingKnowledgeMetadata()
    if request.knowledge_grounding:
        logger.info("Knowledge-aware meeting analysis requested")
        try:
            sources = retrieve_meeting_knowledge(request.meeting_title, request.meeting_context, summary)
            logger.info("Meeting knowledge retrieval completed")
            if sources:
                analysis = analyze_meeting_context(summary, sources)
                used_ids = {
                    source_id
                    for item in [
                        *analysis.policy_alerts,
                        *analysis.related_knowledge,
                        *analysis.potential_conflicts,
                    ]
                    for source_id in item.sources
                }
                used_sources = [source for source in sources if source.source_id in used_ids]
                knowledge = MeetingKnowledgeMetadata(
                    requested=True,
                    grounded=bool(used_sources),
                    status="grounded" if used_sources else "no_relevant_context",
                    message=None if used_sources else "No relevant organizational context was used.",
                    policy_alerts=analysis.policy_alerts,
                    related_knowledge=analysis.related_knowledge,
                    potential_conflicts=analysis.potential_conflicts,
                    knowledge_notes=analysis.knowledge_notes,
                    sources=used_sources,
                )
            else:
                knowledge = MeetingKnowledgeMetadata(
                    requested=True,
                    grounded=False,
                    status="no_relevant_context",
                    message="No relevant organizational context found. The meeting summary remains based only on the supplied transcript.",
                )
        except MeetingContextResponseError:
            logger.warning("Knowledge-aware meeting analysis failed: invalid structured response")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI returned invalid organizational context. Please try again.",
            ) from None
        except LLMServiceError:
            logger.warning("Knowledge-aware meeting analysis failed: AI service unavailable")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Organizational context analysis is temporarily unavailable. Please try again.",
            ) from None
        except Exception:
            logger.exception("Knowledge-aware meeting analysis failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Organizational context could not be analyzed. Please try again.",
            ) from None

    logger.info("Meeting summarization succeeded")
    return MeetingSummaryResponse(summary=summary, knowledge=knowledge)
