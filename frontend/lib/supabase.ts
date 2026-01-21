import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Type definitions for database
export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          user_id: string
          title: string
          file_url: string
          status: 'uploading' | 'processing' | 'ready' | 'error'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_url: string
          status?: 'uploading' | 'processing' | 'ready' | 'error'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_url?: string
          status?: 'uploading' | 'processing' | 'ready' | 'error'
          created_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          book_id: string
          user_id: string
          title: string
          description: string
          structure_json: object
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          user_id: string
          title: string
          description: string
          structure_json: object
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          user_id?: string
          title?: string
          description?: string
          structure_json?: object
          created_at?: string
        }
      }
      chapters: {
        Row: {
          id: string
          course_id: string
          title: string
          order: number
          source_sections: string[]
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          order: number
          source_sections?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          order?: number
          source_sections?: string[]
          created_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          chapter_id: string
          title: string
          order: number
          content_json: object
          quiz_json: object
          created_at: string
        }
        Insert: {
          id?: string
          chapter_id: string
          title: string
          order: number
          content_json: object
          quiz_json: object
          created_at?: string
        }
        Update: {
          id?: string
          chapter_id?: string
          title?: string
          order?: number
          content_json?: object
          quiz_json?: object
          created_at?: string
        }
      }
      progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          completed: boolean
          quiz_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          completed?: boolean
          quiz_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          completed?: boolean
          quiz_score?: number | null
          created_at?: string
        }
      }
    }
  }
}
