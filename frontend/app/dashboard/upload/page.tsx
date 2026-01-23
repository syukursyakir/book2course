'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PDFUploader } from '@/components/upload'
import { ArrowLeft, BookOpen, FileText, Check, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

type UploadType = 'book' | 'notes' | null

interface UsageData {
  credits: number
  book_cost: number
  notes_cost: number
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
        if (!session) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/usage`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })

        if (response.ok) {
          setUsageData(await response.json())
        }
      } catch (err) {
        console.error('Error fetching usage:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [])

  const handleUploadComplete = (bookId: string) => {
    setTimeout(() => {
      if (uploadType === 'book') {
        router.push(`/book/${bookId}`)
      } else {
        router.push('/dashboard')
      }
    }, 1500)
  }

  const credits = usageData?.credits ?? 0
  const bookCost = usageData?.book_cost ?? 5
  const notesCost = usageData?.notes_cost ?? 1
  const canUploadBooks = credits >= bookCost
  const canUploadNotes = credits >= notesCost

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Step 1: Choose Upload Type */}
      {!uploadType && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-dark-100 mb-2">Upload PDF</h1>
            <p className="text-dark-400">Choose the type of document to help us process it better.</p>
          </div>

          {/* Credits Display */}
          <div className="mb-8 p-4 bg-dark-900 border border-dark-800 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-dark-400">Your Credits</span>
              <span className={cn(
                'text-2xl font-bold',
                credits > 10 ? 'text-green-500' : credits > 0 ? 'text-yellow-500' : 'text-red-400'
              )}>
                {credits}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Book Option */}
            <button
              onClick={() => canUploadBooks && setUploadType('book')}
              disabled={!canUploadBooks}
              className={cn(
                'group p-8 rounded-xl border-2 text-left transition-all relative',
                canUploadBooks
                  ? 'border-dark-700 hover:border-primary-500 bg-dark-900 hover:bg-dark-800 cursor-pointer'
                  : 'border-dark-800 bg-dark-900/50 cursor-not-allowed opacity-60'
              )}
            >
              <div className="absolute top-4 right-4">
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                  canUploadBooks ? 'bg-primary-500/20 text-primary-500' : 'bg-red-500/20 text-red-400'
                )}>
                  {bookCost} credits
                </div>
              </div>

              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
                canUploadBooks
                  ? 'bg-primary-500/20 group-hover:bg-primary-500/30'
                  : 'bg-dark-800'
              )}>
                {canUploadBooks ? (
                  <BookOpen className="w-7 h-7 text-primary-500" />
                ) : (
                  <Lock className="w-7 h-7 text-dark-500" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-dark-100 mb-2">Book</h3>
              <p className="text-dark-400 text-sm mb-3">
                Textbooks, manuals, long guides, or any document with chapters
              </p>
              {!canUploadBooks && (
                <p className="text-xs text-red-400">
                  Need {bookCost} credits (you have {credits})
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
              <div className="absolute top-4 right-4">
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                  canUploadNotes ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-400'
                )}>
                  {notesCost} credit
                </div>
              </div>

              <div className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
                canUploadNotes ? 'bg-blue-500/20 group-hover:bg-blue-500/30' : 'bg-dark-800'
              )}>
                <FileText className={cn('w-7 h-7', canUploadNotes ? 'text-blue-500' : 'text-dark-500')} />
              </div>
              <h3 className="text-xl font-semibold text-dark-100 mb-2">Notes</h3>
              <p className="text-dark-400 text-sm mb-3">
                Lecture notes, slides, short docs, articles, or quick references
              </p>
              {!canUploadNotes && (
                <p className="text-xs text-red-400">
                  Need {notesCost} credit (you have {credits})
                </p>
              )}
            </button>
          </div>

          {credits < bookCost && (
            <div className="mt-8 text-center">
              <p className="text-dark-500 text-sm">
                Need more credits?{' '}
                <Link href="/pricing" className="text-primary-500 hover:underline">
                  Buy credits
                </Link>
              </p>
            </div>
          )}
        </>
      )}

      {/* Step 2: Upload File */}
      {uploadType && (
        <>
          <button
            onClick={() => setUploadType(null)}
            className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-200 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Change upload type
          </button>

          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800 text-dark-300 text-sm mb-4">
              {uploadType === 'book' ? (
                <BookOpen className="w-4 h-4 text-primary-500" />
              ) : (
                <FileText className="w-4 h-4 text-blue-500" />
              )}
              <span className="capitalize">{uploadType}</span>
              <Check className="w-4 h-4 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-dark-100 mb-2">Upload your {uploadType}</h1>
            <p className="text-dark-400">
              {uploadType === 'book'
                ? 'Upload your PDF and our AI will transform it into a structured course.'
                : 'Upload your notes and we\'ll quickly convert them into an easy-to-study format.'}
            </p>
          </div>

          <PDFUploader uploadType={uploadType} onUploadComplete={handleUploadComplete} />

          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-primary-500 mb-2">1</div>
              <h3 className="font-medium text-dark-200 mb-1">Upload</h3>
              <p className="text-sm text-dark-500">Drop your PDF file</p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-primary-500 mb-2">2</div>
              <h3 className="font-medium text-dark-200 mb-1">Process</h3>
              <p className="text-sm text-dark-500">AI analyzes content</p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-primary-500 mb-2">3</div>
              <h3 className="font-medium text-dark-200 mb-1">Learn</h3>
              <p className="text-sm text-dark-500">Study with quizzes</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
