"""Retrieval and grounded generation orchestration."""

import json
import logging
import re

from pydantic import ValidationError

from backend.models.knowledge import AskResponse, KnowledgeSource, RagModelOutput
from backend.prompts.rag_prompt import RAG_SYSTEM_PROMPT, build_rag_prompt
from backend.services.embedding_service import embed_text
from backend.services.llm_service import LLMServiceError, generate_response
from backend.services.vector_service import search_chunks


logger = logging.getLogger(__name__)


class RagResponseError(RuntimeError):
    """Raised when generated RAG output fails grounding validation."""


def search_knowledge(query: str, top_k: int = 4) -> list[KnowledgeSource]:
    """Embed and retrieve the most similar company knowledge chunks."""
    logger.info("Knowledge retrieval requested")
    hits = search_chunks(embed_text(query), top_k)
    return [KnowledgeSource(source_id=f"S{index}", **hit) for index, hit in enumerate(hits, start=1)]


def ask_knowledge(question: str, top_k: int = 4) -> AskResponse:
    """Generate a source-grounded answer and validate its evidence mapping."""
    sources = search_knowledge(question, top_k)
    if not sources:
        return AskResponse(
            grounded=False,
            answer="The uploaded knowledge base does not provide enough information to answer this question.",
            sources=[],
            insufficient_context=True,
        )

    try:
        raw = generate_response(
            user_prompt=build_rag_prompt(question, sources),
            system_prompt=RAG_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=1400,
        )
        output = RagModelOutput.model_validate(json.loads(raw))
    except (json.JSONDecodeError, ValidationError, TypeError) as error:
        raise RagResponseError("The AI returned an invalid grounded response.") from error

    allowed = {source.source_id for source in sources}
    if set(output.sources_used) - allowed:
        raise RagResponseError("The AI returned invalid source citations.")
    cited_in_answer = set(re.findall(r"\[(S\d+)\]", output.answer))
    if cited_in_answer - allowed:
        raise RagResponseError("The AI returned invalid source citations.")
    if output.insufficient_context:
        output.sources_used = []
    elif not output.sources_used:
        raise RagResponseError("The grounded answer did not include source evidence.")
    else:
        missing_citations = [source_id for source_id in output.sources_used if source_id not in cited_in_answer]
        if missing_citations:
            output.answer = f"{output.answer.rstrip()} {' '.join(f'[{source_id}]' for source_id in missing_citations)}"
    used_sources = [source for source in sources if source.source_id in output.sources_used]
    logger.info("RAG generation completed")
    return AskResponse(
        grounded=bool(used_sources) and not output.insufficient_context,
        answer=output.answer,
        sources=used_sources,
        insufficient_context=output.insufficient_context,
        review_notes=output.review_notes,
    )
