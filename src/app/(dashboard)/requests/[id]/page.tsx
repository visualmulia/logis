'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { MaterialRequest } from '@/types'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  User,
  AlertTriangle,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const [request, setRequest] = useState<MaterialRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const requestId = params.id as string

  useEffect(() => {
    if (!companyId || !requestId) return

    async function fetchRequest() {
      const docRef = doc(
        db,
        'logis_companies',
        companyId!,
        'requests',
        requestId
      )
      const snap = await getDoc(docRef)
      if (snap.exists()) {
        setRequest({
          id: snap.id,
          ...snap.data(),
          createdAt: snap.data().createdAt?.toDate(),
          updatedAt: snap.data().updatedAt?.toDate(),
        } as MaterialRequest)
      }
      setLoading(false)
    }

    fetchRequest()
  }, [companyId, requestId])

  const canApprove = ['owner', 'admin', 'pm'].includes(logisUser?.role || '')

  async function handleApprove() {
    if (!companyId || !requestId) return
    setActionLoading(true)
    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'requests', requestId),
        {
          status: 'approved',
          approvedBy: logisUser?.id,
          updatedAt: serverTimestamp(),
        }
      )
      toast.success('Request disetujui!')
      router.push('/requests')
    } catch {
      toast.error('Gagal menyetujui request')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    if (!companyId || !requestId) return
    setActionLoading(true)
    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'requests', requestId),
        {
          status: 'rejected',
          rejectedReason: rejectReason.trim(),
          updatedAt: serverTimestamp(),
        }
      )
      toast.success('Request ditolak')
      router.push('/requests')
    } catch {
      toast.error('Gagal menolak request')
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

  if (!request) {
    return (
      <div className="p-8 text-center" style={{ color: 'rgba(245,240,235,0.3)' }}>
        Request tidak ditemukan
      </div>
    )
  }

  const isPending = ['submitted', 'in_review'].includes(request.status)

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/requests"
          className="inline-flex items-center gap-2 text-xs mb-4 transition-colors"
          style={{ color: 'rgba(245,240,235,0.3)' }}
        >
          <ArrowLeft size={12} />
          Kembali
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p
              className="text-xs font-mono mb-1"
              style={{ color: 'rgba(245,240,235,0.3)' }}
            >
              #{request.id.slice(-6).toUpperCase()}
            </p>
            <h1 className="text-2xl font-bold" style={{ color: '#f5f0eb' }}>
              Detail Request
            </h1>
          </div>
          <div
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{
              background:
                request.status === 'approved'
                  ? 'rgba(34,197,94,0.1)'
                  : request.status === 'rejected'
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(234,179,8,0.1)',
              color:
                request.status === 'approved'
                  ? '#22c55e'
                  : request.status === 'rejected'
                  ? '#ef4444'
                  : '#eab308',
              border:
                request.status === 'approved'
                  ? '1px solid rgba(34,197,94,0.2)'
                  : request.status === 'rejected'
                  ? '1px solid rgba(239,68,68,0.2)'
                  : '1px solid rgba(234,179,8,0.2)',
            }}
          >
            {request.status.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div
        className="grid grid-cols-3 gap-4 mb-6 p-5"
        style={{
          background: '#111111',
          border: '1px solid rgba(245,240,235,0.06)',
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <User size={12} style={{ color: 'rgba(245,240,235,0.3)' }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              Diminta oleh
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#f5f0eb' }}>
            {request.requestedByName}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={12} style={{ color: 'rgba(245,240,235,0.3)' }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              Tanggal
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#f5f0eb' }}>
            {request.createdAt
              ? format(request.createdAt, 'd MMM yyyy, HH:mm', { locale: id })
              : '—'}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} style={{ color: 'rgba(245,240,235,0.3)' }} />
            <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(245,240,235,0.3)', fontSize: '9px' }}>
              Urgensi
            </span>
          </div>
          <p
            className="text-sm font-semibold uppercase"
            style={{
              color:
                request.urgency === 'urgent'
                  ? '#ef4444'
                  : request.urgency === 'normal'
                  ? '#F97316'
                  : 'rgba(245,240,235,0.4)',
            }}
          >
            {request.urgency}
          </p>
        </div>
      </div>

      {/* Items */}
      <div
        className="mb-6"
        style={{
          background: '#111111',
          border: '1px solid rgba(245,240,235,0.06)',
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <Package size={14} style={{ color: '#F97316' }} />
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(245,240,235,0.4)' }}
            >
              Daftar Barang ({request.items?.length} item)
            </span>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(245,240,235,0.04)' }}>
          {request.items?.map((item, index) => (
            <div key={index} className="px-5 py-4 flex items-center gap-4">
              <span
                className="font-mono text-xs w-5 flex-shrink-0"
                style={{ color: 'rgba(245,240,235,0.2)' }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: '#f5f0eb' }}>
                  {item.name}
                </p>
                {item.notes && (
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(245,240,235,0.3)' }}>
                    {item.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: '#F97316' }}
                >
                  {item.quantity}
                </span>
                <span
                  className="text-xs ml-1"
                  style={{ color: 'rgba(245,240,235,0.4)' }}
                >
                  {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div
        className="mb-6 p-5"
        style={{
          background: '#111111',
          border: '1px solid rgba(245,240,235,0.06)',
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'rgba(245,240,235,0.3)' }}
        >
          Alasan Permintaan
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(245,240,235,0.7)' }}>
          {request.reason}
        </p>
      </div>

      {/* Rejected reason */}
      {request.status === 'rejected' && request.rejectedReason && (
        <div
          className="mb-6 p-5"
          style={{
            background: 'rgba(239,68,68,0.05)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#ef4444' }}>
            Alasan Penolakan
          </p>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.7)' }}>
            {request.rejectedReason}
          </p>
        </div>
      )}

      {/* Approval actions */}
      {canApprove && isPending && (
        <div
          className="p-5"
          style={{
            background: '#111111',
            border: '1px solid rgba(245,240,235,0.06)',
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(245,240,235,0.3)' }}
          >
            Tindakan
          </p>

          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  color: '#22c55e',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                {actionLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle size={15} />
                )}
                Setujui Request
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={actionLoading}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                <XCircle size={15} />
                Tolak Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan..."
                rows={3}
                className="w-full p-3 text-sm outline-none resize-none"
                style={{
                  background: '#0a0a0a',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f5f0eb',
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                  }}
                >
                  {actionLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Konfirmasi Tolak'
                  )}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2.5 text-sm"
                  style={{
                    border: '1px solid rgba(245,240,235,0.1)',
                    color: 'rgba(245,240,235,0.4)',
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}