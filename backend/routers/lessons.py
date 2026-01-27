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


@router.get("/analytics/quiz")
async def get_quiz_analytics(user: dict = Depends(get_current_user)):
    """Get quiz performance analytics for the user."""
    client = get_supabase_client()

    # Get all progress records with quiz scores for this user
    progress_result = client.table("progress").select(
        "quiz_score, lesson_id, created_at, lessons(title, chapter_id, chapters(title, course_id, courses(title)))"
    ).eq("user_id", user["id"]).not_.is_("quiz_score", "null").order("created_at", desc=True).execute()

    records = progress_result.data or []

    if not records:
        return {
            "total_quizzes": 0,
            "average_score": 0,
            "best_score": 0,
            "worst_score": 0,
            "recent_trend": [],
            "by_course": [],
            "weak_areas": [],
            "strong_areas": []
        }

    # Calculate statistics
    scores = [r["quiz_score"] for r in records if r["quiz_score"] is not None]
    total_quizzes = len(scores)
    average_score = sum(scores) / total_quizzes if scores else 0
    best_score = max(scores) if scores else 0
    worst_score = min(scores) if scores else 0

    # Recent trend (last 10 quizzes)
    recent_trend = [
        {
            "lesson": r["lessons"]["title"] if r.get("lessons") else "Unknown",
            "score": r["quiz_score"],
            "date": r["created_at"]
        }
        for r in records[:10]
    ]

    # Group by course
    course_scores = {}
    for r in records:
        try:
            course_title = r["lessons"]["chapters"]["courses"]["title"]
            course_id = r["lessons"]["chapters"]["courses"]["title"]  # Using title as key
        except (KeyError, TypeError):
            course_title = "Unknown Course"
            course_id = "unknown"

        if course_id not in course_scores:
            course_scores[course_id] = {"title": course_title, "scores": []}
        course_scores[course_id]["scores"].append(r["quiz_score"])

    by_course = [
        {
            "course": data["title"],
            "quizzes_taken": len(data["scores"]),
            "average_score": sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0
        }
        for data in course_scores.values()
    ]

    # Identify weak and strong areas (by chapter)
    chapter_scores = {}
    for r in records:
        try:
            chapter_title = r["lessons"]["chapters"]["title"]
        except (KeyError, TypeError):
            chapter_title = "Unknown Chapter"

        if chapter_title not in chapter_scores:
            chapter_scores[chapter_title] = []
        chapter_scores[chapter_title].append(r["quiz_score"])

    chapter_averages = [
        {"chapter": title, "average": sum(scores) / len(scores)}
        for title, scores in chapter_scores.items()
    ]
    chapter_averages.sort(key=lambda x: x["average"])

    weak_areas = chapter_averages[:3] if len(chapter_averages) >= 3 else chapter_averages
    strong_areas = chapter_averages[-3:][::-1] if len(chapter_averages) >= 3 else chapter_averages[::-1]

    return {
        "total_quizzes": total_quizzes,
        "average_score": round(average_score, 1),
        "best_score": best_score,
        "worst_score": worst_score,
        "recent_trend": recent_trend,
        "by_course": by_course,
        "weak_areas": weak_areas,
        "strong_areas": strong_areas
    }
