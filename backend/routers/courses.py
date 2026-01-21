from fastapi import APIRouter, HTTPException, Depends
from typing import List
from routers.auth import get_current_user
from services.supabase_client import (
    get_user_courses,
    get_user_books,
    get_course_with_chapters,
    get_user_progress,
    delete_book,
    delete_course
)
from services.queue_worker import queue_worker
from models.schemas import CourseResponse, CourseDetailResponse, ChapterResponse, LessonBrief

router = APIRouter(prefix="/api", tags=["courses"])


@router.get("/courses", response_model=List[CourseResponse])
async def list_courses(user: dict = Depends(get_current_user)):
    """Get all courses for the current user, including processing books."""
    courses = await get_user_courses(user["id"])
    books = await get_user_books(user["id"])

    # Track which books have courses
    books_with_courses = {course["book_id"] for course in courses}

    result = []

    # Add processing/error/queued/pending_selection books first (that don't have courses yet)
    for book in books:
        if book["id"] not in books_with_courses:
            # Calculate queue position for queued books
            queue_position = None
            if book["status"] == "queued":
                queue_position = await queue_worker.get_queue_position(book["id"])

            # Set description based on status
            if book["status"] == "pending_selection":
                description = "Click to select chapters for your course."
            else:
                description = "Your book is being processed by our AI..."

            result.append(CourseResponse(
                id=book["id"],
                title=book["title"],
                description=description,
                chapters_count=0,
                lessons_count=0,
                progress=0,
                status=book["status"],  # "pending_selection", "queued", "processing", or "error"
                processing_step=book.get("processing_step"),  # Current step
                queue_position=queue_position,
                created_at=book["created_at"]
            ))

    # Add completed courses
    for course in courses:
        # Get progress for this course
        progress = await get_user_progress(user["id"], course["id"])

        # Count chapters and lessons from structure
        structure = course.get("structure_json", {})
        chapters = structure.get("chapters", [])
        lessons_count = sum(len(ch.get("lessons", [])) for ch in chapters)

        result.append(CourseResponse(
            id=course["id"],
            title=course["title"],
            description=course["description"],
            chapters_count=len(chapters),
            lessons_count=lessons_count,
            progress=progress["percentage"],
            status="ready",  # Courses in DB are ready
            created_at=course["created_at"],
            quality_mode=course.get("quality_mode"),
            quality_scores=course.get("quality_scores")
        ))

    return result


@router.get("/courses/{course_id}")
async def get_course(course_id: str, user: dict = Depends(get_current_user)):
    """Get a specific course with chapters and lessons."""
    data = await get_course_with_chapters(course_id)

    if not data["course"]:
        raise HTTPException(status_code=404, detail="Course not found")

    course = data["course"]

    # Verify ownership
    if course["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get progress
    progress = await get_user_progress(user["id"], course_id)
    completed_lesson_ids = set(progress["completed_lessons"])

    # Build chapter response
    chapters = []
    total_lessons = 0

    for chapter in data["chapters"]:
        lessons = []
        for lesson in chapter.get("lessons", []):
            lessons.append(LessonBrief(
                id=lesson["id"],
                title=lesson["title"],
                order=lesson["order"],
                completed=lesson["id"] in completed_lesson_ids
            ))
            total_lessons += 1

        # Sort lessons by order
        lessons.sort(key=lambda x: x.order)

        chapters.append(ChapterResponse(
            id=chapter["id"],
            title=chapter["title"],
            description="",  # Could add description to DB
            order=chapter["order"],
            lessons=lessons
        ))

    # Sort chapters by order
    chapters.sort(key=lambda x: x.order)

    course_response = CourseResponse(
        id=course["id"],
        title=course["title"],
        description=course["description"],
        chapters_count=len(chapters),
        lessons_count=total_lessons,
        progress=progress["percentage"],
        status="ready",
        created_at=course["created_at"],
        quality_mode=course.get("quality_mode"),
        quality_scores=course.get("quality_scores")
    )

    return {
        "course": course_response,
        "chapters": chapters
    }


@router.delete("/courses/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
    """Delete a course or processing book by ID."""
    # Try to delete as a course first
    deleted = await delete_course(item_id, user["id"])

    # If not found as course, try as a book (processing books)
    if not deleted:
        deleted = await delete_book(item_id, user["id"])

    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")

    return {"success": True}
