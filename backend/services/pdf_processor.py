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


def extract_title_from_first_page(reader: PdfReader) -> str:
    """Try to extract title from first page content."""
    try:
        if len(reader.pages) > 0:
            first_page_text = reader.pages[0].extract_text() or ""
            lines = first_page_text.strip().split('\n')

            # Filter out very short lines and empty lines
            meaningful_lines = [
                line.strip() for line in lines[:10]
                if line.strip() and len(line.strip()) > 5 and len(line.strip()) < 150
            ]

            if meaningful_lines:
                # Usually the title is one of the first substantial lines
                # Skip lines that look like headers/dates/page numbers
                for line in meaningful_lines[:5]:
                    line_lower = line.lower()
                    # Skip common non-title patterns
                    skip_patterns = [
                        'page', 'chapter', 'table of contents', 'copyright',
                        'all rights reserved', 'isbn', 'www.', 'http',
                        'edition', 'published', 'printed'
                    ]
                    if not any(pattern in line_lower for pattern in skip_patterns):
                        # Check if it looks like a title (mostly letters, reasonable length)
                        alpha_ratio = sum(c.isalpha() or c.isspace() for c in line) / max(len(line), 1)
                        if alpha_ratio > 0.7 and 10 < len(line) < 100:
                            return line.strip()
    except Exception:
        pass
    return ""


def get_pdf_metadata(pdf_bytes: bytes) -> dict:
    """Extract metadata from PDF with improved title extraction."""
    pdf_file = io.BytesIO(pdf_bytes)
    reader = PdfReader(pdf_file)

    metadata = reader.metadata
    title = "Untitled"

    # Strategy 1: Try PDF metadata
    if metadata:
        meta_title = metadata.get("/Title", "")
        if meta_title and meta_title.strip() and meta_title.strip().lower() != "untitled":
            # Clean up the title
            title = meta_title.strip()
            # Remove common suffixes like ".pdf"
            if title.lower().endswith('.pdf'):
                title = title[:-4]

    # Strategy 2: If metadata title is generic, try first page
    if title in ["Untitled", "", "Microsoft Word", "Document"]:
        extracted_title = extract_title_from_first_page(reader)
        if extracted_title:
            title = extracted_title

    return {
        "title": title,
        "author": metadata.get("/Author", "Unknown") if metadata else "Unknown",
        "pages": len(reader.pages),
        "has_text": any(page.extract_text() for page in reader.pages)
    }


def estimate_reading_time(text: str, words_per_minute: int = 200) -> int:
    """Estimate reading time in minutes."""
    word_count = len(text.split())
    return max(1, word_count // words_per_minute)
