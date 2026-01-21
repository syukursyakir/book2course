-- Book2Course Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Books table (uploaded PDFs)
create table books (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    file_url text not null,
    status text default 'uploading' check (status in ('uploading', 'processing', 'ready', 'error')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Courses table (generated from books)
create table courses (
    id uuid primary key default uuid_generate_v4(),
    book_id uuid references books(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text not null,
    description text,
    structure_json jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chapters table
create table chapters (
    id uuid primary key default uuid_generate_v4(),
    course_id uuid references courses(id) on delete cascade not null,
    title text not null,
    "order" integer not null default 0,
    source_sections text[] default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Lessons table
create table lessons (
    id uuid primary key default uuid_generate_v4(),
    chapter_id uuid references chapters(id) on delete cascade not null,
    title text not null,
    "order" integer not null default 0,
    content_json jsonb default '{}'::jsonb,
    quiz_json jsonb default '[]'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Progress table
create table progress (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete cascade not null,
    lesson_id uuid references lessons(id) on delete cascade not null,
    completed boolean default false,
    quiz_score integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, lesson_id)
);

-- Indexes for better query performance
create index books_user_id_idx on books(user_id);
create index courses_user_id_idx on courses(user_id);
create index courses_book_id_idx on courses(book_id);
create index chapters_course_id_idx on chapters(course_id);
create index lessons_chapter_id_idx on lessons(chapter_id);
create index progress_user_id_idx on progress(user_id);
create index progress_lesson_id_idx on progress(lesson_id);

-- Row Level Security (RLS) policies
alter table books enable row level security;
alter table courses enable row level security;
alter table chapters enable row level security;
alter table lessons enable row level security;
alter table progress enable row level security;

-- Books policies
create policy "Users can view their own books"
    on books for select
    using (auth.uid() = user_id);

create policy "Users can insert their own books"
    on books for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own books"
    on books for update
    using (auth.uid() = user_id);

create policy "Users can delete their own books"
    on books for delete
    using (auth.uid() = user_id);

-- Courses policies
create policy "Users can view their own courses"
    on courses for select
    using (auth.uid() = user_id);

create policy "Users can insert their own courses"
    on courses for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own courses"
    on courses for update
    using (auth.uid() = user_id);

create policy "Users can delete their own courses"
    on courses for delete
    using (auth.uid() = user_id);

-- Chapters policies (access through course ownership)
create policy "Users can view chapters of their courses"
    on chapters for select
    using (
        exists (
            select 1 from courses
            where courses.id = chapters.course_id
            and courses.user_id = auth.uid()
        )
    );

create policy "Users can manage chapters of their courses"
    on chapters for all
    using (
        exists (
            select 1 from courses
            where courses.id = chapters.course_id
            and courses.user_id = auth.uid()
        )
    );

-- Lessons policies (access through course ownership)
create policy "Users can view lessons of their courses"
    on lessons for select
    using (
        exists (
            select 1 from chapters
            join courses on courses.id = chapters.course_id
            where chapters.id = lessons.chapter_id
            and courses.user_id = auth.uid()
        )
    );

create policy "Users can manage lessons of their courses"
    on lessons for all
    using (
        exists (
            select 1 from chapters
            join courses on courses.id = chapters.course_id
            where chapters.id = lessons.chapter_id
            and courses.user_id = auth.uid()
        )
    );

-- Progress policies
create policy "Users can view their own progress"
    on progress for select
    using (auth.uid() = user_id);

create policy "Users can manage their own progress"
    on progress for all
    using (auth.uid() = user_id);

-- Create storage bucket for books
insert into storage.buckets (id, name, public)
values ('books', 'books', true)
on conflict do nothing;

-- Storage policies for books bucket
create policy "Users can upload their own books"
    on storage.objects for insert
    with check (bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view their own book files"
    on storage.objects for select
    using (bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete their own book files"
    on storage.objects for delete
    using (bucket_id = 'books' and auth.uid()::text = (storage.foldername(name))[1]);

-- Service role bypass for backend operations
-- Note: The backend uses service_role key which bypasses RLS
