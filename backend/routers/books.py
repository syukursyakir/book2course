"""
Book management endpoints: TOC extraction, chapter selection, processing.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
from routers.auth import get_current_user
from services.supabase_client import (
    get_supabase_client,
    update_book_status,
)
from services.toc_extractor import extract_toc
from services.chapter_extractor import extract_chapter_pages, get_chapter_summary
from services.queue_worker import queue_worker

router = APIRouter(prefix="/api/books", tags=["books"])


class ChapterSelection(BaseModel):
    start_page: int
    end_page: int
    title: Optional[str] = None


class ProcessBookRequest(BaseModel):
    process_full: bool = False
    selected_chapters: Optional[List[ChapterSelection]] = None


class TOCResponse(BaseModel):
    book_id: str
    title: str
    total_pages: int
    chapters: Optional[List[dict]] = None
    extraction_method: str


@router.get("/{book_id}/toc", response_model=TOCResponse)
async def get_book_toc(book_id: str, user: dict = Depends(get_current_user)):
    """
    Get the table of contents for a book.
    Extracts TOC from PDF metadata or uses AI fallback.
    """
    client = get_supabase_client()

    # Get book and verify ownership
    result = client.table("books").select("*").eq("id", book_id).eq("user_id", user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Book not found")

    book = result.data[0]

    # Download PDF from storage
    file_url = book["file_url"]
    path_parts = file_url.split("/storage/v1/object/public/books/")
    if len(path_parts) < 2:
        raise HTTPException(status_code=500, detail="Invalid file URL format")

    file_path = path_parts[1]
    pdf_bytes = client.storage.from_("books").download(file_path)

    # Extract TOC
    toc_result = await extract_toc(pdf_bytes)

    return TOCResponse(
        book_id=book_id,
        title=book["title"],
        total_pages=toc_result["total_pages"],
        chapters=toc_result["chapters"],
        extraction_method=toc_result["extraction_method"]
    )


@router.post("/{book_id}/process")
async def process_book(
    book_id: str,
    request: ProcessBookRequest,
    user: dict = Depends(get_current_user)
):
    """
    Start processing a book with optional chapter selection.

    - process_full=true: Process the entire book
    - process_full=false + selected_chapters: Process only selected chapters
    """
    client = get_supabase_client()

    # Get book and verify ownership
    result = client.table("books").select("*").eq("id", book_id).eq("user_id", user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Book not found")

    book = result.data[0]

    # Check if book is in correct status
    if book["status"] not in ("pending_selection", "queued", "error"):
        raise HTTPException(
            status_code=400,
            detail=f"Book cannot be processed in current status: {book['status']}"
        )

    # Store selected chapters if any
    update_data = {"status": "queued"}

    if not request.process_full and request.selected_chapters:
        # Store chapter selection
        chapters_json = [
            {
                "start_page": ch.start_page,
                "end_page": ch.end_page,
                "title": ch.title
            }
            for ch in request.selected_chapters
        ]
        update_data["selected_chapters"] = chapters_json

        # Get summary for response
        summary = get_chapter_summary(chapters_json)
    else:
        # Full book processing
        update_data["selected_chapters"] = None
        summary = {"chapter_count": 0, "total_pages": 0, "chapters": []}

    # Update book status to queued
    try:
        client.table("books").update(update_data).eq("id", book_id).execute()
    except Exception as e:
        # Fallback if selected_chapters column doesn't exist
        print(f"[BOOKS] Could not update with selected_chapters: {e}")
        client.table("books").update({"status": "queued"}).eq("id", book_id).execute()

    # Make sure worker is running
    if not queue_worker.is_processing:
        queue_worker.start()

    return {
        "book_id": book_id,
        "status": "queued",
        "process_full": request.process_full,
        "summary": summary if not request.process_full else None,
        "message": "Book added to processing queue"
    }


@router.get("/{book_id}")
async def get_book(book_id: str, user: dict = Depends(get_current_user)):
    """Get book details including status and selected chapters."""
    client = get_supabase_client()

    result = client.table("books").select("*").eq("id", book_id).eq("user_id", user["id"]).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Book not found")

    book = result.data[0]

    return {
        "id": book["id"],
        "title": book["title"],
        "status": book["status"],
        "upload_type": book.get("upload_type", "notes"),
        "file_url": book["file_url"],
        "selected_chapters": book.get("selected_chapters"),
        "processing_step": book.get("processing_step"),
        "created_at": book["created_at"]
    }
