'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, BookOpen, CheckCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react'
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
  const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-dark-100">Learning Progress</h1>
        <p className="text-dark-400 mt-2 text-lg">Track your learning journey across all courses</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-primary-500" />
            </div>
          </div>
          <div className="text-4xl font-bold text-dark-100 mb-2">{courses.length}</div>
          <div className="text-base text-dark-400">Total Courses</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
          </div>
          <div className="text-4xl font-bold text-dark-100 mb-2">{completedCourses.length}</div>
          <div className="text-base text-dark-400">Completed</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-blue-500" />
            </div>
          </div>
          <div className="text-4xl font-bold text-dark-100 mb-2">{inProgressCourses.length}</div>
          <div className="text-base text-dark-400">In Progress</div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-yellow-500" />
            </div>
          </div>
          <div className="text-4xl font-bold text-dark-100 mb-2">{completedLessons}<span className="text-2xl text-dark-500">/{totalLessons}</span></div>
          <div className="text-base text-dark-400">Lessons Completed</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      {courses.length > 0 && (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-dark-100">Overall Progress</h2>
            <span className="text-2xl font-bold text-primary-500">{overallProgress}%</span>
          </div>
          <div className="h-4 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className="text-dark-500 mt-3">
            You've completed {completedLessons} of {totalLessons} lessons across {courses.length} courses
          </p>
        </div>
      )}

      {/* Course Progress List */}
      {courses.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold text-dark-100 mb-6">Course Progress</h2>

          <div className="space-y-4">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/course/${course.id}`}
                className="block bg-dark-900 border border-dark-800 hover:border-dark-700 rounded-2xl p-6 transition-all hover:bg-dark-850"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-dark-100">{course.title}</h3>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'text-lg font-bold',
                      course.progress === 100 ? 'text-green-500' :
                      course.progress > 0 ? 'text-blue-500' : 'text-dark-500'
                    )}>
                      {course.progress}%
                    </span>
                    <ArrowRight className="w-5 h-5 text-dark-500" />
                  </div>
                </div>
                <div className="h-3 bg-dark-800 rounded-full overflow-hidden mb-4">
                  <div
                    className={cn(
                      'h-full transition-all',
                      course.progress === 100 ? 'bg-green-500' :
                      course.progress > 0 ? 'bg-blue-500' : 'bg-dark-700'
                    )}
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-6 text-sm text-dark-500">
                  <span>{course.chapters_count} chapters</span>
                  <span>{course.lessons_count} lessons</span>
                  <span className={course.progress > 0 ? 'text-dark-400' : ''}>
                    {Math.round(course.lessons_count * course.progress / 100)} completed
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-16 text-center">
          <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-8">
            <TrendingUp className="w-10 h-10 text-dark-500" />
          </div>
          <h2 className="text-2xl font-semibold text-dark-100 mb-3">No progress yet</h2>
          <p className="text-dark-400 mb-8 text-lg max-w-md mx-auto">
            Start learning from your courses to track your progress here. Your journey begins with the first lesson.
          </p>
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors text-lg"
          >
            View Courses
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      )}
    </div>
  )
}
