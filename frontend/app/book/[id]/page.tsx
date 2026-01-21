'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { Button } from '@/components/ui'
import { ArrowLeft, BookOpen, Loader2, Check, FileText } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Chapter {
  level: number
  title: string
  page: number
  start_page: number
  end_page: number
  page_count: number
}

interface TOCData {
  book_id: string
  title: string
  total_pages: number
  chapters: Chapter[] | null
  extraction_method: string
}

export default function ChapterSelectionPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string

  const [tocData, setTocData] = useState<TOCData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set())
  const [processMode, setProcessMode] = useState<'full' | 'select'>('select')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    async function fetchTOC() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/books/${bookId}/toc`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch table of contents')
        }

        const data = await response.json()
        setTocData(data)

        // If no chapters found, default to full book processing
        if (!data.chapters || data.chapters.length === 0) {
          setProcessMode('full')
        }
      } catch (err) {
        console.error('Error fetching TOC:', err)
        setError('Failed to load book chapters')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTOC()
  }, [bookId, router])

  const toggleChapter = (index: number) => {
    const newSelected = new Set(selectedChapters)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedChapters(newSelected)
  }

  const selectAll = () => {
    if (tocData?.chapters) {
      setSelectedChapters(new Set(tocData.chapters.map((_, i) => i)))
    }
  }

  const deselectAll = () => {
    setSelectedChapters(new Set())
  }

  const getSelectedPageCount = () => {
    if (!tocData?.chapters) return 0
    return Array.from(selectedChapters).reduce((total, index) => {
      return total + (tocData.chapters?.[index]?.page_count || 0)
    }, 0)
  }

  const handleProcess = async () => {
    setIsProcessing(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const body: any = {
        process_full: processMode === 'full'
      }

      if (processMode === 'select' && tocData?.chapters) {
        body.selected_chapters = Array.from(selectedChapters).map(index => {
          const ch = tocData.chapters![index]
          return {
            start_page: ch.start_page,
            end_page: ch.end_page,
            title: ch.title
          }
        })
      }

      const response = await fetch(`${apiUrl}/api/books/${bookId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to start processing')
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Error starting processing:', err)
      setError(err instanceof Error ? err.message : 'Failed to start processing')
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <main className="pt-24 pb-12 px-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </main>
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

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-6 h-6 text-primary-500" />
              <h1 className="text-2xl font-bold text-dark-100">{tocData?.title}</h1>
            </div>
            <p className="text-dark-400">
              {tocData?.total_pages} pages
              {tocData?.chapters && ` • ${tocData.chapters.length} chapters detected`}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Processing Mode Selection */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">
              How do you want to create your course?
            </h2>

            <div className="space-y-3">
              {/* Full Book Option */}
              <button
                onClick={() => setProcessMode('full')}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-colors text-left',
                  processMode === 'full'
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-dark-700 hover:border-dark-600'
                )}
              >
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  processMode === 'full' ? 'border-primary-500 bg-primary-500' : 'border-dark-600'
                )}>
                  {processMode === 'full' && <Check className="w-3 h-3 text-dark-950" />}
                </div>
                <div>
                  <h3 className="font-medium text-dark-100">Full book</h3>
                  <p className="text-sm text-dark-400">
                    Process everything ({tocData?.total_pages} pages)
                  </p>
                </div>
              </button>

              {/* Select Chapters Option */}
              {tocData?.chapters && tocData.chapters.length > 0 && (
                <button
                  onClick={() => setProcessMode('select')}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-lg border-2 transition-colors text-left',
                    processMode === 'select'
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    processMode === 'select' ? 'border-primary-500 bg-primary-500' : 'border-dark-600'
                  )}>
                    {processMode === 'select' && <Check className="w-3 h-3 text-dark-950" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-dark-100">Select chapters</h3>
                    <p className="text-sm text-dark-400">
                      Pick specific chapters to include
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Chapter Selection */}
          {processMode === 'select' && tocData?.chapters && tocData.chapters.length > 0 && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-dark-100">Select chapters</h2>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-primary-500 hover:text-primary-400"
                  >
                    Select all
                  </button>
                  <span className="text-dark-600">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-dark-400 hover:text-dark-300"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tocData.chapters.map((chapter, index) => (
                  <button
                    key={index}
                    onClick={() => toggleChapter(index)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                      selectedChapters.has(index)
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-700 hover:border-dark-600 bg-dark-800/50'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                      selectedChapters.has(index)
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-dark-600'
                    )}>
                      {selectedChapters.has(index) && <Check className="w-3 h-3 text-dark-950" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-dark-100 truncate">{chapter.title}</p>
                      <p className="text-xs text-dark-500">
                        Pages {chapter.start_page}-{chapter.end_page} ({chapter.page_count} pages)
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {selectedChapters.size > 0 && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <p className="text-sm text-dark-400">
                    Selected: <span className="text-dark-100 font-medium">{selectedChapters.size} chapters</span>
                    {' '}({getSelectedPageCount()} pages)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No Chapters Found */}
          {(!tocData?.chapters || tocData.chapters.length === 0) && (
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 text-dark-400">
                <FileText className="w-5 h-5" />
                <p>
                  No chapter structure detected. The full book will be processed.
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleProcess}
              disabled={isProcessing || (processMode === 'select' && selectedChapters.size === 0)}
              className="min-w-[200px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Generate Course
                  {processMode === 'select' && selectedChapters.size > 0 && (
                    <span className="ml-2 text-primary-200">
                      ({selectedChapters.size} chapters)
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
