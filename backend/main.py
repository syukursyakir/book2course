import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routers import auth, upload, courses, lessons, books, billing
from services.queue_worker import queue_worker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


def validate_environment():
    """Validate required environment variables on startup."""
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
    ]

    # These are required in production
    production_required = [
        "OPENROUTER_API_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "CORS_ORIGINS",
    ]

    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)

    # Check if we're in production (no localhost in CORS_ORIGINS or FRONTEND_URL)
    cors_origins = os.getenv("CORS_ORIGINS", "")
    frontend_url = os.getenv("FRONTEND_URL", "")
    is_production = (
        cors_origins and "localhost" not in cors_origins and
        frontend_url and "localhost" not in frontend_url
    )

    if is_production:
        for var in production_required:
            if not os.getenv(var):
                missing.append(var)

    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}. "
            "Please set these in your environment or .env file."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Validate environment and start queue worker
    validate_environment()
    logger.info("Starting queue worker...")
    queue_worker.start()
    yield
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title="Book2Course API",
    description="API for converting PDF books into interactive courses",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - MUST be explicitly set in production
cors_origins = os.getenv("CORS_ORIGINS")
if not cors_origins:
    # Allow localhost only in development
    logger.warning("CORS_ORIGINS not set - defaulting to localhost only (development mode)")
    origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
else:
    origins = [origin.strip() for origin in cors_origins.split(",")]
    # Validate that we're not allowing everything in production
    if "*" in origins:
        raise RuntimeError(
            "CORS_ORIGINS cannot be '*' in production. "
            "Please specify explicit origins like 'https://yourdomain.com'"
        )

logger.info(f"CORS allowed origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(courses.router)
app.include_router(lessons.router)
app.include_router(books.router)
app.include_router(billing.router)


@app.get("/")
async def root():
    return {
        "name": "Book2Course API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
