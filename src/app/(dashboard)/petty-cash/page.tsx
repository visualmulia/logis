'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection, query, orderBy, onSnapshot, getDocs
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { PettyCashTransaction, Project } from '@/types'
import Link from 'next/link'
import {
  Plus, Wallet, CheckCircle, XCircle, Clock,
  Loader2, ChevronRight, ShoppingBag, AlertCircle,
  Download, FolderOpen,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { id } from 'date-fns/locale'
import { exportPettyCashPDF } from '@/lib/pdf/exportPDF'
import { toast } from 'sonner'

const statusConfig: { [key: string]: {
  label: string; color: string; bg: string; icon: React.ElementType
}} = {
  pending_approval: {
    label: 'Menunggu Approval', color: '#eab308',
    bg: 'rgba(234,179,8,0.1)', icon: Clock,
  },
  approved: {
    label: 'Disetujui', color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)', icon: CheckCircle,
  },
  in_progress: {
    label: 'Sedang Belanja', color: '#38bdf8',
    bg: 'rgba(56,189,248,0.1)', icon: ShoppingBag,
  },
  pending_reimbursement: {
    label: 'Menunggu Reimburse', color: '#a78bfa',
    bg: 'rgba(167,139,250,0.1)', icon: Wallet,
  },
  completed: {
    label: 'Selesai', color: 'var(--text-secondary)',
    bg: 'rgba(100,100,100,0.08)', icon: CheckCircle,
  },
  rejected: {
    label: 'Ditolak', color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)', icon: XCircle,
  },
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

const CAN_CREATE = ['owner', 'admin_site', 'supervisor']
const CAN_APPROVE = ['owner', 'pm']
const ASSIGNED_ONLY = ['pm', 'supervisor', 'logistik', 'admin_site']

