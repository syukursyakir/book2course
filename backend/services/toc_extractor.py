"""
TOC (Table of Contents) extraction from PDFs.
Tries metadata first with sanity checks, falls back to AI extraction.
"""
import io
import json
import re
from typing import List, Dict, Any, Optional, Tuple
import fitz  # PyMuPDF


def extract_toc_from_metadata(pdf_bytes: bytes) -> Optional[List[Dict[str, Any]]]:
    """
    Extract TOC from PDF metadata/outline.
    This is fast and doesn't require AI.

    Returns list of chapters with:
    - level: hierarchy level (1 = top level chapter)
    - title: chapter/section title
    - page: starting page number (1-indexed)
    Also captures backmatter start page for proper end page calculation.
    """
    # Keywords that indicate backmatter (not main content)
    backmatter_keywords = [
        "appendix", "index", "glossary", "bibliography", "references",
        "about the author", "about author", "acknowledgement", "acknowledgment",
        "versioning", "changelog", "afterword", "colophon"
    ]

    # Keywords that indicate front matter (not main content)
    frontmatter_keywords = [
        "contents", "table of contents", "preface", "foreword", "dedication",
        "copyright", "title page", "half title"
    ]

    try:
        pdf_file = io.BytesIO(pdf_bytes)
        doc = fitz.open(stream=pdf_file, filetype="pdf")
        toc = doc.get_toc()  # Returns: [[level, title, page], ...]

        if not toc:
            doc.close()
            return None

        # Collect all entries, marking chapters vs backmatter
        chapters = []
        backmatter_start = None

        for item in toc:
            level, title, page = item
            if level > 2 or not title.strip():
                continue

            title_lower = title.strip().lower()

            # Check if it's backmatter
            is_backmatter = any(kw in title_lower for kw in backmatter_keywords)

            # Check if it's frontmatter (skip these)
            is_frontmatter = any(kw in title_lower for kw in frontmatter_keywords)

            if is_backmatter:
                # Record first backmatter page
                if backmatter_start is None:
                    backmatter_start = page
                    print(f"[TOC] Metadata: backmatter starts at page {page} ({title.strip()})")
            elif not is_frontmatter and level == 1:
                chapters.append({
                    "level": level,
                    "title": title.strip(),
                    "page": page
                })

        # If no level-1 chapters found, try level 2
        if not chapters:
            for item in toc:
                level, title, page = item
                if level > 2 or not title.strip():
                    continue

                title_lower = title.strip().lower()
                is_backmatter = any(kw in title_lower for kw in backmatter_keywords)
                is_frontmatter = any(kw in title_lower for kw in frontmatter_keywords)

                if not is_backmatter and not is_frontmatter:
                    chapters.append({
                        "level": level,
                        "title": title.strip(),
                        "page": page
                    })

        # Attach backmatter_start to first chapter for calculate_chapter_pages
        if chapters and backmatter_start:
            chapters[0]["_backmatter_start"] = backmatter_start

        doc.close()
        return chapters if chapters else None

    except Exception as e:
        print(f"[TOC] Error extracting TOC from metadata: {e}")
        return None


