'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface RouteGuardProps {
  children: React.ReactNode
}

export default function RouteGuard({ children }: RouteGuardProps) {
  const { firebaseUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/login')
    }
  }, [firebaseUser, loading, router])

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: '#F97316' }}
          />
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: 'rgba(245,240,235,0.3)' }}
          >
            Memuat...
          </p>
        </div>
      </div>
    )
  }

  if (!firebaseUser) {
    return null
  }

  return <>{children}</>
}