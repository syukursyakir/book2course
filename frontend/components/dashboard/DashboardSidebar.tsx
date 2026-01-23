'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Home,
  Upload,
  BarChart3,
  Settings,
  CreditCard,
  HelpCircle,
  ChevronUp,
  Crown,
  X,
  Library
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
      case 'basic': return 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30'
      default: return 'bg-dark-800/50 border-dark-700'
    }
  }

  const getTierTextColor = (tier: string) => {
    switch (tier) {
      case 'pro': return 'text-yellow-500'
      case 'basic': return 'text-blue-400'
      default: return 'text-dark-300'
    }
  }

  const formatTier = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1) + ' Plan'
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
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-dark-100">Book2Course</span>
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

        {/* Plan Badge at Bottom */}
        <div className="p-4 border-t border-dark-800">
          {usageData ? (
            <div className={cn(
              'rounded-xl p-4 border',
              getTierColor(usageData.tier)
            )}>
              <div className="flex items-center gap-2 mb-2">
                {usageData.tier !== 'free' && (
                  <Crown className={cn('w-4 h-4', getTierTextColor(usageData.tier))} />
                )}
                <span className={cn('text-sm font-semibold', getTierTextColor(usageData.tier))}>
                  {formatTier(usageData.tier)}
                </span>
              </div>

              {/* Usage info */}
              <div className="space-y-1 mb-3">
                {usageData.limits.notes_limit !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-dark-400">Notes</span>
                    <span className="text-dark-300">
                      {usageData.usage.notes_this_month}/{usageData.limits.notes_limit}
                    </span>
                  </div>
                )}
                {usageData.can_upload_books && usageData.limits.books_limit !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-dark-400">Books</span>
                    <span className="text-dark-300">
                      {usageData.usage.books_this_month}/{usageData.limits.books_limit}
                    </span>
                  </div>
                )}
                {usageData.tier === 'pro' && (
                  <div className="text-xs text-dark-400">Unlimited uploads</div>
                )}
              </div>

              {/* Upgrade button for non-pro users */}
              {usageData.tier !== 'pro' && (
                <Link
                  href="/pricing"
                  className="flex items-center justify-center gap-1 w-full py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                  Upgrade
                </Link>
              )}
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
