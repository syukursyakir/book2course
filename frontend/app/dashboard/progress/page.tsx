'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, BookOpen, CheckCircle, Clock, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Course {
  id: string
  title: string
  progress: number
  chapters_count: number
  lessons_count: number
  status: string
}

export default function ProgressPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

        if (response.ok) {
          const data = await response.json()
          setCourses(data.filter((c: Course) => c.status === 'ready'))
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [])

  const completedCourses = courses.filter(c => c.progress === 100)
  const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100)
  const notStartedCourses = courses.filter(c => c.progress === 0)
  const totalLessons = courses.reduce((acc, c) => acc + c.lessons_count, 0)
  const completedLessons = courses.reduce((acc, c) => acc + Math.round(c.lessons_count * c.progress / 100), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Learning Progress</h1>
        <p className="text-dark-400 mt-1">Track your learning journey across all courses</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-primary-500" />
            <span className="text-sm text-dark-400">Total Courses</span>
          </div>
          <div className="text-2xl font-bold text-dark-100">{courses.length}</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-dark-400">Completed</span>
          </div>
          <div className="text-2xl font-bold text-dark-100">{completedCourses.length}</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-dark-400">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-dark-100">{inProgressCourses.length}</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-yellow-500" />
            <span className="text-sm text-dark-400">Lessons Done</span>
          </div>
          <div className="text-2xl font-bold text-dark-100">{completedLessons}/{totalLessons}</div>
        </div>
      </div>

      {/* Course Progress List */}
      {courses.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-dark-100">Course Progress</h2>

          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/course/${course.id}`}
              className="block bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-dark-100">{course.title}</h3>
                <span className={cn(
                  'text-sm font-medium',
                  course.progress === 100 ? 'text-green-500' :
                  course.progress > 0 ? 'text-blue-500' : 'text-dark-500'
                )}>
                  {course.progress}%
                </span>
              </div>
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    course.progress === 100 ? 'bg-green-500' :
                    course.progress > 0 ? 'bg-blue-500' : 'bg-dark-700'
                  )}
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-dark-500">
                <span>{course.chapters_count} chapters</span>
                <span>{course.lessons_count} lessons</span>
                <span>{Math.round(course.lessons_count * course.progress / 100)} completed</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-8 h-8 text-dark-500" />
          </div>
          <h2 className="text-xl font-semibold text-dark-100 mb-2">No progress yet</h2>
          <p className="text-dark-400 mb-6">Start learning to see your progress here.</p>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            View Courses
          </Link>
        </div>
      )}
    </div>
  )
}
