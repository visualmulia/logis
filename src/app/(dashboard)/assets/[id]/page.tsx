'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Asset, Project } from '@/types'
import { toast } from 'sonner'
import {
  ArrowLeft, Wrench, MapPin, Clock,
  AlertTriangle, Loader2, CheckCircle,
  Edit3, Save, X
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const statusOptions = [
  { value: 'active', label: '✅ Aktif Dipakai', color: '#22c55e' },
  { value: 'idle', label: '⏸ Idle / Standby', color: '#eab308' },
  { value: 'maintenance', label: '🔧 Dalam Servis', color: '#38bdf8' },
  { value: 'lost', label: '❌ Hilang', color: '#ef4444' },
  { value: 'retired', label: '🗄 Pensiun', color: 'var(--text-muted)' },
]

const conditionOptions = [
  { value: 'good', label: '✅ Baik', color: '#22c55e' },
  { value: 'fair', label: '⚠️ Cukup', color: '#eab308' },
  { value: 'poor', label: '🔴 Buruk', color: '#ef4444' },
  { value: 'damaged', label: '❌ Rusak', color: '#ef4444' },
]

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const assetId = params.id as string

  const [asset, setAsset] = useState<Asset | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    status: '',
    condition: '',
    currentProjectId: '',
    operatingHours: 0,
  })

  useEffect(() => {
    if (!companyId || !assetId) return

    async function load() {
      const snap = await getDoc(
        doc(db, 'logis_companies', companyId!, 'assets', assetId)
      )
      if (snap.exists()) {
        const data = {
          id: snap.id,
          ...snap.data(),
          lastServiceDate: snap.data().lastServiceDate?.toDate(),
          nextServiceDue: snap.data().nextServiceDue?.toDate(),
          createdAt: snap.data().createdAt?.toDate(),
        } as Asset
        setAsset(data)
        setEditForm({
          status: data.status,
          condition: data.condition,
          currentProjectId: data.currentProjectId || '',
          operatingHours: data.operatingHours,
        })
      }

      const projSnap = await getDocs(
        collection(db, 'logis_companies', companyId!, 'projects')
      )
      setProjects(projSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)))
      setLoading(false)
    }

    load()
  }, [companyId, assetId])

  async function handleSave() {
    if (!companyId || !assetId || !asset) return
    setSaving(true)
    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'assets', assetId),
        {
          status: editForm.status,
          condition: editForm.condition,
          currentProjectId: editForm.currentProjectId || null,
          operatingHours: Number(editForm.operatingHours),
          updatedAt: serverTimestamp(),
        }
      )
      setAsset({
        ...asset,
        status: editForm.status as Asset['status'],
        condition: editForm.condition as Asset['condition'],
        currentProjectId: editForm.currentProjectId || null,
        operatingHours: Number(editForm.operatingHours),
      })
      toast.success('Aset berhasil diupdate')
      setEditing(false)
    } catch {
      toast.error('Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  async function markAsLost() {
    if (!companyId || !assetId) return
    if (!confirm('Tandai aset ini sebagai HILANG? Tindakan ini akan dicatat.')) return

    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'assets', assetId),
        {
          status: 'lost',
          currentProjectId: null,
          updatedAt: serverTimestamp(),
        }
      )
      toast.error(`${asset?.name} ditandai hilang`)
      router.push('/assets')
    } catch {
      toast.error('Gagal mengupdate status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="p-8" style={{ color: 'var(--text-muted)' }}>
        Aset tidak ditemukan
      </div>
    )
  }

  const currentProject = projects.find((p) => p.id === asset.currentProjectId)
  const isServiceDue = asset.nextServiceDue && new Date() >= asset.nextServiceDue

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    background: 'var(--bg-primary)',
    border: '1px solid rgba(245,240,235,0.1)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/assets"
          className="inline-flex items-center gap-2 text-sm mb-4 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F97316' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}>
          <ArrowLeft size={14} />
          Semua Aset
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-mono mb-1"
              style={{ color: 'var(--text-secondary)' }}>
              #{asset.id.slice(-6).toUpperCase()}
              {asset.serialNumber && ` · SN: ${asset.serialNumber}`}
            </p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {asset.name}
            </h1>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                style={{ border: '1px solid var(--border-strong)', color: 'var(--text-secondary)', background: 'var(--bg-card)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <Edit3 size={12} />
                Edit
              </button>
            ) : (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                  style={{ background: '#F97316', color: '#fff' }}>
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Simpan
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-2"
                  style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Service due alert */}
      {isServiceDue && (
        <div className="flex items-center gap-3 p-4 mb-6"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <AlertTriangle size={18} style={{ color: '#eab308' }} />
          <p className="text-sm font-semibold" style={{ color: '#ca8a04' }}>
            Jadwal servis sudah terlewat — segera lakukan perawatan
          </p>
        </div>
      )}

      {/* Status & condition */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-xs font-medium tracking-wide mb-3"
            style={{ color: 'var(--text-secondary)' }}>
            Status
          </p>
          {editing ? (
            <select value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              style={inputStyle}>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value} style={{ background: 'var(--bg-card)' }}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold px-3 py-1.5 inline-block"
              style={{
                background: statusOptions.find((s) => s.value === asset.status)?.color + '15' || 'transparent',
                color: statusOptions.find((s) => s.value === asset.status)?.color || '#f5f0eb',
              }}>
              {statusOptions.find((s) => s.value === asset.status)?.label}
            </span>
          )}
        </div>

        <div className="p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-xs font-medium tracking-wide mb-3"
            style={{ color: 'var(--text-secondary)' }}>
            Kondisi
          </p>
          {editing ? (
            <select value={editForm.condition}
              onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
              style={inputStyle}>
              {conditionOptions.map((c) => (
                <option key={c.value} value={c.value} style={{ background: 'var(--bg-card)' }}>
                  {c.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold"
              style={{ color: conditionOptions.find((c) => c.value === asset.condition)?.color || '#f5f0eb' }}>
              {conditionOptions.find((c) => c.value === asset.condition)?.label}
            </span>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={14} style={{ color: '#F97316' }} />
          <p className="text-xs font-medium tracking-wide"
            style={{ color: 'var(--text-secondary)' }}>
            Lokasi Sekarang
          </p>
        </div>
        {editing ? (
          <select value={editForm.currentProjectId}
            onChange={(e) => setEditForm({ ...editForm, currentProjectId: e.target.value })}
            style={inputStyle}>
            <option value="" style={{ background: 'var(--bg-card)' }}>— Di Gudang / Tidak di Proyek —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} style={{ background: 'var(--bg-card)' }}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {currentProject
              ? `📍 ${currentProject.name}`
              : '🏠 Di Gudang / Tidak di Proyek'}
          </p>
        )}
      </div>

      {/* Service info */}
      <div className="p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Wrench size={14} style={{ color: '#F97316' }} />
          <p className="text-xs font-medium tracking-wide"
            style={{ color: 'var(--text-secondary)' }}>
            Info Servis
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Jam Operasi
            </p>
            {editing ? (
              <input type="number" value={editForm.operatingHours}
                onChange={(e) => setEditForm({ ...editForm, operatingHours: Number(e.target.value) })}
                style={{ ...inputStyle, padding: '6px 10px' }} />
            ) : (
              <p className="text-xl font-black font-mono" style={{ color: '#F97316' }}>
                {asset.operatingHours}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>
                  jam
                </span>
              </p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Interval Servis
            </p>
            <p className="text-xl font-black font-mono" style={{ color: 'var(--text-primary)' }}>
              {asset.serviceIntervalHours}
              <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-secondary)' }}>
                jam
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Servis Terakhir
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {asset.lastServiceDate
                ? format(asset.lastServiceDate, 'd MMM yyyy', { locale: id })
                : 'Belum pernah'}
            </p>
          </div>
        </div>

        {/* Service progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1"
            style={{ color: 'var(--text-secondary)' }}>
            <span>Progress ke servis berikutnya</span>
            <span style={{ color: isServiceDue ? '#ef4444' : '#F97316', fontWeight: 600 }}>
              {Math.min(Math.round((asset.operatingHours / asset.serviceIntervalHours) * 100), 100)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full" style={{ background: 'var(--border-color)' }}>
            <div
              className="h-full transition-all rounded-full"
              style={{
                width: `${Math.min((asset.operatingHours / asset.serviceIntervalHours) * 100, 100)}%`,
                background: isServiceDue ? '#ef4444' : '#F97316',
              }}
            />
          </div>
        </div>
      </div>

      {/* Danger zone */}
      {asset.status !== 'lost' && (
        <div className="p-5"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <p className="text-xs font-semibold tracking-wide mb-3"
            style={{ color: '#ef4444' }}>
            Zona Bahaya
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Tandai Sebagai Hilang
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Tindakan ini akan dicatat dan tidak bisa di-undo secara otomatis
              </p>
            </div>
            <button onClick={markAsLost}
              className="px-4 py-2 text-xs font-bold flex-shrink-0"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)',
              }}>
              Tandai Hilang
            </button>
          </div>
        </div>
      )}

      {asset.status === 'lost' && (
        <div className="p-5"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center gap-3">
            <X size={20} style={{ color: '#ef4444' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
                Aset ini ditandai HILANG
              </p>
              <p className="text-sm mt-0.5" style={{ color: '#dc2626' }}>
                Hubungi tim lapangan untuk investigasi lebih lanjut
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}