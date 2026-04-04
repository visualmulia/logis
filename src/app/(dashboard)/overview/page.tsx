'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  Loader2, TrendingUp, Package,
  Wrench, AlertTriangle, ChevronRight,
  Clock, CheckCircle, XCircle
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  activeProjects: number
  pendingRequests: number
  totalAssets: number
  needsAttention: number
}

interface RecentActivity {
  id: string
  type: 'request' | 'asset' | 'petty_cash'
  title: string
  subtitle: string
  status: string
  href: string
  createdAt: Date | null
}

export default function OverviewPage() {
  const { logisUser, companyId, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    pendingRequests: 0,
    totalAssets: 0,
    needsAttention: 0,
  })
  const [recentRequests, setRecentRequests] = useState<RecentActivity[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!companyId) return

    const unsubs: (() => void)[] = []

    // 1. Active projects
    const projUnsub = onSnapshot(
      query(
        collection(db, 'logis_companies', companyId, 'projects'),
        where('status', '==', 'active')
      ),
      (snap) => {
        setStats((prev) => ({ ...prev, activeProjects: snap.size }))
      }
    )
    unsubs.push(projUnsub)

    // 2. Pending requests
    const reqUnsub = onSnapshot(
      query(
        collection(db, 'logis_companies', companyId, 'requests'),
        where('status', 'in', ['submitted', 'in_review'])
      ),
      (snap) => {
        setStats((prev) => ({ ...prev, pendingRequests: snap.size }))
      }
    )
    unsubs.push(reqUnsub)

    // 3. Total assets
    const assetUnsub = onSnapshot(
      query(
        collection(db, 'logis_companies', companyId, 'assets'),
        where('status', '!=', 'retired')
      ),
      (snap) => {
        // Hitung needs attention: lost + service due
        const needsAttention = snap.docs.filter((d) => {
          const data = d.data()
          if (data.status === 'lost') return true
          if (data.nextServiceDue) {
            return new Date() >= data.nextServiceDue.toDate()
          }
          return false
        }).length

        setStats((prev) => ({
          ...prev,
          totalAssets: snap.size,
          needsAttention: needsAttention,
        }))
      }
    )
    unsubs.push(assetUnsub)

    // 4. Recent requests untuk activity feed
    const recentReqUnsub = onSnapshot(
      query(
        collection(db, 'logis_companies', companyId, 'requests')
      ),
      (snap) => {
        const data = snap.docs
          .map((d) => ({
            id: d.id,
            type: 'request' as const,
            title: `${d.data().items?.length || 0} item — ${
              d.data().items?.map((i: { name: string }) => i.name).join(', ') || ''
            }`,
            subtitle: `Oleh ${d.data().requestedByName || '—'}`,
            status: d.data().status,
            href: `/requests/${d.id}`,
            createdAt: d.data().createdAt?.toDate() || null,
          }))
          .sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0
            return b.createdAt.getTime() - a.createdAt.getTime()
          })
          .slice(0, 5)

        setRecentRequests(data)
        setLoadingStats(false)
      }
    )
    unsubs.push(recentReqUnsub)

    return () => unsubs.forEach((u) => u())
  }, [companyId])

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    submitted: { label: 'Pending', color: '#eab308', icon: Clock },
    in_review: { label: 'Review', color: '#F97316', icon: Clock },
    approved: { label: 'Disetujui', color: '#22c55e', icon: CheckCircle },
    rejected: { label: 'Ditolak', color: '#ef4444', icon: XCircle },
    po_issued: { label: 'PO Issued', color: '#a78bfa', icon: CheckCircle },
    on_delivery: { label: 'Dikirim', color: '#38bdf8', icon: Package },
    completed: { label: 'Selesai', color: 'var(--text-secondary)', icon: CheckCircle },
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  const statCards = [
    {
      label: 'Proyek Aktif',
      value: stats.activeProjects,
      icon: TrendingUp,
      color: '#F97316',
      href: '/projects',
    },
    {
      label: 'Request Pending',
      value: stats.pendingRequests,
      icon: Package,
      color: '#eab308',
      href: '/requests',
      alert: stats.pendingRequests > 0,
    },
    {
      label: 'Aset Terdaftar',
      value: stats.totalAssets,
      icon: Wrench,
      color: '#22c55e',
      href: '/assets',
    },
    {
      label: 'Perlu Perhatian',
      value: stats.needsAttention,
      icon: AlertTriangle,
      color: '#ef4444',
      href: '/assets',
      alert: stats.needsAttention > 0,
    },
  ]

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#F97316' }}>
          Command Center
        </p>
        <h1 className="text-xl lg:text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}>
          Selamat datang, {logisUser?.name?.split(' ')[0] || '...'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}
  className="p-4 lg:p-6 block transition-all"
  style={{
    background: stat.alert ? `${stat.color}08` : 'var(--bg-card)',
    border: stat.alert
      ? `1px solid ${stat.color}30`
      : '1px solid var(--border-color)',
  }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${stat.color}40`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = stat.alert
                  ? `${stat.color}30`
                  : 'rgba(245,240,235,0.06)'
              }}>
              <div className="flex items-start justify-between mb-3 lg:mb-4">
                <div className="p-1.5 lg:p-2"
                  style={{
                    background: `${stat.color}15`,
                    border: `1px solid ${stat.color}30`,
                  }}>
                  <Icon size={13} style={{ color: stat.color }} />
                </div>
                {stat.alert && stat.value > 0 && (
                  <div className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: stat.color }} />
                )}
              </div>
              {loadingStats ? (
                <div className="h-8 w-12 rounded animate-pulse mb-1"
                  style={{ background: 'rgba(245,240,235,0.06)' }} />
              ) : (
                <div className="text-2xl lg:text-3xl font-black mb-1"
                  style={{
                    fontFamily: 'monospace',
                    color: stat.alert && stat.value > 0 ? stat.color : '#f5f0eb',
                  }}>
                  {stat.value}
                </div>
              )}
              <div className="text-xs uppercase tracking-wide leading-tight"
                style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                {stat.label}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent requests */}
        <div className="p-4 lg:p-6"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-muted)' }}>
              Request Terbaru
            </p>
            <Link href="/requests"
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: '#F97316' }}>
              Lihat semua
              <ChevronRight size={12} />
            </Link>
          </div>

          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded animate-pulse"
                  style={{ background: 'rgba(245,240,235,0.04)' }} />
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="text-center py-8"
              style={{ color: 'var(--text-muted)' }}>
              <Package size={28} className="mx-auto mb-2 opacity-30"
                style={{ color: 'var(--text-primary)' }} />
              <p className="text-xs">Belum ada request</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((req) => {
                const sc = statusConfig[req.status] || statusConfig.submitted
                const StatusIcon = sc.icon
                return (
                  <Link key={req.id} href={req.href}
                    className="flex items-center gap-3 p-3 transition-all"
                    style={{
                      background: 'rgba(245,240,235,0.03)',
                      border: '1px solid rgba(245,240,235,0.04)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-secondary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(245,240,235,0.03)'
                    }}>
                    <StatusIcon size={14} style={{ color: sc.color, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}>
                        {req.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {req.subtitle}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 font-semibold flex-shrink-0"
                      style={{ background: `${sc.color}15`, color: sc.color }}>
                      {sc.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Module status + quick actions */}
        <div className="p-4 lg:p-6"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}>
            Aksi Cepat
          </p>
          <div className="space-y-2">
            {[
              {
                label: 'Buat Request Material',
                desc: 'Request barang dari lapangan',
                href: '/requests/new',
                color: '#F97316',
                roles: null,
              },
              {
                label: 'Tambah Item Gudang',
                desc: 'Catat stok masuk ke gudang',
                href: '/projects',
                color: '#22c55e',
                roles: ['owner', 'admin', 'pm', 'supervisor', 'logistik', 'admin_site'],
              },
              {
                label: 'Daftarkan Aset Baru',
                desc: 'Tambah alat ke equipment tracker',
                href: '/assets/new',
                color: '#38bdf8',
                roles: ['owner', 'admin', 'pm', 'supervisor', 'logistik'],
              },
              {
                label: 'Request Petty Cash',
                desc: 'Ajukan penggunaan kas lapangan',
                href: '/petty-cash/new',
                color: '#a78bfa',
                roles: ['owner', 'admin', 'pm', 'admin_site', 'supervisor'],
              },
            ]
              .filter(
                (item) =>
                  item.roles === null ||
                  (logisUser?.role && item.roles.includes(logisUser.role))
              )
              .map((action) => (
                <Link key={action.href} href={action.href}
                  className="flex items-center gap-3 p-3 transition-all"
                  style={{
                    background: 'rgba(245,240,235,0.03)',
                    border: '1px solid rgba(245,240,235,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${action.color}08`
                    e.currentTarget.style.borderColor = `${action.color}20`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(245,240,235,0.03)'
                    e.currentTarget.style.borderColor = 'rgba(245,240,235,0.04)'
                  }}>
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${action.color}15`,
                      border: `1px solid ${action.color}30`,
                    }}>
                    <ChevronRight size={12} style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold"
                      style={{ color: 'var(--text-primary)' }}>
                      {action.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {action.desc}
                    </p>
                  </div>
                  <ChevronRight size={14}
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
