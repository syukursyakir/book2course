import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-dark-950 border-t border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-dark-100">Book2Course</span>
            </Link>
            <p className="text-dark-400 text-sm max-w-md">
              Transform any PDF book into an interactive learning experience with AI-powered
              chapter breakdowns, lessons, and quizzes.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-sm text-dark-400 hover:text-dark-200 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/upload" className="text-sm text-dark-400 hover:text-dark-200 transition-colors">
                  Upload Book
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Account</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-sm text-dark-400 hover:text-dark-200 transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-sm text-dark-400 hover:text-dark-200 transition-colors">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-dark-800">
          <p className="text-dark-500 text-sm text-center">
            &copy; {new Date().getFullYear()} Book2Course. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
