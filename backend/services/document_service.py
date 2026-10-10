"""In-memory extraction and paragraph-aware chunking for approved file types."""

from dataclasses import dataclass
from io import BytesIO
import re

from docx import Document
from pypdf import PdfReader


TARGET_CHARS = 900
OVERLAP_CHARS = 120


class DocumentProcessingError(ValueError):
    """Raised when an uploaded document cannot be safely extracted."""


@dataclass(frozen=True)
class ExtractedSection:
    text: str
    page: int | None = None


@dataclass(frozen=True)
class DocumentChunk:
    text: str
    page: int | None
    chunk_index: int


def _clean_text(text: str) -> str:
    return re.sub(r"[ \t]+", " ", text.replace("\x00", "")).strip()


def extract_pdf(content: bytes) -> list[ExtractedSection]:
    """Extract text per PDF page without OCR."""
    try:
        reader = PdfReader(BytesIO(content))
        sections = [
            ExtractedSection(_clean_text(page.extract_text() or ""), page_number)
            for page_number, page in enumerate(reader.pages, start=1)
        ]
    except Exception as error:
        raise DocumentProcessingError("The PDF could not be read.") from error

    sections = [section for section in sections if section.text]
    if not sections:
        raise DocumentProcessingError(
            "No extractable text was found in this PDF. Scanned documents without a text layer are not currently supported."
        )
    return sections


def extract_docx(content: bytes) -> list[ExtractedSection]:
    """Extract DOCX paragraphs in their original order."""
    try:
        document = Document(BytesIO(content))
        text = "\n\n".join(_clean_text(paragraph.text) for paragraph in document.paragraphs if _clean_text(paragraph.text))
    except Exception as error:
        raise DocumentProcessingError("The DOCX file could not be read.") from error
    if not text:
        raise DocumentProcessingError("No extractable text was found in this DOCX file.")
    return [ExtractedSection(text)]


def extract_txt(content: bytes) -> list[ExtractedSection]:
    """Decode a UTF-8 text document safely."""
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise DocumentProcessingError("TXT files must use UTF-8 encoding.") from error
    text = _clean_text(text)
    if not text:
        raise DocumentProcessingError("The TXT file is empty.")
    return [ExtractedSection(text)]


def extract_document(content: bytes, file_type: str) -> list[ExtractedSection]:
    """Route a supported file type to its extractor."""
    extractors = {"pdf": extract_pdf, "docx": extract_docx, "txt": extract_txt}
    try:
        extractor = extractors[file_type]
    except KeyError as error:
        raise DocumentProcessingError("Unsupported document type.") from error
    return extractor(content)


def _split_long_text(text: str) -> list[str]:
    parts: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + TARGET_CHARS, len(text))
        if end < len(text):
            boundary = max(text.rfind(". ", start + 650, end), text.rfind(" ", start + 650, end))
            if boundary > start:
                end = boundary + 1
        parts.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - OVERLAP_CHARS, start + 1)
    return [part for part in parts if part]


def chunk_sections(sections: list[ExtractedSection]) -> list[DocumentChunk]:
    """Create roughly 700-1000 character chunks with modest overlap."""
    chunks: list[DocumentChunk] = []
    for section in sections:
        paragraphs = [part.strip() for part in re.split(r"\n\s*\n", section.text) if part.strip()]
        buffer = ""
        section_chunks: list[str] = []
        for paragraph in paragraphs:
            if len(paragraph) > TARGET_CHARS:
                if buffer:
                    section_chunks.append(buffer)
                    buffer = ""
                section_chunks.extend(_split_long_text(paragraph))
                continue
            candidate = f"{buffer}\n\n{paragraph}".strip()
            if buffer and len(candidate) > TARGET_CHARS:
                section_chunks.append(buffer)
                overlap = buffer[-OVERLAP_CHARS:].lstrip()
                buffer = f"{overlap}\n\n{paragraph}".strip()
            else:
                buffer = candidate
        if buffer:
            section_chunks.append(buffer)
        for text in section_chunks:
            chunks.append(DocumentChunk(text=text, page=section.page, chunk_index=len(chunks)))
    if not chunks:
        raise DocumentProcessingError("The document did not contain enough text to index.")
    return chunks
