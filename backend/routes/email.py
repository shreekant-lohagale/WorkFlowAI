"""Email drafting API routes."""

import json
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import ValidationError

from backend.models.email import (
    EmailDraft,
    EmailGenerationRequest,
    EmailGenerationResponse,
    EmailKnowledgeMetadata,
)
from backend.models.knowledge import KnowledgeSource
from backend.prompts.email_prompt import (
    EMAIL_SYSTEM_PROMPT,
    GROUNDED_EMAIL_SYSTEM_PROMPT,
    build_email_prompt,
    build_email_retrieval_query,
    build_grounded_email_prompt,
)
from backend.services.llm_service import LLMServiceError, generate_response
from backend.services.rag_service import search_knowledge
from backend.services.vector_service import knowledge_counts


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email", tags=["email"])
KNOWLEDGE_TOP_K = 4
MIN_RETRIEVAL_SIMILARITY = 0.35


def _surface_deterministic_policy_conflicts(
    request: EmailGenerationRequest,
    draft: EmailDraft,
    sources: list[KnowledgeSource],
) -> None:
    """Ensure known approval conflicts are explicit and evidence-backed."""
    user_text = " ".join(
        filter(None, [request.purpose, request.recipient_context, request.key_points, request.additional_context])
    ).lower()
    discusses_release = "release" in user_text or "delivery date" in user_text
    approval_established = any(
        phrase in user_text
        for phrase in (
            "approved by the project manager",
            "project manager approved",
            "project-manager approved",
        )
    )
    policy_sources = [
        source
        for source in sources
        if ("release date" in source.content.lower() or "delivery date" in source.content.lower())
        and ("approved" in source.content.lower() or "approval" in source.content.lower())
    ]
    if not discusses_release or approval_established or not policy_sources:
        return

    alert = (
        "Company policy requires project-manager approval before externally communicating a release date. "
        "The supplied request does not establish that the proposed release date has received this approval."
    )
    if not any("supplied request does not establish" in item.lower() for item in draft.knowledge_alerts):
        draft.knowledge_alerts.append(alert)
    for source in policy_sources:
        if source.source_id not in draft.sources_used:
            draft.sources_used.append(source.source_id)


@router.post("/generate", response_model=EmailGenerationResponse)
def generate_email(request: EmailGenerationRequest) -> EmailGenerationResponse:
    """Generate a structured, reviewable workplace email draft."""
    logger.info("Email draft generation requested")

    knowledge = EmailKnowledgeMetadata()
    sources = []
    if request.knowledge_grounding:
        logger.info("Grounded email generation requested")
        try:
            document_count, _ = knowledge_counts()
            if document_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Company Knowledge is empty. Upload company policies, SOPs or project documentation before using knowledge-grounded generation.",
                )
            retrieved = search_knowledge(build_email_retrieval_query(request), KNOWLEDGE_TOP_K)
            sources = [source for source in retrieved if source.similarity >= MIN_RETRIEVAL_SIMILARITY]
            logger.info("Knowledge retrieval completed")
            if sources:
                knowledge = EmailKnowledgeMetadata(
                    requested=True,
                    grounded=True,
                    status="grounded",
                    sources=sources,
                )
            else:
                knowledge = EmailKnowledgeMetadata(
                    requested=True,
                    grounded=False,
                    status="no_relevant_context",
                    message="No relevant company knowledge was found for this request.",
                )
        except HTTPException:
            raise
        except Exception:
            logger.warning("Grounded email retrieval failed")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Company Knowledge is temporarily unavailable. Please try again.",
            ) from None

    try:
        user_prompt = build_grounded_email_prompt(request, sources) if sources else build_email_prompt(request)
        system_prompt = GROUNDED_EMAIL_SYSTEM_PROMPT if sources else EMAIL_SYSTEM_PROMPT
        raw_response = generate_response(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0 if sources else 0.2,
            max_tokens=1200,
        )
        draft = EmailDraft.model_validate(json.loads(raw_response))
        if sources:
            allowed_source_ids = {source.source_id for source in sources}
            if set(draft.sources_used) - allowed_source_ids:
                logger.warning("Grounded email generation failed: invalid source citations")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="The AI returned invalid company-knowledge citations. Please try again.",
                )
            _surface_deterministic_policy_conflicts(request, draft, sources)
            used_source_ids = set(draft.sources_used)
            used_sources = [source for source in sources if source.source_id in used_source_ids]
            knowledge.sources = used_sources
            knowledge.grounded = bool(used_sources)
            if not used_sources:
                knowledge.status = "no_relevant_context"
                knowledge.message = "No relevant company knowledge was used for this request."
        else:
            draft.knowledge_alerts = []
            draft.sources_used = []
    except HTTPException:
        raise
    except (json.JSONDecodeError, ValidationError, TypeError):
        logger.warning("Email draft generation failed: invalid structured response")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI returned an invalid draft. Please try again.",
        ) from None
    except LLMServiceError:
        logger.warning("Email draft generation failed: AI service unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="We couldn't generate the email draft. Please try again.",
        ) from None
    except Exception:
        logger.error("Email draft generation failed unexpectedly")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="We couldn't generate the email draft. Please try again.",
        ) from None

    logger.info("Grounded email generated" if knowledge.grounded else "Email draft generation succeeded")
    return EmailGenerationResponse(draft=draft, knowledge=knowledge)
