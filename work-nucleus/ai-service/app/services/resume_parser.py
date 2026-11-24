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
    # iter_inner_content retains the reading order of paragraphs and table cells.
    # Merged cells share their XML node; emit each only once.
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    def paragraphs(container):
        for block in container.iter_inner_content():
            if isinstance(block, Paragraph):
                if block.text.strip():
                    yield block.text
            elif isinstance(block, Table):
                visited = set()
                for row in block.rows:
                    for cell in row.cells:
                        if cell._tc not in visited:
                            visited.add(cell._tc)
                            yield from paragraphs(cell)

    return "\n".join(paragraphs(doc))
