-- Migration: Add updated_at column to books table
-- Run this in your Supabase SQL Editor

-- Add updated_at column to books table
ALTER TABLE books
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Add processing_step column if it doesn't exist (for tracking progress)
ALTER TABLE books
ADD COLUMN IF NOT EXISTS processing_step text;

-- Add upload_type column if it doesn't exist
ALTER TABLE books
ADD COLUMN IF NOT EXISTS upload_type text DEFAULT 'book' CHECK (upload_type IN ('book', 'notes'));

-- Add selected_chapters column if it doesn't exist
ALTER TABLE books
ADD COLUMN IF NOT EXISTS selected_chapters jsonb;

-- Add index for faster queries on status and updated_at
CREATE INDEX IF NOT EXISTS books_status_updated_idx ON books(status, updated_at);

-- Update existing rows to have updated_at = created_at
UPDATE books SET updated_at = created_at WHERE updated_at IS NULL;
