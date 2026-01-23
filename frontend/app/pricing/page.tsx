'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { Button } from '@/components/ui'
import { Check, Crown, Zap, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'

interface Plan {
  name: string
  id: 'free' | 'starter' | 'pro'
  price: string
  period: string
  credits: number
  description: string
  highlights: string[]
  cta: string
  popular?: boolean
  icon: React.ReactNode
}

const plans: Plan[] = [
  {
    name: 'Free',
    id: 'free',
    price: '$0',
    period: '',
    credits: 5,
    description: 'Try Book2Course risk-free',
    icon: <Zap className="w-6 h-6" />,
    highlights: [
      '5 credits on signup',
      '5 notes uploads OR 1 book',
      'All features included',
      'No credit card required',
    ],
    cta: 'Get Started',
  },
  {
    name: 'Starter',
    id: 'starter',
    price: '$9.90',
    period: '/month',
    credits: 30,
    description: 'Perfect for students',
    icon: <Sparkles className="w-6 h-6" />,
    popular: true,
    highlights: [
      '30 credits every month',
      '30 notes OR 6 books/month',
      'Chapter selection for books',
      'Credits roll over',
    ],
    cta: 'Subscribe',
  },
  {
    name: 'Pro',
    id: 'pro',
    price: '$24.90',
    period: '/month',
    credits: 100,
    description: 'Best value for power users',
    icon: <Crown className="w-6 h-6" />,
    highlights: [
      '100 credits every month',
      '100 notes OR 20 books/month',
      'Priority processing',
      'Best price per credit',
    ],
    cta: 'Subscribe',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePlanClick = async (plan: Plan) => {
    setError(null)

    // Free plan - just go to signup
    if (plan.id === 'free') {
      router.push('/auth')
      return
    }

    // Paid plans - need to check auth and create checkout session
    setLoadingTier(plan.id)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Not logged in - redirect to auth with redirect back
        router.push(`/auth?redirect=/pricing&plan=${plan.id}`)
        return
      }

      // Create checkout session
      const result = await api.createCheckoutSession(plan.id, session.access_token)

      if (result.error) {
        setError(result.error)
        setLoadingTier(null)
        return
      }

      if (result.data?.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.checkout_url
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoadingTier(null)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-dark-100 mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-dark-400 max-w-2xl mx-auto">
              Choose the plan that fits your learning needs. Upgrade or downgrade anytime.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-md mx-auto mb-8 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'relative bg-dark-900 border rounded-2xl p-8',
                  plan.popular
                    ? 'border-primary-500 ring-2 ring-primary-500/20'
                    : 'border-dark-800'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary-500 text-white text-sm font-medium px-4 py-1 rounded-full">
                      Best Value
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                    plan.popular
                      ? 'bg-primary-500/20 text-primary-500'
                      : 'bg-dark-800 text-dark-400'
                  )}>
                    {plan.icon}
                  </div>
                  <h2 className="text-2xl font-bold text-dark-100">{plan.name}</h2>
                  <p className="text-dark-500 mt-1">{plan.description}</p>
                </div>

                {/* Credits Badge */}
                <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-800 text-dark-200">
                  <span className="text-lg font-bold text-primary-500">{plan.credits}</span>
                  <span className="text-sm">credits</span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-dark-100">{plan.price}</span>
                  {plan.period && (
                    <span className="text-dark-500">{plan.period}</span>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  className="w-full mb-8"
                  variant={plan.popular ? 'primary' : 'secondary'}
                  onClick={() => handlePlanClick(plan)}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>

                {/* Highlights */}
                <ul className="space-y-3">
                  {plan.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                      <span className="text-dark-300">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Credit Cost Info */}
          <div className="mt-12 bg-dark-900 border border-dark-800 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-dark-100 mb-4 text-center">How Credits Work</h3>
            <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-blue-500">1</span>
                </div>
                <div>
                  <p className="font-medium text-dark-200">Notes Upload</p>
                  <p className="text-sm text-dark-400">Quick processing for short docs</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl">
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-primary-500">5</span>
                </div>
                <div>
                  <p className="font-medium text-dark-200">Book Upload</p>
                  <p className="text-sm text-dark-400">Full processing with chapters</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ or Additional Info */}
          <div className="mt-16 text-center">
            <p className="text-dark-500">
              All plans include secure cloud storage for your PDFs and generated courses.
            </p>
            <p className="text-dark-600 mt-2">
              Questions? Contact us at support@book2course.com
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
