'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { db } from '@/lib/firebase/config'
import {
  collection,
  collectionGroup,
  getCountFromServer,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import {
  Loader2, Building2, Users, TrendingUp,
  PackageSearch, ExternalLink, ShieldAlert,
} from 'lucide-react'

interface SystemStats {
  totalCompanies: number
  totalUsers: number
  totalProjects: number
  totalRequests: number
}

interface RecentCompany {
  id: string
  name: string
  ownerEmail: string
  createdAt: Date | null
}

export default function AdminPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [recentCompanies, setRecentCompanies] = useState<RecentCompany[]>([])
  const [loading, setLoading] = useState(true)

  // Proteksi: hanya superadmin yang boleh akses
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/overview')
    }
  }, [authLoading, isSuperAdmin, router])

  useEffect(() => {
    if (!isSuperAdmin) return

    async function loadStats() {
      try {
        // Total companies
        const companiesSnap = await getCountFromServer(
          collection(db, 'logis_companies')
        )

        // Total users
        const usersSnap = await getCountFromServer(
          collectionGroup(db, 'users')
        )

        // Total projects
        const projectsSnap = await getCountFromServer(
          collectionGroup(db, 'projects')
        )

        // Total requests
        const requestsSnap = await getCountFromServer(
          collectionGroup(db, 'requests')
        )

        setStats({
          totalCompanies: companiesSnap.data().count,
          totalUsers: usersSnap.data().count,
          totalProjects: projectsSnap.data().count,
          totalRequests: requestsSnap.data().count,
        })

        // Recent companies
        const recentSnap = await getDocs(
          query(
            collection(db, 'logis_companies'),
            orderBy('createdAt', 'desc'),
            limit(10)
          )
        )

        setRecentCompanies(
          recentSnap.docs.map((d) => ({
            id: d.id,
            name: d.data().name || '—',
            ownerEmail: d.data().ownerEmail || '—',
            createdAt: d.data().createdAt?.toDate() || null,
          }))
        )
      } catch (err) {
        console.error('Failed to load admin stats:', err)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [isSuperAdmin])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  if (!isSuperAdmin) return null

  const statCards = [
    {
      label: 'Perusahaan Terdaftar',
      value: stats?.totalCompanies ?? 0,
      icon: Building2,
      color: '#F97316',
    },
    {
      label: 'Total User',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: '#22c55e',
    },
    {
      label: 'Total Proyek',
      value: stats?.totalProjects ?? 0,
      icon: TrendingUp,
      color: '#38bdf8',
    },
    {
      label: 'Total Request',
      value: stats?.totalRequests ?? 0,
      icon: PackageSearch,
      color: '#a78bfa',
    },
  ]

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={14} style={{ color: '#F97316' }} />
          <p className="text-sm font-semibold tracking-wide" style={{ color: '#F97316' }}>
            Developer Dashboard
          </p>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          System Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Statistik penggunaan platform Logis secara real-time
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="p-4 lg:p-6"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)',
              }}
            >
              <div
                className="p-1.5 lg:p-2 w-fit mb-3"
                style={{
                  background: `${stat.color}15`,
                  border: `1px solid ${stat.color}30`,
                }}
              >
                <Icon size={13} style={{ color: stat.color }} />
              </div>
              <div
                className="text-2xl lg:text-3xl font-black mb-1"
                style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}
              >
                {stat.value}
              </div>
              <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* External links */}
      <div
        className="p-4 lg:p-6 mb-6 lg:mb-8"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <p className="text-sm font-semibold tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>
          External Monitoring
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://masbroo-studio.sentry.io/issues/?project=logis"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 transition-all"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
              e.currentTarget.style.background = 'rgba(249,115,22,0.04)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div
              className="w-7 h-7 flex items-center justify-center shrink-0"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
            >
              <ExternalLink size={12} style={{ color: '#F97316' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Sentry Issues
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Error tracking & performance
              </p>
            </div>
          </a>

          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 transition-all"
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'
              e.currentTarget.style.background = 'rgba(34,197,94,0.04)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <div
              className="w-7 h-7 flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              <ExternalLink size={12} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Google Analytics
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Traffic & user behavior
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent companies */}
      <div
        className="p-4 lg:p-6"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        <p className="text-sm font-semibold tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>
          Perusahaan Terbaru
        </p>

        {recentCompanies.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            Belum ada perusahaan terdaftar
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {recentCompanies.map((company) => (
              <div key={company.id} className="flex items-center gap-3 py-3">
                <div
                  className="w-8 h-8 flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(249,115,22,0.1)',
                    border: '1px solid rgba(249,115,22,0.2)',
                  }}
                >
                  <Building2 size={14} style={{ color: '#F97316' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {company.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {company.ownerEmail}
                  </p>
                </div>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {company.createdAt
                    ? company.createdAt.toLocaleDateString('id-ID')
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
