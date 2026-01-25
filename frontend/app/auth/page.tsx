'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type AuthStep = 'initial' | 'code-sent' | 'verifying'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<AuthStep>('initial')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState('')
  const [isGoogleVerify, setIsGoogleVerify] = useState(false)

  // Check for Google verification or if already fully authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const verifyGoogleEmail = searchParams.get('verify_google')
      const authError = searchParams.get('error')

      if (authError) {
        setError('Authentication failed. Please try again.')
        setIsCheckingAuth(false)
        return
      }

      // If coming from Google OAuth, send OTP for verification
      if (verifyGoogleEmail) {
        setEmail(decodeURIComponent(verifyGoogleEmail))
        setIsGoogleVerify(true)
        setIsCheckingAuth(false)
        // Auto-send OTP
        await sendOtpToEmail(decodeURIComponent(verifyGoogleEmail))
        return
      }

      // Otherwise check if user is already logged in (shouldn't happen in normal flow)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // Only redirect if no verify_google param (meaning full auth is complete)
      if (session && !verifyGoogleEmail) {
        router.push('/dashboard')
      } else {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router, searchParams])

  // Send OTP to email
  const sendOtpToEmail = async (emailToSend: string) => {
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email: emailToSend,
        options: {
          shouldCreateUser: true,
        },
      })
      if (error) throw error

      setStep('code-sent')
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Google sign in
  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google')
      setIsLoading(false)
    }
  }

  // Handle email submit - send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    await sendOtpToEmail(email)
  }

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newCode = [...code]
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit
        }
      })
      setCode(newCode)

      // Focus last filled or next empty
      const nextIndex = Math.min(index + digits.length, 5)
      const nextInput = document.getElementById(`code-${nextIndex}`)
      nextInput?.focus()
    } else {
      // Single digit
      const newCode = [...code]
      newCode[index] = value.replace(/\D/g, '')
      setCode(newCode)

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`code-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Verify OTP code
  const handleVerifyCode = async () => {
    const token = code.join('')
    if (token.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }

    setIsLoading(true)
    setStep('verifying')
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      if (error) throw error

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
      setStep('code-sent')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-verify when all digits entered
  useEffect(() => {
    if (code.every(digit => digit) && step === 'code-sent') {
      handleVerifyCode()
    }
  }, [code, step])

  // Resend code
  const handleResendCode = async () => {
    setCode(['', '', '', '', '', ''])
    setError('')
    await sendOtpToEmail(email)
  }

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
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

        {step === 'initial' && !isGoogleVerify && (
          <>
            {/* Headline */}
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-8">
              Log in or sign up
            </h1>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            {/* Google Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 font-medium">Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit}>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29CC57] focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full mt-4 px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  'Continue with email'
                )}
              </button>
            </form>

            {/* Terms */}
            <p className="mt-8 text-xs text-gray-500 text-center leading-relaxed">
              By continuing, you agree to Book2Course's{' '}
              <a href="#" className="underline hover:text-gray-700">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="underline hover:text-gray-700">Privacy Policy</a>.
            </p>
          </>
        )}

        {(step === 'code-sent' || step === 'verifying' || isGoogleVerify) && (
          <>
            {/* Back button - only show for email flow, not Google */}
            {!isGoogleVerify && (
              <button
                onClick={() => {
                  setStep('initial')
                  setCode(['', '', '', '', '', ''])
                  setError('')
                }}
                className="mb-6 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}

            {/* Headline */}
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              {isGoogleVerify ? 'Verify your email' : 'Check your email'}
            </h1>
            <p className="text-gray-500 text-center mb-8">
              {isGoogleVerify
                ? <>We sent a verification code to <span className="font-medium text-gray-700">{email}</span></>
                : <>We sent a code to <span className="font-medium text-gray-700">{email}</span></>
              }
            </p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            )}

            {/* Code Input */}
            <div className="flex justify-center gap-2 mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={step === 'verifying'}
                  className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29CC57] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Verifying state */}
            {step === 'verifying' && (
              <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </div>
            )}

            {/* Resend */}
            <p className="text-sm text-gray-500 text-center">
              Didn't get the code?{' '}
              <button
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-[#29CC57] hover:underline font-medium disabled:opacity-50"
              >
                Resend
              </button>
            </p>

            {/* Cancel Google verify */}
            {isGoogleVerify && (
              <button
                onClick={() => {
                  setIsGoogleVerify(false)
                  setStep('initial')
                  setEmail('')
                  setCode(['', '', '', '', '', ''])
                  setError('')
                  // Sign out from partial Google auth
                  const supabase = createClient()
                  supabase.auth.signOut()
                }}
                className="w-full mt-6 text-sm text-gray-500 hover:text-gray-700"
              >
                Use a different account
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
