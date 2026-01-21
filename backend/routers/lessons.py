from fastapi import APIRouter, HTTPException, Depends
from routers.auth import get_current_user
from services.supabase_client import get_lesson, mark_lesson_complete, get_supabase_client
from models.schemas import (
    LessonDetailResponse,
    LessonWithQuizResponse,
    LessonContent,
    QuizSubmission,
    QuizResultResponse
)

router = APIRouter(prefix="/api", tags=["lessons"])


@router.get("/lessons/{lesson_id}")
async def get_lesson_detail(lesson_id: str, user: dict = Depends(get_current_user)):
    """Get lesson content and quiz."""
    lesson = await get_lesson(lesson_id)

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Verify user has access to this lesson (through course ownership)
    client = get_supabase_client()
    chapter = client.table("chapters").select(
        "course_id, courses(user_id)"
    ).eq("id", lesson["chapter_id"]).single().execute()

    if not chapter.data or chapter.data["courses"]["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if lesson is completed
    progress = client.table("progress").select("completed").eq(
        "user_id", user["id"]
    ).eq("lesson_id", lesson_id).execute()

    completed = progress.data[0]["completed"] if progress.data else False

    content_json = lesson.get("content_json", {})
    content = LessonContent(
        introduction=content_json.get("introduction", ""),
        explanation=content_json.get("explanation", ""),
        examples=content_json.get("examples", []),
        keyPoints=content_json.get("keyPoints", []),
        summary=content_json.get("summary", ""),
        # Enhanced content fields (may be None for free tier or older lessons)
        key_concepts=content_json.get("key_concepts"),
        common_mistakes=content_json.get("common_mistakes"),
        actionable_steps=content_json.get("actionable_steps"),
        before_you_move_on=content_json.get("before_you_move_on")
    )

    lesson_detail = LessonDetailResponse(
        id=lesson["id"],
        title=lesson["title"],
        order=lesson["order"],
        content=content,
        completed=completed
    )

    return LessonWithQuizResponse(
        lesson=lesson_detail,
        quiz=lesson.get("quiz_json", [])
    )


@router.post("/quiz/submit", response_model=QuizResultResponse)
async def submit_quiz(
    submission: QuizSubmission,
    user: dict = Depends(get_current_user)
):
    """Submit quiz answers and get score."""
    lesson = await get_lesson(submission.lesson_id)

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    quiz_questions = lesson.get("quiz_json", [])

    # Calculate score for MCQ questions
    correct = 0
    total_mcq = 0

    for question in quiz_questions:
        if question.get("type") == "mcq":
            total_mcq += 1
            user_answer = submission.answers.get(question["id"])
            if user_answer is not None and user_answer == question.get("correctAnswer"):
                correct += 1

    # Mark lesson as complete
    score_percentage = (correct / total_mcq * 100) if total_mcq > 0 else 100
    await mark_lesson_complete(user["id"], submission.lesson_id, int(score_percentage))

    return QuizResultResponse(score=correct, total=total_mcq)


@router.post("/progress/complete/{lesson_id}")
async def complete_lesson(lesson_id: str, user: dict = Depends(get_current_user)):
    """Mark a lesson as complete without quiz."""
    lesson = await get_lesson(lesson_id)

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    await mark_lesson_complete(user["id"], lesson_id)

    return {"success": True}


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson_with_score(
    lesson_id: str,
    body: dict = None,
    user: dict = Depends(get_current_user)
):
    """Mark a lesson as complete with optional quiz score."""
    lesson = await get_lesson(lesson_id)

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    quiz_score = body.get("quiz_score") if body else None
    await mark_lesson_complete(user["id"], lesson_id, quiz_score)

    return {"success": True}


@router.get("/progress/{course_id}")
async def get_progress(course_id: str, user: dict = Depends(get_current_user)):
    """Get user progress for a course."""
    from services.supabase_client import get_user_progress

    progress = await get_user_progress(user["id"], course_id)
    return progress
