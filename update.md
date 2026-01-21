# Book2Course Enhancement Spec

## Overview

Upgrade Book2Course with:
1. Book vs Notes upload flow
2. Chapter selection for books
3. Quality detection (ENHANCE vs PRESERVE mode)
4. Better quiz generation

---

## Part 1: Upload Flow

### Upload Screen

User first chooses what they're uploading:

```
┌─────────────────────────────────────────────────────────┐
│  What are you uploading?                                │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │ 📚 Book         │  │ 📝 Notes        │              │
│  │                 │  │                 │              │
│  │ Textbooks,      │  │ Lecture notes,  │              │
│  │ manuals,        │  │ slides, short   │              │
│  │ long guides     │  │ docs, articles  │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  [Upload PDF]                                           │
└─────────────────────────────────────────────────────────┘
```

---

### Flow A: Notes

Simple and fast, no extra choices:

```
Upload → Process immediately → Course ready
```

- No chapter selection
- Process entire document
- Usually <100 pages so it's fast
- More likely to need ENHANCE mode (notes are often messy)

---

### Flow B: Book

After upload, extract TOC and show options:

```
┌─────────────────────────────────────────────────────────┐
│  📖 "Chemistry 101.pdf"                                 │
│  850 pages • 24 chapters detected                       │
│                                                         │
│  How do you want to create your course?                 │
│                                                         │
│  ○ Full book                                            │
│    Process everything (background, ~25 min)             │
│    We'll email you when it's ready.                     │
│                                                         │
│  ● Select chapters                                      │
│    Pick specific chapters to include                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ ☑ Chapter 1: Introduction (pg 1-14)            │    │
│  │ ☑ Chapter 2: Atomic Structure (pg 15-44)       │    │
│  │ ☐ Chapter 3: Chemical Bonds (pg 45-82)         │    │
│  │ ☐ Chapter 4: Reactions (pg 83-120)             │    │
│  │ ...                                             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Selected: 2 chapters (~60 pages, ~3 min)               │
│                                                         │
│  [Generate Course]                                      │
└─────────────────────────────────────────────────────────┘
```

**Full book:** Background job, email/notify when done
**Select chapters:** Process immediately, show progress

---

## Part 2: TOC Extraction

### Step 1: Try PDF metadata first (fast, no AI)

```python
import fitz  # pymupdf

def extract_toc_from_metadata(pdf_path):
    doc = fitz.open(pdf_path)
    toc = doc.get_toc()
    # Returns: [[level, title, page], ...]
    # Example: [[1, "Chapter 1: Introduction", 1], [1, "Chapter 2: Atoms", 15], ...]
    
    if toc:
        return [
            {"level": item[0], "title": item[1], "page": item[2]}
            for item in toc
        ]
    return None
```

### Step 2: Fallback - AI extraction from first pages

If no TOC metadata, extract text from first 10 pages and use AI:

```python
def extract_toc_with_ai(pdf_path):
    # Get first 10 pages text (usually contains table of contents)
    first_pages_text = extract_text(pdf_path, pages=range(0, 10))
    
    prompt = """
    Extract the chapter/section list from this table of contents.
    
    Text from first pages:
    {first_pages_text}
    
    Return JSON:
    {
      "chapters": [
        {"number": 1, "title": "Introduction", "start_page": 1},
        {"number": 2, "title": "Atomic Structure", "start_page": 15},
        {"number": 3, "title": "Chemical Bonds", "start_page": 45}
      ]
    }
    
    If no clear chapter structure found, return:
    {"chapters": null}
    """
    
    return call_ai(prompt)
```

### Step 3: Calculate page ranges

```python
def calculate_chapter_pages(chapters, total_pages):
    for i, chapter in enumerate(chapters):
        if i < len(chapters) - 1:
            chapter["end_page"] = chapters[i + 1]["start_page"] - 1
        else:
            chapter["end_page"] = total_pages
        
        chapter["page_count"] = chapter["end_page"] - chapter["start_page"] + 1
    
    return chapters
```

---

## Part 3: Extract Selected Chapters

When user selects specific chapters, extract only those pages:

```python
import fitz

def extract_chapter_pages(pdf_path, chapters_selected):
    """
    chapters_selected: [{"start_page": 15, "end_page": 44}, ...]
    """
    doc = fitz.open(pdf_path)
    new_doc = fitz.open()
    
    for chapter in chapters_selected:
        # Pages are 0-indexed in pymupdf
        start = chapter["start_page"] - 1
        end = chapter["end_page"] - 1
        new_doc.insert_pdf(doc, from_page=start, to_page=end)
    
    # Save to temp file or bytes
    output_path = f"/tmp/selected_chapters_{uuid4()}.pdf"
    new_doc.save(output_path)
    return output_path
```

---

## Part 4: Background Processing for Full Books

For full book option, use a job queue:

