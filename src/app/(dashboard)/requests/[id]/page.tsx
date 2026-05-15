'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { MaterialRequest, Project } from '@/types'
import { toast } from 'sonner'
import {
  ArrowLeft, CheckCircle, XCircle, Loader2, Clock,
  User, AlertTriangle, Package, FileText, Upload,
  FolderOpen, ExternalLink, Printer, RotateCcw,
  Truck, AlertCircle, ThumbsUp,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import Image from 'next/image'
import { createNotification } from '@/lib/firebase/notifications'
import { useFileUpload } from '@/hooks/useFileUpload'

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string
}> = {
  submitted:          { label: 'Menunggu Review PM', color: '#eab308', bg: 'rgba(234,179,8,0.1)',   border: 'rgba(234,179,8,0.2)' },
  pending_pm_review:  { label: 'Menunggu Acknowledge PM', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)' },
  revision_requested: { label: 'Perlu Revisi',        color: '#F97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  in_review:          { label: 'Review Admin Pusat',  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)' },
  approved:           { label: 'Disetujui',           color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)' },
  rejected:           { label: 'Ditolak',             color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
  po_issued:          { label: 'PO Diterbitkan',      color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
  on_delivery:        { label: 'Dalam Pengiriman',    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)' },
  completed:          { label: 'Selesai',             color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)' },
  discrepancy:        { label: 'Ada Ketidaksesuaian', color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)' },
}

// Timeline status untuk progress tracker
const STATUS_STEPS = [
  { key: 'submitted',          label: 'Dibuat' },
  { key: 'pending_pm_review',  label: 'Review PM' },
  { key: 'in_review',          label: 'Review Pusat' },
  { key: 'approved',           label: 'Disetujui' },
  { key: 'po_issued',          label: 'PO Issued' },
  { key: 'on_delivery',        label: 'Dikirim' },
  { key: 'completed',          label: 'Selesai' },
]

const STATUS_ORDER = [
  'submitted', 'pending_pm_review', 'revision_requested',
  'in_review', 'approved', 'po_issued', 'on_delivery', 'completed', 'discrepancy',
]

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    submitted: 0, pending_pm_review: 1, revision_requested: 1,
    in_review: 2, approved: 3, po_issued: 4, on_delivery: 5,
    completed: 6, discrepancy: 5,
  }
  return map[status] ?? 0
}

