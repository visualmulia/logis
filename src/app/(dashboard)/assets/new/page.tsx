'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Project } from '@/types'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewAssetPage() {
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [form, setForm] = useState({
    name: '',
    type: 'power_tool',
    serialNumber: '',
    condition: 'good',
    status: 'active',
    currentProjectId: '',
    isRented: false,
    operatingHours: 0,
    serviceIntervalHours: 500,
    purchasePrice: '',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !companyId) return

    setIsLoading(true)
    try {
      await addDoc(
        collection(db, 'logis_companies', companyId, 'assets'),
        {
          companyId,
          name: form.name.trim(),
          type: form.type,
          serialNumber: form.serialNumber.trim() || null,
          condition: form.condition,
          status: form.status,
          currentProjectId: form.currentProjectId || null,
          currentPicId: logisUser?.id || null,
          isRented: form.isRented,
          operatingHours: Number(form.operatingHours),
          serviceIntervalHours: Number(form.serviceIntervalHours),
          purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
          lastServiceDate: null,
          nextServiceDue: null,
          photos: [],
          createdAt: serverTimestamp(),
        }
      )

      toast.success(`${form.name} berhasil didaftarkan!`)
      router.push('/assets')
    } catch (error) {
      console.error(error)
      toast.error('Gagal mendaftarkan aset')
    } finally {
      setIsLoading(false)
    }
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
    marginBottom: '6px',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    background: 'var(--bg-primary)',
    border: '1px solid rgba(245,240,235,0.08)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/assets"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={12} />
          Kembali ke daftar aset
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#F97316' }}>
          Modul 03 — Aset Baru
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Daftarkan Aset
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="p-6 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}>
            Informasi Dasar
          </p>

          <div>
            <label style={labelStyle}>Nama Aset *</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="Genset Honda 5KVA, Mesin Las Lincoln, dll"
              style={inputStyle} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Jenis Aset</label>
              <select name="type" value={form.type} onChange={handleChange} style={selectStyle}>
                <option value="heavy_equipment" style={{ background: 'var(--bg-card)' }}>🏗️ Alat Berat</option>
                <option value="power_tool" style={{ background: 'var(--bg-card)' }}>🔧 Power Tool</option>
                <option value="scaffolding" style={{ background: 'var(--bg-card)' }}>🪜 Scaffolding</option>
                <option value="measuring" style={{ background: 'var(--bg-card)' }}>📐 Alat Ukur</option>
                <option value="vehicle" style={{ background: 'var(--bg-card)' }}>🚛 Kendaraan</option>
                <option value="other" style={{ background: 'var(--bg-card)' }}>📦 Lainnya</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nomor Seri (opsional)</label>
              <input name="serialNumber" value={form.serialNumber} onChange={handleChange}
                placeholder="SN-123456"
                style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Kondisi Saat Ini</label>
              <select name="condition" value={form.condition} onChange={handleChange} style={selectStyle}>
                <option value="good" style={{ background: 'var(--bg-card)' }}>✅ Baik</option>
                <option value="fair" style={{ background: 'var(--bg-card)' }}>⚠️ Cukup</option>
                <option value="poor" style={{ background: 'var(--bg-card)' }}>🔴 Buruk</option>
                <option value="damaged" style={{ background: 'var(--bg-card)' }}>❌ Rusak</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} style={selectStyle}>
                <option value="active" style={{ background: 'var(--bg-card)' }}>Aktif Dipakai</option>
                <option value="idle" style={{ background: 'var(--bg-card)' }}>Idle / Standby</option>
                <option value="maintenance" style={{ background: 'var(--bg-card)' }}>Dalam Servis</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="p-6 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}>
            Lokasi & Kepemilikan
          </p>

          <div>
            <label style={labelStyle}>Proyek Saat Ini</label>
            <select name="currentProjectId" value={form.currentProjectId}
              onChange={handleChange} style={selectStyle}>
              <option value="" style={{ background: 'var(--bg-card)' }}>— Di Gudang / Tidak di Proyek —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ background: 'var(--bg-card)' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRented"
              name="isRented"
              checked={form.isRented}
              onChange={handleChange}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="isRented" className="text-sm cursor-pointer"
              style={{ color: 'rgba(245,240,235,0.6)' }}>
              Aset ini adalah hasil sewa (bukan milik perusahaan)
            </label>
          </div>
        </div>

        {/* Service info */}
        <div className="p-6 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}>
            Info Servis & Pembelian
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Jam Operasi Saat Ini</label>
              <input type="number" name="operatingHours" value={form.operatingHours}
                onChange={handleChange} min="0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Interval Servis (jam)</label>
              <input type="number" name="serviceIntervalHours" value={form.serviceIntervalHours}
                onChange={handleChange} min="0" style={inputStyle} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Default: 500 jam
              </p>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Harga Beli / Sewa (Rp)</label>
            <input type="number" name="purchasePrice" value={form.purchasePrice}
              onChange={handleChange} placeholder="8000000"
              style={inputStyle} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isLoading}
            className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            style={{
              background: isLoading ? '#c45a0e' : '#F97316',
              color: '#0a0a0a',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}>
            {isLoading ? (
              <><Loader2 size={15} className="animate-spin" />Mendaftarkan...</>
            ) : 'Daftarkan Aset'}
          </button>
          <Link href="/assets"
            className="px-6 py-3 text-sm font-semibold flex items-center"
            style={{ border: '1px solid rgba(245,240,235,0.1)', color: 'var(--text-secondary)' }}>
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}
