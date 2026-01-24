import asyncio
from typing import Optional
from services.supabase_client import (
    get_supabase_client,
    update_book_status,
    update_book_progress,
    create_course,
    create_chapter,
    create_lesson,
)
from services.pdf_processor import extract_text_from_pdf
from services.ai_generator import process_book_to_course
from services.chapter_extractor import extract_chapter_pages


class BookQueueWorker:
    """
    A singleton worker that processes books one at a time from the queue.
    This prevents API rate limits and server overload.
    """
    _instance: Optional['BookQueueWorker'] = None
    _is_running: bool = False
    _current_book_id: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls) -> 'BookQueueWorker':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def is_processing(self) -> bool:
        return self._is_running

    @property
    def current_book(self) -> Optional[str]:
        return self._current_book_id

    async def get_next_queued_book(self) -> Optional[dict]:
        """Get the next book in the queue (oldest first)."""
        client = get_supabase_client()
        result = client.table("books").select("*").eq(
            "status", "queued"
        ).order("created_at", desc=False).limit(1).execute()
        return result.data[0] if result.data else None

    async def get_queue_position(self, book_id: str) -> int:
        """Get the position of a book in the queue (1-indexed)."""
        client = get_supabase_client()

        # Get the book's created_at
        book = client.table("books").select("created_at").eq("id", book_id).single().execute()
        if not book.data:
            return 0

        # Count how many queued books are ahead
        result = client.table("books").select("id", count="exact").eq(
            "status", "queued"
        ).lt("created_at", book.data["created_at"]).execute()

        return (result.count or 0) + 1

    async def check_book_exists(self, book_id: str) -> bool:
        """Check if a book still exists (hasn't been deleted)."""
        client = get_supabase_client()
        result = client.table("books").select("id").eq("id", book_id).execute()
        return len(result.data) > 0

    async def process_book(self, book: dict) -> None:
        """Process a single book."""
        book_id = book["id"]
        user_id = book["user_id"]
        book_title = book["title"]
        file_url = book["file_url"]

        self._current_book_id = book_id
        print(f"[QUEUE] Starting to process book: {book_id} - {book_title}")

        try:
            # Check if book still exists before starting
            if not await self.check_book_exists(book_id):
                print(f"[QUEUE] Book {book_id} was deleted, skipping")
                return

            # Update status to processing
            await update_book_status(book_id, "processing")
            await update_book_progress(book_id, "Downloading PDF...")

            # Download PDF from storage
            client = get_supabase_client()

            # Extract bucket and path from URL
            # URL format: https://xxx.supabase.co/storage/v1/object/public/books/user_id/file_id.pdf
            path_parts = file_url.split("/storage/v1/object/public/books/")
            if len(path_parts) < 2:
                raise Exception("Invalid file URL format")

            file_path = path_parts[1]
            pdf_response = client.storage.from_("books").download(file_path)
            pdf_bytes = pdf_response

            # Check if specific chapters were selected
            selected_chapters = book.get("selected_chapters")
            if selected_chapters:
                await update_book_progress(book_id, f"Extracting {len(selected_chapters)} selected chapters...")
                pdf_bytes = extract_chapter_pages(pdf_bytes, selected_chapters)
                print(f"[QUEUE] Extracted selected chapters, new PDF size: {len(pdf_bytes)} bytes")

            # Progress callback that also checks if book was deleted
            async def on_progress(step: str):
                # Check if book still exists
                if not await self.check_book_exists(book_id):
                    raise Exception("Book was deleted")
                await update_book_progress(book_id, step)

            # Extract text
            await on_progress("Extracting text from PDF...")
            text = extract_text_from_pdf(pdf_bytes)
            print(f"[QUEUE] Extracted {len(text)} characters from PDF")

            if not text or len(text) < 100:
                raise Exception("Not enough text extracted from PDF")

            # All users who upload have paid credits, so they get full features
            user_tier = "pro"
            print(f"[QUEUE] User tier: {user_tier} (credit-based)")

            # Process with AI
            await on_progress("Starting AI processing...")
            course_data = await process_book_to_course(
                text,
                book_title,
                progress_callback=on_progress,
                user_tier=user_tier
            )
            print(f"[QUEUE] AI processing complete")

            overview = course_data["overview"]
            structure = course_data["structure"]
            quality = course_data.get("quality", {})

            # Create course
            await on_progress("Saving course to database...")
            course = await create_course(
                book_id=book_id,
                user_id=user_id,
                title=overview.get("title", book_title),
                description=f"A course generated from {book_title}. " +
                           f"Main themes: {', '.join(overview.get('main_themes', [])[:3])}",
                structure_json=structure,
                quality_mode=quality.get("mode", "ENHANCE"),
                quality_scores=quality
            )

            # Create chapters and lessons
            for chapter_order, chapter_data in enumerate(structure.get("chapters", [])):
                chapter = await create_chapter(
                    course_id=course["id"],
                    title=chapter_data["title"],
                    order=chapter_order,
                    source_sections=[]
                )

                for lesson_order, lesson_data in enumerate(chapter_data.get("lessons", [])):
                    await create_lesson(
                        chapter_id=chapter["id"],
                        title=lesson_data["title"],
                        order=lesson_order,
                        content_json=lesson_data.get("content", {}),
                        quiz_json=lesson_data.get("quiz", [])
                    )

            # Mark as ready
            await update_book_status(book_id, "ready", "Complete!")
            print(f"[QUEUE] Book {book_id} processing complete!")

        except Exception as e:
            print(f"[QUEUE] Error processing book {book_id}: {e}")
            import traceback
            traceback.print_exc()
            await update_book_status(book_id, "error", f"Error: {str(e)[:100]}")

        finally:
            self._current_book_id = None

    async def run_worker(self) -> None:
        """Main worker loop - processes books from queue one at a time."""
        if self._is_running:
            print("[QUEUE] Worker already running")
            return

        self._is_running = True
        print("[QUEUE] Worker started")

        try:
            while True:
                # Check for next book in queue
                book = await self.get_next_queued_book()

                if book:
                    await self.process_book(book)
                else:
                    # No books in queue, wait before checking again
                    await asyncio.sleep(5)

        except asyncio.CancelledError:
            print("[QUEUE] Worker stopped")
        finally:
            self._is_running = False

    def start(self) -> None:
        """Start the worker in the background."""
        asyncio.create_task(self.run_worker())


# Global worker instance
queue_worker = BookQueueWorker.get_instance()