export default function RequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const { uploadFile, uploading, progress } = useFileUpload()

  const [request, setRequest] = useState<MaterialRequest | null>(null)
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // PM states
  const [showRevisionForm, setShowRevisionForm] = useState(false)
  const [revisionNote, setRevisionNote] = useState('')

  // Admin pusat reject state
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // PO states
  const [showPOUpload, setShowPOUpload] = useState(false)
  const [poNumber, setPoNumber] = useState('')
  const [poFile, setPoFile] = useState<File | null>(null)
  const [poNotes, setPoNotes] = useState('')

  // Logistik discrepancy state
  const [showDiscrepancyForm, setShowDiscrepancyForm] = useState(false)
  const [discrepancyNote, setDiscrepancyNote] = useState('')

  const requestId = params.id as string
  const role = logisUser?.role || ''

  const canPMAction   = ['owner', 'pm'].includes(role)
  const canAdminAction = ['owner', 'admin'].includes(role)
  const canLogistik   = ['owner', 'logistik', 'admin'].includes(role)

  useEffect(() => {
    if (!companyId || !requestId) return
    async function fetchRequest() {
      const snap = await getDoc(doc(db, 'logis_companies', companyId!, 'requests', requestId))
      if (snap.exists()) {
        const data = {
          id: snap.id,
          ...snap.data(),
          createdAt: snap.data().createdAt?.toDate(),
          updatedAt: snap.data().updatedAt?.toDate(),
          pmAcknowledgedAt: snap.data().pmAcknowledgedAt?.toDate(),
          poIssuedAt: snap.data().poIssuedAt?.toDate(),
          deliveryConfirmedAt: snap.data().deliveryConfirmedAt?.toDate(),
          discrepancyReportedAt: snap.data().discrepancyReportedAt?.toDate(),
        } as MaterialRequest
        setRequest(data)
        if (data.projectId) {
          try {
            const projSnap = await getDoc(doc(db, 'logis_companies', companyId!, 'projects', data.projectId))
            if (projSnap.exists()) setProjectName((projSnap.data() as Project).name || data.projectId)
          } catch { setProjectName(data.projectId) }
        }
      }
      setLoading(false)
    }
    fetchRequest()
  }, [companyId, requestId])

  // ── HELPERS ──────────────────────────────────────────────
  async function updateRequest(fields: Record<string, unknown>, successMsg: string) {
    if (!companyId || !requestId) return false
    setActionLoading(true)
    try {
      await updateDoc(doc(db, 'logis_companies', companyId, 'requests', requestId), {
        ...fields,
        updatedAt: serverTimestamp(),
      })
      setRequest((prev) => prev ? { ...prev, ...fields } as MaterialRequest : prev)
      toast.success(successMsg)
      return true
    } catch {
      toast.error('Gagal memperbarui request')
      return false
    } finally {
      setActionLoading(false)
    }
  }

  // ── PM: ACKNOWLEDGE ──────────────────────────────────────
  async function handlePMAcknowledge() {
    const ok = await updateRequest({
      status: 'in_review',
      pmAcknowledgedBy: logisUser?.id,
      pmAcknowledgedByName: logisUser?.name,
      pmAcknowledgedAt: serverTimestamp(),
    }, 'Request di-acknowledge! Diteruskan ke Admin Pusat.')
    if (ok && companyId) {
      await createNotification({
        companyId, type: 'request_approved',
        title: 'Request Disetujui PM',
        message: `PM ${logisUser?.name} telah acknowledge request #${requestId.slice(-6).toUpperCase()}. Menunggu persetujuan Admin Pusat.`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '', createdByName: logisUser?.name || '',
                targetRoles: ['owner', 'admin', 'admin_site'],
      })
    }
  }

  // ── PM: MINTA REVISI ─────────────────────────────────────
  async function handlePMRevision() {
    if (!revisionNote.trim()) { toast.error('Catatan revisi wajib diisi'); return }
    const ok = await updateRequest({
      status: 'revision_requested',
      pmRevisionNote: revisionNote.trim(),
    }, 'Permintaan revisi dikirim ke Admin Proyek.')
    if (ok && companyId) {
      await createNotification({
        companyId, type: 'request_revision',
        title: 'Request Perlu Direvisi',
        message: `PM ${logisUser?.name} meminta revisi: ${revisionNote}`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '', createdByName: logisUser?.name || '',
                targetRoles: ['admin_site', 'supervisor', 'pm'],
      })
      setShowRevisionForm(false)
      setRevisionNote('')
    }
  }

  // ── ADMIN PUSAT: APPROVE ─────────────────────────────────
  async function handleApprove() {
    const ok = await updateRequest({
      status: 'approved',
      approvedBy: logisUser?.id,
      approvedByName: logisUser?.name,
    }, 'Request disetujui! Silakan upload PO sekarang.')
    if (ok) {
      setShowPOUpload(true)
      if (companyId) {
        await createNotification({
          companyId, type: 'request_approved',
          title: 'Request Disetujui',
          message: `Request #${requestId.slice(-6).toUpperCase()} disetujui oleh ${logisUser?.name}`,
          href: `/requests/${requestId}`,
          createdBy: logisUser?.id || '', createdByName: logisUser?.name || '',
                  targetRoles: ['owner', 'admin', 'pm', 'supervisor', 'logistik', 'admin_site', 'po'],
        })
      }
    }
  }

  // ── ADMIN PUSAT: REJECT ──────────────────────────────────
  async function handleReject() {
    if (!rejectReason.trim()) { toast.error('Alasan penolakan wajib diisi'); return }
    const ok = await updateRequest({
      status: 'rejected',
      rejectedReason: rejectReason.trim(),
    }, 'Request ditolak.')
    if (ok && companyId) {
      await createNotification({
        companyId, type: 'request_rejected',
        title: 'Request Ditolak',
        message: `Request #${requestId.slice(-6).toUpperCase()} ditolak. Alasan: ${rejectReason}`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '', createdByName: logisUser?.name || '',
        targetRoles: ['owner', 'admin', 'pm', 'supervisor', 'logistik', 'admin_site'],
      })
      setShowRejectForm(false)
      router.push('/requests')
    }
  }

  // ── UPLOAD PO → STATUS: ON_DELIVERY ──────────────────────
  async function handleUploadPO() {
    if (!poNumber.trim()) { toast.error('Nomor PO wajib diisi'); return }
    if (!companyId || !requestId) return
    setActionLoading(true)
    try {
      let poFileUrl = '', poFilePath = ''
      if (poFile) {
        const path = `logis/${companyId}/po/${requestId}/${Date.now()}_${poFile.name}`
        const result = await uploadFile(poFile, path)
        poFileUrl = result.url
        poFilePath = result.path
      }
      await updateDoc(doc(db, 'logis_companies', companyId, 'requests', requestId), {
        status: 'on_delivery',     // ← langsung on_delivery setelah PO
        poNumber: poNumber.trim(),
        poFileUrl: poFileUrl || null,
        poFilePath: poFilePath || null,
        poNotes: poNotes.trim() || null,
        poIssuedAt: serverTimestamp(),
        poIssuedBy: logisUser?.id,
        poIssuedByName: logisUser?.name,
        updatedAt: serverTimestamp(),
      })
      setRequest((prev) => prev ? { ...prev, status: 'on_delivery', poNumber: poNumber.trim() } as MaterialRequest : prev)
      await createNotification({
        companyId, type: 'request_on_delivery',
        title: 'PO Diterbitkan — Barang Dalam Pengiriman',
        message: `PO #${poNumber} diterbitkan untuk request #${requestId.slice(-6).toUpperCase()}. Silakan follow up ke supplier.`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '', createdByName: logisUser?.name || '',
                targetRoles: ['owner', 'admin', 'pm', 'logistik', 'admin_site', 'po'],
      })
      toast.success('PO diterbitkan! Status → Dalam Pengiriman. Logistik sudah dinotifikasi.')
      setShowPOUpload(false)
    } catch { toast.error('Gagal upload PO') }
    finally { setActionLoading(false) }
  }

  // ── LOGISTIK: KONFIRMASI SELESAI ─────────────────────────
  async function handleDeliveryComplete() {
    const ok = await updateRequest({
      status: 'completed',
      deliveryConfirmedBy: logisUser?.id,
      deliveryConfirmedByName: logisUser?.name,
      deliveryConfirmedAt: serverTimestamp(),
    }, 'Penerimaan barang dikonfirmasi. Request selesai!')
    if (ok && companyId) {
      await createNotification({
        companyId, type: 'request_completed',
        title: 'Barang Diterima — Request Selesai',
        message: `Logistik ${logisUser?.name} konfirmasi barang untuk request #${requestId.slice(-6).toUpperCase()} sudah diterima sesuai PO.`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '', createdByName: logisUser?.name || '',
                targetRoles: ['owner', 'admin', 'pm', 'admin_site'],
      })
    }
  }

  // ── LOGISTIK: KETIDAKSESUAIAN ────────────────────────────
  async function handleDiscrepancy() {
    if (!discrepancyNote.trim()) { toast.error('Catatan ketidaksesuaian wajib diisi'); return }
    const ok = await updateRequest({
      status: 'discrepancy',
      discrepancyNote: discrepancyNote.trim(),
      discrepancyReportedBy: logisUser?.id,
      discrepancyReportedByName: logisUser?.name,
      discrepancyReportedAt: serverTimestamp(),
    }, 'Laporan ketidaksesuaian dikirim ke Admin Pusat.')
    if (ok && companyId) {
      await createNotification({
        companyId, type: 'request_discrepancy',
        title: '⚠️ Ketidaksesuaian Barang',
        message: `Logistik ${logisUser?.name} melaporkan ketidaksesuaian: ${discrepancyNote}`,
        href: `/requests/${requestId}`,
        createdBy: logisUser?.id || '', createdByName: logisUser?.name || '',
                targetRoles: ['owner', 'admin', 'pm', 'admin_site'],
      })
      setShowDiscrepancyForm(false)
    }
  }

  // ── PRINT ─────────────────────────────────────────────────
  function handlePrint() {
    if (!request) return
    const statusLabel = STATUS_CONFIG[request.status]?.label || request.status
    const tanggal = request.createdAt ? format(request.createdAt, 'd MMMM yyyy, HH:mm', { locale: id }) : '—'
    const itemsHTML = request.items?.map((item, i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-size:13px;">${String(i+1).padStart(2,'0')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:13px;">${item.name}${item.notes ? `<br><span style="color:#999;font-size:11px;">${item.notes}</span>` : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;"><strong style="color:#F97316;">${item.quantity}</strong> <span style="color:#999;">${item.unit}</span></td>
      </tr>`).join('') || ''
    const printContent = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Request Material #${request.id.slice(-6).toUpperCase()}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1a1a1a;padding:32px;font-size:14px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #F97316}
      .logo{font-size:22px;font-weight:900;letter-spacing:4px}.logo span{color:#F97316}
      .badge{padding:4px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border:1px solid #eab308;color:#b45309;background:#fef3c7}
      .meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;padding:16px;background:#f9f9f9;border:1px solid #eee}
      .meta-item label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;display:block;margin-bottom:4px}
      .meta-item p{font-size:13px;font-weight:600}
      .section{margin-bottom:20px}.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee}
      table{width:100%;border-collapse:collapse}th{padding:8px 12px;background:#f5f5f5;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#666;text-align:left;border-bottom:2px solid #eee}th:last-child{text-align:right}
      .box{padding:12px 16px;background:#f9f9f9;border-left:3px solid #F97316;font-size:13px;color:#444;line-height:1.6}
      .footer{margin-top:40px;padding-top:16px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#999}
      @media print{body{padding:20px}}</style></head><body>
      <div class="header"><div><div class="logo">LOG<span>I</span>S</div><div style="font-size:11px;color:#999;margin-top:2px;">Sistem Administrasi & Logistik Konstruksi</div></div>
      <div style="text-align:right;"><div class="badge">${statusLabel}</div><div style="font-size:12px;color:#999;margin-top:6px;">Request #${request.id.slice(-6).toUpperCase()}</div></div></div>
      <div style="margin-bottom:20px;"><div style="font-size:20px;font-weight:700;margin-bottom:4px;">Request Material</div>
      <div style="font-size:12px;color:#666;">Dicetak pada ${format(new Date(),'d MMMM yyyy, HH:mm',{locale:id})}</div></div>
      <div class="meta-grid">
        <div class="meta-item"><label>Diminta oleh</label><p>${request.requestedByName||'—'}</p></div>
        <div class="meta-item"><label>Tanggal</label><p>${tanggal}</p></div>
        <div class="meta-item"><label>Urgensi</label><p style="color:${request.urgency==='urgent'?'#ef4444':request.urgency==='normal'?'#F97316':'#999'}">${(request.urgency||'—').toUpperCase()}</p></div>
        <div class="meta-item"><label>Proyek</label><p style="color:#F97316">${projectName||'—'}</p></div>
      </div>
      ${request.pmAcknowledgedByName?`<div class="meta-grid" style="margin-top:-12px;"><div class="meta-item"><label>Acknowledge PM</label><p>${request.pmAcknowledgedByName}</p></div></div>`:''}
      <div class="section"><div class="section-title">Daftar Barang (${request.items?.length||0} item)</div>
      <table><thead><tr><th style="width:40px;">No</th><th>Nama Barang</th><th style="text-align:right;width:120px;">Jumlah</th></tr></thead><tbody>${itemsHTML}</tbody></table></div>
      ${request.reason?`<div class="section"><div class="section-title">Alasan Permintaan</div><div class="box">${request.reason}</div></div>`:''}
      ${request.status==='rejected'&&request.rejectedReason?`<div class="section"><div class="section-title">Alasan Penolakan</div><div class="box" style="border-left-color:#ef4444">${request.rejectedReason}</div></div>`:''}
      ${request.poNumber?`<div class="section"><div class="section-title">Purchase Order</div><div class="box" style="border-left-color:#a78bfa"><strong>Nomor PO:</strong> ${request.poNumber}${request.poNotes?`<br>${request.poNotes}`:''}${request.poIssuedByName?`<br><span style="color:#999;font-size:11px;">Diterbitkan oleh ${request.poIssuedByName}</span>`:''}</div></div>`:''}
      ${request.discrepancyNote?`<div class="section"><div class="section-title">Laporan Ketidaksesuaian</div><div class="box" style="border-left-color:#ef4444">${request.discrepancyNote}<br><span style="color:#999;font-size:11px;">Dilaporkan oleh ${request.discrepancyReportedByName}</span></div></div>`:''}
      <div class="footer"><span>Logis — logis-rho.vercel.app</span><span>Dokumen digenerate otomatis oleh sistem</span></div>
      <script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('','_blank','width=800,height=900')
    if (w) { w.document.write(printContent); w.document.close() }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} /></div>
  }
  if (!request) {
    return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Request tidak ditemukan</div>
  }

  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.submitted
  const currentStep = getStepIndex(request.status)
  const isPendingPM = ['submitted', 'pending_pm_review'].includes(request.status)
  const isPendingAdmin = request.status === 'in_review'
  const isApproved = request.status === 'approved'
  const isOnDelivery = request.status === 'on_delivery'
  const isRevisionRequested = request.status === 'revision_requested'

  const inputStyle = {
    width: '100%', padding: '10px 14px', fontSize: '14px',
    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
    color: 'var(--text-primary)', outline: 'none',
  }
  const labelStyle = {
    display: 'block' as const, fontSize: '11px', fontWeight: 600,
    letterSpacing: '2px', textTransform: 'uppercase' as const,
    color: 'var(--text-muted)', marginBottom: '6px',
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-6">
        <Link href="/requests" className="inline-flex items-center gap-2 text-sm mb-4 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F97316' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}>
          <ArrowLeft size={14} />Kembali
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold"
              style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-card)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <Printer size={13} />Print
            </button>
            <div className="px-3 py-1.5 text-xs font-semibold"
              style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
              {statusCfg.label}
            </div>
          </div>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="mb-6 p-4 overflow-x-auto"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center gap-0 min-w-max">
          {STATUS_STEPS.map((step, i) => {
            const done = currentStep > i
            const active = currentStep === i
            const isLast = i === STATUS_STEPS.length - 1
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: done ? '#22c55e' : active ? '#F97316' : 'var(--bg-secondary)',
                      color: done || active ? '#fff' : 'var(--text-muted)',
                      border: done ? 'none' : active ? 'none' : '1px solid var(--border-strong)',
                    }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className="text-xs whitespace-nowrap"
                    style={{ color: active ? '#F97316' : done ? '#22c55e' : 'var(--text-muted)' }}>
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div className="w-10 h-px mx-1 mb-4"
                    style={{ background: done ? '#22c55e' : 'var(--border-color)' }} />
                )}
              </div>
            )
          })}
        </div>
        {request.status === 'discrepancy' && (
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#ef4444' }}>
            <AlertCircle size={12} />
            Ada ketidaksesuaian barang — menunggu tindak lanjut Admin Pusat
          </p>
        )}
        {request.status === 'revision_requested' && (
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#F97316' }}>
            <RotateCcw size={12} />
            PM meminta revisi — Admin Proyek perlu update request
          </p>
        )}
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <User size={13} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Diminta oleh</span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{request.requestedByName}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tanggal</span>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {request.createdAt ? format(request.createdAt, 'd MMM yyyy, HH:mm', { locale: id }) : '—'}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Urgensi</span>
          </div>
          <p className="text-sm font-semibold uppercase"
            style={{ color: request.urgency === 'urgent' ? '#ef4444' : request.urgency === 'normal' ? '#F97316' : 'var(--text-muted)' }}>
            {request.urgency || '—'}
          </p>
        </div>
        {request.projectId && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <FolderOpen size={13} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Proyek</span>
            </div>
            <p className="text-sm font-semibold" style={{ color: '#F97316' }}>{projectName || request.projectId}</p>
          </div>
        )}
      </div>

      {/* PM Acknowledge info */}
      {request.pmAcknowledgedByName && (
        <div className="mb-4 px-4 py-3 flex items-center gap-3"
          style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <ThumbsUp size={16} style={{ color: '#38bdf8' }} />
          <p className="text-sm" style={{ color: '#0ea5e9' }}>
            Acknowledge oleh PM <strong>{request.pmAcknowledgedByName}</strong>
            {request.pmAcknowledgedAt && (
              <span style={{ color: '#38bdf8' }}> · {format(request.pmAcknowledgedAt, 'd MMM yyyy, HH:mm', { locale: id })}</span>
            )}
          </p>
        </div>
      )}

      {/* Catatan revisi PM */}
      {isRevisionRequested && request.pmRevisionNote && (
        <div className="mb-4 p-5"
          style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-2" style={{ color: '#F97316' }}>
            Catatan Revisi dari PM
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{request.pmRevisionNote}</p>
        </div>
      )}

      {/* Items */}
      <div className="mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Package size={16} style={{ color: '#F97316' }} />
            <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
              Daftar Barang ({request.items?.length} item)
            </span>
          </div>
        </div>
        {request.items?.map((item, index) => (
          <div key={index} className="px-5 py-4 flex items-center gap-4"
            style={{ borderBottom: index < (request.items?.length || 0) - 1 ? '1px solid var(--border-color)' : 'none' }}>
            <span className="font-mono text-sm w-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
              {item.notes && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{item.notes}</p>}
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono" style={{ color: '#F97316' }}>{item.quantity}</span>
              <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Foto */}
      {request.photos && request.photos.length > 0 && (
        <div className="mb-4 p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-3" style={{ color: 'var(--text-primary)' }}>
            Foto Referensi ({request.photos.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {request.photos.map((photo, index) => (
              <a key={index} href={photo.url} target="_blank" rel="noopener noreferrer"
                className="relative block" style={{ width: 80, height: 80 }}>
                <Image src={photo.url} alt={`Foto ${index + 1}`} fill className="object-cover"
                  style={{ border: '1px solid var(--border-color)' }} />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Alasan */}
      {request.reason && (
        <div className="mb-4 p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-3" style={{ color: 'var(--text-primary)' }}>Alasan Permintaan</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{request.reason}</p>
        </div>
      )}

      {/* Alasan penolakan */}
      {request.status === 'rejected' && request.rejectedReason && (
        <div className="mb-4 p-5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-2" style={{ color: '#ef4444' }}>Alasan Penolakan</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{request.rejectedReason}</p>
        </div>
      )}

      {/* Info PO */}
      {(request.status === 'po_issued' || request.status === 'on_delivery' || request.status === 'completed' || request.status === 'discrepancy') && request.poNumber && (
        <div className="mb-4 p-5" style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: '#a78bfa' }} />
            <p className="text-sm font-semibold tracking-wide" style={{ color: '#a78bfa' }}>Purchase Order</p>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Nomor PO: {request.poNumber}</p>
          {request.poNotes && <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{request.poNotes}</p>}
          {request.poFileUrl && (
            <a href={request.poFileUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold"
              style={{ color: '#a78bfa' }}>
              <ExternalLink size={12} />Lihat Dokumen PO
            </a>
          )}
          {request.poIssuedByName && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Diterbitkan oleh {request.poIssuedByName}</p>
          )}
        </div>
      )}

      {/* Laporan ketidaksesuaian */}
      {request.discrepancyNote && (
        <div className="mb-4 p-5" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-2" style={{ color: '#ef4444' }}>Laporan Ketidaksesuaian</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{request.discrepancyNote}</p>
          {request.discrepancyReportedByName && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Dilaporkan oleh {request.discrepancyReportedByName}</p>
          )}
        </div>
      )}

      {/* ══ TINDAKAN SECTION ══════════════════════════════════ */}

      {/* 1. PM: Acknowledge atau Minta Revisi */}
      {canPMAction && isPendingPM && (
        <div className="p-5 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-3" style={{ color: 'var(--text-primary)' }}>
            Tindakan PM
          </p>
          {!showRevisionForm ? (
            <div className="flex gap-3">
              <button onClick={handlePMAcknowledge} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <ThumbsUp size={15} />}
                Acknowledge & Teruskan
              </button>
              <button onClick={() => setShowRevisionForm(true)} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.3)' }}>
                <RotateCcw size={15} />Minta Revisi
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Jelaskan apa yang perlu direvisi oleh Admin Proyek:
              </p>
              <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="Contoh: Jumlah semen terlalu banyak, harap revisi menjadi 50 sak..."
                rows={3} style={{ ...inputStyle, resize: 'none' }} />
              <div className="flex gap-3">
                <button onClick={handlePMRevision} disabled={actionLoading}
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  style={{ background: '#F97316', color: '#fff' }}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Kirim Permintaan Revisi'}
                </button>
                <button onClick={() => setShowRevisionForm(false)}
                  className="px-4 py-2.5 text-sm"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Admin Pusat: Approve atau Reject */}
      {canAdminAction && isPendingAdmin && (
        <div className="p-5 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-4" style={{ color: 'var(--text-primary)' }}>
            Tindakan Admin Pusat
          </p>
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button onClick={handleApprove} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                Setujui Request
              </button>
              <button onClick={() => setShowRejectForm(true)} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                <XCircle size={15} />Tolak Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan..." rows={3}
                style={{ ...inputStyle, resize: 'none', border: '1px solid rgba(239,68,68,0.3)' }} />
              <div className="flex gap-3">
                <button onClick={handleReject} disabled={actionLoading}
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Konfirmasi Tolak'}
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

      {/* 3. Admin Pusat: Upload PO (setelah approve) */}
      {canAdminAction && (isApproved || showPOUpload) && !['po_issued','on_delivery','completed','discrepancy'].includes(request.status) && (
        <div className="mt-4 mb-4 p-5"
          style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} style={{ color: '#a78bfa' }} />
            <p className="text-sm font-semibold tracking-wide" style={{ color: '#a78bfa' }}>
              Terbitkan Purchase Order (PO)
            </p>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Request disetujui. Terbitkan PO — status akan otomatis berubah ke "Dalam Pengiriman" dan logistik akan dinotifikasi.
          </p>
          <div className="space-y-3">
            <div>
              <label style={labelStyle}>Nomor PO *</label>
              <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)}
                placeholder="PO-2026-001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Upload Dokumen PO / SPK (opsional)</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest cursor-pointer"
                  style={{ border: '1px solid var(--border-strong)', color: poFile ? '#a78bfa' : 'var(--text-secondary)', background: 'var(--bg-card)' }}>
                  <Upload size={13} />
                  {poFile ? poFile.name : 'Pilih File'}
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden"
                    onChange={(e) => setPoFile(e.target.files?.[0] || null)} />
                </label>
                {poFile && <button onClick={() => setPoFile(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Hapus</button>}
              </div>
              {uploading && (
                <div className="mt-2">
                  <div className="h-1 w-full" style={{ background: 'var(--border-color)' }}>
                    <div className="h-full" style={{ width: `${progress}%`, background: '#a78bfa' }} />
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Catatan untuk Logistik (opsional)</label>
              <textarea value={poNotes} onChange={(e) => setPoNotes(e.target.value)}
                placeholder="Supplier sudah dikonfirmasi, estimasi datang 3 hari kerja..." rows={2}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handleUploadPO} disabled={actionLoading || uploading || !poNumber.trim()}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                style={{ background: !poNumber.trim() ? 'rgba(167,139,250,0.3)' : '#a78bfa', color: '#fff', cursor: !poNumber.trim() ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? <><Loader2 size={14} className="animate-spin" />Memproses...</> : <><FileText size={14} />Terbitkan PO → On Delivery</>}
              </button>
              <button onClick={() => setShowPOUpload(false)} className="px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                Nanti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Logistik: Konfirmasi terima atau laporkan ketidaksesuaian */}
      {canLogistik && isOnDelivery && (
        <div className="p-5 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-sm font-semibold tracking-wide mb-3" style={{ color: 'var(--text-primary)' }}>
            Konfirmasi Penerimaan Barang
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Periksa kesesuaian barang yang datang dengan PO #{request.poNumber}
          </p>
          {!showDiscrepancyForm ? (
            <div className="flex gap-3">
              <button onClick={handleDeliveryComplete} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                Sesuai — Konfirmasi Selesai
              </button>
              <button onClick={() => setShowDiscrepancyForm(true)} disabled={actionLoading}
                className="flex-1 py-3 px-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertTriangle size={15} />Tidak Sesuai
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Jelaskan ketidaksesuaian barang dengan PO:
              </p>
              <textarea value={discrepancyNote} onChange={(e) => setDiscrepancyNote(e.target.value)}
                placeholder="Contoh: Semen yang datang 40 sak, bukan 50 sak sesuai PO. Tripleks ada 5 lembar yang rusak..."
                rows={3} style={{ ...inputStyle, resize: 'none', border: '1px solid rgba(239,68,68,0.3)' }} />
              <div className="flex gap-3">
                <button onClick={handleDiscrepancy} disabled={actionLoading}
                  className="flex-1 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : 'Kirim Laporan'}
                </button>
                <button onClick={() => setShowDiscrepancyForm(false)}
                  className="px-4 py-2.5 text-sm"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
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