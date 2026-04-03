'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection, addDoc, serverTimestamp, getDocs
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Project } from '@/types'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, AlertTriangle,
  Zap, ShoppingBag, ShoppingCart, Wallet
} from 'lucide-react'
import Link from 'next/link'
import { createNotification } from '@/lib/firebase/notifications'

const CATEGORIES = [
  { value: 'material_kecil', label: 'Material Kecil', sub: ['Baut & mur', 'Kawat', 'Klem', 'Lainnya'] },
  { value: 'operasional', label: 'Operasional Proyek', sub: ['BBM genset', 'BBM kendaraan operasional', 'Token listrik proyek', 'Air galon', 'Lainnya'] },
  { value: 'atk', label: 'ATK & Kantor Proyek', sub: ['Kertas & tinta', 'Alat tulis', 'Fotokopi', 'Lainnya'] },
  { value: 'konsumsi', label: 'Konsumsi Tim', sub: ['Makan lembur', 'Air minum', 'Lainnya'] },
  { value: 'operasional_umum', label: 'Operasional Umum', sub: ['Pengeluaran umum operasional'] },
  { value: 'lainnya', label: 'Lainnya', sub: ['Lainnya'] },
]

const MAX_REIMBURSEMENT = 2000000

export default function NewPettyCashPage() {
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [purchaseType, setPurchaseType] = useState<'cash' | 'reimbursement' | 'online'>('cash')
  const [form, setForm] = useState({
    projectId: '',
    category: 'material_kecil',
    subcategory: 'Lainnya',
    description: '',
    amount: '',
    isEmergency: false,
    emergencyApprovedBy: '',
    onlineUrl: '',
    onlinePlatform: 'shopee',
    notes: '',
  })

  useEffect(() => {
    if (!companyId) return
    getDocs(collection(db, 'logis_companies', companyId, 'projects')).then((snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)))
    })
  }, [companyId])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const target = e.target
    const value = target.type === 'checkbox'
      ? (target as HTMLInputElement).checked
      : target.value
    setForm({ ...form, [target.name]: value })
  }

  function detectAnomaly(amount: number, category: string): {
    flag: boolean; reason: string
  } {
    if (amount > 1500000 && category === 'operasional_umum') {
      return { flag: true, reason: 'Nominal operasional umum melebihi Rp 1.500.000' }
    }
    if (purchaseType === 'reimbursement' && amount > MAX_REIMBURSEMENT) {
      return { flag: true, reason: `Reimbursement melebihi batas Rp ${MAX_REIMBURSEMENT.toLocaleString('id-ID')}` }
    }
    return { flag: false, reason: '' }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.description.trim()) {
      toast.error('Deskripsi pengeluaran wajib diisi')
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Nominal harus lebih dari 0')
      return
    }
    if (!form.projectId) {
      toast.error('Pilih proyek terlebih dahulu')
      return
    }
    if (form.isEmergency && !form.emergencyApprovedBy.trim()) {
      toast.error('Nama PM yang mengizinkan wajib diisi untuk pembelian darurat')
      return
    }
    if (!companyId || !logisUser) return

    const amount = Number(form.amount)
    const anomaly = detectAnomaly(amount, form.category)

    setIsLoading(true)
    try {
      await addDoc(
        collection(db, 'logis_companies', companyId, 'petty_cash'),
        {
          companyId,
          projectId: form.projectId,
          requestedBy: logisUser.name,
          requestedById: logisUser.id,
          category: CATEGORIES.find((c) => c.value === form.category)?.label || form.category,
          subcategory: form.subcategory,
          description: form.description.trim(),
          amount,
          purchaseType,
          isEmergency: form.isEmergency,
          emergencyApprovedBy: form.isEmergency ? form.emergencyApprovedBy.trim() : null,
          onlineUrl: purchaseType === 'online' ? form.onlineUrl.trim() : null,
          onlinePlatform: purchaseType === 'online' ? form.onlinePlatform : null,
          status: 'pending_approval',
          receipts: [],
          anomalyFlag: anomaly.flag,
          anomalyReason: anomaly.reason || null,
          notes: form.notes.trim() || null,
          createdAt: serverTimestamp(),
        }
      )

      // Setelah addDoc berhasil:
await createNotification({
  companyId,
  type: 'petty_cash_new',
  title: 'Request Petty Cash Baru 💰',
  message: `${logisUser.name} mengajukan ${new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)} untuk ${form.description}`,
  href: '/petty-cash',
  createdBy: logisUser.id,
  createdByName: logisUser.name,
  targetRoles: ['owner', 'admin', 'pm'],
})

      if (anomaly.flag) {
        toast.warning('Request berhasil dikirim — tapi terdeteksi anomali. Kantor akan review lebih ketat.')
      } else {
        toast.success('Request petty cash berhasil dikirim!')
      }

      router.push('/petty-cash')
    } catch (error) {
      console.error(error)
      toast.error('Gagal mengirim request')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedCategory = CATEGORIES.find((c) => c.value === form.category)

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,240,235,0.4)',
    marginBottom: '6px',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    background: '#0a0a0a',
    border: '1px solid rgba(245,240,235,0.08)',
    color: '#f5f0eb',
    outline: 'none',
  }

  const currentAmount = Number(form.amount) || 0
  const anomaly = detectAnomaly(currentAmount, form.category)

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
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#F97316' }}>
          Petty Cash — Request Baru
        </p>
        <h1 className="text-2xl font-bold" style={{ color: '#f5f0eb' }}>
          Request Kas Lapangan
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Purchase type */}
<div className="p-6"
  style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
  <label style={labelStyle}>Jenis Pembelian</label>
  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2">
    {[
      {
        key: 'cash',
        label: 'Pakai Kas',
        desc: 'Dari dana kas proyek',
        icon: <ShoppingBag size={16} />,
      },
      {
        key: 'reimbursement',
        label: 'Reimburse',
        desc: `Bayar dulu, klaim balik (maks ${(MAX_REIMBURSEMENT/1000000).toFixed(1)}jt)`,
        icon: <Wallet size={16} />,
      },
      {
        key: 'online',
        label: 'Beli Online',
        desc: 'Shopee, Tokopedia, dll',
        icon: <ShoppingCart size={16} />,
      },
    ].map((opt) => (
      <button key={opt.key} type="button"
        onClick={() => setPurchaseType(opt.key as typeof purchaseType)}
        className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 p-3 text-left transition-all"
        style={{
          background: purchaseType === opt.key
            ? 'rgba(249,115,22,0.1)'
            : 'transparent',
          border: purchaseType === opt.key
            ? '1px solid rgba(249,115,22,0.3)'
            : '1px solid rgba(245,240,235,0.08)',
          color: purchaseType === opt.key
            ? '#F97316'
            : 'rgba(245,240,235,0.4)',
        }}>
        <div className="shrink-0">{opt.icon}</div>
        <div>
          <div className="text-sm font-semibold">{opt.label}</div>
          <div className="text-xs mt-0.5 opacity-60 leading-tight">{opt.desc}</div>
        </div>
      </button>
    ))}
  </div>

          {/* Online URL input */}
          {purchaseType === 'online' && (
            <div className="mt-4 space-y-3">
              <div>
                <label style={labelStyle}>Platform</label>
                <select name="onlinePlatform" value={form.onlinePlatform}
                  onChange={handleChange}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  {['shopee', 'tokopedia', 'blibli', 'lazada', 'other'].map((p) => (
                    <option key={p} value={p} style={{ background: '#111' }}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Link Produk (wajib)</label>
                <input name="onlineUrl" value={form.onlineUrl}
                  onChange={handleChange}
                  placeholder="https://shopee.co.id/produk-xxx"
                  style={inputStyle} required={purchaseType === 'online'} />
                <p className="text-xs mt-1" style={{ color: 'rgba(245,240,235,0.2)' }}>
                  Link digunakan untuk verifikasi harga oleh kantor
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Project & Category */}
        <div className="p-6 space-y-4"
          style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>

          <div>
            <label style={labelStyle}>Proyek *</label>
            <select name="projectId" value={form.projectId}
              onChange={handleChange}
              style={{ ...inputStyle, cursor: 'pointer' }} required>
              <option value="" style={{ background: '#111' }}>— Pilih Proyek —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#111' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Kategori</label>
              <select name="category" value={form.category}
                onChange={(e) => {
                  const cat = CATEGORIES.find((c) => c.value === e.target.value)
                  setForm({
                    ...form,
                    category: e.target.value,
                    subcategory: cat?.sub[0] || 'Lainnya',
                  })
                }}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} style={{ background: '#111' }}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sub-kategori</label>
              <select name="subcategory" value={form.subcategory}
                onChange={handleChange}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {selectedCategory?.sub.map((s) => (
                  <option key={s} value={s} style={{ background: '#111' }}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Deskripsi Pengeluaran *</label>
            <input name="description" value={form.description}
              onChange={handleChange}
              placeholder="Beli kawat bendrat 10kg untuk zona A, Token listrik direksi keet, dll"
              style={inputStyle} required />
          </div>

          <div>
            <label style={labelStyle}>Nominal (Rp) *</label>
            <input type="number" name="amount" value={form.amount}
              onChange={handleChange}
              placeholder="250000"
              min="1"
              style={inputStyle} required />

            {/* Anomaly warning — real time */}
            {currentAmount > 0 && anomaly.flag && (
              <div className="flex items-start gap-2 mt-2 p-3"
                style={{
                  background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                <AlertTriangle size={13}
                  style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>
                  ⚠️ {anomaly.reason} — request akan di-flag untuk review lebih ketat oleh kantor.
                </p>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Catatan Tambahan (opsional)</label>
            <textarea name="notes" value={form.notes} onChange={handleChange}
              placeholder="Info tambahan yang perlu diketahui kantor..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {/* Emergency toggle */}
        <div className="p-6"
          style={{ background: '#111111', border: '1px solid rgba(245,240,235,0.06)' }}>
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="isEmergency" name="isEmergency"
              checked={form.isEmergency}
              onChange={handleChange}
              className="w-4 h-4 accent-orange-500" />
            <label htmlFor="isEmergency" className="text-sm cursor-pointer font-semibold"
              style={{ color: form.isEmergency ? '#ef4444' : 'rgba(245,240,235,0.6)' }}>
              <Zap size={13} className="inline mr-1" />
              Pembelian Darurat (PM sudah izinkan secara lisan)
            </label>
          </div>

          {form.isEmergency && (
            <div>
              <label style={labelStyle}>Nama PM yang Mengizinkan *</label>
              <input name="emergencyApprovedBy" value={form.emergencyApprovedBy}
                onChange={handleChange}
                placeholder="Nama Project Manager yang memberi izin"
                style={{
                  ...inputStyle,
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
                required={form.isEmergency} />
              <p className="text-xs mt-1" style={{ color: 'rgba(239,68,68,0.5)' }}>
                Sistem akan mengirim notifikasi ke PM untuk konfirmasi
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={isLoading}
            className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            style={{
              background: isLoading ? '#c45a0e' : '#F97316',
              color: '#0a0a0a',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}>
            {isLoading ? (
              <><Loader2 size={15} className="animate-spin" />Mengirim...</>
            ) : 'Kirim Request'}
          </button>
          <Link href="/petty-cash"
            className="px-6 py-3 text-sm font-semibold flex items-center"
            style={{ border: '1px solid rgba(245,240,235,0.1)', color: 'rgba(245,240,235,0.4)' }}>
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}