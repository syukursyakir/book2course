import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from routers.auth import get_current_user
from services.supabase_client import (
    upload_file_to_storage,
    create_book,
    check_upload_allowed,
    get_user_usage,
    deduct_credits,
    get_credit_cost,
)
from services.pdf_processor import get_pdf_metadata
from services.queue_worker import queue_worker
from models.schemas import UploadResponse

router = APIRouter(prefix="/api", tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    upload_type: str = Form(default="notes"),
    user: dict = Depends(get_current_user)
):
    """Upload a PDF and add it to the processing queue.

    upload_type: 'book' or 'notes'
    - notes: Process immediately (1 credit)
    - book: Chapter selection first (5 credits)
    """
    # Validate upload_type
    if upload_type not in ("book", "notes"):
        upload_type = "notes"

    # === VALIDATE FILE FIRST (before deducting credits) ===
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    if file.size and file.size > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File size must be less than 50MB")

    # Check if user has enough credits
    upload_check = await check_upload_allowed(user["id"], upload_type)
    if not upload_check["allowed"]:
        raise HTTPException(status_code=403, detail=upload_check["reason"])

    # Deduct credits AFTER validation passes
    credit_cost = get_credit_cost(upload_type)
    deducted = await deduct_credits(user["id"], credit_cost)
    if not deducted:
        raise HTTPException(status_code=403, detail="Failed to deduct credits. Please try again.")

    # Read file content
    pdf_bytes = await file.read()

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
        # Refund credits on upload failure
        from services.supabase_client import refund_credits
        await refund_credits(user["id"], credit_cost)
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    # Determine initial status based on upload type
    # - notes: Queue immediately for processing
    # - book: Wait for chapter selection
    if upload_type == "book":
        initial_status = "pending_selection"
        message = f"Book uploaded ({credit_cost} credits used). Please select chapters to process."
    else:
        initial_status = "queued"
        message = f"Notes uploaded ({credit_cost} credit used). Added to processing queue."

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

    return UploadResponse(
        book_id=book["id"],
        message=message
    )


@router.get("/usage")
async def get_usage(user: dict = Depends(get_current_user)):
    """Get user's credit info."""
    usage = await get_user_usage(user["id"])

    return {
        "credits": usage["credits"],
        "tier": usage.get("tier", "free"),
        "book_cost": usage["book_cost"],
        "notes_cost": usage["notes_cost"]
    }
