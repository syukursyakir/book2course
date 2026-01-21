'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout'
import { Button, Progress } from '@/components/ui'
import { ChapterList } from '@/components/course'
import { ArrowLeft, BookOpen, Clock, GraduationCap, Play, Loader2, Sparkles, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Lesson {
  id: string
  title: string
  order: number
  completed: boolean
}

interface Chapter {
  id: string
  title: string
  description: string
  order: number
  lessons: Lesson[]
}

interface QualityScores {
  specificity_score: number
  technical_depth_score: number
  actionability_score: number
  average_score: number
  mode: string
  reasoning: string
}

interface Course {
  id: string
  title: string
  description: string
  progress: number
  chapters_count: number
  lessons_count: number
  quality_mode?: string
  quality_scores?: QualityScores
}

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<Course | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchCourse() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/courses/${params.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch course')
        }

        const data = await response.json()
        setCourse(data.course)
        setChapters(data.chapters)
      } catch (err) {
        console.error('Error fetching course:', err)
        setError('Failed to load course')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourse()
  }, [params.id, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="pt-24 px-4 text-center">
          <p className="text-red-500">{error || 'Course not found'}</p>
          <Link href="/dashboard" className="text-primary-500 hover:underline mt-4 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)
  const completedLessons = chapters.reduce(
    (sum, ch) => sum + ch.lessons.filter((l) => l.completed).length,
    0
  )

  // Find the first incomplete lesson
  let nextLesson: Lesson | null = null
  for (const chapter of chapters) {
    const incomplete = chapter.lessons.find((l) => !l.completed)
    if (incomplete) {
      nextLesson = incomplete
      break
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Course Header */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-8 h-8 text-primary-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-dark-100 mb-2">{course.title}</h1>
                <p className="text-dark-400 mb-4">{course.description}</p>

                <div className="flex flex-wrap items-center gap-6 text-sm text-dark-500 mb-6">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    {chapters.length} chapters
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {totalLessons} lessons
                  </div>
                  <div>
                    {completedLessons} of {totalLessons} completed
                  </div>
                  {course.quality_mode && (
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        course.quality_mode === 'ENHANCE'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                      title={course.quality_scores?.reasoning || `${course.quality_mode} mode`}
                    >
                      {course.quality_mode === 'ENHANCE' ? (
                        <Sparkles className="w-3 h-3" />
                      ) : (
                        <Shield className="w-3 h-3" />
                      )}
                      {course.quality_mode === 'ENHANCE' ? 'Enhanced' : 'Preserved'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={course.progress} showLabel />
                  </div>
                  {nextLesson && (
                    <Link href={`/course/${course.id}/lesson/${nextLesson.id}`}>
                      <Button>
                        <Play className="w-4 h-4 mr-2" />
                        {completedLessons > 0 ? 'Continue' : 'Start Learning'}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chapter List */}
          <h2 className="text-xl font-semibold text-dark-100 mb-6">Course Content</h2>
          <ChapterList courseId={course.id} chapters={chapters} />
        </div>
      </main>
    </div>
  )
}
