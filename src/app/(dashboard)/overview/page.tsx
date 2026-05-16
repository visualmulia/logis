'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  Loader2, TrendingUp, Package,
  Wrench, AlertTriangle, ChevronRight,
  Clock, CheckCircle, XCircle, FileText,
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
  type: 'request'
  title: string
  subtitle: string
  status: string
  href: string
  createdAt: Date | null
}

// Aksi cepat — PM tidak dapat aksi cepat sama sekali
const QUICK_ACTIONS = [
  {
    label: 'Lihat Semua Request',
    desc: 'Review & approve request material',
    href: '/requests',
    color: '#F97316',
    roles: ['admin'],
  },
  {
    label: 'Buat Request Material',
    desc: 'Request barang dari lapangan',
    href: '/requests/new',
    color: '#F97316',
    roles: ['owner', 'supervisor', 'logistik', 'admin_site'],
  },
  {
    label: 'Tambah Item Gudang',
    desc: 'Catat stok masuk ke gudang',
    href: '/projects',
    color: '#22c55e',
    roles: ['owner', 'logistik'],
  },
  {
    label: 'Daftarkan Aset Baru',
    desc: 'Tambah alat ke equipment tracker',
    href: '/assets/new',
    color: '#38bdf8',
    roles: ['owner', 'logistik'],
  },
  {
    label: 'Request Petty Cash',
    desc: 'Ajukan penggunaan kas lapangan',
    href: '/petty-cash/new',
    color: '#a78bfa',
    roles: ['owner', 'admin_site', 'supervisor'],
  },
]

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

  const role = logisUser?.role || ''
  const isAdmin = role === 'admin'
  const isPM    = role === 'pm'
  const isAdminSite = role === 'admin_site'  // ← TAMBAH INI

  useEffect(() => {
    if (!companyId) return
    const unsubs: (() => void)[] = []

    // Proyek aktif — semua kecuali admin
    if (!isAdmin) {
      const projUnsub = onSnapshot(
        query(
          collection(db, 'logis_companies', companyId, 'projects'),
          where('status', '==', 'active')
        ),
        (snap) => {
          // PM hanya hitung proyek yang di-assign
          if (isPM && logisUser?.projectIds?.length) {
            const assigned = snap.docs.filter(
              (d) => logisUser.projectIds.includes(d.id)
            ).length
            setStats((prev) => ({ ...prev, activeProjects: assigned }))
          } else {
            setStats((prev) => ({ ...prev, activeProjects: snap.size }))
          }
        }
      )
      unsubs.push(projUnsub)
    }

    // Pending requests untuk PM — hanya yang pending_pm_review
    // untuk role lain — submitted + in_review
    const pendingStatuses = isPM
      ? ['pending_pm_review', 'submitted']
      : ['submitted', 'in_review', 'pending_pm_review']

    const reqUnsub = onSnapshot(
      query(
        collection(db, 'logis_companies', companyId, 'requests'),
        where('status', 'in', pendingStatuses)
      ),
      (snap) => setStats((prev) => ({ ...prev, pendingRequests: snap.size }))
    )
    unsubs.push(reqUnsub)

    // Assets — semua kecuali admin
    if (!isAdmin) {
      const assetUnsub = onSnapshot(
        query(
          collection(db, 'logis_companies', companyId, 'assets'),
          where('status', '!=', 'retired')
        ),
        (snap) => {
          // PM hanya hitung aset di proyek yang di-assign
          const relevantDocs = (isPM && logisUser?.projectIds?.length)
            ? snap.docs.filter(
                (d) => d.data().currentProjectId &&
                  logisUser.projectIds.includes(d.data().currentProjectId)
              )
            : snap.docs

          const needsAttention = relevantDocs.filter((d) => {
            const data = d.data()
            if (data.status === 'lost') return true
            if (data.nextServiceDue) return new Date() >= data.nextServiceDue.toDate()
            return false
          }).length

          setStats((prev) => ({
            ...prev,
            totalAssets: relevantDocs.length,
            needsAttention,
          }))
        }
      )
      unsubs.push(assetUnsub)
    }

    // Recent requests
    const recentReqUnsub = onSnapshot(
      query(collection(db, 'logis_companies', companyId, 'requests')),
      (snap) => {
        let docs = snap.docs

        // PM hanya lihat request dari proyek yang di-assign
        if (isPM && logisUser?.projectIds?.length) {
          docs = docs.filter(
            (d) => d.data().projectId &&
              logisUser.projectIds.includes(d.data().projectId)
          )
        }

        const data = docs
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
            // PM: prioritaskan yang menunggu acknowledge dulu
            if (isPM) {
              const priority = ['pending_pm_review', 'submitted', 'revision_requested']
              const aIdx = priority.indexOf(a.status)
              const bIdx = priority.indexOf(b.status)
              if (aIdx !== -1 && bIdx === -1) return -1
              if (aIdx === -1 && bIdx !== -1) return 1
            }
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
  }, [companyId, isAdmin, isPM, logisUser])

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    submitted:          { label: 'Pending',         color: '#eab308', icon: Clock },
    pending_pm_review:  { label: 'Perlu Acknowledge',color: '#F97316', icon: Clock },
    revision_requested: { label: 'Perlu Revisi',    color: '#F97316', icon: Clock },
    in_review:          { label: 'Review Pusat',    color: '#38bdf8', icon: Clock },
    approved:           { label: 'Disetujui',       color: '#22c55e', icon: CheckCircle },
    rejected:           { label: 'Ditolak',         color: '#ef4444', icon: XCircle },
    po_issued:          { label: 'PO Issued',       color: '#a78bfa', icon: FileText },
    on_delivery:        { label: 'Dikirim',         color: '#38bdf8', icon: Package },
    completed:          { label: 'Selesai',         color: 'var(--text-secondary)', icon: CheckCircle },
    discrepancy:        { label: 'Tidak Sesuai',    color: '#ef4444', icon: AlertTriangle },
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  // Stat cards per role — FIX: admin_site hanya lihat Request
  const statCards = isAdmin
    ? [
        {
          label: 'Request Pending',
          value: stats.pendingRequests,
          icon: Package,
          color: '#eab308',
          href: '/requests',
          alert: stats.pendingRequests > 0,
        },
        {
          label: 'Request — Perlu PO',
          value: recentRequests.filter((r) => r.status === 'approved').length,
          icon: FileText,
          color: '#a78bfa',
          href: '/requests',
          alert: recentRequests.filter((r) => r.status === 'approved').length > 0,
        },
      ]
    : isPM
    ? [
        {
          label: 'Proyek Saya',
          value: stats.activeProjects,
          icon: TrendingUp,
          color: '#F97316',
          href: '/projects',
          alert: false,
        },
        {
          label: 'Perlu Acknowledge',
          value: recentRequests.filter(
            (r) => r.status === 'pending_pm_review' || r.status === 'submitted'
          ).length,
          icon: Package,
          color: '#eab308',
          href: '/requests',
          alert: recentRequests.filter(
            (r) => r.status === 'pending_pm_review' || r.status === 'submitted'
          ).length > 0,
        },
        {
          label: 'Aset Terdaftar',
          value: stats.totalAssets,
          icon: Wrench,
          color: '#22c55e',
          href: '/assets',
          alert: false,
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
    : isAdminSite  // ← FIX: admin_site hanya lihat Request
    ? [
        {
          label: 'Request Saya',
          value: recentRequests.filter(
            (r) => r.subtitle?.includes(logisUser?.name || '')
          ).length,
          icon: Package,
          color: '#F97316',
          href: '/requests',
          alert: false,
        },
        {
          label: 'Request Pending',
          value: stats.pendingRequests,
          icon: Package,
          color: '#eab308',
          href: '/requests',
          alert: stats.pendingRequests > 0,
        },
      ]
    : [  // owner, supervisor, logistik
        {
          label: 'Proyek Aktif',
          value: stats.activeProjects,
          icon: TrendingUp,
          color: '#F97316',
          href: '/projects',
          alert: false,
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
          alert: false,
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

  const quickActions = QUICK_ACTIONS.filter((item) => item.roles.includes(role))
  const showQuickActions = !isPM && quickActions.length > 0

  // Label header per role
  const headerLabel = isAdmin ? 'Admin Pusat' : isPM ? 'Project Manager' : 'Command Center'
  const requestSectionLabel = isPM
    ? 'Request Menunggu Acknowledge'
    : isAdmin
    ? 'Request Menunggu Tindakan'
    : 'Request Terbaru'

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <p className="text-sm font-semibold tracking-wide mb-1"
          style={{ color: '#F97316' }}>
          {headerLabel}
        </p>
        <h1 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Selamat datang, {logisUser?.name?.split(' ')[0] || '...'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* Stats grid — FIX: 2 kolom untuk admin dan admin_site */}
      <div className={`grid gap-3 lg:gap-4 mb-6 lg:mb-8 ${
        isAdmin || isAdminSite ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'
      }`}>
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Link key={stat.label} href={stat.href}
              className="p-4 lg:p-6 block transition-all"
              style={{
                background: stat.alert ? `${stat.color}10` : 'var(--bg-card)',
                border: stat.alert
                  ? `1px solid ${stat.color}35`
                  : '1px solid var(--border-color)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${stat.color}40`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = stat.alert
                  ? `${stat.color}30`
                  : 'var(--border-color)'
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
                  style={{ background: '#E5E7EB' }} />
              ) : (
                <div className="text-2xl lg:text-3xl font-black mb-1"
                  style={{
                    fontFamily: 'monospace',
                    color: stat.alert && stat.value > 0
                      ? stat.color
                      : 'var(--text-primary)',
                  }}>
                  {stat.value}
                </div>
              )}
              <div className="text-xs font-medium leading-tight"
                style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Bottom grid */}
      <div className={`grid grid-cols-1 gap-4 ${showQuickActions ? 'lg:grid-cols-2' : ''}`}>

        {/* Request list */}
        <div className="p-4 lg:p-6"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold tracking-wide"
              style={{ color: 'var(--text-primary)' }}>
              {requestSectionLabel}
            </p>
            <Link href="/requests" className="text-xs flex items-center gap-1"
              style={{ color: '#F97316' }}>
              Lihat semua <ChevronRight size={12} />
            </Link>
          </div>

          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded animate-pulse"
                  style={{ background: '#E5E7EB' }} />
              ))}
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <Package size={28} className="mx-auto mb-2 opacity-40"
                style={{ color: 'var(--text-primary)' }} />
              <p className="text-sm">Belum ada request</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {recentRequests.map((req) => {
                const sc = statusConfig[req.status] || statusConfig.submitted
                const StatusIcon = sc.icon
                const needsAction = isPM &&
                  ['pending_pm_review', 'submitted'].includes(req.status)
                return (
                  <Link key={req.id} href={req.href}
                    className="flex items-center gap-3 p-3 transition-all"
                    style={{
                      background: needsAction
                        ? 'rgba(249,115,22,0.04)'
                        : 'transparent',
                      borderLeft: needsAction
                        ? '3px solid #F97316'
                        : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F9FAFB'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = needsAction
                        ? 'rgba(249,115,22,0.04)'
                        : 'transparent'
                    }}>
                    <StatusIcon size={16} style={{ color: sc.color, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}>
                        {req.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {req.subtitle}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 font-semibold shrink-0 rounded-sm"
                      style={{ background: `${sc.color}18`, color: sc.color }}>
                      {sc.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        {showQuickActions && (
          <div className="p-4 lg:p-6"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)',
            }}>
            <p className="text-sm font-semibold tracking-wide mb-4"
              style={{ color: 'var(--text-primary)' }}>
              Aksi Cepat
            </p>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <Link key={action.href + action.label} href={action.href}
                  className="flex items-center gap-3 p-3 transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${action.color}10`
                    e.currentTarget.style.borderColor = `${action.color}30`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                  }}>
                  <div className="w-7 h-7 flex items-center justify-center shrink-0"
                    style={{
                      background: `${action.color}15`,
                      border: `1px solid ${action.color}30`,
                    }}>
                    <ChevronRight size={12} style={{ color: action.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {action.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {action.desc}
                    </p>
                  </div>
                  <ChevronRight size={14}
                    style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}