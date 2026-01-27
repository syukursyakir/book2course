import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, upload, courses, lessons, books, billing, admin
from services.queue_worker import queue_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the queue worker
    print("[APP] Starting queue worker...")
    queue_worker.start()
    yield
    # Shutdown: Nothing special needed
    print("[APP] Shutting down...")


app = FastAPI(
    title="Book2Course API",
    description="API for converting PDF books into interactive courses",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
# In production, set CORS_ORIGINS env var to your frontend domain
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins == "*":
    origins = ["*"]
else:
    origins = [origin.strip() for origin in cors_origins.split(",")]

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
app.include_router(admin.router)


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
