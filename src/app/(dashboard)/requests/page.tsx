'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { MaterialRequest } from '@/types'
import Link from 'next/link'
import {
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  AlertCircle,
  Loader2,
  ChevronRight,
  Package,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

interface StatusConfig {
  label: string
  color: string
  bg: string
  icon: React.ElementType
}

const statusConfig: Record<string, StatusConfig> = {
  submitted: {
    label: 'Menunggu Review',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.1)',
    icon: Clock,
  },
  in_review: {
    label: 'Sedang Direview',
    color: '#F97316',
    bg: 'rgba(249,115,22,0.1)',
    icon: Clock,
  },
  approved: {
    label: 'Disetujui',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Ditolak',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    icon: XCircle,
  },
  po_issued: {
    label: 'PO Diterbitkan',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
    icon: CheckCircle,
  },
  on_delivery: {
    label: 'Dalam Pengiriman',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.1)',
    icon: Truck,
  },
  completed: {
    label: 'Selesai',
    color: 'rgba(245,240,235,0.4)',
    bg: 'rgba(245,240,235,0.05)',
    icon: CheckCircle,
  },
  discrepancy: {
    label: 'Ada Ketidaksesuaian',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    icon: AlertCircle,
  },
}

export default function RequestsPage() {
  const { companyId, logisUser } = useAuth()
  const [requests, setRequests] = useState<MaterialRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!companyId) return

    const q = query(
      collection(db, 'logis_companies', companyId, 'requests'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as MaterialRequest[]
      setRequests(data)
      setLoading(false)
    })

    return () => unsub()
  }, [companyId])

  const canCreateRequest = ['owner', 'admin', 'supervisor', 'logistik', 'admin_site', 'mandor'].includes(
    logisUser?.role || ''
  )

  const filtered = filter === 'all'
    ? requests
    : requests.filter((r) => r.status === filter)

  const pendingCount = requests.filter((r) =>
    ['submitted', 'in_review'].includes(r.status)
  ).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: '#F97316' }}
          >
            Modul 01
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5f0eb' }}>
            Request Material
          </h1>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
            Semua permintaan barang dari lapangan tercatat di sini
          </p>
        </div>
        {canCreateRequest && (
          <Link
            href="/requests/new"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition-all"
            style={{ background: '#F97316', color: '#0a0a0a' }}
          >
            <Plus size={15} />
            Request Baru
          </Link>
        )}
      </div>

      {/* Summary bar */}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-3 p-4 mb-6"
          style={{
            background: 'rgba(234,179,8,0.08)',
            border: '1px solid rgba(234,179,8,0.2)',
          }}
        >
          <AlertCircle size={16} style={{ color: '#eab308' }} />
          <p className="text-sm" style={{ color: '#eab308' }}>
            <span className="font-bold">{pendingCount} request</span> menunggu
            review dari kantor
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div
        className="flex gap-0 mb-6 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}
      >
        {[
          { key: 'all', label: 'Semua' },
          { key: 'submitted', label: 'Pending' },
          { key: 'approved', label: 'Disetujui' },
          { key: 'po_issued', label: 'PO Issued' },
          { key: 'on_delivery', label: 'Dikirim' },
          { key: 'completed', label: 'Selesai' },
          { key: 'rejected', label: 'Ditolak' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-4 py-3 text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-all"
            style={{
              color: filter === tab.key ? '#F97316' : 'rgba(245,240,235,0.3)',
              borderBottom:
                filter === tab.key
                  ? '2px solid #F97316'
                  : '2px solid transparent',
              background: 'transparent',
            }}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-2 opacity-50">
                {requests.filter((r) => r.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: '#F97316' }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-24"
          style={{ color: 'rgba(245,240,235,0.2)' }}
        >
          <Package size={40} className="mx-auto mb-4 opacity-30" style={{color: '#f5f0eb'}}/>
          <p className="text-sm">Belum ada request material</p>
          {canCreateRequest && (
            <Link
              href="/requests/new"
              className="inline-flex items-center gap-2 mt-4 text-sm font-semibold"
              style={{ color: '#F97316' }}
            >
              <Plus size={14} />
              Buat request pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => {
            const status = statusConfig[req.status] || statusConfig.submitted
            const StatusIcon = status.icon

            return (
              <Link
                key={req.id}
                href={`/requests/${req.id}`}
                className="flex items-center gap-4 p-5 transition-all group"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(245,240,235,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor =
                    'rgba(249,115,22,0.2)'
                  e.currentTarget.style.background = '#151515'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    'rgba(245,240,235,0.06)'
                  e.currentTarget.style.background = '#111111'
                }}
              >
                {/* Status indicator */}
                <div
                  className="p-2 shrink-0"
                  style={{ background: status.bg }}
                >
                  <StatusIcon size={14} style={{ color: status.color }} />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="text-xs font-mono"
                      style={{ color: 'rgba(245,240,235,0.3)' }}
                    >
                      #{req.id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 font-semibold"
                      style={{
                        background: status.bg,
                        color: status.color,
                      }}
                    >
                      {status.label}
                    </span>
                    {req.urgency === 'urgent' && (
                      <span
                        className="text-xs px-2 py-0.5 font-semibold"
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          color: '#ef4444',
                        }}
                      >
                        URGENT
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: '#f5f0eb' }}
                  >
                    {req.items?.length} item
                    {req.items?.length > 1 ? 's' : ''} —{' '}
                    {req.items?.map((i) => i.name).join(', ')}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'rgba(245,240,235,0.3)' }}
                  >
                    Oleh {req.requestedByName} ·{' '}
                    {req.createdAt
                      ? formatDistanceToNow(req.createdAt, {
                          addSuffix: true,
                          locale: id,
                        })
                      : '—'}
                  </p>
                </div>

                <ChevronRight
                  size={16}
                  style={{ color: 'rgba(245,240,235,0.2)' }}
                  className="shrink-0 group-hover:text-orange-500 transition-colors"
                />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}