-- Migration: Add profiles table for Stripe subscription data
-- Run this in your Supabase SQL Editor

-- Profiles table (for Stripe subscription data)
create table if not exists profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null unique,
    stripe_customer_id text,
    stripe_subscription_id text,
    tier text default 'free' check (tier in ('free', 'basic', 'pro')),
    subscription_status text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookups
create index if not exists profiles_user_id_idx on profiles(user_id);
create index if not exists profiles_stripe_customer_id_idx on profiles(stripe_customer_id);
create index if not exists profiles_stripe_subscription_id_idx on profiles(stripe_subscription_id);

-- Enable RLS
alter table profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
    on profiles for select
    using (auth.uid() = user_id);

create policy "Users can update their own profile"
    on profiles for update
    using (auth.uid() = user_id);

-- Note: Insert and full management handled by service role (backend)
