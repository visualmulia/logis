'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PLAN_LIMITS, PlanType } from '@/types'
import { isTrialActive, isSubscriptionExpired, formatPrice, getPlanLabel } from '@/lib/subscription'
import { toast } from 'sonner'
import {
  Loader2, Check, Zap, Building2, Crown,
  AlertTriangle, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

declare global {
  interface Window {
    snap: {
      pay: (token: string, options?: Record<string, unknown>) => void
    }
  }
}

const PLAN_ORDER: PlanType[] = ['starter', 'builder', 'prime', 'enterprise']

const PLAN_ICONS: Record<PlanType, React.ElementType> = {
  trial: Zap,
  starter: Zap,
  builder: Building2,
  prime: Crown,
  enterprise: Crown,
}

export default function UpgradePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { companyProfile, logisUser, companyId, loading: authLoading } = useAuth()
  const [processing, setProcessing] = useState(false)

  const status = searchParams.get('status')
  const orderId = searchParams.get('order_id')

  // Handle callback dari Midtrans
  useEffect(() => {
    if (status === 'success' && orderId) {
      toast.success('Pembayaran berhasil! Plan kamu sedang di-update...')
      // Refresh setelah 3 detik supaya Firestore update
      setTimeout(() => {
        window.location.href = '/overview'
      }, 3000)
    } else if (status === 'failed') {
      toast.error('Pembayaran gagal atau dibatalkan. Coba lagi.')
    }
  }, [status, orderId])

  // Load Midtrans Snap script
  useEffect(() => {
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    if (!clientKey) return

    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', clientKey)
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  async function handleSelectPlan(plan: PlanType) {
    if (!companyId || !logisUser) {
      toast.error('Silakan login ulang')
      return
    }

    const limits = PLAN_LIMITS[plan]
    if (!limits) return

    setProcessing(true)
    try {
      const orderId = `LOGIS-${companyId.slice(0, 8)}-${plan.toUpperCase()}-${Date.now()}`

      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: limits.price,
          plan,
          companyId,
          customerName: logisUser.name,
          customerEmail: logisUser.email,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat transaksi')
      }

      // Buka Midtrans Snap
      if (typeof window !== 'undefined' && window.snap) {
        window.snap.pay(data.token, {
          onSuccess: () => {
            toast.success('Pembayaran berhasil!')
            router.push('/overview')
          },
          onPending: () => {
            toast.info('Menunggu pembayaran...')
          },
          onError: () => {
            toast.error('Pembayaran gagal.')
          },
          onClose: () => {
            toast.info('Popup pembayaran ditutup.')
          },
        })
      } else {
        // Fallback: redirect ke Midtrans page
        window.location.href = data.redirect_url
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memproses pembayaran'
      toast.error(message)
    } finally {
      setProcessing(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  const currentPlan = companyProfile?.plan || 'trial'
  const trialActive = isTrialActive(companyProfile)
  const expired = isSubscriptionExpired(companyProfile)

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/overview"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={12} />
          Kembali ke Overview
        </Link>
        <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: '#F97316' }}>
          Upgrade Plan
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Pilih Plan yang Sesuai
        </h1>
      </div>

      {/* Trial info */}
      {trialActive && (
        <div className="mb-6 p-4 flex items-start gap-3"
          style={{
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.2)',
          }}>
          <Zap size={18} style={{ color: '#F97316', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#F97316' }}>
              Trial Aktif
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Kamu masih dalam masa trial. Upgrade sekarang untuk terus menggunakan semua fitur.
            </p>
          </div>
        </div>
      )}

      {expired && currentPlan === 'trial' && (
        <div className="mb-6 p-4 flex items-start gap-3"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
          <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>
              Trial Sudah Habis
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Trial 30 hari kamu sudah berakhir. Upgrade plan untuk melanjutkan penggunaan Logis.
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLAN_ORDER.map((plan) => {
          const limits = PLAN_LIMITS[plan]
          const Icon = PLAN_ICONS[plan]
          const isCurrent = currentPlan === plan
          const isFree = limits.price === 0

          return (
            <div
              key={plan}
              className="p-6 relative transition-all"
              style={{
                background: 'var(--bg-card)',
                border: isCurrent
                  ? '2px solid #F97316'
                  : '1px solid var(--border-color)',
                boxShadow: isCurrent
                  ? '0 4px 6px -1px rgba(249,115,22,0.1)'
                  : '0 4px 6px -1px rgba(0,0,0,0.05)',
              }}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-4 px-3 py-0.5 text-xs font-bold"
                  style={{ background: '#F97316', color: '#fff' }}>
                  AKTIF
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                  <Icon size={18} style={{ color: '#F97316' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {limits.label}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {plan === 'enterprise'
                      ? 'Hubungi Kami'
                      : isFree
                        ? 'Gratis'
                        : formatPrice(limits.price) + '/bulan'}
                  </p>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={13} style={{ color: '#22c55e' }} />
                  {limits.maxProjects === 999 ? 'Unlimited Proyek' : `${limits.maxProjects} Proyek`}
                </li>
                <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={13} style={{ color: '#22c55e' }} />
                  {limits.maxUsers === 999 ? 'Unlimited User' : `${limits.maxUsers} User`}
                </li>
                <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={13} style={{ color: '#22c55e' }} />
                  Semua fitur aktif
                </li>
                {plan === 'enterprise' && (
                  <li className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Check size={13} style={{ color: '#22c55e' }} />
                    Kustomisasi Fitur
                  </li>
                )}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-2.5 text-sm font-bold"
                  style={{
                    background: 'rgba(249,115,22,0.1)',
                    color: '#F97316',
                    border: '1px solid rgba(249,115,22,0.3)',
                    cursor: 'default',
                  }}
                >
                  Plan Saat Ini
                </button>
              ) : plan === 'enterprise' ? (
                <a
                  href="mailto:visualmulia@gmail.com?subject=Info%20Enterprise%20Plan%20-%20Logis"
                  className="block w-full py-2.5 text-sm font-bold text-center transition-all"
                  style={{
                    background: '#F97316',
                    color: '#0a0a0a',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e0650f'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F97316'
                  }}
                >
                  More Info
                </a>
              ) : (
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={processing}
                  className="w-full py-2.5 text-sm font-bold transition-all"
                  style={{
                    background: processing ? '#c45a0e' : '#F97316',
                    color: '#0a0a0a',
                    cursor: processing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Memproses...
                    </span>
                  ) : isFree ? (
                    'Pilih Gratis'
                  ) : (
                    'Upgrade Sekarang'
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
