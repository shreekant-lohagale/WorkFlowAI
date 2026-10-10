"""All persistent ChromaDB operations for Company Knowledge."""

from collections import defaultdict
from functools import lru_cache
from typing import Any

import chromadb

from backend.config import settings
from backend.services.document_service import DocumentChunk


COLLECTION_NAME = "workflowai_company_knowledge"
CHROMA_PATH = settings.chroma_path


def initialize_vector_storage() -> None:
    """Create the configured persistent Chroma directory when absent."""
    CHROMA_PATH.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_client() -> chromadb.PersistentClient:
    """Return one persistent local Chroma client."""
    initialize_vector_storage()
    return chromadb.PersistentClient(path=str(CHROMA_PATH))


@lru_cache(maxsize=1)
def get_collection():
    """Return the cosine-similarity knowledge collection."""
    return get_client().get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def has_content_hash(content_hash: str) -> bool:
    result = get_collection().get(where={"content_hash": content_hash}, limit=1, include=["metadatas"])
    return bool(result["ids"])


def index_chunks(
    document_id: str,
    filename: str,
    file_type: str,
    uploaded_at: str,
    content_hash: str,
    chunks: list[DocumentChunk],
    embeddings: list[list[float]],
) -> None:
    """Persist document chunks, embeddings and safe source metadata."""
    metadatas: list[dict[str, Any]] = []
    for chunk in chunks:
        metadata: dict[str, Any] = {
            "document_id": document_id,
            "filename": filename,
            "file_type": file_type,
            "chunk_index": chunk.chunk_index,
            "uploaded_at": uploaded_at,
            "content_hash": content_hash,
        }
        if chunk.page is not None:
            metadata["page"] = chunk.page
        metadatas.append(metadata)
    get_collection().add(
        ids=[f"{document_id}:{chunk.chunk_index}" for chunk in chunks],
        embeddings=embeddings,
        documents=[chunk.text for chunk in chunks],
        metadatas=metadatas,
    )


def knowledge_counts() -> tuple[int, int]:
    documents = list_documents()
    return len(documents), get_collection().count()


def list_documents() -> list[dict[str, Any]]:
    """Aggregate one safe summary per indexed document."""
    result = get_collection().get(include=["metadatas"])
    grouped: dict[str, dict[str, Any]] = {}
    counts: defaultdict[str, int] = defaultdict(int)
    for metadata in result.get("metadatas") or []:
        document_id = str(metadata["document_id"])
        counts[document_id] += 1
        grouped[document_id] = {
            "document_id": document_id,
            "filename": metadata["filename"],
            "file_type": metadata["file_type"],
            "uploaded_at": metadata["uploaded_at"],
        }
    documents = [{**item, "chunks": counts[document_id]} for document_id, item in grouped.items()]
    return sorted(documents, key=lambda item: item["uploaded_at"], reverse=True)


def delete_document(document_id: str) -> bool:
    existing = get_collection().get(where={"document_id": document_id}, include=[])
    if not existing["ids"]:
        return False
    get_collection().delete(where={"document_id": document_id})
    return True


def search_chunks(query_embedding: list[float], top_k: int) -> list[dict[str, Any]]:
    """Search chunks and consistently convert cosine distance to similarity."""
    collection = get_collection()
    if collection.count() == 0:
        return []
    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )
    hits: list[dict[str, Any]] = []
    for content, metadata, distance in zip(
        result["documents"][0], result["metadatas"][0], result["distances"][0]
    ):
        hits.append({
            "document_id": metadata["document_id"],
            "filename": metadata["filename"],
            "page": metadata.get("page"),
            "chunk_index": int(metadata["chunk_index"]),
            "content": content,
            "similarity": round(max(0.0, min(1.0, 1.0 - float(distance))), 4),
        })
    return hits
