'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { Button } from '@/components/ui'
import { CourseCard } from '@/components/course/CourseCard'
import { Plus, BookOpen, Loader2, Crown, FileText, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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

interface UsageData {
  tier: string
  can_upload_books: boolean
  books_remaining: number | null
  notes_remaining: number | null
  usage: {
    books_this_month: number
    notes_this_month: number
  }
  limits: {
    books_limit: number | null
    notes_limit: number | null
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

        // Fetch courses and usage in parallel
        const [coursesRes, usageRes] = await Promise.all([
          fetch(`${apiUrl}/api/courses`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }),
          fetch(`${apiUrl}/api/usage`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          })
        ])

        if (!coursesRes.ok) {
          throw new Error('Failed to fetch courses')
        }

        const coursesData = await coursesRes.json()
        setCourses(coursesData)

        if (usageRes.ok) {
          const usageData = await usageRes.json()
          setUsageData(usageData)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load courses')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [router])

  // Poll for updates more frequently when there are processing or queued courses
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
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setCourses(data)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds when processing

    return () => clearInterval(pollInterval)
  }, [courses])

  const hasCourses = courses.length > 0

  // Helper to format tier name
  const formatTier = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1)
  }

  // Helper to get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-yellow-500 bg-yellow-500/20'
      case 'basic': return 'text-blue-500 bg-blue-500/20'
      default: return 'text-dark-400 bg-dark-700'
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-dark-100">My Courses</h1>
              <p className="text-dark-400 mt-1">Continue learning or upload a new book</p>
            </div>
            <Link href="/upload">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Upload PDF
              </Button>
            </Link>
          </div>

          {/* Usage Stats Card */}
          {usageData && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Tier Badge */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                    getTierColor(usageData.tier)
                  )}>
                    {usageData.tier !== 'free' && <Crown className="w-4 h-4" />}
                    {formatTier(usageData.tier)} Plan
                  </div>
                  {usageData.tier === 'free' && (
                    <Link
                      href="/pricing"
                      className="text-sm text-primary-500 hover:underline flex items-center gap-1"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Upgrade
                    </Link>
                  )}
                </div>

                {/* Usage Stats */}
                <div className="flex items-center gap-6 text-sm">
                  {/* Notes Usage */}
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-dark-400">Notes:</span>
                    <span className="text-dark-200 font-medium">
                      {usageData.usage.notes_this_month}
                      {usageData.limits.notes_limit !== null && (
                        <span className="text-dark-500">/{usageData.limits.notes_limit}</span>
                      )}
                    </span>
                  </div>

                  {/* Books Usage */}
                  {usageData.can_upload_books ? (
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary-500" />
                      <span className="text-dark-400">Books:</span>
                      <span className="text-dark-200 font-medium">
                        {usageData.usage.books_this_month}
                        {usageData.limits.books_limit !== null && (
                          <span className="text-dark-500">/{usageData.limits.books_limit}</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-dark-500">
                      <BookOpen className="w-4 h-4" />
                      <span>Books: Pro only</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bars for limits */}
              {(usageData.limits.notes_limit !== null || usageData.limits.books_limit !== null) && (
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  {usageData.limits.notes_limit !== null && (
                    <div>
                      <div className="flex justify-between text-xs text-dark-500 mb-1">
                        <span>Notes this month</span>
                        <span>{usageData.notes_remaining} remaining</span>
                      </div>
                      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{
                            width: `${Math.min(100, (usageData.usage.notes_this_month / usageData.limits.notes_limit) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {usageData.can_upload_books && usageData.limits.books_limit !== null && (
                    <div>
                      <div className="flex justify-between text-xs text-dark-500 mb-1">
                        <span>Books this month</span>
                        <span>{usageData.books_remaining} remaining</span>
                      </div>
                      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 transition-all"
                          style={{
                            width: `${Math.min(100, (usageData.usage.books_this_month / usageData.limits.books_limit) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
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

          {/* Course Grid or Empty State */}
          {!isLoading && !error && (
            hasCourses ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
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
                  Upload your first PDF book to get started. Our AI will transform it into
                  an interactive course with chapters, lessons, and quizzes.
                </p>
                <Link href="/upload">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Your First PDF
                  </Button>
                </Link>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}
