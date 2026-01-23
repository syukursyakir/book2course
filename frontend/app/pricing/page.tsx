'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout'
import { Button } from '@/components/ui'
import { Check, X, Crown, Zap, Sparkles, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { api } from '@/lib/api'

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  tier: 'free' | 'basic' | 'pro'
  price: string
  period: string
  description: string
  features: PlanFeature[]
  cta: string
  popular?: boolean
  icon: React.ReactNode
}

const plans: Plan[] = [
  {
    name: 'Free',
    tier: 'free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out Book2Course',
    icon: <Zap className="w-6 h-6" />,
    features: [
      { text: '2 notes uploads/month', included: true },
      { text: 'Basic quiz (4 questions)', included: true },
      { text: 'Standard processing', included: true },
      { text: 'Book uploads', included: false },
      { text: 'Chapter selection', included: false },
      { text: 'AI-enhanced content', included: false },
      { text: 'Full quiz (7+ questions)', included: false },
      { text: 'Common mistakes section', included: false },
    ],
    cta: 'Get Started',
  },
  {
    name: 'Basic',
    tier: 'basic',
    price: '$9',
    period: '/month',
    description: 'For students and self-learners',
    icon: <Sparkles className="w-6 h-6" />,
    popular: true,
    features: [
      { text: '20 notes uploads/month', included: true },
      { text: '10 book uploads/month', included: true },
      { text: 'Chapter selection', included: true },
      { text: 'Full quiz (7+ questions)', included: true },
      { text: 'AI quality detection', included: true },
      { text: 'Enhanced content mode', included: true },
      { text: 'Common mistakes section', included: true },
      { text: 'Before you move on checklist', included: true },
    ],
    cta: 'Start Basic',
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$24',
    period: '/month',
    description: 'For power users and professionals',
    icon: <Crown className="w-6 h-6" />,
    features: [
      { text: 'Unlimited notes uploads', included: true },
      { text: 'Unlimited book uploads', included: true },
      { text: 'Chapter selection', included: true },
      { text: 'Full quiz (7+ questions)', included: true },
      { text: 'AI quality detection', included: true },
      { text: 'Enhanced content mode', included: true },
      { text: 'Priority processing queue', included: true },
      { text: 'All premium features', included: true },
    ],
    cta: 'Start Pro',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePlanClick = async (plan: Plan) => {
    setError(null)

    // Free plan - just go to signup
    if (plan.tier === 'free') {
      router.push('/signup')
      return
    }

    // Paid plans - need to check auth and create checkout session
    setLoadingTier(plan.tier)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        // Not logged in - redirect to signup with redirect back
        router.push(`/signup?redirect=/pricing&plan=${plan.tier}`)
        return
      }

      // Create checkout session
      const result = await api.createCheckoutSession(plan.tier, session.access_token)

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
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-8">
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

                {/* Price */}
                <div className="mb-8">
                  <span className="text-4xl font-bold text-dark-100">{plan.price}</span>
                  <span className="text-dark-500">{plan.period}</span>
                </div>

                {/* CTA Button */}
                <Button
                  className="w-full mb-8"
                  variant={plan.popular ? 'primary' : 'secondary'}
                  onClick={() => handlePlanClick(plan)}
                  disabled={loadingTier !== null}
                >
                  {loadingTier === plan.tier ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>

                {/* Features */}
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-dark-600 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={cn(
                        feature.included ? 'text-dark-300' : 'text-dark-600'
                      )}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
