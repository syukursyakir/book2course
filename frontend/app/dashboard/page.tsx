'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CourseCard } from '@/components/course/CourseCard'
import { Plus, BookOpen, Loader2, TrendingUp, Clock, CheckCircle, Library } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Course {
  id: string
  title: string
  description: string
  chapters_count: number
  lessons_count: number
  progress: number
  status: 'pending_selection' | 'queued' | 'processing' | 'ready' | 'error'
  processing_step?: string
  queue_position?: number
}

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchCourses() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/courses`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })

        if (!response.ok) throw new Error('Failed to fetch courses')
        const data = await response.json()
        setCourses(data)
      } catch (err) {
        setError('Failed to load courses')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Poll for updates when there are processing courses
  useEffect(() => {
    const hasProcessing = courses.some(c => c.status === 'processing' || c.status === 'queued')
    if (!hasProcessing) return

    const pollInterval = setInterval(async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/courses`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })

        if (response.ok) {
          setCourses(await response.json())
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [courses])

  // Calculate stats
  const totalCourses = courses.filter(c => c.status === 'ready').length
  const inProgress = courses.filter(c => c.progress > 0 && c.progress < 100).length
  const completed = courses.filter(c => c.progress === 100).length
  const recentCourses = courses.slice(0, 3)

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
        <p className="text-dark-400 mt-1">Welcome back! Here's an overview of your learning.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Library className="w-5 h-5 text-primary-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-dark-100">{totalCourses}</div>
          <div className="text-sm text-dark-400">Total Courses</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-dark-100">{inProgress}</div>
          <div className="text-sm text-dark-400">In Progress</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="text-2xl font-bold text-dark-100">{completed}</div>
          <div className="text-sm text-dark-400">Completed</div>
        </div>

        <Link href="/dashboard/upload" className="bg-dark-900 border border-dark-800 hover:border-primary-500/50 rounded-xl p-5 transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-dark-800 group-hover:bg-primary-500/20 rounded-lg flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-dark-400 group-hover:text-primary-500 transition-colors" />
            </div>
          </div>
          <div className="text-sm font-medium text-dark-300 group-hover:text-primary-500 transition-colors">New Course</div>
          <div className="text-sm text-dark-500">Upload a PDF</div>
        </Link>
      </div>

      {/* Recent Courses */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-100">Recent Courses</h2>
          {courses.length > 3 && (
            <Link href="/dashboard/courses" className="text-sm text-primary-500 hover:underline">
              View all
            </Link>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        )}

        {error && !isLoading && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!isLoading && !error && (
          recentCourses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  chaptersCount={course.chapters_count}
                  lessonsCount={course.lessons_count}
                  progress={course.progress}
                  status={course.status}
                  processingStep={course.processing_step}
                  queuePosition={course.queue_position}
                  onDelete={() => setCourses(courses.filter(c => c.id !== course.id))}
                />
              ))}
            </div>
          ) : (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-8 h-8 text-dark-500" />
              </div>
              <h2 className="text-xl font-semibold text-dark-100 mb-2">No courses yet</h2>
              <p className="text-dark-400 mb-6 max-w-md mx-auto">
                Upload your first PDF to get started. Our AI will transform it into an interactive course.
              </p>
              <Link
                href="/dashboard/upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Upload Your First PDF
              </Link>
            </div>
          )
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/dashboard/upload"
            className="flex items-center gap-4 p-4 bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-dark-200">Upload PDF</div>
              <div className="text-xs text-dark-500">Create a new course</div>
            </div>
          </Link>

          <Link
            href="/dashboard/courses"
            className="flex items-center gap-4 p-4 bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Library className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-dark-200">My Courses</div>
              <div className="text-xs text-dark-500">View all courses</div>
            </div>
          </Link>

          <Link
            href="/dashboard/progress"
            className="flex items-center gap-4 p-4 bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-xl transition-colors"
          >
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-dark-200">View Progress</div>
              <div className="text-xs text-dark-500">Track your learning</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
