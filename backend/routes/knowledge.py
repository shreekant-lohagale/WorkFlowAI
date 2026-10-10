"""Company Knowledge upload, retrieval and RAG endpoints."""

from datetime import datetime, timezone
import hashlib
import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from backend.models.knowledge import (
    AskResponse,
    DeleteResponse,
    DocumentsResponse,
    KnowledgeAskRequest,
    KnowledgeDocument,
    KnowledgeSearchRequest,
    KnowledgeStatusResponse,
    SearchResponse,
    UploadDocument,
    UploadResponse,
)
from backend.services.document_service import DocumentProcessingError, chunk_sections, extract_document
from backend.services.embedding_service import EMBEDDING_MODEL_NAME, embed_documents
from backend.services.llm_service import LLMServiceError
from backend.services.rag_service import RagResponseError, ask_knowledge, search_knowledge
from backend.services.vector_service import (
    delete_document,
    has_content_hash,
    index_chunks,
    knowledge_counts,
    list_documents,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge", tags=["knowledge"])
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    """Extract and index one supported document without retaining the original."""
    safe_filename = Path(file.filename or "").name
    extension = Path(safe_filename).suffix.lower()
    if not safe_filename or extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Only PDF, DOCX and TXT files are supported.")

    content = await file.read(MAX_FILE_SIZE + 1)
    await file.close()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="The maximum file size is 10 MB.")
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    content_hash = hashlib.sha256(content).hexdigest()
    if has_content_hash(content_hash):
        raise HTTPException(status_code=409, detail="This document has already been indexed.")

    logger.info("Knowledge document indexing started")
    document_id = str(uuid4())
    uploaded_at = datetime.now(timezone.utc).isoformat()
    file_type = extension.removeprefix(".")
    try:
        chunks = chunk_sections(extract_document(content, file_type))
        embeddings = embed_documents([chunk.text for chunk in chunks])
        index_chunks(document_id, safe_filename, file_type, uploaded_at, content_hash, chunks, embeddings)
    except DocumentProcessingError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    except Exception:
        logger.exception("Knowledge document indexing failed")
        raise HTTPException(status_code=500, detail="The document could not be indexed. Please try again.") from None

    logger.info("Knowledge document indexing completed")
    return UploadResponse(document=UploadDocument(
        document_id=document_id,
        filename=safe_filename,
        file_type=file_type,
        chunks_indexed=len(chunks),
    ))


@router.get("/status", response_model=KnowledgeStatusResponse)
def get_status() -> KnowledgeStatusResponse:
    document_count, chunk_count = knowledge_counts()
    return KnowledgeStatusResponse(
        document_count=document_count,
        chunk_count=chunk_count,
        embedding_model=EMBEDDING_MODEL_NAME,
    )


@router.get("/documents", response_model=DocumentsResponse)
def get_documents() -> DocumentsResponse:
    return DocumentsResponse(documents=[KnowledgeDocument(**item) for item in list_documents()])


@router.delete("/documents/{document_id}", response_model=DeleteResponse)
def remove_document(document_id: str) -> DeleteResponse:
    if not delete_document(document_id):
        raise HTTPException(status_code=404, detail="Knowledge document not found.")
    logger.info("Knowledge document deleted")
    return DeleteResponse()


@router.post("/search", response_model=SearchResponse)
def search(request: KnowledgeSearchRequest) -> SearchResponse:
    try:
        return SearchResponse(results=search_knowledge(request.query, request.top_k))
    except Exception:
        logger.exception("Knowledge retrieval failed")
        raise HTTPException(status_code=500, detail="Knowledge search is temporarily unavailable.") from None


@router.post("/ask", response_model=AskResponse)
def ask(request: KnowledgeAskRequest) -> AskResponse:
    try:
        return ask_knowledge(request.question, request.top_k)
    except RagResponseError:
        raise HTTPException(status_code=502, detail="The AI returned an invalid grounded response. Please try again.") from None
    except LLMServiceError:
        raise HTTPException(status_code=503, detail="The AI service is temporarily unavailable. Please try again.") from None
    except Exception:
        logger.exception("RAG generation failed")
        raise HTTPException(status_code=500, detail="The knowledge answer could not be generated. Please try again.") from None