def sanity_check_toc(chapters: List[Dict[str, Any]], total_pages: int) -> Tuple[bool, str]:
    """
    Check if extracted TOC makes sense.

    Returns:
        (is_valid, reason) - True if TOC looks good, False with reason if bad
    """
    if not chapters:
        return False, "No chapters found"

    # Calculate page ranges
    chapters_with_pages = calculate_chapter_pages(chapters.copy(), total_pages)

    # Check 1: Any section with > 50 pages is suspicious (might be missing chapters)
    for ch in chapters_with_pages:
        page_count = ch.get("page_count", 0)
        if page_count > 50:
            # Exception: if it's clearly labeled as a single chapter/part, it might be valid
            title_lower = ch.get("title", "").lower()
            if not any(word in title_lower for word in ["chapter", "part", "section", "unit", "module"]):
                return False, f"Section '{ch.get('title')}' has {page_count} pages - likely missing chapters"

    # Check 2: Too few sections for a large book
    if total_pages > 100 and len(chapters) < 5:
        # Check if any entries look like actual chapters
        has_chapter_entries = any(
            "chapter" in ch.get("title", "").lower()
            for ch in chapters
        )
        if not has_chapter_entries:
            return False, f"Only {len(chapters)} sections for {total_pages} pages - likely incomplete"

    # Check 3: Mostly front/back matter, no real content
    front_back_keywords = [
        "contents", "preface", "acknowledgement", "acknowledgment", "foreword",
        "introduction", "appendix", "index", "glossary", "bibliography",
        "references", "about the author", "dedication", "copyright"
    ]

    content_chapters = []
    for ch in chapters:
        title_lower = ch.get("title", "").lower()
        is_front_back = any(keyword in title_lower for keyword in front_back_keywords)
        if not is_front_back:
            content_chapters.append(ch)

    # If most entries are front/back matter for a large book, probably bad extraction
    if total_pages > 100 and len(content_chapters) < 3:
        return False, f"Most entries are front/back matter - likely missing main chapters"

    # Check 4: Large page gap between entries suggests missing chapters
    sorted_chapters = sorted(chapters, key=lambda x: x.get("page", 0))
    for i in range(len(sorted_chapters) - 1):
        current_page = sorted_chapters[i].get("page", 0)
        next_page = sorted_chapters[i + 1].get("page", 0)
        gap = next_page - current_page

        # A gap of more than 80 pages between entries is suspicious
        if gap > 80:
            return False, f"Large gap ({gap} pages) between '{sorted_chapters[i].get('title')}' and '{sorted_chapters[i+1].get('title')}'"

    return True, "TOC looks valid"


def extract_first_pages_text(pdf_bytes: bytes, num_pages: int = 15) -> str:
    """Extract text from first N pages of PDF for AI TOC extraction."""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        doc = fitz.open(stream=pdf_file, filetype="pdf")

        text_parts = []
        for page_num in range(min(num_pages, len(doc))):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

        doc.close()
        return "\n\n".join(text_parts)

    except Exception as e:
        print(f"[TOC] Error extracting first pages: {e}")
        return ""


