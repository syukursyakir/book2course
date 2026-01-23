'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, User, Mail, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser({
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0],
          })
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Error signing out:', err)
      setIsSigningOut(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Settings</h1>
        <p className="text-dark-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Profile</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <div className="text-dark-100 font-medium">{user?.name}</div>
              <div className="text-dark-500 text-sm flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Account</h2>

        <div className="space-y-4">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-3 w-full p-3 text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSigningOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
