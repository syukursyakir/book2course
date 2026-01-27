'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, CreditCard, ChevronRight, BookOpen, FileText, Coins, Crown, Sparkles, Zap, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface UsageData {
  credits: number
  tier: 'free' | 'basic' | 'pro'
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
  const tier = usageData?.tier ?? 'free'
  const bookCost = usageData?.book_cost ?? 5
  const notesCost = usageData?.notes_cost ?? 1

  const getPlanInfo = (planTier: string) => {
    switch (planTier) {
      case 'pro':
        return {
          name: 'Pro',
          icon: Crown,
          color: 'purple',
          bgClass: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
          borderClass: 'border-purple-500/30',
          textClass: 'text-purple-400',
          description: '100 credits/month, priority support'
        }
      case 'basic':
        return {
          name: 'Starter',
          icon: Sparkles,
          color: 'blue',
          bgClass: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
          borderClass: 'border-blue-500/30',
          textClass: 'text-blue-400',
          description: '30 credits/month'
        }
      default:
        return {
          name: 'Free',
          icon: Zap,
          color: 'gray',
          bgClass: 'bg-dark-800/50',
          borderClass: 'border-dark-700',
          textClass: 'text-dark-400',
          description: '5 credits to start'
        }
    }
  }

  const planInfo = getPlanInfo(tier)
  const PlanIcon = planInfo.icon

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-100">Billing</h1>
        <p className="text-dark-400 mt-1">Manage your credits and subscription</p>
      </div>

      {/* Current Plan - Prominent Display */}
      <div className={cn(
        'rounded-xl p-6 mb-6 border-2',
        planInfo.bgClass,
        planInfo.borderClass
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center',
              tier === 'pro' ? 'bg-purple-500/30' : tier === 'basic' ? 'bg-blue-500/30' : 'bg-dark-700'
            )}>
              <PlanIcon className={cn('w-7 h-7', planInfo.textClass)} />
            </div>
            <div>
              <p className="text-sm text-dark-400 mb-1">Current Plan</p>
              <h2 className={cn('text-2xl font-bold', planInfo.textClass)}>
                {planInfo.name} Plan
              </h2>
              <p className="text-sm text-dark-400 mt-1">{planInfo.description}</p>
            </div>
          </div>
          {tier === 'free' && (
            <Link
              href="/pricing"
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
            >
              Upgrade
            </Link>
          )}
        </div>
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
        <h2 className="text-lg font-semibold text-dark-100 mb-4">Available Plans</h2>

        <div className="space-y-3">
          {/* Free Plan */}
          <div className={cn(
            'flex items-center justify-between p-4 rounded-xl',
            tier === 'free'
              ? 'bg-dark-800 border-2 border-dark-600'
              : 'bg-dark-800/30'
          )}>
            <div className="flex items-center gap-3">
              <Zap className={cn('w-5 h-5', tier === 'free' ? 'text-dark-200' : 'text-dark-500')} />
              <div>
                <div className="flex items-center gap-2">
                  <p className={cn('font-medium', tier === 'free' ? 'text-dark-100' : 'text-dark-400')}>Free</p>
                  {tier === 'free' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
                      <Check className="w-3 h-3" /> Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-500">5 credits to start</p>
              </div>
            </div>
            <span className={cn('text-lg font-bold', tier === 'free' ? 'text-dark-200' : 'text-dark-500')}>$0</span>
          </div>

          {/* Starter Plan */}
          <Link
            href="/pricing"
            className={cn(
              'flex items-center justify-between p-4 rounded-xl transition-colors',
              tier === 'basic'
                ? 'bg-blue-500/20 border-2 border-blue-500/30'
                : 'bg-dark-800/50 hover:bg-dark-800'
            )}
          >
            <div className="flex items-center gap-3">
              <Sparkles className={cn('w-5 h-5', tier === 'basic' ? 'text-blue-400' : 'text-dark-400')} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-dark-200">Starter</p>
                  {tier === 'basic' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
                      <Check className="w-3 h-3" /> Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-400">30 credits/month</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-dark-100">$9.90<span className="text-sm text-dark-500">/mo</span></span>
              {tier !== 'basic' && <ChevronRight className="w-4 h-4 text-dark-500" />}
            </div>
          </Link>

          {/* Pro Plan */}
          <Link
            href="/pricing"
            className={cn(
              'flex items-center justify-between p-4 rounded-xl transition-colors',
              tier === 'pro'
                ? 'bg-purple-500/20 border-2 border-purple-500/30'
                : 'bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30'
            )}
          >
            <div className="flex items-center gap-3">
              <Crown className={cn('w-5 h-5', tier === 'pro' ? 'text-purple-400' : 'text-primary-500')} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-dark-200">Pro</p>
                  {tier === 'pro' ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-500 text-xs font-medium rounded-full">
                      <Check className="w-3 h-3" /> Current
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-primary-500/20 text-primary-500 text-xs font-medium rounded-full">Best Value</span>
                  )}
                </div>
                <p className="text-sm text-dark-400">100 credits/month</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-dark-100">$24.90<span className="text-sm text-dark-500">/mo</span></span>
              {tier !== 'pro' && <ChevronRight className="w-4 h-4 text-dark-500" />}
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
