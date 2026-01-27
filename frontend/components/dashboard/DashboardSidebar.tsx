'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Upload,
  BarChart3,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronUp,
  X,
  Library,
  Zap,
  Sparkles,
  Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <Home className="w-5 h-5" /> },
  { label: 'My Courses', href: '/dashboard/courses', icon: <Library className="w-5 h-5" /> },
  { label: 'Upload', href: '/dashboard/upload', icon: <Upload className="w-5 h-5" /> },
  { label: 'Progress', href: '/dashboard/progress', icon: <BarChart3 className="w-5 h-5" /> },
]

const secondaryNavItems: NavItem[] = [
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
  { label: 'Billing', href: '/dashboard/billing', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Help', href: '/dashboard/help', icon: <HelpCircle className="w-5 h-5" /> },
]

interface UsageData {
  credits: number
  tier: 'free' | 'basic' | 'pro'
  book_cost: number
  notes_cost: number
}

interface DashboardSidebarProps {
  usageData: UsageData | null
  isOpen?: boolean
  onClose?: () => void
}

export function DashboardSidebar({ usageData, isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const getCreditsColor = (credits: number) => {
    if (credits >= 50) return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
    if (credits >= 10) return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30'
    if (credits > 0) return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
    return 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/30'
  }

  const getCreditsTextColor = (credits: number) => {
    if (credits >= 50) return 'text-green-500'
    if (credits >= 10) return 'text-blue-400'
    if (credits > 0) return 'text-yellow-500'
    return 'text-red-400'
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-dark-900 border-r border-dark-800 z-50',
        'flex flex-col',
        'transition-transform duration-200 ease-in-out',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-dark-800">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-dark-400 hover:text-dark-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-dark-800" />

          {/* Secondary Navigation */}
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Plan & Credits Badge at Bottom */}
        <div className="p-4 border-t border-dark-800">
          {usageData ? (
            <div className={cn(
              'rounded-xl p-4 border',
              getCreditsColor(usageData.credits)
            )}>
              {/* Plan Badge - Prominent display */}
              <div className="mb-3">
                {usageData.tier === 'pro' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-purple-400">Pro Plan</span>
                  </div>
                ) : usageData.tier === 'basic' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold text-blue-400">Starter Plan</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-800/50 border border-dark-700 rounded-lg">
                    <Zap className="w-4 h-4 text-dark-400" />
                    <span className="text-sm font-bold text-dark-400">Free Plan</span>
                  </div>
                )}
              </div>

              {/* Credits display */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-dark-300">Credits</span>
                <span className={cn('text-2xl font-bold', getCreditsTextColor(usageData.credits))}>
                  {usageData.credits}
                </span>
              </div>

              {/* Cost info */}
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Book upload</span>
                  <span className="text-dark-300">{usageData.book_cost} credits</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Notes upload</span>
                  <span className="text-dark-300">{usageData.notes_cost} credit</span>
                </div>
              </div>

              {/* Upgrade/Buy credits button */}
              <Link
                href="/pricing"
                className="flex items-center justify-center gap-1 w-full py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
                {usageData.tier === 'free' ? 'Upgrade Plan' : 'Buy Credits'}
              </Link>
            </div>
          ) : (
            <div className="rounded-xl p-4 bg-dark-800/50 border border-dark-700 animate-pulse">
              <div className="h-4 bg-dark-700 rounded w-24 mb-2" />
              <div className="h-3 bg-dark-700 rounded w-16" />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
