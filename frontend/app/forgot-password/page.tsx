'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { BookOpen, ArrowLeft, CheckCircle2 } from 'lucide-react'
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
    <div className="min-h-screen bg-dark-950">
      {/* Minimal Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-dark-100">Book2Course</span>
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 text-dark-400 hover:text-dark-200 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Form */}
      <div className="flex items-center justify-center px-4 pt-24 pb-12 min-h-screen">
        <div className="w-full max-w-md">
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-8">
            {success ? (
              // Success State
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold text-dark-100 mb-2">Check your email</h1>
                <p className="text-dark-400 mb-6">
                  We&apos;ve sent a password reset link to <span className="text-dark-200">{email}</span>
                </p>
                <p className="text-dark-500 text-sm mb-6">
                  Didn&apos;t receive the email? Check your spam folder or try again.
                </p>
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setSuccess(false)
                      setEmail('')
                    }}
                  >
                    Try another email
                  </Button>
                  <Link href="/login">
                    <Button className="w-full">Back to Login</Button>
                  </Link>
                </div>
              </div>
            ) : (
              // Form State
              <>
                <h1 className="text-2xl font-bold text-dark-100 text-center mb-2">Forgot password?</h1>
                <p className="text-dark-400 text-center mb-8">
                  Enter your email and we&apos;ll send you a reset link
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    id="email"
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />

                  <Button type="submit" isLoading={isLoading} className="w-full">
                    Send Reset Link
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-primary-500 hover:text-primary-400 text-sm font-medium">
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
