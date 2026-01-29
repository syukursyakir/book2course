"""Admin endpoints for maintenance tasks."""

import json
from fastapi import APIRouter, HTTPException, Depends
from routers.auth import get_current_user
from services.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Admin email whitelist
ADMIN_EMAILS = ["nyfspade@gmail.com", "syakirbusiness.syukur@gmail.com"]


def require_admin(user: dict = Depends(get_current_user)):
    """Require user to be an admin."""
    if user.get("email") not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/fix-lessons")
async def fix_lesson_content(user: dict = Depends(require_admin)):
    """Fix lessons with nested JSON or empty keyPoints."""
    client = get_supabase_client()

    # Get all lessons with content
    result = client.table("lessons").select("id, title, content_json").not_.is_("content_json", "null").execute()
    lessons = result.data or []

    fixed_count = 0

    for lesson in lessons:
        lesson_id = lesson["id"]
        title = lesson["title"]
        content = lesson.get("content_json") or {}

        if not content:
            continue

        original_content = json.dumps(content, sort_keys=True)
        modified = False

        # Fix 1: Nested JSON in explanation
        explanation = content.get("explanation", "")
        if isinstance(explanation, str) and explanation.strip().startswith("{"):
            try:
                nested = json.loads(explanation)
                if isinstance(nested, dict):
                    for key, value in nested.items():
                        if key not in content or not content[key]:
                            content[key] = value
                        elif key == "explanation":
                            content["explanation"] = value
                    modified = True
            except json.JSONDecodeError:
                pass

        # Fix 2: Empty keyPoints descriptions
        key_points = content.get("keyPoints", [])
        for kp in key_points:
            kp_title = kp.get("title", "")
            kp_desc = kp.get("description", "")
            if kp_title and not kp_desc:
                kp["description"] = f"Understanding {kp_title} is essential for mastering this topic."
                modified = True

        if modified:
            content["keyPoints"] = key_points
            client.table("lessons").update({"content_json": content}).eq("id", lesson_id).execute()
            fixed_count += 1

    return {"fixed_count": fixed_count, "total_checked": len(lessons)}


@router.delete("/courses/{course_id}")
async def delete_error_course(course_id: str, user: dict = Depends(require_admin)):
    """Delete a course in error state."""
    client = get_supabase_client()

    # Check course exists
    course = client.table("courses").select("id, status, book_id").eq("id", course_id).execute()

    if not course.data:
        raise HTTPException(status_code=404, detail="Course not found")

    book_id = course.data[0].get("book_id")

    # Delete course (cascades to chapters -> lessons)
    client.table("courses").delete().eq("id", course_id).execute()

    # Delete associated book
    if book_id:
        client.table("books").delete().eq("id", book_id).execute()

    return {"deleted": True, "course_id": course_id}


@router.post("/reprocess/{book_id}")
async def reprocess_book(book_id: str, user: dict = Depends(require_admin)):
    """Reset a book to queued state for reprocessing."""
    client = get_supabase_client()

    # Check book exists
    book = client.table("books").select("id, status").eq("id", book_id).execute()

    if not book.data:
        raise HTTPException(status_code=404, detail="Book not found")

    # Delete existing course if any
    client.table("courses").delete().eq("book_id", book_id).execute()

    # Reset book status
    client.table("books").update({
        "status": "queued",
        "processing_step": "Queued for reprocessing"
    }).eq("id", book_id).execute()

    # Start worker
    from services.queue_worker import queue_worker
    if not queue_worker.is_processing:
        queue_worker.start()

    return {"reprocessing": True, "book_id": book_id}


@router.get("/stats")
async def get_admin_stats(user: dict = Depends(require_admin)):
    """Get admin statistics."""
    client = get_supabase_client()

    # Count by status
    books = client.table("books").select("status").execute()
    courses = client.table("courses").select("status").execute()
    lessons = client.table("lessons").select("id").execute()
    users = client.table("profiles").select("id, tier").execute()

    book_stats = {}
    for b in books.data or []:
        status = b["status"]
        book_stats[status] = book_stats.get(status, 0) + 1

    course_stats = {}
    for c in courses.data or []:
        status = c["status"]
        course_stats[status] = course_stats.get(status, 0) + 1

    tier_stats = {}
    for u in users.data or []:
        tier = u.get("tier", "free")
        tier_stats[tier] = tier_stats.get(tier, 0) + 1

    return {
        "books": {"total": len(books.data or []), "by_status": book_stats},
        "courses": {"total": len(courses.data or []), "by_status": course_stats},
        "lessons": {"total": len(lessons.data or [])},
        "users": {"total": len(users.data or []), "by_tier": tier_stats}
    }
