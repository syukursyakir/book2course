'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { PDFUploader } from '@/components/upload'
import { ArrowLeft, BookOpen, FileText, Check, Lock, Loader2, Crown } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

type UploadType = 'book' | 'notes' | null

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

export default function UploadPage() {
  const router = useRouter()
  const [uploadType, setUploadType] = useState<UploadType>(null)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/usage`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUsageData(data)
        }
      } catch (err) {
        console.error('Error fetching usage:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [router])

  const handleUploadComplete = (bookId: string) => {
    // After upload completes:
    // - Books: Redirect to chapter selection
    // - Notes: Redirect to dashboard (processing starts immediately)
    setTimeout(() => {
      if (uploadType === 'book') {
        router.push(`/book/${bookId}`)
      } else {
        router.push('/dashboard')
      }
    }, 1500)
  }

  const handleBack = () => {
    if (uploadType) {
      setUploadType(null)
    }
  }

  const canUploadBooks = usageData?.can_upload_books ?? false
  const booksRemaining = usageData?.books_remaining ?? null
  const notesRemaining = usageData?.notes_remaining ?? null
  const tier = usageData?.tier ?? 'free'

  // Check if user can upload based on remaining quota
  const canUploadNotes = notesRemaining === null || (notesRemaining !== undefined && notesRemaining > 0)
  const canUploadMoreBooks = booksRemaining === null || (booksRemaining !== undefined && booksRemaining > 0)

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

          {/* Step 1: Choose Upload Type */}
          {!uploadType && (
            <>
              <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-dark-100 mb-4">
                  What are you uploading?
                </h1>
                <p className="text-dark-400 max-w-lg mx-auto">
                  Choose the type of document to help us process it better.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* Book Option */}
                <button
                  onClick={() => canUploadBooks && canUploadMoreBooks && setUploadType('book')}
                  disabled={!canUploadBooks || !canUploadMoreBooks}
                  className={cn(
                    'group p-8 rounded-xl border-2 text-left transition-all relative',
                    canUploadBooks && canUploadMoreBooks
                      ? 'border-dark-700 hover:border-primary-500 bg-dark-900 hover:bg-dark-800 cursor-pointer'
                      : 'border-dark-800 bg-dark-900/50 cursor-not-allowed opacity-60'
                  )}
                >
                  {/* Lock overlay for free tier */}
                  {!canUploadBooks && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        Pro
                      </div>
                    </div>
                  )}
                  {canUploadBooks && !canUploadMoreBooks && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                        Limit reached
                      </div>
                    </div>
                  )}

                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
                    canUploadBooks && canUploadMoreBooks
                      ? 'bg-primary-500/20 group-hover:bg-primary-500/30'
                      : 'bg-dark-800'
                  )}>
                    {canUploadBooks ? (
                      <BookOpen className={cn(
                        'w-7 h-7',
                        canUploadMoreBooks ? 'text-primary-500' : 'text-dark-500'
                      )} />
                    ) : (
                      <Lock className="w-7 h-7 text-dark-500" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-dark-100 mb-2">Book</h3>
                  <p className="text-dark-400 text-sm mb-3">
                    Textbooks, manuals, long guides, or any document with chapters
                  </p>
                  {canUploadBooks && booksRemaining !== null && (
                    <p className="text-xs text-dark-500">
                      {booksRemaining} of {usageData?.limits.books_limit} remaining this month
                    </p>
                  )}
                  {!canUploadBooks && (
                    <p className="text-xs text-yellow-500/80">
                      Upgrade to Basic or Pro to upload books
                    </p>
                  )}
                </button>

                {/* Notes Option */}
                <button
                  onClick={() => canUploadNotes && setUploadType('notes')}
                  disabled={!canUploadNotes}
                  className={cn(
                    'group p-8 rounded-xl border-2 text-left transition-all relative',
                    canUploadNotes
                      ? 'border-dark-700 hover:border-primary-500 bg-dark-900 hover:bg-dark-800 cursor-pointer'
                      : 'border-dark-800 bg-dark-900/50 cursor-not-allowed opacity-60'
                  )}
                >
                  {!canUploadNotes && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                        Limit reached
                      </div>
                    </div>
                  )}

                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
                    canUploadNotes
                      ? 'bg-blue-500/20 group-hover:bg-blue-500/30'
                      : 'bg-dark-800'
                  )}>
                    <FileText className={cn(
                      'w-7 h-7',
                      canUploadNotes ? 'text-blue-500' : 'text-dark-500'
                    )} />
                  </div>
                  <h3 className="text-xl font-semibold text-dark-100 mb-2">Notes</h3>
                  <p className="text-dark-400 text-sm mb-3">
                    Lecture notes, slides, short docs, articles, or quick references
                  </p>
                  {notesRemaining !== null && (
                    <p className="text-xs text-dark-500">
                      {notesRemaining} of {usageData?.limits.notes_limit} remaining this month
                    </p>
                  )}
                </button>
              </div>

              {/* Upgrade CTA for free users */}
              {tier === 'free' && (
                <div className="mt-8 text-center">
                  <p className="text-dark-500 text-sm">
                    Want more uploads and book processing?{' '}
                    <Link href="/pricing" className="text-primary-500 hover:underline">
                      Upgrade your plan
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}

          {/* Step 2: Upload File */}
          {uploadType && (
            <>
              {/* Back to type selection */}
              <button
                onClick={handleBack}
                className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Change upload type
              </button>

              {/* Header with selected type */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-800 text-dark-300 mb-4">
                  {uploadType === 'book' ? (
                    <BookOpen className="w-4 h-4 text-primary-500" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="capitalize">{uploadType}</span>
                  <Check className="w-4 h-4 text-primary-500" />
                </div>
                <h1 className="text-3xl font-bold text-dark-100 mb-4">
                  Upload your {uploadType}
                </h1>
                <p className="text-dark-400 max-w-lg mx-auto">
                  {uploadType === 'book'
                    ? 'Upload your PDF and our AI will transform it into a structured course with chapters, lessons, and quizzes.'
                    : 'Upload your notes and we\'ll quickly convert them into an easy-to-study course format.'}
                </p>
              </div>

              {/* Uploader */}
              <PDFUploader
                uploadType={uploadType}
                onUploadComplete={handleUploadComplete}
              />

              {/* Info */}
              <div className="mt-12 grid sm:grid-cols-3 gap-6">
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-primary-500 mb-2">1</div>
                  <h3 className="font-medium text-dark-200 mb-1">Upload</h3>
                  <p className="text-sm text-dark-500">Drop your PDF file</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-primary-500 mb-2">2</div>
                  <h3 className="font-medium text-dark-200 mb-1">Process</h3>
                  <p className="text-sm text-dark-500">AI analyzes and structures content</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-primary-500 mb-2">3</div>
                  <h3 className="font-medium text-dark-200 mb-1">Learn</h3>
                  <p className="text-sm text-dark-500">Study with lessons and quizzes</p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
