'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, CreditCard, ChevronRight, BookOpen, FileText, Coins } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface UsageData {
  credits: number
  book_cost: number
  notes_cost: number
}

export default function BillingPage() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

        const usageRes = await fetch(`${apiUrl}/api/usage`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        })

        if (usageRes.ok) {
          setUsageData(await usageRes.json())
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const getCreditsColor = (credits: number) => {
    if (credits >= 50) return 'text-green-500'
    if (credits >= 10) return 'text-blue-500'
    if (credits > 0) return 'text-yellow-500'
    return 'text-red-400'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const credits = usageData?.credits ?? 0
  const bookCost = usageData?.book_cost ?? 5
  const notesCost = usageData?.notes_cost ?? 1

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Billing</h1>
        <p className="text-dark-400 mt-1">Manage your credits and purchases</p>
      </div>

      {/* Current Credits */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Credit Balance</h2>
              <p className="text-sm text-dark-400">Use credits to upload PDFs</p>
            </div>
          </div>
          <div className={cn('text-4xl font-bold', getCreditsColor(credits))}>
            {credits}
          </div>
        </div>

        <Link
          href="/pricing"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium"
        >
          <CreditCard className="w-5 h-5" />
          Buy More Credits
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Credit Costs */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Credit Costs</h2>

        <div className="space-y-4">
          {/* Notes */}
          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-dark-200">Notes Upload</p>
                <p className="text-sm text-dark-400">Lecture notes, slides, short docs</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-blue-500">{notesCost}</span>
              <span className="text-dark-400 text-sm ml-1">credit</span>
            </div>
          </div>

          {/* Books */}
          <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <p className="font-medium text-dark-200">Book Upload</p>
                <p className="text-sm text-dark-400">Textbooks, manuals, long guides</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-primary-500">{bookCost}</span>
              <span className="text-dark-400 text-sm ml-1">credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Monthly Plans</h2>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="flex items-center justify-between p-4 bg-dark-800/50 hover:bg-dark-800 rounded-xl transition-colors"
          >
            <div>
              <p className="font-medium text-dark-200">Starter</p>
              <p className="text-sm text-dark-400">30 credits/month</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-dark-100">$9.90<span className="text-sm text-dark-500">/mo</span></span>
              <ChevronRight className="w-4 h-4 text-dark-500" />
            </div>
          </Link>

          <Link
            href="/pricing"
            className="flex items-center justify-between p-4 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 rounded-xl transition-colors"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-dark-200">Pro</p>
                <span className="px-2 py-0.5 bg-primary-500/20 text-primary-500 text-xs font-medium rounded-full">Best Value</span>
              </div>
              <p className="text-sm text-dark-400">100 credits/month</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-dark-100">$24.90<span className="text-sm text-dark-500">/mo</span></span>
              <ChevronRight className="w-4 h-4 text-dark-500" />
            </div>
          </Link>
        </div>

        <p className="text-sm text-dark-500 mt-4 text-center">
          Unused credits roll over to the next month
        </p>
      </div>
    </div>
  )
}
