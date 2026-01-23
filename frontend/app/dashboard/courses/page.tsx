'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CourseCard } from '@/components/course/CourseCard'
import { Plus, BookOpen, Loader2, Search } from 'lucide-react'
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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
        setCourses(await response.json())
      } catch (err) {
        setError('Failed to load courses')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Poll for updates
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

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-dark-100">My Courses</h1>
          <p className="text-dark-400 mt-1">All your converted courses in one place</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload PDF
        </Link>
      </div>

      {/* Search */}
      {courses.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-800 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Course Grid */}
      {!isLoading && !error && (
        filteredCourses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
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
        ) : searchQuery ? (
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
            <p className="text-dark-400">No courses found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-8 h-8 text-dark-500" />
            </div>
            <h2 className="text-xl font-semibold text-dark-100 mb-2">No courses yet</h2>
            <p className="text-dark-400 mb-6 max-w-md mx-auto">
              Upload your first PDF to get started.
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
  )
}
