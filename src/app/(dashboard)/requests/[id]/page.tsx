'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  doc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { MaterialRequest } from '@/types'
import { toast } from 'sonner'
import {
  ArrowLeft, CheckCircle, XCircle, Loader2,
  Clock, User, AlertTriangle, Package,
  FileText, Upload, FolderOpen, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Image from 'next/image'
import { createNotification } from '@/lib/firebase/notifications'
import { useFileUpload } from '@/hooks/useFileUpload'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  submitted:   { label: 'Menunggu Review',    color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.2)' },
  in_review:   { label: 'Sedang Direview',    color: '#F97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)' },
  approved:    { label: 'Disetujui',          color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)' },
  rejected:    { label: 'Ditolak',            color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
  po_issued:   { label: 'PO Diterbitkan',     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  on_delivery: { label: 'Dalam Pengiriman',   color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.2)' },
  completed:   { label: 'Selesai',            color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.15)' },
  discrepancy: { label: 'Ada Ketidaksesuaian',color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
}

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const { uploadFile, uploading, progress } = useFileUpload()

  const [request, setRequest] = useState<MaterialRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  // PO Upload state
  const [showPOUpload, setShowPOUpload] = useState(false)
  const [poNumber, setPoNumber] = useState('')
  const [poFile, setPoFile] = useState<File | null>(null)
  const [poNotes, setPoNotes] = useState('')

  const requestId = params.id as string
  const role = logisUser?.role || ''
  const canApprove = ['owner', 'admin', 'pm'].includes(role)

  useEffect(() => {
    if (!companyId || !requestId) return
    async function fetchRequest() {
      const snap = await getDoc(doc(db, 'logis_companies', companyId!, 'requests', requestId))
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

  // ── APPROVE ──────────────────────────────────────────────
  async function handleApprove() {
    if (!companyId || !requestId) return
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'logis_companies', companyId, 'requests', requestId), {
        status: 'approved',
        approvedBy: logisUser?.id,
        approvedByName: logisUser?.name,
        updatedAt: serverTimestamp(),
      })
      await createNotification({
        companyId,
        type: 'request_approved',
        title: 'Request Disetujui',
        message: `Request #${requestId.slice(-6).toUpperCase()} disetujui oleh ${logisUser?.name}`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '',
        createdByName: logisUser?.name || '',
        targetRoles: ['owner', 'admin', 'pm', 'supervisor', 'logistik', 'admin_site'],
      })
      toast.success('Request disetujui! Silakan upload PO sekarang.')
      // Update local state — tampilkan PO upload section
      setRequest((prev) => prev ? { ...prev, status: 'approved' } : prev)
      setShowPOUpload(true)
    } catch {
      toast.error('Gagal menyetujui request')
    } finally {
      setActionLoading(false)
    }
  }

  // ── REJECT ───────────────────────────────────────────────
  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    if (!companyId || !requestId) return
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'logis_companies', companyId, 'requests', requestId), {
        status: 'rejected',
        rejectedReason: rejectReason.trim(),
        updatedAt: serverTimestamp(),
      })
      await createNotification({
        companyId,
        type: 'request_rejected',
        title: 'Request Ditolak',
        message: `Request #${requestId.slice(-6).toUpperCase()} ditolak. Alasan: ${rejectReason}`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '',
        createdByName: logisUser?.name || '',
        targetRoles: ['owner', 'admin', 'pm', 'supervisor', 'logistik', 'admin_site'],
      })
      toast.success('Request ditolak')
      router.push('/requests')
    } catch {
      toast.error('Gagal menolak request')
    } finally {
      setActionLoading(false)
    }
  }

  // ── UPLOAD PO ────────────────────────────────────────────
  async function handleUploadPO() {
    if (!poNumber.trim()) {
      toast.error('Nomor PO wajib diisi')
      return
    }
    if (!companyId || !requestId) return
    setActionLoading(true)
    try {
      let poFileUrl = ''
      let poFilePath = ''

      if (poFile) {
        const path = `logis/${companyId}/po/${requestId}/${Date.now()}_${poFile.name}`
        const result = await uploadFile(poFile, path)
        poFileUrl = result.url
        poFilePath = result.path
      }

      await updateDoc(doc(db, 'logis_companies', companyId, 'requests', requestId), {
        status: 'po_issued',
        poNumber: poNumber.trim(),
        poFileUrl: poFileUrl || null,
        poFilePath: poFilePath || null,
        poNotes: poNotes.trim() || null,
        poIssuedAt: serverTimestamp(),
        poIssuedBy: logisUser?.id,
        poIssuedByName: logisUser?.name,
        updatedAt: serverTimestamp(),
      })

      await createNotification({
        companyId,
        type: 'request_po_issued',
        title: 'PO Diterbitkan',
        message: `PO #${poNumber} diterbitkan untuk request #${requestId.slice(-6).toUpperCase()}. Logistik bisa follow up ke supplier.`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '',
        createdByName: logisUser?.name || '',
        targetRoles: ['owner', 'admin', 'pm', 'logistik'],
      })

      toast.success('PO berhasil diterbitkan! Status request → PO Issued.')
      router.push('/requests')
    } catch {
      toast.error('Gagal upload PO')
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
      <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
        Request tidak ditemukan
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.submitted
  const isPending = ['submitted', 'in_review'].includes(request.status)
  const isApproved = request.status === 'approved'

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'var(--text-muted)',
    marginBottom: '6px',
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/requests"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={12} />
          Kembali
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
              #{request.id.slice(-6).toUpperCase()}
            </p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Detail Request
            </h1>
          </div>
          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest flex-shrink-0"
            style={{
              background: statusCfg.bg,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.border}`,
            }}>
            {statusCfg.label}
          </div>
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <User size={11} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Diminta oleh
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {request.requestedByName}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={11} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Tanggal
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {request.createdAt ? format(request.createdAt, 'd MMM yyyy, HH:mm', { locale: id }) : '—'}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={11} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              Urgensi
            </span>
          </div>
          <p className="text-sm font-semibold uppercase"
            style={{
              color: request.urgency === 'urgent' ? '#ef4444'
                : request.urgency === 'normal' ? '#F97316'
                : 'var(--text-muted)',
            }}>
            {request.urgency || '—'}
          </p>
        </div>
        {request.projectId && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FolderOpen size={11} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Proyek
              </span>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#F97316' }}>
              {request.projectId}
            </p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Package size={14} style={{ color: '#F97316' }} />
            <span className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}>
              Daftar Barang ({request.items?.length} item)
            </span>
          </div>
        </div>
        <div>
          {request.items?.map((item, index) => (
            <div key={index}
              className="px-5 py-4 flex items-center gap-4"
              style={{ borderBottom: index < (request.items?.length || 0) - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <span className="font-mono text-xs w-5 flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {item.name}
                </p>
                {item.notes && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.notes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono" style={{ color: '#F97316' }}>
                  {item.quantity}
                </span>
                <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
                  {item.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Foto referensi */}
      {request.photos && request.photos.length > 0 && (
        <div className="mb-6 p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Foto Referensi ({request.photos.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {request.photos.map((photo, index) => (
              <a key={index} href={photo.url} target="_blank" rel="noopener noreferrer"
                className="relative block" style={{ width: 80, height: 80 }}>
                <Image src={photo.url} alt={`Foto ${index + 1}`} fill
                  className="object-cover"
                  style={{ border: '1px solid var(--border-color)' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Alasan permintaan */}
      {request.reason && (
        <div className="mb-6 p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'var(--text-muted)' }}>
            Alasan Permintaan
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {request.reason}
          </p>
        </div>
      )}

      {/* Alasan penolakan */}
      {request.status === 'rejected' && request.rejectedReason && (
        <div className="mb-6 p-5"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: '#ef4444' }}>
            Alasan Penolakan
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {request.rejectedReason}
          </p>
        </div>
      )}

      {/* Info PO yang sudah diterbitkan */}
      {request.status === 'po_issued' && request.poNumber && (
        <div className="mb-6 p-5"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} style={{ color: '#a78bfa' }} />
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#a78bfa' }}>
              PO Telah Diterbitkan
            </p>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Nomor PO: {request.poNumber}
          </p>
          {request.poNotes && (
            <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
              {request.poNotes}
            </p>
          )}
          {request.poFileUrl && (
            <a href={request.poFileUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold mt-2"
              style={{ color: '#a78bfa' }}>
              <ExternalLink size={12} />
              Lihat Dokumen PO
            </a>
          )}
          {request.poIssuedByName && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Diterbitkan oleh {request.poIssuedByName}
            </p>
          )}
        </div>
      )}

      {/* ── APPROVAL ACTIONS ── */}
      {canApprove && isPending && (
        <div className="p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}>
            Tindakan
          </p>
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                {actionLoading
                  ? <Loader2 size={15} className="animate-spin" />
                  : <CheckCircle size={15} />}
                Setujui Request
              </button>
              <button onClick={() => setShowRejectForm(true)} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
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
                style={{ ...inputStyle, resize: 'none', border: '1px solid rgba(239,68,68,0.3)' }}
              />
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
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PO UPLOAD SECTION ── */}
      {/* Muncul setelah approve ATAU jika status sudah approved tapi PO belum diupload */}
      {canApprove && (isApproved || showPOUpload) && request.status !== 'po_issued' && (
        <div className="mt-4 p-5"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={14} style={{ color: '#a78bfa' }} />
            <p className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#a78bfa' }}>
              Terbitkan Purchase Order (PO)
            </p>
          </div>

          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Request sudah disetujui. Upload PO agar tim logistik bisa follow up ke supplier.
          </p>

          <div className="space-y-3">
            <div>
              <label style={labelStyle}>Nomor PO *</label>
              <input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="PO-2026-001"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Upload Dokumen PO (opsional)</label>
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest cursor-pointer"
                  style={{
                    border: '1px solid var(--border-strong)',
                    color: poFile ? '#a78bfa' : 'var(--text-secondary)',
                    background: 'var(--bg-card)',
                  }}>
                  <Upload size={13} />
                  {poFile ? poFile.name : 'Pilih File'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => setPoFile(e.target.files?.[0] || null)}
                  />
                </label>
                {poFile && (
                  <button onClick={() => setPoFile(null)}
                    className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Hapus
                  </button>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                PDF, Word, atau gambar — maks 5MB
              </p>
              {uploading && (
                <div className="mt-2">
                  <div className="h-1 w-full" style={{ background: 'var(--border-color)' }}>
                    <div className="h-full transition-all" style={{ width: `${progress}%`, background: '#a78bfa' }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Uploading {progress}%...
                  </p>
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Catatan untuk Logistik (opsional)</label>
              <textarea
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="Supplier sudah dikonfirmasi, estimasi datang 3 hari kerja..."
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleUploadPO}
                disabled={actionLoading || uploading || !poNumber.trim()}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                style={{
                  background: actionLoading || !poNumber.trim() ? 'rgba(167,139,250,0.3)' : '#a78bfa',
                  color: '#fff',
                  cursor: !poNumber.trim() ? 'not-allowed' : 'pointer',
                }}>
                {actionLoading
                  ? <><Loader2 size={14} className="animate-spin" />Memproses...</>
                  : <><FileText size={14} />Terbitkan PO</>}
              </button>
              <button
                onClick={() => setShowPOUpload(false)}
                className="px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                Nanti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}