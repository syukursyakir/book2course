"""
Book2Course App Tester
Run this script to test the full flow: upload a book, wait for processing, and analyze the course.

Usage:
  python test_app.py --email YOUR_EMAIL

It will prompt you for the OTP code sent to your email.
"""

import asyncio
import argparse
import httpx
import time
import os
from supabase import create_client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
API_URL = os.getenv("API_URL", "http://localhost:8000")

# Sample free PDF for testing (Alice in Wonderland - public domain)
TEST_PDF_URL = "https://www.gutenberg.org/files/11/11-pdf.pdf"
TEST_PDF_NAME = "alice_in_wonderland.pdf"


async def download_test_pdf():
    """Download a free public domain book for testing."""
    print(f"📥 Downloading test PDF: {TEST_PDF_NAME}...")

    async with httpx.AsyncClient() as client:
        response = await client.get(TEST_PDF_URL, follow_redirects=True)
        if response.status_code == 200:
            with open(TEST_PDF_NAME, "wb") as f:
                f.write(response.content)
            print(f"✅ Downloaded {TEST_PDF_NAME} ({len(response.content) / 1024:.1f} KB)")
            return TEST_PDF_NAME
        else:
            print(f"❌ Failed to download: {response.status_code}")
            return None


async def login_with_otp(email: str):
    """Login using email OTP."""
    print(f"\n🔐 Logging in with email: {email}")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Send OTP
    print("📧 Sending OTP to your email...")
    response = supabase.auth.sign_in_with_otp({"email": email})

    # Wait for user to enter OTP
    otp = input("\n🔢 Enter the 6-digit code from your email: ").strip()

    # Verify OTP
    print("🔄 Verifying OTP...")
    response = supabase.auth.verify_otp({
        "email": email,
        "token": otp,
        "type": "email"
    })

    if response.session:
        print("✅ Login successful!")
        return response.session.access_token
    else:
        print("❌ Login failed!")
        return None


async def upload_book(token: str, pdf_path: str):
    """Upload a PDF book to the API."""
    print(f"\n📤 Uploading {pdf_path}...")

    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(pdf_path, "rb") as f:
            files = {"file": (pdf_path, f, "application/pdf")}
            data = {"upload_type": "book"}
            headers = {"Authorization": f"Bearer {token}"}

            response = await client.post(
                f"{API_URL}/api/upload",
                files=files,
                data=data,
                headers=headers
            )

            if response.status_code == 200:
                result = response.json()
                print(f"✅ Upload successful! Book ID: {result.get('book_id')}")
                return result.get("book_id")
            else:
                print(f"❌ Upload failed: {response.status_code} - {response.text}")
                return None


async def wait_for_processing(token: str, book_id: str, max_wait: int = 600):
    """Wait for the book to be processed."""
    print(f"\n⏳ Waiting for processing (max {max_wait}s)...")

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        start_time = time.time()

        while time.time() - start_time < max_wait:
            response = await client.get(
                f"{API_URL}/api/books/{book_id}",
                headers=headers
            )

            if response.status_code == 200:
                book = response.json()
                status = book.get("status")
                progress = book.get("progress_message", "")

                print(f"  Status: {status} - {progress}")

                if status == "ready":
                    print("✅ Processing complete!")
                    return True
                elif status == "error":
                    print(f"❌ Processing failed: {progress}")
                    return False

            await asyncio.sleep(5)

        print("❌ Timeout waiting for processing")
        return False


