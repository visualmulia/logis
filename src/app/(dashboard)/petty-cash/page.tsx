'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection, query, orderBy, onSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { PettyCashTransaction } from '@/types'
import Link from 'next/link'
import {
  Plus, Wallet, AlertTriangle, CheckCircle,
  XCircle, Clock, Loader2, ChevronRight,
  ShoppingBag, AlertCircle, Download,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { id } from 'date-fns/locale'
import { exportPettyCashPDF } from '@/lib/pdf/exportPDF'
import { toast } from 'sonner'

const statusConfig: { [key: string]: {
  label: string; color: string; bg: string; icon: React.ElementType
}} = {
  pending_approval: {
    label: 'Menunggu Approval',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.1)',
    icon: Clock,
  },
  approved: {
    label: 'Disetujui',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    icon: CheckCircle,
  },
  in_progress: {
    label: 'Sedang Belanja',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.1)',
    icon: ShoppingBag,
  },
  pending_reimbursement: {
    label: 'Menunggu Reimburse',
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)',
    icon: Wallet,
  },
  completed: {
    label: 'Selesai',
    color: 'rgba(245,240,235,0.4)',
    bg: 'rgba(245,240,235,0.05)',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Ditolak',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    icon: XCircle,
  },
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function PettyCashPage() {
  const { companyId, logisUser } = useAuth()
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!companyId) return

    const q = query(
      collection(db, 'logis_companies', companyId, 'petty_cash'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      })) as PettyCashTransaction[]
      setTransactions(data)
      setLoading(false)
    })

    return () => unsub()
  }, [companyId])

  const canCreate = ['owner', 'admin', 'admin_site', 'logistik'].includes(
    logisUser?.role || ''
  )

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.status === filter)

  const pendingCount = transactions.filter((t) =>
    t.status === 'pending_approval'
  ).length

  const anomalyCount = transactions.filter((t) => t.anomalyFlag).length

  const totalThisMonth = transactions
    .filter((t) => {
      if (!t.createdAt) return false
      const now = new Date()
      return (
        t.createdAt.getMonth() === now.getMonth() &&
        t.createdAt.getFullYear() === now.getFullYear() &&
        t.status !== 'rejected'
      )
    })
    .reduce((sum, t) => sum + t.amount, 0)

  async function handleExport() {
    setExporting(true)
    try {
      exportPettyCashPDF(
        transactions.map((t) => ({
          id: t.id,
          requestedBy: t.requestedBy,
          category: t.category,
          description: t.description,
          amount: t.amount,
          purchaseType: t.purchaseType,
          status: t.status,
          anomalyFlag: t.anomalyFlag,
          createdAt: t.createdAt,
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
            Petty Cash
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5f0eb' }}>
            Kas Lapangan
          </h1>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
            Setiap rupiah ada jejak dan justifikasinya
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-widest"
            style={{
              border: '1px solid rgba(245,240,235,0.1)',
              color: exporting || transactions.length === 0
                ? 'rgba(245,240,235,0.2)'
                : 'rgba(245,240,235,0.5)',
              cursor: transactions.length === 0 ? 'not-allowed' : 'pointer',
              background: 'transparent',
            }}
          >
            {exporting
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />}
            PDF
          </button>
          {canCreate && (
            <Link href="/petty-cash/new"
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest flex-1 sm:flex-none"
              style={{ background: '#F97316', color: '#0a0a0a' }}>
              <Plus size={15} />
              Request Kas
            </Link>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="p-5"
          style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
          <p className="text-xs uppercase tracking-widest mb-2"
            style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
            Total Bulan Ini
          </p>
          <p className="text-2xl font-black font-mono" style={{ color: '#F97316' }}>
            {formatRupiah(totalThisMonth)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(245,240,235,0.2)' }}>
            {format(new Date(), 'MMMM yyyy', { locale: id })}
          </p>
        </div>

        {pendingCount > 0 ? (
          <div className="p-5"
            style={{
              background: 'rgba(234,179,8,0.06)',
              border: '1px solid rgba(234,179,8,0.2)'
            }}>
            <p className="text-xs uppercase tracking-widest mb-2"
              style={{ color: '#eab308', fontSize: '9px' }}>
              Menunggu Approval
            </p>
            <p className="text-2xl font-black font-mono" style={{ color: '#eab308' }}>
              {pendingCount}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(234,179,8,0.5)' }}>
              request belum disetujui
            </p>
          </div>
        ) : (
          <div className="p-5"
            style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
            <p className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              Menunggu Approval
            </p>
            <p className="text-2xl font-black font-mono flex items-center gap-2"
              style={{ color: '#22c55e' }}>
              <CheckCircle size={20} />
              Clear
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(34,197,94,0.5)' }}>
              Semua sudah diproses
            </p>
          </div>
        )}

        {anomalyCount > 0 ? (
          <div className="p-5"
            style={{
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)'
            }}>
            <p className="text-xs uppercase tracking-widest mb-2"
              style={{ color: '#ef4444', fontSize: '9px' }}>
              Anomali Terdeteksi
            </p>
            <p className="text-2xl font-black font-mono" style={{ color: '#ef4444' }}>
              {anomalyCount}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(239,68,68,0.5)' }}>
              perlu investigasi
            </p>
          </div>
        ) : (
          <div className="p-5"
            style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
            <p className="text-xs uppercase tracking-widest mb-2"
              style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              Anomali
            </p>
            <p className="text-2xl font-black font-mono flex items-center gap-2"
              style={{ color: '#22c55e' }}>
              <CheckCircle size={20} />
              Normal
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(34,197,94,0.5)' }}>
              Tidak ada anomali
            </p>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 mb-6 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}>
        {[
          { key: 'all', label: 'Semua' },
          { key: 'pending_approval', label: 'Pending' },
          { key: 'approved', label: 'Disetujui' },
          { key: 'in_progress', label: 'Berlangsung' },
          { key: 'pending_reimbursement', label: 'Reimburse' },
          { key: 'completed', label: 'Selesai' },
          { key: 'rejected', label: 'Ditolak' },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className="px-4 py-3 text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-all"
            style={{
              color: filter === tab.key ? '#F97316' : 'rgba(245,240,235,0.3)',
              borderBottom: filter === tab.key
                ? '2px solid #F97316'
                : '2px solid transparent',
              background: 'transparent',
            }}>
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-2 opacity-50">
                {transactions.filter((t) => t.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24"
          style={{ color: 'rgba(245,240,235,0.2)' }}>
          <Wallet size={40} className="mx-auto mb-4 opacity-30"
            style={{ color: '#f5f0eb' }} />
          <p className="text-sm">Belum ada transaksi petty cash</p>
          {canCreate && (
            <Link href="/petty-cash/new"
              className="inline-flex items-center gap-2 mt-4 text-sm font-semibold"
              style={{ color: '#F97316' }}>
              <Plus size={14} />
              Buat request pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => {
            const status = statusConfig[tx.status] || statusConfig.pending_approval
            const StatusIcon = status.icon

            return (
              <Link key={tx.id}
                href={`/petty-cash/${tx.id}`}
                className="flex items-center gap-4 p-5 transition-all group"
                style={{
                  background: '#111111',
                  border: tx.anomalyFlag
                    ? '1px solid rgba(239,68,68,0.25)'
                    : '1px solid rgba(245,240,235,0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#151515'
                  if (!tx.anomalyFlag)
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#111111'
                  e.currentTarget.style.borderColor = tx.anomalyFlag
                    ? 'rgba(239,68,68,0.25)'
                    : 'rgba(245,240,235,0.06)'
                }}>

                <div className="p-2 flex-shrink-0" style={{ background: status.bg }}>
                  <StatusIcon size={14} style={{ color: status.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono"
                      style={{ color: 'rgba(245,240,235,0.3)' }}>
                      #{tx.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 font-semibold"
                      style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    {tx.anomalyFlag && (
                      <span className="text-xs px-2 py-0.5 font-semibold flex items-center gap-1"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        <AlertCircle size={10} />
                        ANOMALI
                      </span>
                    )}
                    {tx.isEmergency && (
                      <span className="text-xs px-2 py-0.5 font-semibold"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        ⚡ DARURAT
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: '#f5f0eb' }}>
                    {tx.description}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(245,240,235,0.3)' }}>
                    {tx.category} · {tx.requestedBy} ·{' '}
                    {tx.createdAt
                      ? formatDistanceToNow(tx.createdAt, { addSuffix: true, locale: id })
                      : '—'}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 mr-2">
                  <p className="text-sm font-black font-mono" style={{ color: '#F97316' }}>
                    {formatRupiah(tx.amount)}
                  </p>
                </div>

                <ChevronRight size={16}
                  style={{ color: 'rgba(245,240,235,0.15)', flexShrink: 0 }} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
