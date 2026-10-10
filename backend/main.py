"""FastAPI application entry point for WorkFlowAI."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.routes.email import router as email_router
from backend.routes.health import router as health_router
from backend.routes.meetings import router as meetings_router
from backend.routes.knowledge import router as knowledge_router
from backend.routes.actions import router as actions_router
from backend.routes.reports import router as reports_router
from backend.routes.executive import router as executive_router
from backend.routes.analytics import router as analytics_router
from backend.services.analytics_service import initialize_analytics_storage
from backend.services.vector_service import initialize_vector_storage


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize configured local persistence without loading AI models."""
    initialize_vector_storage()
    initialize_analytics_storage()
    yield


app = FastAPI(
    title="WorkFlowAI API",
    description="REST API for source-grounded workplace AI workflows and measured productivity analytics.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["service"])
def root() -> dict[str, str]:
    """Return minimal public API metadata."""
    return {"name": "WorkFlowAI API", "status": "running", "docs": "/docs"}

app.include_router(health_router, prefix="/api")
app.include_router(email_router, prefix="/api")
app.include_router(meetings_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(actions_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(executive_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
