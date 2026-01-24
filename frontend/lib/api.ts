// API configuration - requires NEXT_PUBLIC_API_URL to be set
const getApiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url) {
    // In development, fall back to localhost
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:8000'
    }
    // In production, this should never happen
    console.error('NEXT_PUBLIC_API_URL environment variable is not configured')
    throw new Error('API URL not configured. Please set NEXT_PUBLIC_API_URL.')
  }
  return url
}

const API_BASE_URL = getApiBaseUrl()

interface ApiResponse<T> {
  data?: T
  error?: string
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      return { error: error.message || error.detail || `HTTP ${response.status}` }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Course types
export interface Course {
  id: string
  title: string
  description: string
  chapters_count: number
  lessons_count: number
  progress: number
  status: 'processing' | 'ready' | 'error'
  created_at: string
}

export interface Chapter {
  id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  order: number
  completed: boolean
}

export interface LessonContent {
  introduction: string
  explanation: string
  examples: string[]
  keyPoints: string[]
  summary: string
}

export interface QuizQuestion {
  type: 'mcq' | 'short_answer'
  id: string
  question: string
  options?: string[]
  correctAnswer?: number
  sampleAnswer?: string
}

// API functions
export const api = {
  // Upload
  async uploadPDF(file: File, token: string) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }))
      return { error: error.message || error.detail }
    }

    return { data: await response.json() }
  },

  // Courses
  async getCourses(token: string) {
    return fetchApi<Course[]>('/api/courses', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getCourse(id: string, token: string) {
    return fetchApi<{
      course: Course
      chapters: Chapter[]
    }>(`/api/courses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // Lessons
  async getLesson(id: string, token: string) {
    return fetchApi<{
      lesson: Lesson & { content: LessonContent }
      quiz: QuizQuestion[]
    }>(`/api/lessons/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // Quiz
  async submitQuiz(
    lessonId: string,
    answers: Record<string, number | string>,
    token: string
  ) {
    return fetchApi<{ score: number; total: number }>('/api/quiz/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ lesson_id: lessonId, answers }),
    })
  },

  // Progress
  async getProgress(courseId: string, token: string) {
    return fetchApi<{
      completed_lessons: string[]
      total_lessons: number
      percentage: number
    }>(`/api/progress/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async markLessonComplete(lessonId: string, token: string) {
    return fetchApi<{ success: boolean }>(`/api/progress/complete/${lessonId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // Billing
  async createCheckoutSession(tier: 'basic' | 'pro', token: string) {
    return fetchApi<{ checkout_url: string }>(`/api/billing/create-checkout-session?tier=${tier}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async createPortalSession(token: string) {
    return fetchApi<{ portal_url: string }>('/api/billing/create-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getSubscription(token: string) {
    return fetchApi<{
      tier: string
      status: string | null
      current_period_end: number | null
      cancel_at_period_end?: boolean
    }>('/api/billing/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // Account
  async deleteAccount(token: string) {
    return fetchApi<{ success: boolean; message: string }>('/api/auth/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}

// Export base URL for components that need it directly
export { API_BASE_URL }
