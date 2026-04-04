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
  Download,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { exportRequestsPDF } from '@/lib/pdf/exportPDF'
import { toast } from 'sonner'

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
    color: 'var(--text-secondary)',
    bg: 'rgba(100,100,100,0.08)',
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
  const [exporting, setExporting] = useState(false)

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

  const canCreateRequest = [
    'owner', 'admin', 'supervisor', 'logistik', 'admin_site', 'mandor',
  ].includes(logisUser?.role || '')

  const filtered =
    filter === 'all'
      ? requests
      : requests.filter((r) => r.status === filter)

  const pendingCount = requests.filter((r) =>
    ['submitted', 'in_review'].includes(r.status)
  ).length

  async function handleExport() {
    setExporting(true)
    try {
      exportRequestsPDF(
        requests.map((r) => ({
          id: r.id,
          requestedByName: r.requestedByName,
          items: r.items || [],
          urgency: r.urgency,
          status: r.status,
          reason: r.reason || '',
          createdAt: r.createdAt,
        }))
      )
      toast.success('PDF berhasil didownload!')
    } catch {
      toast.error('Gagal export PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: '#F97316' }}>
            Modul 01
          </p>
          <h1 className="text-2xl font-bold mb-1"
            style={{ color: 'var(--text-primary)' }}>
            Request Material
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Semua permintaan barang dari lapangan tercatat di sini
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          {/* PDF button — fixed colors for light/dark */}
          <button
            onClick={handleExport}
            disabled={exporting || requests.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-widest"
            style={{
              border: '1px solid var(--border-strong)',
              color: exporting || requests.length === 0
                ? 'var(--text-muted)'
                : 'var(--text-secondary)',
              cursor: requests.length === 0 ? 'not-allowed' : 'pointer',
              background: 'var(--bg-card)',
            }}
          >
            {exporting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            PDF
          </button>

          {canCreateRequest && (
            <Link
              href="/requests/new"
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest flex-1 sm:flex-none"
              style={{ background: '#F97316', color: '#fff' }}
            >
              <Plus size={15} />
              Request Baru
            </Link>
          )}
        </div>
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

      {/* Filter tabs — fixed text color */}
      <div
        className="flex gap-0 mb-6 -mx-4 lg:mx-0 px-4 lg:px-0"
        style={{
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
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
              color: filter === tab.key ? '#F97316' : 'var(--text-muted)',
              borderBottom: filter === tab.key
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
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
          <Package
            size={40}
            className="mx-auto mb-4 opacity-30"
            style={{ color: 'var(--text-primary)' }}
          />
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
                className="flex items-center gap-3 p-4 lg:p-5 transition-all group w-full overflow-hidden"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.background = 'var(--bg-card)'
                }}
              >
                {/* Status indicator */}
                <div className="p-2 shrink-0" style={{ background: status.bg }}>
                  <StatusIcon size={14} style={{ color: status.color }} />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-xs font-mono"
                      style={{ color: 'var(--text-muted)' }}>
                      #{req.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 font-semibold"
                      style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    {req.urgency === 'urgent' && (
                      <span className="text-xs px-2 py-0.5 font-semibold"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate"
                    style={{ color: 'var(--text-primary)' }}>
                    {req.items?.length} item
                    {req.items?.length > 1 ? 's' : ''} —{' '}
                    {req.items?.map((i) => i.name).join(', ')}
                  </p>
                  <p className="text-xs mt-0.5"
                    style={{ color: 'var(--text-muted)' }}>
                    Oleh {req.requestedByName} ·{' '}
                    {req.createdAt
                      ? formatDistanceToNow(req.createdAt, {
                          addSuffix: true,
                          locale: id,
                        })
                      : '—'}
                  </p>
                </div>

                <ChevronRight size={16}
                  style={{ color: 'var(--text-muted)' }}
                  className="shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}