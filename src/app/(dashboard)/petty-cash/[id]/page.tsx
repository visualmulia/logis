'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { PettyCashTransaction } from '@/types'
import { toast } from 'sonner'
import {
  ArrowLeft, CheckCircle, XCircle,
  Loader2, AlertTriangle, Zap,
  ShoppingCart, Clock, User, Wallet
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function PettyCashDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const txId = params.id as string

  const [tx, setTx] = useState<PettyCashTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  useEffect(() => {
    if (!companyId || !txId) return

    getDoc(doc(db, 'logis_companies', companyId, 'petty_cash', txId)).then((snap) => {
      if (snap.exists()) {
        setTx({
          id: snap.id,
          ...snap.data(),
          createdAt: snap.data().createdAt?.toDate(),
          completedAt: snap.data().completedAt?.toDate(),
        } as PettyCashTransaction)
      }
      setLoading(false)
    })
  }, [companyId, txId])

  const canApprove = ['owner', 'admin', 'pm'].includes(logisUser?.role || '')
  const isPending = tx?.status === 'pending_approval'

  async function handleApprove() {
    if (!companyId || !txId) return
    setActionLoading(true)
    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'petty_cash', txId),
        {
          status: 'approved',
          approvedBy: logisUser?.id,
          approvedByName: logisUser?.name,
          updatedAt: serverTimestamp(),
        }
      )
      toast.success('Request petty cash disetujui!')
      router.push('/petty-cash')
    } catch {
      toast.error('Gagal menyetujui')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    if (!companyId || !txId) return
    setActionLoading(true)
    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'petty_cash', txId),
        {
          status: 'rejected',
          rejectedReason: rejectReason.trim(),
          updatedAt: serverTimestamp(),
        }
      )
      toast.success('Request ditolak')
      router.push('/petty-cash')
    } catch {
      toast.error('Gagal menolak request')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMarkComplete() {
    if (!companyId || !txId) return
    setActionLoading(true)
    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'petty_cash', txId),
        {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      )
      toast.success('Transaksi ditandai selesai!')
      router.push('/petty-cash')
    } catch {
      toast.error('Gagal update status')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  if (!tx) {
    return (
      <div className="p-8" style={{ color: 'rgba(245,240,235,0.3)' }}>
        Transaksi tidak ditemukan
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/petty-cash"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: 'rgba(245,240,235,0.3)' }}>
          <ArrowLeft size={12} />
          Kembali
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono mb-1"
              style={{ color: 'rgba(245,240,235,0.3)' }}>
              #{tx.id.slice(-6).toUpperCase()}
            </p>
            <h1 className="text-2xl font-bold" style={{ color: '#f5f0eb' }}>
              Detail Petty Cash
            </h1>
          </div>
          <p className="text-2xl font-black font-mono" style={{ color: '#F97316' }}>
            {formatRupiah(tx.amount)}
          </p>
        </div>
      </div>

      {/* Anomaly alert */}
      {tx.anomalyFlag && (
        <div className="flex items-start gap-3 p-4 mb-5"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}>
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#ef4444' }}>
              ⚠️ Anomali Terdeteksi
            </p>
            <p className="text-xs" style={{ color: 'rgba(239,68,68,0.7)' }}>
              {tx.anomalyReason}
            </p>
          </div>
        </div>
      )}

      {/* Emergency badge */}
      {tx.isEmergency && (
        <div className="flex items-center gap-3 p-4 mb-5"
          style={{
            background: 'rgba(249,115,22,0.06)',
            border: '1px solid rgba(249,115,22,0.25)',
          }}>
          <Zap size={16} style={{ color: '#F97316' }} />
          <div>
            <p className="text-sm font-bold" style={{ color: '#F97316' }}>
              Pembelian Darurat
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(249,115,22,0.6)' }}>
              Diizinkan oleh: {tx.emergencyApprovedBy}
            </p>
          </div>
        </div>
      )}

      {/* Main info */}
      <div className="p-5 mb-4"
        style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs mb-1"
              style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              DIMINTA OLEH
            </p>
            <p className="text-sm font-semibold flex items-center gap-1.5"
              style={{ color: '#f5f0eb' }}>
              <User size={12} style={{ color: 'rgba(245,240,235,0.3)' }} />
              {tx.requestedBy}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1"
              style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              TANGGAL REQUEST
            </p>
            <p className="text-sm font-semibold flex items-center gap-1.5"
              style={{ color: '#f5f0eb' }}>
              <Clock size={12} style={{ color: 'rgba(245,240,235,0.3)' }} />
              {tx.createdAt
                ? format(tx.createdAt, 'd MMM yyyy, HH:mm', { locale: id })
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1"
              style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              KATEGORI
            </p>
            <p className="text-sm font-semibold" style={{ color: '#f5f0eb' }}>
              {tx.category}
              {tx.subcategory && ` — ${tx.subcategory}`}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1"
              style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              JENIS PEMBELIAN
            </p>
            <p className="text-sm font-semibold" style={{ color: '#f5f0eb' }}>
              {tx.purchaseType === 'cash' && '💵 Kas Langsung'}
              {tx.purchaseType === 'reimbursement' && '🔄 Reimbursement'}
              {tx.purchaseType === 'online' && `🛒 Online (${tx.onlinePlatform})`}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-5 mb-4"
        style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(245,240,235,0.3)' }}>
          Deskripsi Pengeluaran
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,240,235,0.8)' }}>
          {tx.description}
        </p>
        {tx.notes && (
          <p className="text-xs mt-3 pt-3 leading-relaxed"
            style={{
              color: 'rgba(245,240,235,0.4)',
              borderTop: '1px solid rgba(245,240,235,0.06)'
            }}>
            Catatan: {tx.notes}
          </p>
        )}
      </div>

      {/* Online URL */}
      {tx.purchaseType === 'online' && tx.onlineUrl && (
        <div className="p-5 mb-4"
          style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'rgba(245,240,235,0.3)' }}>
            <ShoppingCart size={12} className="inline mr-1" />
            Link Produk
          </p>
          <a href={tx.onlineUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm break-all"
            style={{ color: '#F97316' }}>
            {tx.onlineUrl}
          </a>
          <p className="text-xs mt-2" style={{ color: 'rgba(245,240,235,0.3)' }}>
            Klik untuk verifikasi harga di {tx.onlinePlatform}
          </p>
        </div>
      )}

      {/* Reject reason */}
      {tx.status === 'rejected' && tx.rejectedReason && (
        <div className="p-5 mb-4"
          style={{
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.2)'
          }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#ef4444' }}>
            Alasan Penolakan
          </p>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.7)' }}>
            {tx.rejectedReason}
          </p>
        </div>
      )}

      {/* Actions */}
      {canApprove && isPending && (
        <div className="p-5 mb-4"
          style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(245,240,235,0.3)' }}>
            Tindakan Approval
          </p>

          {!showRejectForm ? (
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={actionLoading}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}>
                {actionLoading
                  ? <Loader2 size={15} className="animate-spin" />
                  : <CheckCircle size={15} />}
                Setujui
              </button>
              <button onClick={() => setShowRejectForm(true)} disabled={actionLoading}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}>
                <XCircle size={15} />
                Tolak
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan..."
                rows={3}
                className="w-full p-3 text-sm outline-none resize-none"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f5f0eb',
                }} />
              <div className="flex gap-3">
                <button onClick={handleReject} disabled={actionLoading}
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  {actionLoading
                    ? <Loader2 size={14} className="animate-spin" />
                    : 'Konfirmasi Tolak'}
                </button>
                <button onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2.5 text-sm"
                  style={{
                    border: '1px solid rgba(245,240,235,0.1)',
                    color: 'rgba(245,240,235,0.4)'
                  }}>
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mark complete — untuk yang sudah approved */}
      {tx.status === 'approved' && (
        <div className="p-5"
          style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(245,240,235,0.3)' }}>
            Update Status
          </p>
          <button onClick={handleMarkComplete} disabled={actionLoading}
            className="w-full py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            style={{
              background: 'rgba(34,197,94,0.1)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.3)',
            }}>
            {actionLoading
              ? <Loader2 size={15} className="animate-spin" />
              : <><Wallet size={15} /> Tandai Selesai & Uang Sudah Dipakai</>}
          </button>
        </div>
      )}
    </div>
  )
}