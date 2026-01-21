# Book2Course Enhancement Spec

## Overview

Upgrade Book2Course from basic PDF-to-course conversion to an intelligent system that detects content quality and adapts its processing accordingly. The AI is cheap (Gemini Flash ~$0.03/book), so we can add more processing steps without significant cost impact.

---

## Current Pipeline (Keep This)

```
PDF → Chunking → Summarize Chunks → Book Overview → Course Structure → Lesson Content → Quiz Generation
```

Total: ~47 AI calls per 300-page book

---

## Changes to Implement

### 1. Add Quality Detection Step (NEW)

**Where:** After "Summarize Chunks", before "Book Overview"

**Purpose:** Determine if source material is high-quality (technical textbook) or generic (fluffy content)

**New AI Call - Quality Detection Prompt:**

```
Analyze these chunk summaries and rate the source material:

{chunk_summaries}

Evaluate on these criteria (1-10 each):
1. SPECIFICITY: Does it give concrete details, steps, examples? Or vague advice?
2. TECHNICAL_DEPTH: Is it comprehensive and detailed? Or surface-level?
3. ACTIONABILITY: Does it tell you exactly what to do? Or just theory?

Based on your ratings, return:

{
  "specificity_score": <1-10>,
  "technical_depth_score": <1-10>,
  "actionability_score": <1-10>,
  "average_score": <calculated average>,
  "mode": "<ENHANCE or PRESERVE>",
  "reasoning": "<one sentence why>"
}

Rules:
- If average >= 7: mode = "PRESERVE" (content is good, don't mess with it)
- If average < 7: mode = "ENHANCE" (content needs improvement)
```

**Store the mode** in the course metadata for use in lesson generation.

---

### 2. Two Different Lesson Content Prompts

**Where:** Replace current single lesson prompt with conditional logic

#### PRESERVE Mode Prompt (for good source material):

```
You are generating a lesson from HIGH-QUALITY source material. Your job is to PRESERVE accuracy and structure, not add your own content.

Chapter: {chapter_title}
Lesson: {lesson_title}
Learning Goals: {goals}
Source Content: {relevant_chunk}

Generate this lesson structure:

{
  "introduction": "Brief intro to what this lesson covers (2-3 sentences, faithful to source)",
  
  "explanation": "Main content - preserve technical accuracy, use the source's terminology and examples, organize into clear paragraphs",
  
  "key_concepts": [
    {"term": "...", "definition": "... (from source)"}
  ],
  
  "examples": ["... (use examples FROM the source material, don't invent new ones)"],
  
  "summary": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  
  "before_you_move_on": [
    "Make sure you can explain X in your own words",
    "Make sure you understand why Y matters",
    "Make sure you can do Z without looking"
  ]
}

IMPORTANT:
- Do NOT add examples or information not in the source
- Do NOT simplify technical content - preserve depth
- DO organize and structure clearly
- DO extract the most important concepts
```

#### ENHANCE Mode Prompt (for generic/fluffy source material):

```
You are generating a lesson from GENERIC source material that needs improvement. Your job is to ENHANCE it with concrete examples, specific advice, and practical value.

Chapter: {chapter_title}
Lesson: {lesson_title}
Learning Goals: {goals}
Source Content: {relevant_chunk}

Generate this lesson structure:

{
  "introduction": "Brief intro - make it engaging, tell them WHY this matters",
  
  "explanation": "Main content - take the source concepts BUT:
    - If advice is vague, make it specific
    - If there are no examples, ADD concrete real-world examples
    - If it says 'learn X', say exactly HOW to learn X
    - Cut any fluff or obvious statements
    - Add what most people get WRONG about this topic",
  
  "key_concepts": [
    {"term": "...", "definition": "... (clear, practical definition)"}
  ],
  
  "examples": [
    "Concrete example 1 (specific scenario, not generic)",
    "Concrete example 2 (real-world application)"
  ],
  
  "common_mistakes": [
    "What people typically get wrong about this",
    "Misconception to avoid"
  ],
  
  "actionable_steps": [
    "Specific step 1 you can do today",
    "Specific step 2 with concrete details"
  ],
  
  "summary": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  
  "before_you_move_on": [
    "Make sure you can explain X in your own words",
    "Make sure you understand why Y matters",  
    "Make sure you can do Z without looking"
  ]
}

IMPORTANT:
- DO add concrete examples from your knowledge
- DO rewrite vague advice into specific actionable steps
- DO add "common mistakes" section
- DO cut fluffy obvious statements
- PRESERVE the core concepts from source, just make them better
```

