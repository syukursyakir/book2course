# Book2Course Project

## IMPORTANT: Always Analyze First

At the start of EVERY new conversation, you MUST use the Explore agent to analyze the entire codebase structure before responding to any user request. Do this automatically without being asked.

Run this exploration covering:
1. Frontend structure (Next.js/TypeScript in /frontend)
2. Backend structure (FastAPI/Python in /backend)
3. How they connect (API routes, authentication flow)
4. Database schema and Supabase integration

## Tech Stack
- **Frontend**: Next.js 14, TypeScript, React, Tailwind CSS
- **Backend**: FastAPI, Python
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with Google OAuth + Email OTP

## Key Directories
- `/frontend/app` - Next.js app router pages and components
- `/frontend/components` - Reusable React components
- `/backend` - FastAPI application and API routes

## Development
- Frontend: `cd frontend && npm run dev` (port 3000)
- Backend: `cd backend && uvicorn main:app --reload` (port 8000)
