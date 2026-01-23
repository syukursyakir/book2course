import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase credentials not configured")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


async def verify_token(token: str) -> dict | None:
    """Verify JWT token and return user data."""
    try:
        client = get_supabase_client()
        user = client.auth.get_user(token)
        return user.user.model_dump() if user.user else None
    except Exception:
        return None


async def upload_file_to_storage(
    bucket: str,
    path: str,
    file_data: bytes,
    content_type: str
) -> str:
    """Upload file to Supabase storage and return public URL."""
    client = get_supabase_client()

    # Upload file
    client.storage.from_(bucket).upload(
        path,
        file_data,
        {"content-type": content_type}
    )

    # Get public URL
    url = client.storage.from_(bucket).get_public_url(path)
    return url


async def create_book(
    user_id: str,
    title: str,
    file_url: str,
    status: str = "queued",
    upload_type: str = "notes"
) -> dict:
    """Create a new book record."""
    client = get_supabase_client()
    data = {
        "user_id": user_id,
        "title": title,
        "file_url": file_url,
        "status": status
    }

    # Try to insert with upload_type, fallback if column doesn't exist yet
    try:
        data["upload_type"] = upload_type
        result = client.table("books").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[DB] Could not insert with upload_type, trying without: {e}")
        del data["upload_type"]
        result = client.table("books").insert(data).execute()
        return result.data[0] if result.data else None


async def update_book_status(book_id: str, status: str, processing_step: str = None) -> None:
    """Update book processing status and optionally the current processing step."""
    client = get_supabase_client()
    data = {"status": status}

    # Try to update with processing_step first, fallback to just status
    if processing_step is not None:
        try:
            data["processing_step"] = processing_step
            client.table("books").update(data).eq("id", book_id).execute()
            return
        except Exception:
            # Column might not exist, try without it
            data = {"status": status}

    client.table("books").update(data).eq("id", book_id).execute()


async def update_book_progress(book_id: str, step: str) -> None:
    """Update the current processing step for a book."""
    try:
        client = get_supabase_client()
        client.table("books").update({"processing_step": step}).eq("id", book_id).execute()
    except Exception as e:
        # Silently ignore if column doesn't exist yet
        print(f"[PROGRESS] Could not update progress (column may not exist): {e}")


async def create_course(
    book_id: str,
    user_id: str,
    title: str,
    description: str,
    structure_json: dict,
    quality_mode: str = None,
    quality_scores: dict = None
) -> dict:
    """Create a new course record."""
    client = get_supabase_client()
    base_data = {
        "book_id": book_id,
        "user_id": user_id,
        "title": title,
        "description": description,
        "structure_json": structure_json
    }

    # Try to insert with quality fields first
    if quality_mode or quality_scores:
        try:
            data = {**base_data}
            if quality_mode:
                data["quality_mode"] = quality_mode
            if quality_scores:
                data["quality_scores"] = quality_scores
            result = client.table("courses").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"[DB] Could not insert with quality fields, trying without: {e}")

    # Fallback to basic insert
    result = client.table("courses").insert(base_data).execute()
    return result.data[0] if result.data else None


async def create_chapter(
    course_id: str,
    title: str,
    order: int,
    source_sections: list
) -> dict:
    """Create a new chapter record."""
    client = get_supabase_client()
    result = client.table("chapters").insert({
        "course_id": course_id,
        "title": title,
        "order": order,
        "source_sections": source_sections
    }).execute()
    return result.data[0] if result.data else None


async def create_lesson(
    chapter_id: str,
    title: str,
    order: int,
    content_json: dict,
    quiz_json: list
) -> dict:
    """Create a new lesson record."""
    client = get_supabase_client()
    result = client.table("lessons").insert({
        "chapter_id": chapter_id,
        "title": title,
        "order": order,
        "content_json": content_json,
        "quiz_json": quiz_json
    }).execute()
    return result.data[0] if result.data else None


async def get_user_courses(user_id: str) -> list:
    """Get all courses for a user."""
    client = get_supabase_client()
    result = client.table("courses").select("*").eq("user_id", user_id).execute()
    return result.data


async def get_user_books(user_id: str) -> list:
    """Get all books for a user (including processing ones)."""
    client = get_supabase_client()
    result = client.table("books").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return result.data


async def get_course_with_chapters(course_id: str) -> dict:
    """Get course with all chapters and lessons."""
    client = get_supabase_client()

    # Get course
    course = client.table("courses").select("*").eq("id", course_id).single().execute()

    # Get chapters with lessons
    chapters = client.table("chapters").select(
        "*, lessons(*)"
    ).eq("course_id", course_id).order("order").execute()

    return {
        "course": course.data,
        "chapters": chapters.data
    }


async def get_lesson(lesson_id: str) -> dict:
    """Get lesson with content and quiz."""
    client = get_supabase_client()
    result = client.table("lessons").select("*").eq("id", lesson_id).single().execute()
    return result.data