```python
# When user selects "Full book"
async def handle_full_book_upload(pdf_path, user_id, user_email):
    # 1. Save job to database
    job = await db.jobs.create({
        "user_id": user_id,
        "pdf_path": pdf_path,
        "status": "queued",
        "created_at": datetime.now()
    })
    
    # 2. Add to background queue (Supabase Edge Function, Celery, or simple cron)
    await queue.add("process_book", {"job_id": job.id})
    
    # 3. Return immediately to user
    return {"message": "Processing started", "job_id": job.id}

# Background worker
async def process_book_job(job_id):
    job = await db.jobs.get(job_id)
    
    try:
        # Process the full book
        course = await generate_course(job.pdf_path)
        
        # Update job status
        await db.jobs.update(job_id, {"status": "completed", "course_id": course.id})
        
        # Notify user
        await send_email(job.user.email, "Your course is ready!", course.url)
        # OR push notification
        # OR in-app notification
        
    except Exception as e:
        await db.jobs.update(job_id, {"status": "failed", "error": str(e)})
```

---

## Part 5: Quality Detection

### Add after chunk summarization

One AI call to determine ENHANCE or PRESERVE mode:

```python
def detect_quality(chunk_summaries):
    prompt = """
    Analyze these chunk summaries and rate the source material quality.

    Summaries:
    {chunk_summaries}

    Rate each criteria 1-10:
    1. SPECIFICITY: Concrete details/steps/examples (10) vs vague advice (1)
    2. TECHNICAL_DEPTH: Comprehensive and detailed (10) vs surface-level (1)  
    3. ACTIONABILITY: Clear what to do (10) vs just theory (1)

    Return JSON:
    {
      "specificity_score": <1-10>,
      "technical_depth_score": <1-10>,
      "actionability_score": <1-10>,
      "average_score": <calculated>,
      "mode": "ENHANCE" or "PRESERVE",
      "reasoning": "<one sentence>"
    }

    Rules:
    - average >= 7 → "PRESERVE" (content is good, keep it faithful)
    - average < 7 → "ENHANCE" (content is generic, improve it)
    """
    
    return call_ai(prompt)
```

---

## Part 6: Two Lesson Prompts

### PRESERVE Mode (good source material)

```
You are generating a lesson from HIGH-QUALITY source material. 
PRESERVE accuracy - do not add your own examples or information.

Chapter: {chapter_title}
Lesson: {lesson_title}
Learning Goals: {goals}
Source Content: {relevant_chunk}

Generate:
{
  "introduction": "2-3 sentences intro, faithful to source",
  
  "explanation": "Main content - preserve technical accuracy, use source's terminology and examples, organize clearly",
  
  "key_concepts": [
    {"term": "...", "definition": "from source"}
  ],
  
  "examples": ["use examples FROM the source only"],
  
  "summary": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  
  "before_you_move_on": [
    "Make sure you can explain X in your own words",
    "Make sure you understand why Y matters",
    "Make sure you can do Z without looking"
  ]
}

IMPORTANT:
- Do NOT add examples not in the source
- Do NOT simplify technical content
- DO organize and structure clearly
```

### ENHANCE Mode (generic/fluffy source material)

```
You are generating a lesson from GENERIC source material that needs improvement.
ENHANCE it with concrete examples and specific actionable advice.

Chapter: {chapter_title}
Lesson: {lesson_title}
Learning Goals: {goals}
Source Content: {relevant_chunk}

Generate:
{
  "introduction": "Engaging intro - tell them WHY this matters",
  
  "explanation": "Main content - improve the source:
    - Make vague advice specific
    - ADD concrete real-world examples
    - If it says 'learn X', explain exactly HOW
    - Cut fluff and obvious statements
    - Add what people get WRONG about this",
  
  "key_concepts": [
    {"term": "...", "definition": "clear, practical"}
  ],
  
  "examples": [
    "Concrete example 1 (specific scenario)",
    "Concrete example 2 (real-world application)"
  ],
  
  "common_mistakes": [
    "What people typically get wrong",
    "Misconception to avoid"
  ],
  
  "actionable_steps": [
    "Specific step 1 you can do today",
    "Specific step 2 with concrete details"
  ],
  
  "summary": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
  
  "before_you_move_on": [
    "Make sure you can explain X",
    "Make sure you understand why Y matters",
    "Make sure you can do Z"
  ]
}

IMPORTANT:
- DO add concrete examples from your knowledge
- DO rewrite vague advice into specific steps
- DO add "common mistakes" section
- DO cut fluffy obvious statements
```

---

## Part 7: Better Quiz Generation

Tiered questions that test understanding, not just recall:

