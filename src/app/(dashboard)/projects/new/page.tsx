'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    location: '',
    budgetTotal: '',
    startDate: '',
    endDate: '',
    description: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId || !logisUser) return
    if (!form.name.trim() || !form.startDate) {
      toast.error('Nama proyek dan tanggal mulai wajib diisi')
      return
    }

    setIsLoading(true)
    try {
      await addDoc(
        collection(db, 'logis_companies', companyId, 'projects'),
        {
          companyId,
          name: form.name.trim(),
          location: form.location.trim(),
          description: form.description.trim(),
          budgetTotal: form.budgetTotal ? Number(form.budgetTotal) : 0,
          budgetUsed: 0,
          progressPercent: 0,
          status: 'active',
          healthScore: 'healthy',
          pmId: logisUser.id,
          startDate: form.startDate
            ? Timestamp.fromDate(new Date(form.startDate))
            : null,
          endDate: form.endDate
            ? Timestamp.fromDate(new Date(form.endDate))
            : null,
          createdAt: serverTimestamp(),
        }
      )

      toast.success('Proyek berhasil dibuat!')
      router.push('/projects')
    } catch (error) {
      console.error(error)
      toast.error('Gagal membuat proyek')
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
    marginBottom: '8px',
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

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/projects"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={12} />
          Kembali ke daftar proyek
        </Link>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#F97316' }}>
          Proyek Baru
        </p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Daftarkan Proyek
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="p-6 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div>
            <label style={labelStyle}>Nama Proyek *</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="Gedung Perkantoran Gatsu, Apartemen Tower B, dll"
              style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Lokasi</label>
            <input name="location" value={form.location} onChange={handleChange}
              placeholder="Jl. Gatot Subroto No.1, Jakarta Selatan"
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Deskripsi (opsional)</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              placeholder="Keterangan tambahan tentang proyek ini..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>

        {/* Dates & budget */}
        <div className="p-6 space-y-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Tanggal Mulai *</label>
              <input type="date" name="startDate" value={form.startDate}
                onChange={handleChange}
                style={{ ...inputStyle, colorScheme: 'dark' }} required />
            </div>
            <div>
              <label style={labelStyle}>Target Selesai</label>
              <input type="date" name="endDate" value={form.endDate}
                onChange={handleChange}
                style={{ ...inputStyle, colorScheme: 'dark' }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Budget Total (Rp)</label>
            <input type="number" name="budgetTotal" value={form.budgetTotal}
              onChange={handleChange}
              placeholder="5000000000"
              style={inputStyle} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Opsional — bisa diisi nanti
            </p>
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
              <><Loader2 size={15} className="animate-spin" />Menyimpan...</>
            ) : 'Buat Proyek'}
          </button>
          <Link href="/projects"
            className="px-6 py-3 text-sm font-semibold flex items-center"
            style={{ border: '1px solid rgba(245,240,235,0.1)', color: 'var(--text-secondary)' }}>
            Batal
          </Link>
        </div>
      </form>
    </div>
  )
}