async def analyze_course(token: str, book_id: str):
    """Fetch and analyze the generated course."""
    print(f"\n📊 Analyzing generated course...")

    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}

        # Get the course
        response = await client.get(
            f"{API_URL}/api/books/{book_id}/course",
            headers=headers
        )

        if response.status_code != 200:
            print(f"❌ Failed to fetch course: {response.status_code}")
            return

        course = response.json()

        print("\n" + "=" * 60)
        print("📚 COURSE ANALYSIS")
        print("=" * 60)

        print(f"\n📖 Title: {course.get('title', 'N/A')}")
        print(f"📝 Description: {course.get('description', 'N/A')[:100]}...")

        # Get chapters
        chapters = course.get("chapters", [])
        print(f"\n📑 Total Chapters: {len(chapters)}")

        total_lessons = 0
        total_quizzes = 0
        total_quiz_questions = 0

        for i, chapter in enumerate(chapters, 1):
            lessons = chapter.get("lessons", [])
            total_lessons += len(lessons)

            print(f"\n  Chapter {i}: {chapter.get('title', 'Untitled')}")
            print(f"    Lessons: {len(lessons)}")

            for j, lesson in enumerate(lessons, 1):
                quiz = lesson.get("quiz_json", [])
                if quiz:
                    total_quizzes += 1
                    total_quiz_questions += len(quiz)

                content = lesson.get("content_json", {})
                content_sections = len(content.get("sections", [])) if isinstance(content, dict) else 0

                print(f"      Lesson {j}: {lesson.get('title', 'Untitled')}")
                print(f"        - Content sections: {content_sections}")
                print(f"        - Quiz questions: {len(quiz)}")

                # Show sample quiz question
                if quiz and j == 1:
                    q = quiz[0]
                    print(f"        - Sample Q: {q.get('question', 'N/A')[:60]}...")

        print("\n" + "=" * 60)
        print("📈 SUMMARY")
        print("=" * 60)
        print(f"  Total Chapters: {len(chapters)}")
        print(f"  Total Lessons: {total_lessons}")
        print(f"  Total Quizzes: {total_quizzes}")
        print(f"  Total Quiz Questions: {total_quiz_questions}")
        print(f"  Avg Questions per Quiz: {total_quiz_questions / total_quizzes:.1f}" if total_quizzes > 0 else "  No quizzes found")

        # Quality assessment
        print("\n" + "=" * 60)
        print("✅ QUALITY CHECKLIST")
        print("=" * 60)

        checks = [
            ("Has chapters", len(chapters) > 0),
            ("Has multiple chapters", len(chapters) >= 3),
            ("Has lessons", total_lessons > 0),
            ("Good lesson count", total_lessons >= 5),
            ("Has quizzes", total_quizzes > 0),
            ("Has quiz questions", total_quiz_questions > 0),
            ("Good question count", total_quiz_questions >= 10),
        ]

        for check_name, passed in checks:
            status = "✅" if passed else "❌"
            print(f"  {status} {check_name}")

        passed = sum(1 for _, p in checks if p)
        print(f"\n  Score: {passed}/{len(checks)} checks passed")

        return course


async def main():
    parser = argparse.ArgumentParser(description="Test Book2Course app")
    parser.add_argument("--email", required=True, help="Email for login")
    parser.add_argument("--api-url", default="https://api.book2course.org", help="API URL")
    parser.add_argument("--skip-download", action="store_true", help="Skip PDF download if already exists")
    args = parser.parse_args()

    global API_URL
    API_URL = args.api_url

    print("🚀 Book2Course App Tester")
    print("=" * 60)

    # Download test PDF
    if not args.skip_download or not os.path.exists(TEST_PDF_NAME):
        pdf_path = await download_test_pdf()
        if not pdf_path:
            return
    else:
        pdf_path = TEST_PDF_NAME
        print(f"📄 Using existing PDF: {pdf_path}")

    # Login
    token = await login_with_otp(args.email)
    if not token:
        return

    # Check credits
    async with httpx.AsyncClient() as client:
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(f"{API_URL}/api/usage", headers=headers)
        if response.status_code == 200:
            usage = response.json()
            credits = usage.get("credits", 0)
            print(f"\n💳 Current credits: {credits}")
            if credits < 5:
                print("❌ Not enough credits to upload a book (need 5)")
                return

    # Upload book
    book_id = await upload_book(token, pdf_path)
    if not book_id:
        return

    # Wait for processing
    success = await wait_for_processing(token, book_id)
    if not success:
        return

    # Analyze course
    await analyze_course(token, book_id)

    print("\n✨ Testing complete!")


if __name__ == "__main__":
    asyncio.run(main())
