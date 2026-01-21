import io
from typing import List
from PyPDF2 import PdfReader


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract all text from a PDF file."""
    pdf_file = io.BytesIO(pdf_bytes)
    reader = PdfReader(pdf_file)

    text_content = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_content.append(text)

    return "\n\n".join(text_content)


def chunk_text(text: str, chunk_size: int = 8000, overlap: int = 300) -> List[str]:
    """
    Split text into chunks of approximately chunk_size characters.
    Tries to split on paragraph boundaries for cleaner chunks.
    """
    # Split into paragraphs
    paragraphs = text.split("\n\n")

    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        paragraph = paragraph.strip()
        if not paragraph:
            continue

        # If adding this paragraph exceeds chunk size
        if len(current_chunk) + len(paragraph) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                # Start new chunk with overlap from end of previous
                if overlap > 0 and len(current_chunk) > overlap:
                    current_chunk = current_chunk[-overlap:] + "\n\n" + paragraph
                else:
                    current_chunk = paragraph
            else:
                # Single paragraph exceeds chunk size, split it
                while len(paragraph) > chunk_size:
                    # Find a good split point (sentence end or space)
                    split_point = chunk_size
                    for sep in [". ", "! ", "? ", "\n", " "]:
                        last_sep = paragraph[:chunk_size].rfind(sep)
                        if last_sep > chunk_size // 2:
                            split_point = last_sep + len(sep)
                            break

                    chunks.append(paragraph[:split_point].strip())
                    paragraph = paragraph[split_point:]
                current_chunk = paragraph
        else:
            if current_chunk:
                current_chunk += "\n\n" + paragraph
            else:
                current_chunk = paragraph

    # Don't forget the last chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def get_pdf_metadata(pdf_bytes: bytes) -> dict:
    """Extract metadata from PDF."""
    pdf_file = io.BytesIO(pdf_bytes)
    reader = PdfReader(pdf_file)

    metadata = reader.metadata

    return {
        "title": metadata.get("/Title", "Untitled") if metadata else "Untitled",
        "author": metadata.get("/Author", "Unknown") if metadata else "Unknown",
        "pages": len(reader.pages),
        "has_text": any(page.extract_text() for page in reader.pages)
    }


def estimate_reading_time(text: str, words_per_minute: int = 200) -> int:
    """Estimate reading time in minutes."""
    word_count = len(text.split())
    return max(1, word_count // words_per_minute)