```
Generate a quiz for this lesson.

Lesson Title: {lesson_title}
Lesson Content: {lesson_content}

Generate 7 TIERED questions:

{
  "questions": [
    {
      "type": "recall",
      "difficulty": 1,
      "question": "What is X?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "B",
      "explanation": "..."
    },
    {
      "type": "recall",
      "difficulty": 1,
      "question": "Which describes Y?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "understand",
      "difficulty": 2,
      "question": "Why use X instead of Y?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "understand",
      "difficulty": 2,
      "question": "What's the difference between X and Y?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "apply",
      "difficulty": 3,
      "question": "Scenario: [realistic situation]. What should you do?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "apply",
      "difficulty": 3,
      "question": "You need to [task]. Which approach?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "analyze",
      "difficulty": 4,
      "question": "What's wrong with this [setup/approach]?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    }
  ],
  "short_answer": [
    {
      "question": "Explain in your own words why X matters.",
      "sample_answer": "..."
    }
  ]
}

Question types:
- RECALL (2): Definitions, facts
- UNDERSTAND (2): Compare, explain why
- APPLY (2): Scenarios, practical decisions
- ANALYZE (1): Find flaws, debug, critique
```

---

## Part 8: Free vs Paid Tiers

```python
def generate_course(pdf, user_tier, upload_type, selected_chapters=None):
    
    # Handle book chapter selection
    if upload_type == "book" and selected_chapters:
        pdf = extract_chapter_pages(pdf, selected_chapters)
    
    chunks = chunk_pdf(pdf)
    summaries = summarize_chunks(chunks)
    
    # Quality detection
    quality = detect_quality(summaries)
    
    # Tier-based features
    if user_tier == "free":
        mode = "PRESERVE"  # Always basic
        quiz_type = "basic"  # 4 questions, recall + understand only
        include_extras = False
    else:
        mode = quality["mode"]  # Auto-detect
        quiz_type = "full"  # 7 questions, all types
        include_extras = True  # common_mistakes, before_you_move_on
    
    overview = generate_overview(summaries)
    structure = generate_structure(overview)
    
    for lesson in structure.lessons:
        content = generate_lesson(lesson, chunks, mode, include_extras)
        quiz = generate_quiz(lesson, content, quiz_type)
    
    return course
```

### Tier Features Table

| Feature | Free | Basic ($9/mo) | Pro ($24/mo) |
|---------|------|---------------|--------------|
| Upload type | Notes only | Book + Notes | Book + Notes |
| Books/month | - | 10 | Unlimited |
| Notes/month | 2 | 20 | Unlimited |
| Chapter selection | - | Yes | Yes |
| Full book processing | - | Yes | Yes |
| Quality mode | PRESERVE only | Auto-detect | Auto-detect |
| Quiz depth | Basic (4 Qs) | Full (7 Qs) | Full (7 Qs) |
| "Common mistakes" | No | Yes | Yes |
| "Before you move on" | No | Yes | Yes |
| Background processing | - | Yes | Priority queue |

---

## Summary: Files to Create/Modify

### New Files

1. **`toc_extraction.py`**
   - `extract_toc_from_metadata()`
   - `extract_toc_with_ai()`
   - `calculate_chapter_pages()`

2. **`chapter_extractor.py`**
   - `extract_chapter_pages()`

3. **`quality_detection.py`**
   - `detect_quality()`

4. **`background_jobs.py`**
   - `handle_full_book_upload()`
   - `process_book_job()`

### Modified Files

5. **`lesson_generation.py`**
   - Add PRESERVE vs ENHANCE prompt logic
   - Add `include_extras` flag

6. **`quiz_generation.py`**
   - New tiered quiz prompt
   - `basic` vs `full` quiz type

7. **Frontend: Upload component**
   - Book vs Notes selection UI
   - Chapter selection UI for books
   - Full book vs Select chapters option

8. **Database: New fields**
   - `courses.upload_type` (book/notes)
   - `courses.quality_mode` (PRESERVE/ENHANCE)
   - `courses.quality_scores` (JSON)
   - `courses.selected_chapters` (JSON, nullable)
   - `jobs` table for background processing

---

## Processing Flow Diagram

```
User clicks Upload
        │
        ▼
┌─────────────────┐
│ Book or Notes?  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
  Notes      Book
    │         │
    │         ▼
    │    Extract TOC
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │ Full or Select? │
    │    └────────┬────────┘
    │        ┌────┴────┐
    │        ▼         ▼
    │    Full Book   Select Chapters
    │        │              │
    │        ▼              ▼
    │    Background    Extract pages
    │    job queue          │
    │        │              │
    └────────┴──────┬───────┘
                    ▼
              Chunk PDF
                    │
                    ▼
            Summarize chunks
                    │
                    ▼
            Detect quality
            (ENHANCE/PRESERVE)
                    │
                    ▼
            Generate overview
                    │
                    ▼
            Generate structure
                    │
                    ▼
            For each lesson:
            ├─ Generate content (mode-based)
            └─ Generate quiz (tier-based)
                    │
                    ▼
              Course ready!
              (or email notification)
```