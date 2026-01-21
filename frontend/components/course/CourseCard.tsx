'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card } from '@/components/ui'
import { Progress } from '@/components/ui'
import { BookOpen, Loader2, GraduationCap, AlertCircle, Trash2, Clock, ListChecks } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface CourseCardProps {
  id: string
  title: string
  description: string
  chaptersCount: number
  lessonsCount: number
  progress: number
  status: 'pending_selection' | 'queued' | 'processing' | 'ready' | 'error'
  processingStep?: string
  queuePosition?: number
  onDelete?: () => void
}

export function CourseCard({
  id,
  title,
  description,
  chaptersCount,
  lessonsCount,
  progress,
  status,
  processingStep,
  queuePosition,
  onDelete,
}: CourseCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) return

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/courses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        onDelete?.()
      } else {
        alert('Failed to delete')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }

  const DeleteButton = () => (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 rounded-lg hover:bg-red-500/20 text-dark-500 hover:text-red-500 transition-colors"
      title="Delete"
    >
      {isDeleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  )

  // Pending selection state card (books awaiting chapter selection)
  if (status === 'pending_selection') {
    return (
      <Link href={`/book/${id}`}>
        <Card className="p-6 h-full border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 transition-colors cursor-pointer">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <ListChecks className="w-6 h-6 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-dark-100 truncate">{title}</h3>
              <span className="inline-flex items-center gap-1.5 text-sm text-purple-500 mt-1">
                Select Chapters
              </span>
            </div>
            <DeleteButton />
          </div>

          <div className="bg-dark-800/50 rounded-lg p-3 mb-4">
            <p className="text-dark-200 text-sm font-medium">
              Click to select which chapters to include
            </p>
          </div>

          <p className="text-dark-500 text-xs">
            Choose specific chapters or process the entire book.
          </p>
        </Card>
      </Link>
    )
  }

  // Queued state card
  if (status === 'queued') {
    return (
      <Card className="p-6 h-full border-blue-500/30 bg-blue-500/5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-dark-100 truncate">{title}</h3>
            <span className="inline-flex items-center gap-1.5 text-sm text-blue-500 mt-1">
              In Queue
            </span>
          </div>
          <DeleteButton />
        </div>

        {/* Queue position */}
        <div className="bg-dark-800/50 rounded-lg p-3 mb-4">
          <p className="text-dark-200 text-sm font-medium">
            {queuePosition === 1
              ? 'Up next - processing will start soon'
              : `Position ${queuePosition} in queue`
            }
          </p>
        </div>

        <p className="text-dark-500 text-xs">
          Your book is waiting to be processed. Books are processed one at a time.
        </p>
      </Card>
    )
  }

  // Processing state card
  if (status === 'processing') {
    return (
      <Card className="p-6 h-full border-yellow-500/30 bg-yellow-500/5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-dark-100 truncate">{title}</h3>
            <span className="inline-flex items-center gap-1.5 text-sm text-yellow-500 mt-1">
              Processing...
            </span>
          </div>
          <DeleteButton />
        </div>

        {/* Current processing step */}
        <div className="bg-dark-800/50 rounded-lg p-3 mb-4">
          <p className="text-dark-200 text-sm font-medium truncate">
            {processingStep || 'Starting...'}
          </p>
        </div>

        <p className="text-dark-500 text-xs">
          Creating chapters, lessons, and quizzes from your book.
        </p>
        <div className="mt-3 h-1.5 bg-dark-800 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500/50 rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      </Card>
    )
  }

  // Error state card
  if (status === 'error') {
    return (
      <Card className="p-6 h-full border-red-500/30 bg-red-500/5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-dark-100 truncate">{title}</h3>
            <span className="inline-flex items-center gap-1.5 text-sm text-red-500 mt-1">
              Processing failed
            </span>
          </div>
          <DeleteButton />
        </div>
        <p className="text-dark-400 text-sm">
          There was an error processing your book. Please try uploading again.
        </p>
      </Card>
    )
  }

  // Ready state card (clickable)
  return (
    <Card className="p-6 h-full transition-colors hover:border-dark-700 group">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6 text-primary-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/course/${id}`}>
            <h3 className="text-lg font-semibold text-dark-100 truncate hover:text-primary-500 cursor-pointer">{title}</h3>
          </Link>
        </div>
        <DeleteButton />
      </div>

      <Link href={`/course/${id}`} className="block">
        <p className="text-dark-400 text-sm mb-4 line-clamp-2">{description}</p>

        <div className="flex items-center gap-4 text-sm text-dark-500 mb-4">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4" />
            {chaptersCount} chapters
          </div>
          <div>{lessonsCount} lessons</div>
        </div>

        <Progress value={progress} showLabel size="sm" />
      </Link>
    </Card>
  )
}