export default function PettyCashPage() {
  const { companyId, logisUser } = useAuth()
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [exporting, setExporting] = useState(false)

  const role = logisUser?.role || ''
  const canCreate  = CAN_CREATE.includes(role)
  const canApprove = CAN_APPROVE.includes(role)
  const isPM       = role === 'pm'
  const isAssignedOnly = ASSIGNED_ONLY.includes(role)

  useEffect(() => {
    if (!companyId) return

    // Fetch projects untuk toggle
    getDocs(collection(db, 'logis_companies', companyId, 'projects')).then((snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project))
      if (isAssignedOnly && logisUser?.projectIds?.length) {
        setProjects(all.filter((p) => logisUser.projectIds.includes(p.id)))
      } else {
        setProjects(all)
      }
    })

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

      // PM & staff hanya lihat transaksi proyek yang di-assign
      if (isAssignedOnly && logisUser?.projectIds?.length) {
        setTransactions(data.filter(
          (t) => t.projectId && logisUser.projectIds.includes(t.projectId)
        ))
      } else {
        setTransactions(data)
      }

      setLoading(false)
    })
    return () => unsub()
  }, [companyId, logisUser, isAssignedOnly])

  // Transactions yang aktif berdasarkan project filter
  const projectFiltered = selectedProject === 'all'
    ? transactions
    : transactions.filter((t) => t.projectId === selectedProject)

  // Kemudian filter by status
  const filtered = filter === 'all'
    ? projectFiltered
    : projectFiltered.filter((t) => t.status === filter)

  // Stats berdasarkan project yang dipilih
  const pendingCount = projectFiltered.filter((t) => t.status === 'pending_approval').length
  const anomalyCount = projectFiltered.filter((t) => t.anomalyFlag).length
  const totalThisMonth = projectFiltered
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

  const selectedProjectName = selectedProject === 'all'
    ? 'Semua Proyek'
    : projects.find((p) => p.id === selectedProject)?.name || '—'

  async function handleExport() {
    setExporting(true)
    try {
      exportPettyCashPDF(
        filtered.map((t) => ({
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
          <p className="text-sm font-semibold tracking-wide mb-1"
            style={{ color: '#F97316' }}>
            Petty Cash
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Kas Lapangan
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Setiap rupiah ada jejak dan justifikasinya
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
            style={{
              border: '1px solid var(--border-strong)',
              color: exporting || filtered.length === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
              cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
              background: 'var(--bg-card)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </button>
          {canCreate && (
            <Link href="/petty-cash/new"
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold flex-1 sm:flex-none"
              style={{ background: '#F97316', color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <Plus size={15} />
              Request Kas
            </Link>
          )}
        </div>
      </div>

      {/* Project toggle — PM & semua role */}
      {projects.length > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="text-sm font-semibold flex-shrink-0"
            style={{ color: 'var(--text-secondary)' }}>
            Proyek:
          </span>
          <button
            onClick={() => setSelectedProject('all')}
            className="px-3 py-1.5 text-xs font-semibold"
            style={{
              background: selectedProject === 'all' ? '#F97316' : 'var(--bg-card)',
              color: selectedProject === 'all' ? '#fff' : 'var(--text-secondary)',
              border: selectedProject === 'all' ? '1px solid #F97316' : '1px solid var(--border-strong)',
            }}>
            Semua
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
              style={{
                background: selectedProject === p.id ? 'rgba(249,115,22,0.1)' : 'var(--bg-card)',
                color: selectedProject === p.id ? '#F97316' : 'var(--text-secondary)',
                border: selectedProject === p.id ? '1px solid rgba(249,115,22,0.3)' : '1px solid var(--border-strong)',
              }}>
              <FolderOpen size={11} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Summary cards — berdasarkan project yang dipilih */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-xs font-medium tracking-wide mb-1"
            style={{ color: 'var(--text-secondary)' }}>
            Total Bulan Ini
          </p>
          <p className="text-xs mb-2 flex items-center gap-1"
            style={{ color: '#F97316' }}>
            <FolderOpen size={10} />
            {selectedProjectName}
          </p>
          <p className="text-2xl font-black font-mono" style={{ color: '#F97316' }}>
            {formatRupiah(totalThisMonth)}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {format(new Date(), 'MMMM yyyy', { locale: id })}
          </p>
        </div>

        {pendingCount > 0 ? (
          <div className="p-5"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
            <p className="text-xs font-medium tracking-wide mb-2"
              style={{ color: '#ca8a04' }}>
              Menunggu {canApprove ? 'Approval Kamu' : 'Approval'}
            </p>
            <p className="text-2xl font-black font-mono" style={{ color: '#eab308' }}>
              {pendingCount}
            </p>
            <p className="text-sm mt-1" style={{ color: '#ca8a04' }}>
              {canApprove
                ? 'Perlu keputusanmu segera'
                : 'request belum disetujui'}
            </p>
          </div>
        ) : (
          <div className="p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
            <p className="text-xs font-medium tracking-wide mb-2"
              style={{ color: 'var(--text-secondary)' }}>
              Menunggu Approval
            </p>
            <p className="text-2xl font-black font-mono flex items-center gap-2"
              style={{ color: '#22c55e' }}>
              <CheckCircle size={20} />
              Clear
            </p>
            <p className="text-sm mt-1" style={{ color: '#16a34a' }}>
              Semua sudah diproses
            </p>
          </div>
        )}

        {anomalyCount > 0 ? (
          <div className="p-5"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
            <p className="text-xs font-medium tracking-wide mb-2"
              style={{ color: '#dc2626' }}>
              Anomali Terdeteksi
            </p>
            <p className="text-2xl font-black font-mono" style={{ color: '#ef4444' }}>
              {anomalyCount}
            </p>
            <p className="text-sm mt-1" style={{ color: '#dc2626' }}>
              perlu investigasi
            </p>
          </div>
        ) : (
          <div className="p-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
            <p className="text-xs font-medium tracking-wide mb-2"
              style={{ color: 'var(--text-secondary)' }}>
              Anomali
            </p>
            <p className="text-2xl font-black font-mono flex items-center gap-2"
              style={{ color: '#22c55e' }}>
              <CheckCircle size={20} />
              Normal
            </p>
            <p className="text-sm mt-1" style={{ color: '#16a34a' }}>
              Tidak ada anomali
            </p>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 mb-6 -mx-4 lg:mx-0 px-4 lg:px-0"
        style={{
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}>
        {[
          { key: 'all',                  label: 'Semua' },
          { key: 'pending_approval',     label: 'Pending' },
          { key: 'approved',             label: 'Disetujui' },
          { key: 'in_progress',          label: 'Berlangsung' },
          { key: 'pending_reimbursement',label: 'Reimburse' },
          { key: 'completed',            label: 'Selesai' },
          { key: 'rejected',             label: 'Ditolak' },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 text-sm whitespace-nowrap transition-all ${filter === tab.key ? 'font-semibold' : 'font-medium'}`}
            style={{
              color: filter === tab.key ? '#F97316' : 'var(--text-secondary)',
              borderBottom: filter === tab.key ? '2px solid #F97316' : '2px solid transparent',
              background: 'transparent',
            }}>
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 opacity-60 text-xs">
                {projectFiltered.filter((t) => t.status === tab.key).length}
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
        <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
          <Wallet size={40} className="mx-auto mb-4 opacity-30"
            style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm">
            {selectedProject !== 'all'
              ? `Belum ada transaksi di proyek ${selectedProjectName}`
              : 'Belum ada transaksi petty cash'}
          </p>
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
            const projectName = projects.find((p) => p.id === tx.projectId)?.name

            return (
              <Link key={tx.id}
                href={`/petty-cash/${tx.id}`}
                className="flex items-center gap-4 p-4 lg:p-5 transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: tx.anomalyFlag
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid var(--border-color)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  if (!tx.anomalyFlag)
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card)'
                  e.currentTarget.style.borderColor = tx.anomalyFlag
                    ? 'rgba(239,68,68,0.3)'
                    : 'var(--border-color)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
                }}>

                <div className="p-2 flex-shrink-0 rounded-sm" style={{ background: status.bg }}>
                  <StatusIcon size={16} style={{ color: status.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      #{tx.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 font-semibold rounded-sm"
                      style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    {tx.anomalyFlag && (
                      <span className="text-xs px-2 py-0.5 font-semibold flex items-center gap-1 rounded-sm"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        <AlertCircle size={10} />
                        ANOMALI
                      </span>
                    )}
                    {tx.isEmergency && (
                      <span className="text-xs px-2 py-0.5 font-semibold rounded-sm"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                        DARURAT
                      </span>
                    )}
                    {/* Nama proyek — tampil saat mode semua proyek */}
                    {selectedProject === 'all' && projectName && (
                      <span className="text-xs px-2 py-0.5 flex items-center gap-1 rounded-sm"
                        style={{
                          background: 'rgba(249,115,22,0.08)',
                          color: '#F97316',
                          border: '1px solid rgba(249,115,22,0.15)',
                        }}>
                        <FolderOpen size={9} />
                        {projectName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                    {tx.description}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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

                <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}