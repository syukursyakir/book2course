"""
Extract specific chapters/pages from a PDF.
"""
import io
from typing import List, Dict, Any
import fitz  # PyMuPDF


def extract_chapter_pages(
    pdf_bytes: bytes,
    chapters_selected: List[Dict[str, Any]]
) -> bytes:
    """
    Extract only the selected chapters from a PDF.

    Args:
        pdf_bytes: Original PDF as bytes
        chapters_selected: List of chapters with start_page and end_page
            Example: [{"start_page": 15, "end_page": 44}, {"start_page": 100, "end_page": 150}]

    Returns:
        New PDF bytes containing only the selected pages
    """
    if not chapters_selected:
        return pdf_bytes

    try:
        # Open source PDF
        pdf_file = io.BytesIO(pdf_bytes)
        source_doc = fitz.open(stream=pdf_file, filetype="pdf")

        # Create new PDF
        new_doc = fitz.open()

        for chapter in chapters_selected:
            # Pages are 1-indexed in our data, but 0-indexed in pymupdf
            start = chapter.get("start_page", 1) - 1
            end = chapter.get("end_page", start + 1) - 1

            # Clamp to valid range
            start = max(0, min(start, len(source_doc) - 1))
            end = max(start, min(end, len(source_doc) - 1))

            # Insert pages from source to new doc
            new_doc.insert_pdf(source_doc, from_page=start, to_page=end)

        # Save to bytes
        output = io.BytesIO()
        new_doc.save(output)
        new_doc.close()
        source_doc.close()

        return output.getvalue()

    except Exception as e:
        print(f"[CHAPTER] Error extracting chapters: {e}")
        # Return original if extraction fails
        return pdf_bytes


def extract_text_from_pages(
    pdf_bytes: bytes,
    start_page: int,
    end_page: int
) -> str:
    """
    Extract text from specific page range.

    Args:
        pdf_bytes: PDF as bytes
        start_page: Start page (1-indexed)
        end_page: End page (1-indexed, inclusive)

    Returns:
        Extracted text
    """
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        doc = fitz.open(stream=pdf_file, filetype="pdf")

        # Convert to 0-indexed
        start = max(0, start_page - 1)
        end = min(end_page, len(doc))

        text_parts = []
        for page_num in range(start, end):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(text)

        doc.close()
        return "\n\n".join(text_parts)

    except Exception as e:
        print(f"[CHAPTER] Error extracting text: {e}")
        return ""


def get_chapter_summary(chapters_selected: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Get summary statistics for selected chapters.

    Returns:
        {
            "chapter_count": int,
            "total_pages": int,
            "chapters": [{"title": str, "pages": int}, ...]
        }
    """
    total_pages = 0
    chapter_info = []

    for ch in chapters_selected:
        pages = ch.get("page_count", ch.get("end_page", 1) - ch.get("start_page", 1) + 1)
        total_pages += pages
        chapter_info.append({
            "title": ch.get("title", "Unknown"),
            "pages": pages
        })

    return {
        "chapter_count": len(chapters_selected),
        "total_pages": total_pages,
        "chapters": chapter_info
    }