async def get_user_progress(user_id: str, course_id: str) -> dict:
    """Get user progress for a course."""
    client = get_supabase_client()

    # Get all lessons in course
    chapters = client.table("chapters").select(
        "lessons(id)"
    ).eq("course_id", course_id).execute()

    all_lesson_ids = []
    for chapter in chapters.data:
        for lesson in chapter.get("lessons", []):
            all_lesson_ids.append(lesson["id"])

    # Get completed lessons
    progress = client.table("progress").select("lesson_id").eq(
        "user_id", user_id
    ).eq("completed", True).in_("lesson_id", all_lesson_ids).execute()

    completed_ids = [p["lesson_id"] for p in progress.data]

    return {
        "completed_lessons": completed_ids,
        "total_lessons": len(all_lesson_ids),
        "percentage": (len(completed_ids) / len(all_lesson_ids) * 100) if all_lesson_ids else 0
    }


async def mark_lesson_complete(user_id: str, lesson_id: str, quiz_score: int = None) -> None:
    """Mark a lesson as complete."""
    client = get_supabase_client()

    # Upsert progress record
    client.table("progress").upsert({
        "user_id": user_id,
        "lesson_id": lesson_id,
        "completed": True,
        "quiz_score": quiz_score
    }, on_conflict="user_id,lesson_id").execute()


async def delete_book(book_id: str, user_id: str) -> bool:
    """Delete a book and its associated course/chapters/lessons."""
    client = get_supabase_client()

    # Verify ownership
    book = client.table("books").select("*").eq("id", book_id).eq("user_id", user_id).execute()
    if not book.data:
        return False

    # Delete the book (cascades to course -> chapters -> lessons due to foreign keys)
    client.table("books").delete().eq("id", book_id).execute()
    return True


async def get_user_tier(user_id: str) -> str:
    """
    Get the user's subscription tier.
    Returns: 'free', 'basic', or 'pro'
    """
    try:
        client = get_supabase_client()
        result = client.table("profiles").select("tier, subscription_status").eq("user_id", user_id).execute()

        if not result.data:
            return "free"

        profile = result.data[0]
        tier = profile.get("tier", "free")
        status = profile.get("subscription_status")

        # Only return paid tier if subscription is active
        if tier in ("basic", "pro") and status == "active":
            return tier

        return "free"
    except Exception as e:
        print(f"[TIER] Error getting user tier: {e}")
        return "free"


async def get_user_usage(user_id: str) -> dict:
    """
    Get user's upload usage for the current month.
    Returns counts of books and notes uploaded this month.
    """
    from datetime import datetime

    client = get_supabase_client()

    # Get first day of current month
    now = datetime.now()
    month_start = datetime(now.year, now.month, 1).isoformat()

    # Count books uploaded this month
    books_result = client.table("books").select("id", count="exact").eq(
        "user_id", user_id
    ).eq("upload_type", "book").gte("created_at", month_start).execute()

    # Count notes uploaded this month
    notes_result = client.table("books").select("id", count="exact").eq(
        "user_id", user_id
    ).eq("upload_type", "notes").gte("created_at", month_start).execute()

    return {
        "books_this_month": books_result.count or 0,
        "notes_this_month": notes_result.count or 0
    }


def get_tier_limits(tier: str) -> dict:
    """
    Get upload limits for a tier.
    Returns: {"books_limit": int or None, "notes_limit": int or None}
    None means unlimited.
    """
    limits = {
        "free": {"books_limit": 0, "notes_limit": 2, "can_upload_books": False},
        "basic": {"books_limit": 10, "notes_limit": 20, "can_upload_books": True},
        "pro": {"books_limit": None, "notes_limit": None, "can_upload_books": True}  # None = unlimited
    }
    return limits.get(tier, limits["free"])


async def check_upload_allowed(user_id: str, upload_type: str) -> dict:
    """
    Check if user can upload based on their tier and usage.
    Returns: {"allowed": bool, "reason": str or None, "usage": dict, "limits": dict}
    """
    tier = await get_user_tier(user_id)
    limits = get_tier_limits(tier)
    usage = await get_user_usage(user_id)

    # Check if books are allowed for this tier
    if upload_type == "book" and not limits["can_upload_books"]:
        return {
            "allowed": False,
            "reason": "Book uploads require a Basic or Pro subscription",
            "usage": usage,
            "limits": limits,
            "tier": tier
        }

    # Check monthly limits
    if upload_type == "book":
        limit = limits["books_limit"]
        current = usage["books_this_month"]
        if limit is not None and current >= limit:
            return {
                "allowed": False,
                "reason": f"Monthly book limit reached ({current}/{limit}). Upgrade for more.",
                "usage": usage,
                "limits": limits,
                "tier": tier
            }
    else:  # notes
        limit = limits["notes_limit"]
        current = usage["notes_this_month"]
        if limit is not None and current >= limit:
            return {
                "allowed": False,
                "reason": f"Monthly notes limit reached ({current}/{limit}). Upgrade for more.",
                "usage": usage,
                "limits": limits,
                "tier": tier
            }

    return {
        "allowed": True,
        "reason": None,
        "usage": usage,
        "limits": limits,
        "tier": tier
    }


async def delete_course(course_id: str, user_id: str) -> bool:
    """Delete a course and its associated chapters/lessons."""
    client = get_supabase_client()

    # Verify ownership
    course = client.table("courses").select("*").eq("id", course_id).eq("user_id", user_id).execute()
    if not course.data:
        return False

    # Get book_id to delete the book too
    book_id = course.data[0].get("book_id")

    # Delete the course (will cascade to chapters -> lessons)
    client.table("courses").delete().eq("id", course_id).execute()

    # Also delete the book
    if book_id:
        client.table("books").delete().eq("id", book_id).execute()

    return True
