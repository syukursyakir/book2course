'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BookOpen, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Could not send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#29CC57] rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Book2Course</span>
          </Link>
        </div>

        {success ? (
          // Success State
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Check your email
            </h1>
            <p className="text-gray-500 mb-6">
              We&apos;ve sent a password reset link to{' '}
              <span className="font-medium text-gray-700">{email}</span>
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Didn&apos;t receive the email? Check your spam folder or try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail('')
                }}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try another email
              </button>
              <Link
                href="/auth"
                className="block w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors text-center"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        ) : (
          // Form State
          <>
            {/* Back link */}
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>

            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Forgot password?
            </h1>
            <p className="text-gray-500 mb-8">
              Enter your email and we&apos;ll send you a reset link
            </p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29CC57] focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