---

### 3. Improved Quiz Generation

**Where:** Replace current quiz prompt

**New Quiz Prompt:**

```
Generate a quiz for this lesson that tests UNDERSTANDING, not just recall.

Lesson Title: {lesson_title}
Lesson Content: {lesson_content}
Source Material: {relevant_chunk}

Generate exactly 7 questions in a TIERED structure:

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
      "question": "Which of the following describes Y?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "understand",
      "difficulty": 2,
      "question": "Why would you use X instead of Y?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "understand",
      "difficulty": 2, 
      "question": "What is the main difference between X and Y?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "apply",
      "difficulty": 3,
      "question": "Scenario: [describe realistic situation]. What should you do?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "apply",
      "difficulty": 3,
      "question": "You need to [task]. Which approach would work best?",
      "options": [...],
      "correct": "...",
      "explanation": "..."
    },
    {
      "type": "analyze",
      "difficulty": 4,
      "question": "Look at this [setup/code/scenario]. What's wrong with it?",
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

Question Type Guidelines:
- RECALL (2 questions): Definition, identification, basic facts
- UNDERSTAND (2 questions): Compare/contrast, explain why, relationships
- APPLY (2 questions): Scenario-based, "what would you do", practical decisions
- ANALYZE (1 question): Find the flaw, debug, evaluate, critique
```

---

### 4. Free vs Paid Tier Logic

**Implementation:**

```python
# In your course generation logic:

def generate_course(pdf, user_tier):
    chunks = chunk_pdf(pdf)
    summaries = summarize_chunks(chunks)
    
    # Quality detection
    quality = detect_quality(summaries)
    
    if user_tier == "free":
        # Free users always get PRESERVE mode (basic)
        mode = "PRESERVE"
        quiz_type = "basic"  # Only recall + understand questions
    else:
        # Paid users get auto-detected mode
        mode = quality["mode"]
        quiz_type = "full"  # All question types including apply + analyze
    
    overview = generate_overview(summaries)
    structure = generate_structure(overview)
    
    for lesson in structure.lessons:
        if mode == "PRESERVE":
            content = generate_lesson_preserve(lesson, chunks)
        else:
            content = generate_lesson_enhance(lesson, chunks)
        
        if quiz_type == "basic":
            quiz = generate_quiz_basic(lesson, content)  # 4 questions
        else:
            quiz = generate_quiz_full(lesson, content)   # 7 questions
    
    return course
```

**Tier Features:**

| Feature | Free | Basic ($9/mo) | Pro ($24/mo) |
|---------|------|---------------|--------------|
| Books/month | 2 | 10 | Unlimited |
| Quality mode | Always PRESERVE | Auto-detect | Auto-detect |
| Quiz depth | Basic (4 Qs) | Full (7 Qs) | Full (7 Qs) |
| "Common mistakes" | No | Yes | Yes |
| "Before you move on" | No | Yes | Yes |
| Progress tracking | Basic | Full | Full |
| Spaced repetition | No | No | Yes (future) |

---

## File Changes Summary

1. **Add new file:** `quality_detection.py` (or add to existing AI service)
   - Quality detection prompt and parsing

2. **Modify:** `lesson_generation.py` (or equivalent)
   - Add conditional logic for PRESERVE vs ENHANCE
   - Two different prompts

3. **Modify:** `quiz_generation.py` (or equivalent)
   - New tiered quiz prompt
   - Basic vs full quiz logic

4. **Modify:** Course generation orchestrator
   - Add quality detection step
   - Pass mode through pipeline
   - Tier-based feature flags

5. **Database:** Add fields
   - `course.quality_mode` (PRESERVE/ENHANCE)
   - `course.quality_scores` (JSON with the 3 scores)

---

## Cost Impact

Current: ~47 AI calls per book ≈ $0.02-0.03

After changes: ~48 AI calls per book ≈ $0.02-0.03 (basically same)

ENHANCE mode lessons are slightly longer prompts but Gemini Flash is so cheap it doesn't matter.

---

## Testing

Test with these two types of PDFs:

1. **Good source:** An actual technical textbook (AWS guide, programming book)
   - Should detect as PRESERVE
   - Should maintain accuracy
   - Should NOT add random examples

2. **Bad source:** Generic self-help or corporate training PDF
   - Should detect as ENHANCE  
   - Should add concrete examples
   - Should cut fluff
   - Should add "common mistakes"

Compare output quality between modes.