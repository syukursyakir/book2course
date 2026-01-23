'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Crown, CreditCard, ChevronRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface UsageData {
  tier: string
  can_upload_books: boolean
  books_remaining: number | null
  notes_remaining: number | null
  usage: {
    books_this_month: number
    notes_this_month: number
  }
  limits: {
    books_limit: number | null
    notes_limit: number | null
  }
}

interface SubscriptionData {
  tier: string
  status: string | null
  current_period_end: number | null
  cancel_at_period_end?: boolean
}

export default function BillingPage() {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

        const [usageRes, subRes] = await Promise.all([
          fetch(`${apiUrl}/api/usage`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          }),
          api.getSubscription(session.access_token)
        ])

        if (usageRes.ok) {
          setUsageData(await usageRes.json())
        }
        if (subRes.data) {
          setSubscription(subRes.data)
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const result = await api.createPortalSession(session.access_token)
      if (result.data?.portal_url) {
        window.location.href = result.data.portal_url
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setIsLoadingPortal(false)
    }
  }

  const formatTier = (tier: string) => tier.charAt(0).toUpperCase() + tier.slice(1)

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30'
      case 'basic': return 'text-blue-500 bg-blue-500/20 border-blue-500/30'
      default: return 'text-dark-300 bg-dark-800 border-dark-700'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  const tier = usageData?.tier || 'free'

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Billing</h1>
        <p className="text-dark-400 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-100">Current Plan</h2>
          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border', getTierColor(tier))}>
            {tier !== 'free' && <Crown className="w-4 h-4" />}
            {formatTier(tier)}
          </div>
        </div>

        {subscription?.status === 'active' && subscription.current_period_end && (
          <p className="text-dark-400 text-sm mb-4">
            {subscription.cancel_at_period_end
              ? `Cancels on ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`
              : `Renews on ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`}
          </p>
        )}

        <div className="flex gap-3">
          {tier !== 'free' && (
            <button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 hover:bg-dark-700 text-dark-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoadingPortal ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              Manage Subscription
            </button>
          )}
          {tier !== 'pro' && (
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              Upgrade
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Usage */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Monthly Usage</h2>

        <div className="space-y-4">
          {/* Notes */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-dark-400">Notes uploads</span>
              <span className="text-dark-200">
                {usageData?.usage.notes_this_month || 0}
                {usageData?.limits.notes_limit !== null && ` / ${usageData?.limits.notes_limit}`}
                {usageData?.limits.notes_limit === null && ' (unlimited)'}
              </span>
            </div>
            {usageData?.limits.notes_limit !== null && (
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(100, ((usageData?.usage.notes_this_month || 0) / (usageData?.limits.notes_limit || 1)) * 100)}%`
                  }}
                />
              </div>
            )}
          </div>

          {/* Books */}
          {usageData?.can_upload_books && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-dark-400">Book uploads</span>
                <span className="text-dark-200">
                  {usageData?.usage.books_this_month || 0}
                  {usageData?.limits.books_limit !== null && ` / ${usageData?.limits.books_limit}`}
                  {usageData?.limits.books_limit === null && ' (unlimited)'}
                </span>
              </div>
              {usageData?.limits.books_limit !== null && (
                <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{
                      width: `${Math.min(100, ((usageData?.usage.books_this_month || 0) / (usageData?.limits.books_limit || 1)) * 100)}%`
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Plan Features</h2>

        <div className="space-y-3">
          {[
            { feature: 'Notes uploads', free: '2/month', basic: '20/month', pro: 'Unlimited' },
            { feature: 'Book uploads', free: '-', basic: '10/month', pro: 'Unlimited' },
            { feature: 'Quiz questions', free: '4 per lesson', basic: '7+ per lesson', pro: '7+ per lesson' },
            { feature: 'AI-enhanced content', free: false, basic: true, pro: true },
            { feature: 'Chapter selection', free: false, basic: true, pro: true },
            { feature: 'Priority processing', free: false, basic: false, pro: true },
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 py-2 border-b border-dark-800 last:border-0">
              <div className="text-sm text-dark-400">{row.feature}</div>
              <div className={cn('text-sm text-center', tier === 'free' ? 'text-dark-100 font-medium' : 'text-dark-500')}>
                {typeof row.free === 'boolean' ? (row.free ? <Check className="w-4 h-4 mx-auto text-green-500" /> : '-') : row.free}
              </div>
              <div className={cn('text-sm text-center', tier === 'basic' ? 'text-dark-100 font-medium' : 'text-dark-500')}>
                {typeof row.basic === 'boolean' ? (row.basic ? <Check className="w-4 h-4 mx-auto text-green-500" /> : '-') : row.basic}
              </div>
              <div className={cn('text-sm text-center', tier === 'pro' ? 'text-dark-100 font-medium' : 'text-dark-500')}>
                {typeof row.pro === 'boolean' ? (row.pro ? <Check className="w-4 h-4 mx-auto text-green-500" /> : '-') : row.pro}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-4 mt-2 text-xs text-dark-500">
          <div></div>
          <div className="text-center">Free</div>
          <div className="text-center">Basic</div>
          <div className="text-center">Pro</div>
        </div>
      </div>
    </div>
  )
}
