"""
Script to fix existing lesson content issues:
1. Nested JSON in explanation field
2. Empty keyPoints descriptions
3. Stuck/error courses

Run with: python -m scripts.fix_lesson_content
"""

import os
import sys
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.supabase_client import get_supabase_client


def fix_nested_json(content: dict) -> dict:
    """Fix nested JSON in explanation field."""
    explanation = content.get("explanation", "")

    # Check if explanation contains nested JSON
    if isinstance(explanation, str) and explanation.strip().startswith("{"):
        try:
            nested = json.loads(explanation)
            if isinstance(nested, dict):
                # Merge nested content into main content
                for key, value in nested.items():
                    if key not in content or not content[key]:
                        content[key] = value
                    elif key == "explanation":
                        content["explanation"] = value
                print(f"    Fixed nested JSON in explanation")
                return content
        except json.JSONDecodeError:
            pass

    return content


def fix_empty_key_points(content: dict, lesson_title: str) -> dict:
    """Fix empty keyPoints descriptions."""
    key_points = content.get("keyPoints", [])

    if not key_points:
        return content

    fixed = False
    for kp in key_points:
        title = kp.get("title", "")
        description = kp.get("description", "")

        if title and not description:
            # Generate a meaningful description from the title
            kp["description"] = f"Understanding {title} is essential for mastering this topic. This concept builds on the foundations covered in the lesson."
            fixed = True

    if fixed:
        content["keyPoints"] = key_points
        print(f"    Fixed empty keyPoints descriptions")

    return content


def fix_lesson_content():
    """Fix all lessons with content issues."""
    client = get_supabase_client()

    # Get all lessons with content
    print("Fetching lessons...")
    result = client.table("lessons").select("id, title, content_json").not_.is_("content_json", "null").execute()

    lessons = result.data or []
    print(f"Found {len(lessons)} lessons with content")

    fixed_count = 0

    for lesson in lessons:
        lesson_id = lesson["id"]
        title = lesson["title"]
        content = lesson.get("content_json") or {}

        if not content:
            continue

        original_content = json.dumps(content)

        # Apply fixes
        content = fix_nested_json(content)
        content = fix_empty_key_points(content, title)

        # Check if content changed
        if json.dumps(content) != original_content:
            print(f"  Fixing: {title}")
            client.table("lessons").update({"content_json": content}).eq("id", lesson_id).execute()
            fixed_count += 1

    print(f"\nFixed {fixed_count} lessons")


def fix_error_courses():
    """Reset or clean up courses stuck in error state."""
    client = get_supabase_client()

    # Get courses in error state
    print("\nChecking for error courses...")
    result = client.table("books").select("id, title, status, processing_step").eq("status", "error").execute()

    courses = result.data or []
    print(f"Found {len(courses)} courses in error state")

    for course in courses:
        course_id = course["id"]
        title = course["title"]
        error = course.get("processing_step", "")

        print(f"\n  Course: {title}")
        print(f"  Error: {error}")

        # Check if course has any chapters/lessons
        chapters = client.table("chapters").select("id").eq("course_id", course_id).execute()

        if chapters.data:
            print(f"  Has {len(chapters.data)} chapters - keeping course")
        else:
            print(f"  No chapters - marking for deletion")
            # Delete the course and associated book
            book_result = client.table("books").select("id").eq("id", course_id).execute()

            # Delete course first (it references book)
            client.table("courses").delete().eq("id", course_id).execute()
            print(f"  Deleted course: {course_id}")

            # Delete book if exists
            if book_result.data:
                client.table("books").delete().eq("id", course_id).execute()
                print(f"  Deleted book: {course_id}")


def fix_stuck_processing():
    """Reset books stuck in processing state."""
    client = get_supabase_client()

    print("\nChecking for stuck processing books...")
    result = client.table("books").select("id, title, status, updated_at").eq("status", "processing").execute()

    books = result.data or []
    print(f"Found {len(books)} books in processing state")

    for book in books:
        book_id = book["id"]
        title = book["title"]
        print(f"  Resetting: {title} ({book_id})")

        # Reset to queued so it can be reprocessed
        client.table("books").update({
            "status": "queued",
            "processing_step": "Reset for reprocessing"
        }).eq("id", book_id).execute()


if __name__ == "__main__":
    print("=" * 50)
    print("Lesson Content Fix Script")
    print("=" * 50)

    fix_lesson_content()
    fix_error_courses()
    fix_stuck_processing()

    print("\n" + "=" * 50)
    print("Done!")
    print("=" * 50)
