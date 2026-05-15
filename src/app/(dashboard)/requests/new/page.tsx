'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { createNotification } from '@/lib/firebase/notifications'
import PhotoUpload from '@/components/shared/PhotoUpload'
import { getDocs } from 'firebase/firestore'
import { Project } from '@/types'


interface RequestItem {
  name: string
  quantity: number
  unit: string
  notes: string
}

const UNITS = ['pcs', 'kg', 'ton', 'sak', 'liter', 'm', 'm²', 'm³', 'batang', 'lembar', 'roll', 'set', 'unit', 'dus', 'lusin']

export default function NewRequestPage() {
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [urgency, setUrgency] = useState<'normal' | 'urgent' | 'low'>('normal')
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<RequestItem[]>([
    { name: '', quantity: 1, unit: 'pcs', notes: '' },
  ])
  const [photos, setPhotos] = useState<{ url: string; path: string; name: string }[]>([])
  const [projects, setProjects] = useState<Project[]>([])
const [selectedProjectId, setSelectedProjectId] = useState('')

// Fetch projects
useEffect(() => {
  if (!companyId) return
  getDocs(collection(db, 'logis_companies', companyId, 'projects')).then((snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project))
    setProjects(data)
    // Auto-select kalau user punya assigned project
    if (logisUser?.assignedProjectId) {
      setSelectedProjectId(logisUser.assignedProjectId)
    }
  })
}, [companyId, logisUser])

  function addItem() {
    setItems([...items, { name: '', quantity: 1, unit: 'pcs', notes: '' }])
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof RequestItem, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validasi
    const emptyItems = items.filter((i) => !i.name.trim())
    if (emptyItems.length > 0) {
      toast.error('Nama barang tidak boleh kosong')
      return
    }
    if (!reason.trim()) {
      toast.error('Alasan permintaan wajib diisi')
      return
    }

    if (!companyId || !logisUser) return

    setIsLoading(true)
    try {
      await addDoc(
        collection(db, 'logis_companies', companyId, 'requests'),
        {
          companyId,
          projectId: selectedProjectId,
          requestedBy: logisUser.id,
          requestedByName: logisUser.name,
          items: items.map((i) => ({
            name: i.name.trim(),
            quantity: Number(i.quantity),
            unit: i.unit,
            notes: i.notes.trim(),
          })),
          urgency,
          reason: reason.trim(),
          status: 'submitted',
          photos: photos.map((p) => ({ url: p.url, path: p.path })),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      )

      // Trigger notifikasi ke admin/pm/owner
await createNotification({
  companyId,
  type: 'request_new',
  title: 'Request Material Baru',
  message: `${logisUser.name} mengajukan ${items.length} item — ${items.map(i => i.name).join(', ')}`,
  href: '/requests',
  createdBy: logisUser.id,
  createdByName: logisUser.name,
  targetRoles: ['owner', 'admin', 'pm'],
})

      toast.success('Request berhasil dikirim!')
      router.push('/requests')
    } catch (error) {
      console.error(error)
      toast.error('Gagal mengirim request. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const labelStyle = {
  display: 'block' as const,
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.025em',
  color: 'var(--text-secondary)',
  marginBottom: '8px',
}

  const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  outline: 'none',
}

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/requests"
          className="inline-flex items-center gap-2 text-xs mb-4 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft size={12} />
          Kembali ke daftar request
        </Link>
        <p
          className="text-sm font-semibold tracking-wide mb-1"
          style={{ color: '#F97316' }}
        >
          Modul 01 — Request Baru
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Buat Request Material
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Urgency */}
        <div
          className="p-6"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          {/* Proyek */}
<div className="p-6"
  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
  <label style={labelStyle}>Proyek *</label>
  <select
    value={selectedProjectId}
    onChange={(e) => setSelectedProjectId(e.target.value)}
    style={{ ...inputStyle, cursor: 'pointer' }}
    required
  >
    <option value="" style={{ background: 'var(--bg-card)' }}>— Pilih Proyek —</option>
    {projects.map((p) => (
      <option key={p.id} value={p.id} style={{ background: 'var(--bg-card)' }}>
        {p.name}
      </option>
    ))}
  </select>
</div>
          <label style={labelStyle}>Tingkat Urgensi</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'low', label: 'Tidak Mendesak', desc: 'Bisa tunggu 3+ hari' },
              { key: 'normal', label: 'Normal', desc: 'Butuh dalam 1-2 hari' },
              { key: 'urgent', label: '⚡ Urgent', desc: 'Butuh hari ini' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setUrgency(opt.key as typeof urgency)}
                className="p-3 text-left transition-all"
                style={{
  background:
    urgency === opt.key
      ? opt.key === 'urgent'
        ? 'rgba(239,68,68,0.1)'
        : 'rgba(249,115,22,0.1)'
      : 'var(--bg-secondary)',
  border:
    urgency === opt.key
      ? opt.key === 'urgent'
        ? '1px solid rgba(239,68,68,0.4)'
        : '1px solid rgba(249,115,22,0.3)'
      : '1px solid var(--border-strong)',
  color:
    urgency === opt.key
      ? opt.key === 'urgent'
        ? '#ef4444'
        : '#F97316'
      : 'var(--text-secondary)',
}}
              >
                <div className="text-sm font-semibold">{opt.label}</div>
                <div className="text-xs mt-0.5 opacity-60">{opt.desc}</div>
              </button>
            ))}
          </div>

          {urgency === 'urgent' && (
            <div
              className="flex items-start gap-2 mt-3 p-3"
              style={{
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
}}
            >
              <AlertTriangle size={13} style={{ color: '#ef4444', marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>
                Request urgent akan dinotifikasi ke kantor segera. Pastikan benar-benar mendesak.
              </p>
            </div>
          )}
        </div>

        {/* Items */}
        <div
          className="p-6"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Daftar Barang yang Diminta
            </label>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 transition-all"
              style={{
                color: '#F97316',
                border: '1px solid rgba(249,115,22,0.3)',
                background: 'rgba(249,115,22,0.05)',
              }}
            >
              <Plus size={11} />
              Tambah Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-4"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-mono w-5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="flex-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Item ke-{index + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1 transition-colors"
                      style={{ color: 'rgba(239,68,68,0.4)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-2">
                  {/* Nama barang */}
                  <div className="col-span-6">
                    <label style={labelStyle}>Nama Barang</label>
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder="Semen Portland, Besi D13, dll"
                      style={inputStyle}
                      required
                    />
                  </div>
                  {/* Quantity */}
                  <div className="col-span-3">
                    <label style={labelStyle}>Jumlah</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>
                  {/* Unit */}
                  <div className="col-span-3">
                    <label style={labelStyle}>Satuan</label>
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u} style={{ background: 'var(--bg-card)' }}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Notes */}
                  <div className="col-span-12">
                    <label style={labelStyle}>Catatan (opsional)</label>
                    <input
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="Spesifikasi khusus, merk, dll"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Foto referensi */}
<div
  className="p-6"
  style={{
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)',
  }}
>
  <PhotoUpload
    companyId={companyId || ''}
    folder="requests"
    documentId={`draft-${Date.now()}`}
    onPhotosChange={setPhotos}
    maxPhotos={5}
    label="Foto Referensi Material (opsional)"
  />
</div>
        {/* Reason */}
        <div
          className="p-6"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)',
          }}
        >
          <label style={labelStyle}>Alasan Permintaan</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan untuk kebutuhan apa barang ini, dan mengapa perlu dipesan sekarang..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            required
          />
          <p
            className="text-xs mt-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Alasan yang jelas membantu kantor approve lebih cepat.
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            style={{
              background: isLoading ? '#c45a0e' : '#F97316',
              color: '#0a0a0a',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Mengirim...
              </>
            ) : (
              'Kirim Request'
            )}
          </button>
          <Link
            href="/requests"
            className="px-6 py-3 text-sm font-semibold transition-all flex items-center"
            style={{
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-card)',
            }}
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}
