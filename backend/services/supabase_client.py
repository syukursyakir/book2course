import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Credit costs
CREDIT_COST_BOOK = 5
CREDIT_COST_NOTES = 1
DEFAULT_FREE_CREDITS = 5


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


# ==================== CREDIT SYSTEM ====================

async def get_user_credits(user_id: str) -> int:
    """Get user's current credit balance."""
    try:
        client = get_supabase_client()
        result = client.table("profiles").select("credits").eq("user_id", user_id).execute()

        if not result.data:
            # Create profile with default credits for new user
            await ensure_user_profile(user_id)
            return DEFAULT_FREE_CREDITS

        return result.data[0].get("credits", DEFAULT_FREE_CREDITS)
    except Exception as e:
        print(f"[CREDITS] Error getting credits: {e}")
        return 0


async def ensure_user_profile(user_id: str) -> None:
    """Ensure user has a profile with default credits."""
    try:
        client = get_supabase_client()
        client.table("profiles").upsert({
            "user_id": user_id,
            "credits": DEFAULT_FREE_CREDITS,
            "tier": "free"
        }, on_conflict="user_id").execute()
    except Exception as e:
        print(f"[CREDITS] Error ensuring profile: {e}")


async def deduct_credits(user_id: str, amount: int) -> bool:
    """
    Deduct credits from user's balance.
    Returns True if successful, False if insufficient credits.
    """
    try:
        client = get_supabase_client()

        # Get current credits
        current = await get_user_credits(user_id)
        if current < amount:
            return False

        # Deduct credits
        new_balance = current - amount
        client.table("profiles").update({
            "credits": new_balance
        }).eq("user_id", user_id).execute()

        print(f"[CREDITS] Deducted {amount} credits from user {user_id}. New balance: {new_balance}")
        return True
    except Exception as e:
        print(f"[CREDITS] Error deducting credits: {e}")
        return False


async def add_credits(user_id: str, amount: int) -> int:
    """
    Add credits to user's balance.
    Returns new balance.
    """
    try:
        client = get_supabase_client()

        # Ensure profile exists
        await ensure_user_profile(user_id)

        # Get current credits
        current = await get_user_credits(user_id)
        new_balance = current + amount

        # Update credits
        client.table("profiles").update({
            "credits": new_balance
        }).eq("user_id", user_id).execute()

        print(f"[CREDITS] Added {amount} credits to user {user_id}. New balance: {new_balance}")
        return new_balance
    except Exception as e:
        print(f"[CREDITS] Error adding credits: {e}")
        return 0


async def refund_credits(user_id: str, amount: int) -> int:
    """Refund credits to user (alias for add_credits)."""
    return await add_credits(user_id, amount)


def get_credit_cost(upload_type: str) -> int:
    """Get credit cost for an upload type."""
    if upload_type == "book":
        return CREDIT_COST_BOOK
    return CREDIT_COST_NOTES


async def check_upload_allowed(user_id: str, upload_type: str) -> dict:
    """
    Check if user has enough credits for upload.
    Returns: {"allowed": bool, "reason": str or None, "credits": int, "cost": int}
    """
    credits = await get_user_credits(user_id)
    cost = get_credit_cost(upload_type)

    if credits < cost:
        return {
            "allowed": False,
            "reason": f"Not enough credits. You need {cost} credits for this upload, but you have {credits}.",
            "credits": credits,
            "cost": cost
        }

    return {
        "allowed": True,
        "reason": None,
        "credits": credits,
        "cost": cost
    }


async def get_user_usage(user_id: str) -> dict:
    """
    Get user's credit info.
    Returns credits balance and cost info.
    """
    credits = await get_user_credits(user_id)

    return {
        "credits": credits,
        "book_cost": CREDIT_COST_BOOK,
        "notes_cost": CREDIT_COST_NOTES
    }
