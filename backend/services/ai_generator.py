import os
import json
import httpx
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
# AI Model - configurable via environment variable
MODEL = os.getenv("AI_MODEL", "google/gemini-2.0-flash-001")


async def call_openrouter(
    messages: List[Dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 4096,
    retries: int = 3
) -> str:
    """Make a call to OpenRouter API with retry logic."""
    import asyncio

    for attempt in range(retries):
        try:
            async with httpx.AsyncClient() as client:
                print(f"[AI] Making API call (attempt {attempt + 1}/{retries})...")
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Book2Course",
                    },
                    json={
                        "model": MODEL,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                    timeout=180.0
                )
                response.raise_for_status()
                data = response.json()
                print(f"[AI] API call successful")
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            print(f"[AI] API error (attempt {attempt + 1}/{retries}): {e.response.status_code} - {e.response.text[:500] if e.response.text else 'No response body'}")
            if attempt < retries - 1:
                wait_time = 2 ** (attempt + 1)  # 2, 4, 8 seconds
                print(f"[AI] Waiting {wait_time}s before retry...")
                await asyncio.sleep(wait_time)
            else:
                raise
        except httpx.TimeoutException as e:
            print(f"[AI] Timeout error (attempt {attempt + 1}/{retries}): {e}")
            if attempt < retries - 1:
                wait_time = 2 ** (attempt + 1)
                print(f"[AI] Waiting {wait_time}s before retry...")
                await asyncio.sleep(wait_time)
            else:
                raise
        except Exception as e:
            print(f"[AI] Unexpected error (attempt {attempt + 1}/{retries}): {type(e).__name__}: {e}")
            if attempt < retries - 1:
                await asyncio.sleep(2 ** (attempt + 1))
            else:
                raise


async def summarize_chunk(chunk_text: str, chunk_index: int) -> Dict[str, Any]:
    """Summarize a single chunk of text."""
    prompt = f"""Analyze this text section and extract:
1. Main topics covered (list 3-5 topics)
2. Key concepts introduced (list 3-7 concepts)
3. A concise summary (2-3 paragraphs)

Text:
{chunk_text}

Respond in JSON format:
{{
  "topics": ["topic1", "topic2", ...],
  "concepts": ["concept1", "concept2", ...],
  "summary": "Your summary here..."
}}"""

    messages = [{"role": "user", "content": prompt}]
    response = await call_openrouter(messages)

    # Parse JSON from response
    try:
        # Handle potential markdown code blocks
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        return json.loads(response.strip())
    except json.JSONDecodeError:
        return {
            "topics": [],
            "concepts": [],
            "summary": response
        }