async def extract_toc_with_ai(pdf_bytes: bytes) -> Optional[List[Dict[str, Any]]]:
    """
    Extract TOC using AI by analyzing first pages.
    Handles various TOC formats commonly found in books.
    """
    from .ai_generator import call_openrouter

    first_pages_text = extract_first_pages_text(pdf_bytes, num_pages=15)

    if not first_pages_text or len(first_pages_text) < 100:
        return None

    prompt = f"""Extract ALL entries from this book's table of contents.

TEXT FROM FIRST 15 PAGES:
{first_pages_text[:18000]}

TASK: Find the table of contents and extract EVERY entry with page numbers.
The TOC may span MULTIPLE PAGES - make sure to read ALL of it!

COMMON TOC FORMATS TO RECOGNIZE:
- "Chapter 1 Introduction 1" or "Chapter 1: Introduction ... 1"
- "1. Introduction ......... 1" or "1 Introduction 1"
- "Part I: Basics" followed by chapters
- "CHAPTER ONE" or "Chapter One" (page number nearby)
- "1 - Introduction (page 5)" or "Introduction (p. 5)"
- Numbered sections like "1.0 Overview" or "Section 1: Overview"
- "Appendix A" or "Appendix: Something"
- "Index", "Glossary", "Bibliography", "References"

Return JSON with ALL entries, marking each as "chapter" or "backmatter":
{{
  "entries": [
    {{"type": "chapter", "title": "Introduction to Databases", "start_page": 1}},
    {{"type": "chapter", "title": "Data Models", "start_page": 25}},
    {{"type": "chapter", "title": "SQL Fundamentals", "start_page": 48}},
    {{"type": "backmatter", "title": "Appendix A: Examples", "start_page": 127}},
    {{"type": "backmatter", "title": "Index", "start_page": 145}}
  ]
}}

RULES:
- type = "chapter" for main content (Chapter 1, Chapter 2, or numbered sections)
- type = "backmatter" for Appendix, Index, Glossary, Bibliography, References, About Author, etc.
- Extract from ALL pages of the Contents (it often spans 2+ pages!)
- Clean up titles (remove trailing dots, page numbers from title text)
- Make sure page numbers are integers
- Include EVERYTHING listed in the TOC - we need backmatter pages to calculate chapter lengths

If you cannot find a clear structure, return: {{"entries": null}}"""

    messages = [{"role": "user", "content": prompt}]

    try:
        response = await call_openrouter(messages, temperature=0.2)

        # Parse JSON from response
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]

        data = json.loads(response.strip())
        entries = data.get("entries")

        if not entries:
            return None

        # Separate chapters from backmatter
        chapters = []
        backmatter_entries = []

        print(f"[TOC] AI returned {len(entries)} total entries")

        for i, entry in enumerate(entries):
            entry_type = entry.get("type", "chapter")
            title = entry.get("title", f"Chapter {i+1}")
            page = entry.get("start_page", 1)

            # Clean up title - remove trailing dots, page numbers, etc.
            title = re.sub(r'[\.\s]+\d+\s*$', '', title).strip()

            # Ensure page is an integer
            if isinstance(page, str):
                page = int(re.sub(r'[^\d]', '', page) or 1)
            page = max(1, page)

            print(f"[TOC]   Entry {i+1}: type={entry_type}, title='{title[:30]}...', page={page}")

            if entry_type == "chapter":
                chapters.append({
                    "level": 1,
                    "title": title,
                    "page": page
                })
            elif entry_type == "backmatter":
                backmatter_entries.append({"title": title, "page": page})

        # Find backmatter that comes AFTER the last chapter (not frontmatter like Preface)
        backmatter_start = None
        if chapters and backmatter_entries:
            last_chapter_page = max(ch["page"] for ch in chapters)
            # Find first backmatter entry that starts after last chapter
            for bm in sorted(backmatter_entries, key=lambda x: x["page"]):
                if bm["page"] > last_chapter_page:
                    backmatter_start = bm["page"]
                    print(f"[TOC] >>> Backmatter (after chapters) starts at page {backmatter_start} ({bm['title'][:30]}) <<<")
                    break

        # Store backmatter_start for use in page calculation
        if chapters:
            # Attach backmatter info to the result for calculate_chapter_pages to use
            chapters[0]["_backmatter_start"] = backmatter_start

        return chapters if chapters else None

    except Exception as e:
        print(f"[TOC] Error extracting TOC with AI: {e}")
        import traceback
        traceback.print_exc()
        return None


def calculate_chapter_pages(
    chapters: List[Dict[str, Any]],
    total_pages: int
) -> List[Dict[str, Any]]:
    """
    Calculate end page and page count for each chapter.
    Assumes chapters are sorted by start page.
    Uses backmatter_start (if available) to cap the last chapter's end page.
    """
    if not chapters:
        return []

    # Extract backmatter_start if present (attached to first chapter by AI extraction)
    backmatter_start = None
    if chapters and "_backmatter_start" in chapters[0]:
        backmatter_start = chapters[0].get("_backmatter_start")

    # Sort by page number
    chapters = sorted(chapters, key=lambda x: x.get("page", 1))

    result = []
    for i, chapter in enumerate(chapters):
        ch = chapter.copy()
        # Remove internal metadata
        ch.pop("_backmatter_start", None)

        start_page = ch.get("page", 1)

        # End page calculation
        if i < len(chapters) - 1:
            # Not the last chapter: end at next chapter's start - 1
            end_page = chapters[i + 1].get("page", total_pages) - 1
        else:
            # Last chapter: end at backmatter_start - 1 if available, else total_pages
            if backmatter_start and backmatter_start > start_page:
                end_page = backmatter_start - 1
                print(f"[TOC] Last chapter ends at {end_page} (before backmatter at {backmatter_start})")
            else:
                end_page = total_pages

        # Ensure end_page is at least start_page
        end_page = max(end_page, start_page)

        ch["start_page"] = start_page
        ch["end_page"] = end_page
        ch["page_count"] = end_page - start_page + 1

        result.append(ch)

    return result


