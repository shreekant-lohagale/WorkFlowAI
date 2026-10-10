"""Health-check route that does not invoke the LLM service."""

from fastapi import APIRouter


router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Return the availability of the WorkFlowAI API."""
    return {"status": "ok", "service": "WorkFlowAI API"}
