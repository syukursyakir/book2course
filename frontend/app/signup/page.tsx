'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Preserve any query params (like redirect, plan)
    const params = searchParams.toString()
    router.replace(`/auth${params ? `?${params}` : ''}`)
  }, [router, searchParams])

  return null
}
