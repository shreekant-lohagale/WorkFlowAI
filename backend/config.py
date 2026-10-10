"""Central environment-backed configuration for WorkFlowAI."""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
DEFAULT_ALLOWED_ORIGINS = ("http://localhost:5173",)

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / "backend" / ".env", override=False)


def _storage_path(variable: str, default: str) -> Path:
    """Resolve a server-controlled storage path against the project root."""
    configured = os.getenv(variable, default).strip() or default
    path = Path(configured).expanduser()
    return path if path.is_absolute() else PROJECT_ROOT / path


def _allowed_origins() -> tuple[str, ...]:
    """Parse a comma-separated CORS allowlist without permitting wildcards."""
    configured = os.getenv("ALLOWED_ORIGINS", ",".join(DEFAULT_ALLOWED_ORIGINS))
    origins = tuple(dict.fromkeys(item.strip().rstrip("/") for item in configured.split(",") if item.strip()))
    if "*" in origins:
        raise ValueError("ALLOWED_ORIGINS must contain explicit origins, not '*'.")
    return origins or DEFAULT_ALLOWED_ORIGINS


@dataclass(frozen=True)
class Settings:
    """Non-secret application settings safe for internal use."""

    environment: str
    groq_model: str
    allowed_origins: tuple[str, ...]
    chroma_path: Path
    productivity_csv_path: Path


settings = Settings(
    environment=os.getenv("ENVIRONMENT", "development").strip() or "development",
    groq_model=os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip() or DEFAULT_GROQ_MODEL,
    allowed_origins=_allowed_origins(),
    chroma_path=_storage_path("CHROMA_PATH", "backend/storage/chroma"),
    productivity_csv_path=_storage_path("PRODUCTIVITY_CSV_PATH", "data/productivity.csv"),
)
