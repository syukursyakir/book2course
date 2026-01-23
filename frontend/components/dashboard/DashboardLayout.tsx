'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Loader2 } from 'lucide-react'
import { DashboardSidebar } from './DashboardSidebar'
import { createClient } from '@/lib/supabase'

interface UsageData {
  credits: number
  book_cost: number
  notes_cost: number
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    async function checkAuthAndFetchUsage() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push('/auth')
          return
        }

        setIsCheckingAuth(false)

        // Fetch usage data
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const usageRes = await fetch(`${apiUrl}/api/usage`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })

        if (usageRes.ok) {
          const data = await usageRes.json()
          setUsageData(data)
        }
      } catch (err) {
        console.error('Error:', err)
        setIsCheckingAuth(false)
      }
    }

    checkAuthAndFetchUsage()
  }, [router])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Sidebar */}
      <DashboardSidebar
        usageData={usageData}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 lg:hidden bg-dark-900/80 backdrop-blur-lg border-b border-dark-800">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-dark-400 hover:text-dark-200"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-dark-100 font-medium">Book2Course</span>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
