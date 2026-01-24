import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from routers.auth import get_current_user
from services.supabase_client import (
    upload_file_to_storage,
    create_book,
    check_upload_allowed,
    get_user_usage,
    get_user_tier,
    get_tier_limits,
)
from services.pdf_processor import get_pdf_metadata
from services.queue_worker import queue_worker
from models.schemas import UploadResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["upload"])

# Rate limiter for upload endpoint
limiter = Limiter(key_func=get_remote_address)


@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")  # Max 10 uploads per minute per IP
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    upload_type: str = Form(default="notes"),
    user: dict = Depends(get_current_user)
):
    """Upload a PDF and add it to the processing queue.

    upload_type: 'book' or 'notes'
    - notes: Process immediately (smaller documents)
    - book: Will support chapter selection in future
    """
    # Validate upload_type
    if upload_type not in ("book", "notes"):
        upload_type = "notes"

    # Check upload limits before processing
    upload_check = await check_upload_allowed(user["id"], upload_type)
    if not upload_check["allowed"]:
        raise HTTPException(status_code=403, detail=upload_check["reason"])

    # Validate file extension
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Validate file size (50MB limit)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 50MB")

    # Read file content
    pdf_bytes = await file.read()

    # Validate content type by checking PDF magic bytes
    if not pdf_bytes.startswith(b'%PDF'):
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    # Get metadata
    metadata = get_pdf_metadata(pdf_bytes)
    book_title = metadata.get("title", file.filename.replace(".pdf", ""))

    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_path = f"{user['id']}/{file_id}.pdf"

    # Upload to storage
    try:
        file_url = await upload_file_to_storage(
            bucket="books",
            path=file_path,
            file_data=pdf_bytes,
            content_type="application/pdf"
        )
    except Exception as e:
        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")

    # Determine initial status based on upload type
    # - notes: Queue immediately for processing
    # - book: Wait for chapter selection
    if upload_type == "book":
        initial_status = "pending_selection"
        message = "Book uploaded. Please select chapters to process."
    else:
        initial_status = "queued"
        message = "Notes uploaded. Added to processing queue."

    # Create book record
    book = await create_book(
        user_id=user["id"],
        title=book_title,
        file_url=file_url,
        status=initial_status,
        upload_type=upload_type
    )

    # Start worker for notes (they process immediately)
    if upload_type == "notes":
        if not queue_worker.is_processing:
            queue_worker.start()

    logger.info(f"User {user['id']} uploaded {upload_type}: {book['id']}")

    return UploadResponse(
        book_id=book["id"],
        message=message
    )


@router.get("/usage")
async def get_usage(user: dict = Depends(get_current_user)):
    """Get user's usage and limits for the current month."""
    tier = await get_user_tier(user["id"])
    limits = get_tier_limits(tier)
    usage = await get_user_usage(user["id"])

    return {
        "tier": tier,
        "usage": usage,
        "limits": limits,
        "can_upload_books": limits["can_upload_books"],
        "books_remaining": (
            None if limits["books_limit"] is None
            else max(0, limits["books_limit"] - usage["books_this_month"])
        ),
        "notes_remaining": (
            None if limits["notes_limit"] is None
            else max(0, limits["notes_limit"] - usage["notes_this_month"])
        )
    }
