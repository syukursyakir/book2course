'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Logo } from '@/components/ui'
import { Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export function Navbar() {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null) // null = loading

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }

    checkAuth()

    // Listen for auth changes (login/logout)
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    router.push('/')
  }

  // Show minimal navbar while checking auth (prevents flash)
  const showAuthButtons = isLoggedIn !== null

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={isLoggedIn ? '/dashboard' : '/'}>
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {showAuthButtons && (
              isLoggedIn ? (
                <>
                  <Link href="/dashboard" className="text-dark-300 hover:text-dark-100 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/upload" className="text-dark-300 hover:text-dark-100 transition-colors">
                    Upload
                  </Link>
                  <Button variant="secondary" size="sm" onClick={handleSignOut}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/pricing" className="text-dark-300 hover:text-dark-100 transition-colors">
                    Pricing
                  </Link>
                  <Link href="/login" className="text-dark-300 hover:text-dark-100 transition-colors">
                    Sign in
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-dark-800 text-dark-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && showAuthButtons && (
          <div className="md:hidden py-4 border-t border-dark-800">
            {isLoggedIn ? (
              <div className="flex flex-col gap-4">
                <Link href="/dashboard" className="text-dark-300 hover:text-dark-100 py-2">
                  Dashboard
                </Link>
                <Link href="/upload" className="text-dark-300 hover:text-dark-100 py-2">
                  Upload
                </Link>
                <Button variant="secondary" size="sm" className="w-full" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Link href="/pricing" className="text-dark-300 hover:text-dark-100 py-2">
                  Pricing
                </Link>
                <Link href="/login" className="text-dark-300 hover:text-dark-100 py-2">
                  Sign in
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="w-full">Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
