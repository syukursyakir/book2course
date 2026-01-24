'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, RefreshCcw, Home, AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-dark-100 mb-4">Something went wrong</h1>
        <p className="text-dark-400 mb-8">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>

        {/* Error details (only in development) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-dark-900 border border-dark-800 rounded-lg p-4 mb-8 text-left">
            <p className="text-sm text-dark-500 mb-1">Error details:</p>
            <p className="text-sm text-red-400 font-mono break-all">{error.message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
          >
            <RefreshCcw className="w-5 h-5" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-dark-800 hover:bg-dark-700 text-dark-200 font-medium rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>

        {/* Support link */}
        <p className="mt-8 text-sm text-dark-500">
          Need help?{' '}
          <Link href="/dashboard/help" className="text-primary-500 hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
}
