# Book2Course

Transform any PDF book into an interactive online course using AI.

## Overview

Book2Course is a web application that takes PDF books and converts them into structured learning experiences with:
- **Chapters** - Organized sections based on book content
- **Lessons** - Detailed explanations with examples
- **Quizzes** - Multiple choice and short answer questions

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database/Auth/Storage**: Supabase
- **AI**: OpenRouter (Gemini Flash)

## Project Structure

```
Book2CourseTry2/
├── frontend/               # Next.js frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   │   ├── ui/           # Design system
│   │   ├── layout/       # Navbar, Sidebar, Footer
│   │   ├── course/       # Course-related components
│   │   └── upload/       # PDF uploader
│   └── lib/              # Utilities and API client
│
├── backend/               # FastAPI backend
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic
│   │   ├── pdf_processor.py
│   │   ├── ai_generator.py
│   │   └── supabase_client.py
│   └── models/           # Pydantic schemas
│
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account
- OpenRouter API key

### 1. Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `backend/supabase_schema.sql` in the SQL Editor
3. Copy your project URL and keys

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Start server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## Environment Variables

### Frontend (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload PDF and start processing |
| GET | /api/courses | List user's courses |
| GET | /api/courses/{id} | Get course details |
| GET | /api/lessons/{id} | Get lesson content |
| POST | /api/quiz/submit | Submit quiz answers |
| GET | /api/progress/{id} | Get user progress |

## Features

- **Dark Theme UI** - Clean, modern design inspired by Linear/Brilliant
- **PDF Upload** - Drag and drop interface with progress tracking
- **AI Processing** - Automatic content extraction and course generation
- **Interactive Quizzes** - MCQ and short answer formats
- **Progress Tracking** - Track completion across lessons

## AI Pipeline

1. **Chunking**: Split PDF text into ~25K character chunks
2. **Summarize**: Extract topics, concepts, and summary per chunk
3. **Overview**: Generate unified book themes and objectives
4. **Structure**: Create chapter and lesson mapping
5. **Content**: Generate detailed lesson content
6. **Quizzes**: Create 5 MCQs + 2 short answers per lesson

## License

MIT
