"""Reusable CPU-only ONNX sentence embedding service."""

from functools import lru_cache

import numpy as np
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2


EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedding_model() -> ONNXMiniLM_L6_V2:
    """Create and cache one CPU ONNX embedding function per process."""
    return ONNXMiniLM_L6_V2(preferred_providers=["CPUExecutionProvider"])


def _normalize(embedding: np.ndarray) -> list[float]:
    """Return a unit L2-normalized embedding as plain floats."""
    vector = np.asarray(embedding, dtype=np.float32)
    norm = float(np.linalg.norm(vector))
    if norm == 0.0:
        raise ValueError("The embedding model returned a zero-length vector.")
    return (vector / norm).tolist()


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Generate normalized document embeddings in one batch."""
    if not texts or any(not isinstance(text, str) or not text.strip() for text in texts):
        raise ValueError("Embedding input must contain non-empty text.")
    return [_normalize(embedding) for embedding in get_embedding_model()(texts)]


def embed_text(text: str) -> list[float]:
    """Generate one normalized query embedding."""
    return embed_documents([text])[0]
