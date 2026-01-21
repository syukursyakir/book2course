from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class BookStatus(str, Enum):
    UPLOADING = "uploading"
    PENDING_SELECTION = "pending_selection"  # Book awaiting chapter selection
    QUEUED = "queued"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


# Request schemas
class QuizSubmission(BaseModel):
    lesson_id: str
    answers: Dict[str, Any]


# Response schemas
class BookResponse(BaseModel):
    id: str
    user_id: str
    title: str
    file_url: str
    status: BookStatus
    created_at: datetime


class LessonBrief(BaseModel):
    id: str
    title: str
    order: int
    completed: bool = False


class ChapterResponse(BaseModel):
    id: str
    title: str
    description: str
    order: int
    lessons: List[LessonBrief]


class CourseResponse(BaseModel):
    id: str
    title: str
    description: str
    chapters_count: int
    lessons_count: int
    progress: float
    status: BookStatus
    created_at: datetime
    processing_step: Optional[str] = None  # Current processing step for books being processed
    queue_position: Optional[int] = None  # Position in queue (1 = next to be processed)
    quality_mode: Optional[str] = None  # PRESERVE or ENHANCE
    quality_scores: Optional[Dict[str, Any]] = None  # The full quality detection result


class CourseDetailResponse(BaseModel):
    course: CourseResponse
    chapters: List[ChapterResponse]


class LessonContent(BaseModel):
    introduction: str
    explanation: str
    examples: List[Any]  # Can be strings or objects with title/content
    keyPoints: List[Any]  # Can be strings or objects with title/description
    summary: str
    # New enhanced fields (optional for backwards compatibility)
    key_concepts: Optional[List[Any]] = None  # {term, definition}
    common_mistakes: Optional[List[Any]] = None  # {mistake, correction} - ENHANCE mode
    actionable_steps: Optional[List[Any]] = None  # {step, details} - ENHANCE mode
    before_you_move_on: Optional[List[str]] = None  # List of checkpoints


class MCQQuestion(BaseModel):
    type: str = "mcq"
    id: str
    question: str
    options: List[Any]  # Can be strings or objects
    correctAnswer: int
    difficulty: Optional[int] = None  # 1-4 (recall, understand, apply, analyze)
    question_type: Optional[str] = None  # recall, understand, apply, analyze
    explanation: Optional[str] = None


class ShortAnswerQuestion(BaseModel):
    type: str = "short_answer"
    id: str
    question: str
    sampleAnswer: str


class QualityResult(BaseModel):
    specificity_score: int
    technical_depth_score: int
    actionability_score: int
    average_score: float
    mode: str  # PRESERVE or ENHANCE
    reasoning: str


class LessonDetailResponse(BaseModel):
    id: str
    title: str
    order: int
    content: LessonContent
    completed: bool = False


class LessonWithQuizResponse(BaseModel):
    lesson: LessonDetailResponse
    quiz: List[Dict[str, Any]]


class QuizResultResponse(BaseModel):
    score: int
    total: int


class ProgressResponse(BaseModel):
    completed_lessons: List[str]
    total_lessons: int
    percentage: float


class UploadResponse(BaseModel):
    book_id: str
    message: str


# AI Generation schemas
class ChunkSummary(BaseModel):
    topics: List[str]
    concepts: List[str]
    summary: str


class BookOverview(BaseModel):
    title: str
    main_themes: List[str]
    key_concepts: List[str]
    target_audience: str
    learning_objectives: List[str]


class CourseStructure(BaseModel):
    chapters: List[Dict[str, Any]]


class GeneratedLesson(BaseModel):
    title: str
    content: LessonContent
    quiz: List[Dict[str, Any]]