async def detect_quality(chunk_summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Detect the quality of source material to determine PRESERVE or ENHANCE mode."""
    combined_summaries = "\n\n".join(
        summary.get("summary", "") for summary in chunk_summaries
    )

    prompt = f"""Analyze these chunk summaries and rate the source material:

{combined_summaries[:12000]}

Evaluate on these criteria (1-10 each):
1. SPECIFICITY: Does it give concrete details, steps, examples? Or vague advice?
2. TECHNICAL_DEPTH: Is it comprehensive and detailed? Or surface-level?
3. ACTIONABILITY: Does it tell you exactly what to do? Or just theory?

Based on your ratings, return:

{{
  "specificity_score": <1-10>,
  "technical_depth_score": <1-10>,
  "actionability_score": <1-10>,
  "average_score": <calculated average>,
  "mode": "<ENHANCE or PRESERVE>",
  "reasoning": "<one sentence why>"
}}

Rules:
- If average >= 7: mode = "PRESERVE" (content is good, don't mess with it)
- If average < 7: mode = "ENHANCE" (content needs improvement)"""

    messages = [{"role": "user", "content": prompt}]
    response = await call_openrouter(messages)

    try:
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        return json.loads(response.strip())
    except json.JSONDecodeError:
        # Default to ENHANCE mode if parsing fails
        return {
            "specificity_score": 5,
            "technical_depth_score": 5,
            "actionability_score": 5,
            "average_score": 5,
            "mode": "ENHANCE",
            "reasoning": "Could not parse quality detection response"
        }


async def generate_book_overview(chunk_summaries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate a unified overview from all chunk summaries."""
    combined_topics = []
    combined_concepts = []
    combined_summaries = []

    for summary in chunk_summaries:
        combined_topics.extend(summary.get("topics", []))
        combined_concepts.extend(summary.get("concepts", []))
        combined_summaries.append(summary.get("summary", ""))

    summary_text = "\n\n".join(combined_summaries)

    prompt = f"""Based on these section summaries from a book, create a unified book overview.

Section Summaries:
{summary_text}

All Topics Found: {', '.join(set(combined_topics))}
All Concepts Found: {', '.join(set(combined_concepts))}

Generate a book overview in JSON format:
{{
  "title": "Inferred book title based on content",
  "main_themes": ["theme1", "theme2", ...],
  "key_concepts": ["concept1", "concept2", ...],
  "target_audience": "Description of who this book is for",
  "learning_objectives": ["objective1", "objective2", ...]
}}"""

    messages = [{"role": "user", "content": prompt}]
    response = await call_openrouter(messages)

    try:
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        return json.loads(response.strip())
    except json.JSONDecodeError:
        return {
            "title": "Course from Book",
            "main_themes": list(set(combined_topics))[:5],
            "key_concepts": list(set(combined_concepts))[:10],
            "target_audience": "General readers",
            "learning_objectives": []
        }


async def generate_course_structure(
    book_overview: Dict[str, Any],
    chunk_summaries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Generate the course structure with chapters and lessons."""
    prompt = f"""Create a course structure for a book with these characteristics:

Title: {book_overview.get('title', 'Unknown')}
Main Themes: {', '.join(book_overview.get('main_themes', []))}
Key Concepts: {', '.join(book_overview.get('key_concepts', []))}
Learning Objectives: {', '.join(book_overview.get('learning_objectives', []))}

The book has {len(chunk_summaries)} main sections.

Create a course structure with 4-8 chapters, each with 2-5 lessons. Each chapter should cover related themes.

Respond in JSON format:
{{
  "chapters": [
    {{
      "title": "Chapter Title",
      "description": "Brief chapter description",
      "lessons": [
        {{
          "title": "Lesson Title",
          "topics_to_cover": ["topic1", "topic2"],
          "source_chunk_indices": [0, 1]
        }}
      ]
    }}
  ]
}}

Make the lessons flow logically and build upon each other."""

    messages = [{"role": "user", "content": prompt}]
    response = await call_openrouter(messages, max_tokens=8192)

    try:
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        return json.loads(response.strip())
    except json.JSONDecodeError:
        # Fallback structure
        return {
            "chapters": [
                {
                    "title": f"Chapter {i+1}",
                    "description": summary.get("summary", "")[:200],
                    "lessons": [
                        {
                            "title": topic,
                            "topics_to_cover": [topic],
                            "source_chunk_indices": [i]
                        }
                        for topic in summary.get("topics", ["Main Content"])[:3]
                    ]
                }
                for i, summary in enumerate(chunk_summaries[:5])
            ]
        }


def extract_json_from_response(response: str) -> dict:
    """
    Robustly extract JSON from AI response.
    Handles various formats: raw JSON, markdown code blocks, mixed text.
    """
    import re

    # Method 1: Try direct JSON parse
    try:
        return json.loads(response.strip())
    except json.JSONDecodeError:
        pass

    # Method 2: Extract from ```json ... ``` code blocks
    if "```json" in response:
        try:
            json_str = response.split("```json")[1].split("```")[0]
            return json.loads(json_str.strip())
        except (json.JSONDecodeError, IndexError):
            pass

    # Method 3: Extract from ``` ... ``` code blocks
    if "```" in response:
        try:
            json_str = response.split("```")[1].split("```")[0]
            return json.loads(json_str.strip())
        except (json.JSONDecodeError, IndexError):
            pass

    # Method 4: Find JSON object pattern in text
    json_pattern = r'\{[\s\S]*\}'
    matches = re.findall(json_pattern, response)
    for match in matches:
        try:
            # Try to find the largest valid JSON
            result = json.loads(match)
            if isinstance(result, dict) and len(result) > 2:
                return result
        except json.JSONDecodeError:
            continue

    # Method 5: Check if response itself is escaped JSON
    if response.startswith('"') and response.endswith('"'):
        try:
            unescaped = json.loads(response)
            if isinstance(unescaped, str):
                return json.loads(unescaped)
        except json.JSONDecodeError:
            pass

    raise json.JSONDecodeError("Could not extract JSON", response, 0)


def validate_lesson_content(content: dict, lesson_title: str, topics: List[str]) -> dict:
    """
    Validate and fix lesson content structure.
    Ensures all required fields exist with meaningful content.
    """
    # Check for nested JSON bug - if explanation contains JSON, try to parse it
    explanation = content.get("explanation", "")
    if isinstance(explanation, str) and explanation.strip().startswith("{"):
        try:
            nested = json.loads(explanation)
            if isinstance(nested, dict):
                # The explanation contained the actual content - merge it
                content = {**content, **nested}
                # Set explanation to the nested one if it exists
                if "explanation" in nested:
                    content["explanation"] = nested["explanation"]
        except json.JSONDecodeError:
            pass

    # Ensure keyPoints have actual content
    key_points = content.get("keyPoints", [])
    if not key_points or all(not kp.get("title") and not kp.get("description") for kp in key_points):
        # Generate meaningful key points from topics
        content["keyPoints"] = [
            {"title": f"Understanding {topic}", "description": f"Core concepts related to {topic}"}
            for topic in topics[:3]
        ] if topics else []

    # Ensure introduction is meaningful
    intro = content.get("introduction", "")
    if not intro or intro == f"In this lesson, we'll explore {lesson_title}.":
        content["introduction"] = f"This lesson covers {lesson_title}, focusing on {', '.join(topics[:2]) if topics else 'key concepts'}. Understanding these fundamentals is essential for building a strong foundation."

    # Ensure summary is meaningful
    summary = content.get("summary", "")
    if not summary or summary == f"This lesson covered the key aspects of {lesson_title}.":
        content["summary"] = f"In this lesson, we explored {lesson_title}. The key concepts covered will help you understand and apply these principles in practice."

    return content


async def generate_lesson_content_preserve(
    lesson_title: str,
    topics: List[str],
    source_text: str
) -> Dict[str, Any]:
    """Generate lesson content in PRESERVE mode - for high-quality source material."""
    prompt = f"""You are generating a lesson from HIGH-QUALITY source material. Your job is to PRESERVE accuracy and structure, not add your own content.

Lesson: {lesson_title}
Topics to cover: {', '.join(topics)}
Source Content: {source_text[:15000]}

Generate this lesson structure as valid JSON:

{{
  "introduction": "Brief intro to what this lesson covers (2-3 sentences, faithful to source)",

  "explanation": "Main content - preserve technical accuracy, use the source's terminology and examples, organize into clear paragraphs. This should be a substantial explanation of 3-5 paragraphs.",

  "key_concepts": [
    {{"term": "concept name", "definition": "clear definition from source"}}
  ],

  "examples": [
    {{"title": "Example title", "content": "detailed example from the source material"}}
  ],

  "keyPoints": [
    {{"title": "Key takeaway title", "description": "Detailed explanation of this key point"}},
    {{"title": "Another key point", "description": "Detailed explanation"}},
    {{"title": "Third key point", "description": "Detailed explanation"}}
  ],

  "summary": "Summary paragraph of what was learned (2-3 sentences)",

  "before_you_move_on": [
    "Make sure you can explain X in your own words",
    "Make sure you understand why Y matters",
    "Make sure you can do Z without looking"
  ]
}}

IMPORTANT:
- Return ONLY the JSON object, no other text
- Do NOT add examples or information not in the source
- Do NOT simplify technical content - preserve depth
- Ensure keyPoints have both title AND description filled in
- DO organize and structure clearly"""

    messages = [{"role": "user", "content": prompt}]

    # Try up to 2 times to get valid content
    for attempt in range(2):
        try:
            response = await call_openrouter(messages, max_tokens=6144)
            content = extract_json_from_response(response)
            content = validate_lesson_content(content, lesson_title, topics)
            return content
        except json.JSONDecodeError as e:
            print(f"[AI] Lesson content JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 0:
                continue

    # Final fallback with meaningful content
    print(f"[AI] Using fallback content for: {lesson_title}")
    return {
        "introduction": f"This lesson covers {lesson_title}, focusing on {', '.join(topics[:2]) if topics else 'essential concepts'}. Understanding these fundamentals is crucial for your learning journey.",
        "explanation": f"In studying {lesson_title}, we explore several important concepts. {source_text[:1500] if source_text else 'The material covers foundational principles that build upon each other.'}",
        "key_concepts": [{"term": topic, "definition": f"A fundamental concept in {lesson_title}"} for topic in topics[:3]],
        "examples": [],
        "keyPoints": [{"title": f"Understanding {topic}", "description": f"Master the core principles of {topic}"} for topic in topics[:3]],
        "summary": f"This lesson covered the essential aspects of {lesson_title}. Review the key concepts and ensure you understand how they connect.",
        "before_you_move_on": [f"Make sure you understand {topic}" for topic in topics[:3]]
    }


async def generate_lesson_content_enhance(
    lesson_title: str,
    topics: List[str],
    source_text: str
) -> Dict[str, Any]:
    """Generate lesson content in ENHANCE mode - for generic/fluffy source material."""
    prompt = f"""You are generating a lesson from GENERIC source material that needs improvement. Your job is to ENHANCE it with concrete examples, specific advice, and practical value.

Lesson: {lesson_title}
Topics to cover: {', '.join(topics)}
Source Content: {source_text[:15000]}

Generate this lesson structure as valid JSON:

{{
  "introduction": "Brief intro - make it engaging, tell them WHY this matters (2-3 sentences)",

  "explanation": "Main content - substantial explanation of 3-5 paragraphs. Take the source concepts BUT:
    - If advice is vague, make it specific
    - If there are no examples, ADD concrete real-world examples
    - If it says 'learn X', say exactly HOW to learn X
    - Cut any fluff or obvious statements",

  "key_concepts": [
    {{"term": "concept name", "definition": "clear, practical definition"}}
  ],

  "examples": [
    {{"title": "Concrete example 1", "content": "Specific scenario with details"}},
    {{"title": "Concrete example 2", "content": "Real-world application"}}
  ],

  "common_mistakes": [
    {{"mistake": "What people typically get wrong", "correction": "The right approach"}},
    {{"mistake": "Common misconception", "correction": "What to do instead"}}
  ],

  "actionable_steps": [
    {{"step": "Specific action step 1", "details": "How to do this concretely"}},
    {{"step": "Specific action step 2", "details": "More specifics"}}
  ],

  "keyPoints": [
    {{"title": "Key takeaway title 1", "description": "Detailed explanation of this point"}},
    {{"title": "Key takeaway title 2", "description": "Detailed explanation"}},
    {{"title": "Key takeaway title 3", "description": "Detailed explanation"}}
  ],

  "summary": "Summary paragraph of what was learned (2-3 sentences)",

  "before_you_move_on": [
    "Specific thing to verify you understand",
    "Another checkpoint",
    "Third verification point"
  ]
}}

IMPORTANT:
- Return ONLY the JSON object, no other text
- DO add concrete examples from your knowledge
- DO rewrite vague advice into specific actionable steps
- Ensure ALL keyPoints have both title AND description filled in with real content
- PRESERVE the core concepts from source, just make them better"""

    messages = [{"role": "user", "content": prompt}]

    # Try up to 2 times to get valid content
    for attempt in range(2):
        try:
            response = await call_openrouter(messages, max_tokens=6144)
            content = extract_json_from_response(response)
            content = validate_lesson_content(content, lesson_title, topics)
            return content
        except json.JSONDecodeError as e:
            print(f"[AI] Lesson content JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 0:
                continue

    # Final fallback with meaningful content
    print(f"[AI] Using fallback content for: {lesson_title}")
    return {
        "introduction": f"This lesson covers {lesson_title}, an important topic that will help you develop practical skills. Understanding these concepts is essential for real-world applications.",
        "explanation": f"Let's dive into {lesson_title}. {source_text[:1500] if source_text else 'This topic encompasses several key principles that work together.'}",
        "key_concepts": [{"term": topic, "definition": f"A core concept in {lesson_title} that you need to master"} for topic in topics[:3]],
        "examples": [{"title": f"Applying {topics[0] if topics else lesson_title}", "content": "Consider how this applies in practice..."}],
        "common_mistakes": [{"mistake": "Rushing without understanding fundamentals", "correction": "Take time to understand each concept before moving on"}],
        "actionable_steps": [{"step": f"Practice {topics[0] if topics else 'the concepts'}", "details": "Work through examples to reinforce your understanding"}],
        "keyPoints": [{"title": f"Master {topic}", "description": f"Understanding {topic} is crucial for applying these concepts"} for topic in topics[:3]],
        "summary": f"This lesson covered {lesson_title}. Apply what you've learned through practice and review.",
        "before_you_move_on": [f"Verify you understand {topic}" for topic in topics[:3]]
    }


async def generate_lesson_content(
    lesson_title: str,
    topics: List[str],
    source_text: str,
    mode: str = "ENHANCE"
) -> Dict[str, Any]:
    """Generate detailed lesson content based on quality mode."""
    if mode == "PRESERVE":
        return await generate_lesson_content_preserve(lesson_title, topics, source_text)
    else:
        return await generate_lesson_content_enhance(lesson_title, topics, source_text)


async def generate_quiz(
    lesson_title: str,
    lesson_content: Dict[str, Any],
    source_text: str = "",
    quiz_type: str = "full"  # "basic" (4 questions) or "full" (7 questions)
) -> List[Dict[str, Any]]:
    """Generate tiered quiz questions for a lesson."""
    # Build key points string, handling both string and object formats
    key_points_raw = lesson_content.get('keyPoints', [])
    key_points = []
    for kp in key_points_raw:
        if isinstance(kp, str):
            key_points.append(kp)
        elif isinstance(kp, dict):
            key_points.append(f"{kp.get('title', '')}: {kp.get('description', '')}")

    content_summary = f"""
Introduction: {lesson_content.get('introduction', '')}
Explanation: {lesson_content.get('explanation', '')[:2000]}
Key Points: {'; '.join(key_points)}
Summary: {lesson_content.get('summary', '')}
"""

    # Different prompts for basic vs full quiz
    if quiz_type == "basic":
        # Basic quiz: 4 questions (2 recall, 2 understand) - for free tier
        prompt = f"""Generate a quiz for this lesson.

Lesson Title: {lesson_title}
Lesson Content: {content_summary}

Generate exactly 4 questions:

{{
  "questions": [
    {{
      "type": "mcq",
      "difficulty": 1,
      "question_type": "recall",
      "id": "q1",
      "question": "What is X?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 1,
      "explanation": "This is correct because..."
    }},
    {{
      "type": "mcq",
      "difficulty": 1,
      "question_type": "recall",
      "id": "q2",
      "question": "Which describes Y?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 0,
      "explanation": "..."
    }},
    {{
      "type": "mcq",
      "difficulty": 2,
      "question_type": "understand",
      "id": "q3",
      "question": "Why would you use X instead of Y?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 2,
      "explanation": "..."
    }},
    {{
      "type": "mcq",
      "difficulty": 2,
      "question_type": "understand",
      "id": "q4",
      "question": "What is the main difference between X and Y?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 3,
      "explanation": "..."
    }}
  ]
}}

Question Types:
- RECALL (2): Definitions, facts - difficulty 1
- UNDERSTAND (2): Compare/contrast, explain why - difficulty 2

correctAnswer is 0-indexed (0=A, 1=B, 2=C, 3=D)."""
    else:
        # Full quiz: 7 questions + short answer - for paid tiers
        prompt = f"""Generate a quiz for this lesson that tests UNDERSTANDING, not just recall.

Lesson Title: {lesson_title}
Lesson Content: {content_summary}
Source Material (excerpt): {source_text[:3000]}

Generate exactly 7 questions in a TIERED structure:

{{
  "questions": [
    {{
      "type": "mcq",
      "difficulty": 1,
      "question_type": "recall",
      "id": "q1",
      "question": "What is X?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 1,
      "explanation": "This is correct because..."
    }},
    {{
      "type": "mcq",
      "difficulty": 1,
      "question_type": "recall",
      "id": "q2",
      "question": "Which of the following describes Y?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 0,
      "explanation": "..."
    }},
    {{
      "type": "mcq",
      "difficulty": 2,
      "question_type": "understand",
      "id": "q3",
      "question": "Why would you use X instead of Y?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 2,
      "explanation": "..."
    }},
    {{
      "type": "mcq",
      "difficulty": 2,
      "question_type": "understand",
      "id": "q4",
      "question": "What is the main difference between X and Y?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 3,
      "explanation": "..."
    }},
    {{
      "type": "mcq",
      "difficulty": 3,
      "question_type": "apply",
      "id": "q5",
      "question": "Scenario: [describe realistic situation]. What should you do?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 1,
      "explanation": "..."
    }},
    {{
      "type": "mcq",
      "difficulty": 3,
      "question_type": "apply",
      "id": "q6",
      "question": "You need to [task]. Which approach would work best?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 0,
      "explanation": "..."
    }},
    {{
      "type": "mcq",
      "difficulty": 4,
      "question_type": "analyze",
      "id": "q7",
      "question": "Look at this [setup/scenario]. What's wrong with it?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": 2,
      "explanation": "..."
    }}
  ],
  "short_answer": [
    {{
      "type": "short_answer",
      "id": "sa1",
      "question": "Explain in your own words why X matters.",
      "sampleAnswer": "..."
    }}
  ]
}}

Question Type Guidelines:
- RECALL (2 questions): Definition, identification, basic facts - difficulty 1
- UNDERSTAND (2 questions): Compare/contrast, explain why, relationships - difficulty 2
- APPLY (2 questions): Scenario-based, "what would you do", practical decisions - difficulty 3
- ANALYZE (1 question): Find the flaw, debug, evaluate, critique - difficulty 4

correctAnswer is 0-indexed (0=A, 1=B, 2=C, 3=D)."""

    messages = [{"role": "user", "content": prompt}]

    def is_placeholder_option(opt: str) -> bool:
        """Check if an option is a generic placeholder."""
        opt_clean = opt.strip().lower()
        # Check for patterns like "Option A", "A)", "A.", etc.
        placeholder_patterns = [
            "option a", "option b", "option c", "option d",
            "a)", "b)", "c)", "d)",
            "a.", "b.", "c.", "d.",
            "...", "placeholder"
        ]
        # Also check if option is too short to be meaningful
        if len(opt_clean) <= 3:
            return True
        return any(opt_clean == p or opt_clean.startswith(p + " ") for p in placeholder_patterns)

    # Try up to 2 times to get valid quiz JSON
    for attempt in range(2):
        try:
            response = await call_openrouter(messages, max_tokens=6144)
            data = extract_json_from_response(response)

            # Validate the quiz structure
            questions = data.get("questions", [])
            short_answers = data.get("short_answer", [])

            # Verify questions have real options (not generic placeholders)
            valid_questions = []
            for q in questions:
                options = q.get("options", [])
                # Check if all options are placeholders
                if options and not all(is_placeholder_option(opt) for opt in options):
                    # Also ensure the question itself is meaningful
                    question_text = q.get("question", "")
                    if len(question_text) > 10:
                        valid_questions.append(q)
                    else:
                        print(f"[AI] Skipping question with too short text: {question_text}")
                elif options:
                    print(f"[AI] Skipping question with generic options: {q.get('question', '')[:50]}")

            if valid_questions or short_answers:
                return valid_questions + short_answers

            # If no valid questions, retry
            if attempt == 0:
                print(f"[AI] Quiz had no valid questions, retrying...")
                continue

        except json.JSONDecodeError as e:
            print(f"[AI] Quiz JSON parse error (attempt {attempt + 1}): {e}")
            if attempt == 0:
                continue
        except Exception as e:
            print(f"[AI] Quiz generation error (attempt {attempt + 1}): {e}")
            if attempt == 0:
                continue

    # Final fallback - generate a simple but specific quiz
    print(f"[AI] Using fallback quiz for: {lesson_title}")
    return [
        {
            "type": "mcq",
            "difficulty": 1,
            "question_type": "recall",
            "id": "q1",
            "question": f"What is the main focus of the lesson '{lesson_title}'?",
            "options": [
                f"A) Understanding the core concepts of {lesson_title.split()[0] if lesson_title else 'this topic'}",
                "B) Learning unrelated historical facts",
                "C) Practicing advanced mathematics only",
                "D) None of the above"
            ],
            "correctAnswer": 0,
            "explanation": f"This lesson focuses on {lesson_title}, covering its key concepts and applications."
        }
    ]


async def process_book_to_course(
    book_text: str,
    book_title: str = None,
    progress_callback = None,
    user_tier: str = "free"
) -> Dict[str, Any]:
    """
    Main function to process a book into a course.
    Returns the complete course structure with content.

    Args:
        book_text: The extracted text from the PDF
        book_title: Optional title override
        progress_callback: Optional async function(step: str) to report progress
        user_tier: User's subscription tier ('free', 'basic', 'pro')

    Tier differences:
        - free: PRESERVE mode only, basic quiz (4 questions), no extras
        - basic/pro: Auto-detect quality mode, full quiz (7 questions), all extras
    """
    # Determine tier-based settings
    is_paid = user_tier in ("basic", "pro")
    quiz_type = "full" if is_paid else "basic"
    include_extras = is_paid  # common_mistakes, before_you_move_on, etc.
    from .pdf_processor import chunk_text

    async def report_progress(step: str):
        print(f"[AI] {step}")
        if progress_callback:
            await progress_callback(step)

    # Step 1: Chunk the text
    await report_progress("Splitting book into sections...")
    chunks = chunk_text(book_text)
    await report_progress(f"Split into {len(chunks)} sections")

    # Step 2: Summarize each chunk
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        await report_progress(f"Analyzing section {i + 1} of {len(chunks)}...")
        summary = await summarize_chunk(chunk, i)
        chunk_summaries.append(summary)

    # Step 3: Quality detection - determine PRESERVE or ENHANCE mode
    await report_progress("Evaluating content quality...")
    quality_result = await detect_quality(chunk_summaries)

    # Tier-based mode selection
    if is_paid:
        # Paid users get auto-detected mode
        content_mode = quality_result.get("mode", "ENHANCE")
    else:
        # Free users always get PRESERVE mode (simpler, faster)
        content_mode = "PRESERVE"
        quality_result["mode"] = "PRESERVE"
        quality_result["reasoning"] = "Free tier uses PRESERVE mode"

    avg_score = quality_result.get("average_score", 5)
    try:
        score_str = f"{float(avg_score):.1f}"
    except (ValueError, TypeError):
        score_str = str(avg_score)
    await report_progress(f"Quality: {content_mode} mode (score: {score_str}/10)")

    # Step 4: Generate book overview
    await report_progress("Generating book overview...")
    book_overview = await generate_book_overview(chunk_summaries)
    if book_title:
        book_overview["title"] = book_title

    # Step 5: Generate course structure
    await report_progress("Designing course structure...")
    course_structure = await generate_course_structure(book_overview, chunk_summaries)
    num_chapters = len(course_structure.get("chapters", []))
    num_lessons = sum(len(ch.get("lessons", [])) for ch in course_structure.get("chapters", []))
    await report_progress(f"Created {num_chapters} chapters with {num_lessons} lessons")

    # Step 6: Generate content and quizzes for each lesson
    lesson_count = 0
    for chapter in course_structure.get("chapters", []):
        for lesson in chapter.get("lessons", []):
            lesson_count += 1
            await report_progress(f"Generating lesson {lesson_count}/{num_lessons}: {lesson['title'][:40]}...")

            # Get source text from relevant chunks
            chunk_indices = lesson.get("source_chunk_indices", [0])
            # Ensure chunk indices are integers (AI might return strings)
            chunk_indices = [int(i) for i in chunk_indices if str(i).isdigit()]
            source_text = "\n\n".join(
                chunks[i] for i in chunk_indices if i < len(chunks)
            )

            # Generate lesson content based on quality mode
            content = await generate_lesson_content(
                lesson["title"],
                lesson.get("topics_to_cover", []),
                source_text,
                mode=content_mode
            )

            # Strip premium content for free tier
            if not include_extras:
                content.pop("common_mistakes", None)
                content.pop("actionable_steps", None)
                content.pop("before_you_move_on", None)

            lesson["content"] = content

            # Generate quiz with source text for better questions
            await report_progress(f"Creating quiz for lesson {lesson_count}/{num_lessons}...")
            quiz = await generate_quiz(lesson["title"], content, source_text, quiz_type)
            lesson["quiz"] = quiz

    await report_progress("Finalizing course...")
    return {
        "overview": book_overview,
        "structure": course_structure,
        "quality": quality_result
    }
