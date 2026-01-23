-- Migration: Add credits system
-- Run this in your Supabase SQL Editor

-- Add credits column to profiles table (default 5 for free users)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 5;

-- Update existing users to have 5 credits if they have 0 or null
UPDATE profiles
SET credits = 5
WHERE credits IS NULL OR credits = 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_credits_idx ON profiles(credits);
