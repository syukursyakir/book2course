'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'

type AuthMode = 'login' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        setIsCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

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

  // Handle email + password submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    // Validate password for signup
    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        return
      }
    }

    setIsLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const supabase = createClient()

      if (mode === 'signup') {
        // Sign up with email and password
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error

        // Show success message - user needs to verify email
        setSuccessMessage('Check your email for a confirmation link to complete your registration.')
      } else {
        // Sign in with email and password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        router.push('/dashboard')
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('Invalid email or password')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email before signing in. Check your inbox for a confirmation link.')
      } else {
        setError(err.message || `Failed to ${mode === 'signup' ? 'sign up' : 'sign in'}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Switch between login and signup
  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
    setSuccessMessage('')
    setPassword('')
    setConfirmPassword('')
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

        {/* Headline */}
        <h1 className="text-2xl font-semibold text-gray-900 text-center mb-8">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-6 text-sm text-center">
            {successMessage}
          </div>
        )}

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

        {/* Email + Password Form */}
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

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29CC57] focus:border-transparent text-gray-900 placeholder:text-gray-400 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {mode === 'signup' && (
            <div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#29CC57] focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-[#29CC57] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email || !password || (mode === 'signup' && !confirmPassword)}
            className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              mode === 'signup' ? 'Create account' : 'Sign in'
            )}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <p className="mt-6 text-center text-gray-600">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={toggleMode}
                className="text-[#29CC57] hover:underline font-medium"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={toggleMode}
                className="text-[#29CC57] hover:underline font-medium"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        {/* Terms */}
        <p className="mt-8 text-xs text-gray-500 text-center leading-relaxed">
          By continuing, you agree to Book2Course&apos;s{' '}
          <a href="#" className="underline hover:text-gray-700">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-gray-700">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}
