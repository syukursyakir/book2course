'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout'
import { Footer } from '@/components/layout'
import { Button } from '@/components/ui'
import {
  BookOpen,
  Sparkles,
  Brain,
  Target,
  Zap,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkAuth()
  }, [])

  // Determine CTA destination based on auth state
  const ctaHref = isLoggedIn ? '/dashboard' : '/signup'
  const ctaText = isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'
  const showSignIn = isLoggedIn === false // Only show when explicitly not logged in

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 text-primary-500 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Learning
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-dark-50 mb-6 leading-tight">
            Transform Any Book into an{' '}
            <span className="text-gradient">Interactive Course</span>
          </h1>

          <p className="text-lg text-dark-400 mb-10 max-w-2xl mx-auto">
            Upload a PDF and let AI break it down into structured chapters, engaging lessons,
            and interactive quizzes. Learn any book the smart way.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={ctaHref}>
              <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                {ctaText}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            {showSignIn && (
              <Link href="/login">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-dark-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-dark-50 mb-4">
              How It Works
            </h2>
            <p className="text-dark-400 max-w-xl mx-auto">
              Three simple steps to transform your reading into an interactive learning experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 text-center">
              <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-dark-100 mb-3">Upload Your Book</h3>
              <p className="text-dark-400">
                Drag and drop any PDF book. We support textbooks, novels, technical guides, and more.
              </p>
            </div>

            <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 text-center">
              <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Brain className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-dark-100 mb-3">AI Processes Content</h3>
              <p className="text-dark-400">
                Our AI analyzes the book, identifies key concepts, and creates a structured course curriculum.
              </p>
            </div>

            <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 text-center">
              <div className="w-14 h-14 bg-primary-500/20 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Target className="w-7 h-7 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-dark-100 mb-3">Learn & Test</h3>
              <p className="text-dark-400">
                Study through organized lessons and test your knowledge with auto-generated quizzes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-dark-50 mb-6">
                Learn Smarter, Not Harder
              </h2>
              <p className="text-dark-400 mb-8">
                Traditional reading is passive. Book2Course transforms your books into an active learning
                experience with structured content and knowledge checks.
              </p>

              <ul className="space-y-4">
                {[
                  'AI-generated chapter summaries',
                  'Key concepts extracted and explained',
                  'Interactive quizzes after each lesson',
                  'Track your progress across all courses',
                  'Mobile-friendly interface',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <span className="text-dark-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-dark-900 border border-dark-800 rounded-xl p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-dark-800 rounded-lg">
                  <Zap className="w-5 h-5 text-primary-500" />
                  <div>
                    <div className="text-sm font-medium text-dark-100">Fast Processing</div>
                    <div className="text-xs text-dark-400">Books converted in minutes</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-dark-800 rounded-lg">
                  <Brain className="w-5 h-5 text-primary-500" />
                  <div>
                    <div className="text-sm font-medium text-dark-100">Smart Chunking</div>
                    <div className="text-xs text-dark-400">Content split into digestible lessons</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-dark-800 rounded-lg">
                  <Target className="w-5 h-5 text-primary-500" />
                  <div>
                    <div className="text-sm font-medium text-dark-100">5+ Quizzes Per Lesson</div>
                    <div className="text-xs text-dark-400">MCQ and short answer formats</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-dark-900/50 to-dark-950">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-dark-50 mb-4">
            Ready to Transform Your Reading?
          </h2>
          <p className="text-dark-400 mb-8">
            Join thousands of learners who are studying smarter with AI-powered courses.
          </p>
          <Link href={ctaHref}>
            <Button variant="gradient" size="lg">
              {isLoggedIn ? 'Go to Dashboard' : 'Start Learning Now'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
