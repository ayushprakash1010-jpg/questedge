"""Extract text from resume files (PDF and DOCX)."""

import io
import logging

logger = logging.getLogger(__name__)


def extract_text(file_bytes: bytes, content_type: str) -> str:
    """Extract plain text from a resume file."""
    if "pdf" in content_type:
        return _extract_pdf(file_bytes)
    elif "wordprocessingml" in content_type or "msword" in content_type:
        return _extract_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported content type: {content_type}")


def _extract_pdf(file_bytes: bytes) -> str:
    import pymupdf  # PyMuPDF

    text_parts = []
    with pymupdf.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts).strip()


def _extract_docx(file_bytes: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    return "\n".join(para.text for para in doc.paragraphs if para.text.strip())
