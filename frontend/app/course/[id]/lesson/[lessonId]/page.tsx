'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { LessonContent as LessonContentComponent, Quiz } from '@/components/course'
import { Button } from '@/components/ui'
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContent = any

interface LessonData {
  lesson: {
    id: string
    title: string
    order: number
    content: {
      introduction: string
      explanation: string
      examples: AnyContent[]
      keyPoints: AnyContent[]
      summary: string
    }
    completed: boolean
  }
  quiz: AnyContent[]
}

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQuiz, setShowQuiz] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizScore, setQuizScore] = useState({ score: 0, total: 0 })

  const courseId = params.id as string
  const lessonId = params.lessonId as string

  useEffect(() => {
    async function fetchLesson() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/lessons/${lessonId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch lesson')
        }

        const data = await response.json()
        setLesson(data)
      } catch (err) {
        console.error('Error fetching lesson:', err)
        setError('Failed to load lesson')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLesson()
  }, [lessonId, router])

  const handleQuizComplete = async (score: number, total: number) => {
    setQuizScore({ score, total })
    setQuizCompleted(true)

    // Mark lesson as complete
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        await fetch(`${apiUrl}/api/lessons/${lessonId}/complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ quiz_score: Math.round((score / total) * 100) }),
        })
      }
    } catch (err) {
      console.error('Error marking lesson complete:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-dark-950 pt-24 px-4 text-center">
        <p className="text-red-500">{error || 'Lesson not found'}</p>
        <Link href={`/course/${courseId}`} className="text-primary-500 hover:underline mt-4 inline-block">
          Back to Course
        </Link>
      </div>
    )
  }

  const lessonInfo = lesson.lesson
  const quizQuestions = lesson.quiz

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Top Bar */}
      <div className="sticky top-0 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800 px-4 py-3 flex items-center gap-4 z-30">
        <Link
          href={`/course/${courseId}`}
          className="flex items-center gap-2 text-dark-400 hover:text-dark-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Course</span>
        </Link>
        <div className="flex-1 text-center">
          <span className="text-sm text-dark-300 font-medium">{lessonInfo.title}</span>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-dark-100 mb-8">{lessonInfo.title}</h1>

        {!showQuiz ? (
          <>
            <LessonContentComponent content={lessonInfo.content} />

            <div className="mt-12 flex justify-center">
              <Button onClick={() => setShowQuiz(true)} size="lg">
                Take Quiz
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-dark-100 mb-6">Quiz</h2>
            <Quiz questions={quizQuestions} onComplete={handleQuizComplete} />

            {quizCompleted && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 bg-primary-500/20 text-primary-500 px-4 py-2 rounded-lg mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  Lesson Complete! Score: {quizScore.score}/{quizScore.total}
                </div>
                <div>
                  <Link href={`/course/${courseId}`}>
                    <Button size="lg">
                      Back to Course
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