def get_pdf_page_count(pdf_bytes: bytes) -> int:
    """Get total page count of PDF."""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        doc = fitz.open(stream=pdf_file, filetype="pdf")
        count = len(doc)
        doc.close()
        return count
    except Exception as e:
        print(f"[TOC] Error getting page count: {e}")
        return 0


async def extract_toc(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Main function to extract TOC from a PDF.
    Tries metadata first with sanity checks, falls back to AI.

    Returns:
    {
        "chapters": [...] or null,
        "total_pages": int,
        "extraction_method": "metadata" | "ai" | "none"
    }
    """
    total_pages = get_pdf_page_count(pdf_bytes)
    print(f"[TOC] ===== Starting TOC extraction for {total_pages} page PDF =====")

    # Try metadata extraction first (fast)
    metadata_chapters = extract_toc_from_metadata(pdf_bytes)

    if metadata_chapters:
        backmatter_info = metadata_chapters[0].get("_backmatter_start") if metadata_chapters else None
        print(f"[TOC] Metadata found {len(metadata_chapters)} chapters, backmatter_start={backmatter_info}")

        # Run sanity check on metadata TOC
        is_valid, reason = sanity_check_toc(metadata_chapters, total_pages)

        if is_valid:
            print(f"[TOC] Metadata TOC passed sanity check: {len(metadata_chapters)} chapters")
            chapters = calculate_chapter_pages(metadata_chapters, total_pages)
            print(f"[TOC] Final chapters: first={chapters[0]['title']}(p{chapters[0]['start_page']}-{chapters[0]['end_page']}), last={chapters[-1]['title']}(p{chapters[-1]['start_page']}-{chapters[-1]['end_page']})")
            return {
                "chapters": chapters,
                "total_pages": total_pages,
                "extraction_method": "metadata"
            }
        else:
            print(f"[TOC] Metadata TOC failed sanity check: {reason}")
            print(f"[TOC] Falling back to AI extraction...")

    # Fall back to AI extraction (either no metadata or failed sanity check)
    if not metadata_chapters:
        print("[TOC] No metadata TOC found, trying AI extraction...")

    ai_chapters = await extract_toc_with_ai(pdf_bytes)

    if ai_chapters:
        backmatter_info = ai_chapters[0].get("_backmatter_start") if ai_chapters else None
        print(f"[TOC] AI found {len(ai_chapters)} chapters, backmatter_start={backmatter_info}")

        # Run sanity check on AI result too
        is_valid, reason = sanity_check_toc(ai_chapters, total_pages)
        if is_valid:
            print(f"[TOC] AI extraction passed sanity check")
        else:
            print(f"[TOC] AI TOC failed sanity check: {reason} (using anyway)")

        chapters = calculate_chapter_pages(ai_chapters, total_pages)
        print(f"[TOC] Final chapters: first={chapters[0]['title']}(p{chapters[0]['start_page']}-{chapters[0]['end_page']}), last={chapters[-1]['title']}(p{chapters[-1]['start_page']}-{chapters[-1]['end_page']})")
        return {
            "chapters": chapters,
            "total_pages": total_pages,
            "extraction_method": "ai"
        }

    # No TOC found
    print("[TOC] Could not extract TOC from metadata or AI")
    return {
        "chapters": None,
        "total_pages": total_pages,
        "extraction_method": "none"
    }
