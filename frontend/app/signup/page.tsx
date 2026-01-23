'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Preserve any query params (like redirect, plan)
    const params = searchParams.toString()
    router.replace(`/auth${params ? `?${params}` : ''}`)
  }, [router, searchParams])

  return null
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupRedirect />
    </Suspense>
  )
}
