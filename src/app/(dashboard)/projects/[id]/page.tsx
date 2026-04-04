'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  doc, getDoc, updateDoc,
  serverTimestamp, arrayUnion
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Project } from '@/types'
import { toast } from 'sonner'
import {
  ArrowLeft, Loader2, TrendingUp,
  Clock, CheckCircle, AlertTriangle,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { createNotification } from '@/lib/firebase/notifications'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { companyId, logisUser } = useAuth()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newPercent, setNewPercent] = useState(0)
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)

  const canUpdate = ['owner', 'admin', 'pm', 'supervisor'].includes(
    logisUser?.role || ''
  )

  useEffect(() => {
    if (!companyId || !projectId) return

    getDoc(doc(db, 'logis_companies', companyId, 'projects', projectId))
      .then((snap) => {
        if (snap.exists()) {
          const data = {
            id: snap.id,
            ...snap.data(),
            startDate: snap.data().startDate?.toDate(),
            endDate: snap.data().endDate?.toDate(),
            createdAt: snap.data().createdAt?.toDate(),
            progressHistory: snap.data().progressHistory?.map((h: {
              percent: number
              note: string
              updatedBy: string
              updatedByName: string
              updatedAt: { toDate: () => Date }
            }) => ({
              ...h,
              updatedAt: h.updatedAt?.toDate?.() || new Date(),
            })) || [],
          } as Project
          setProject(data)
          setNewPercent(data.progressPercent || 0)
        }
        setLoading(false)
      })
  }, [companyId, projectId])

  async function handleUpdateProgress(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId || !logisUser || !project) return

    if (newPercent < (project.progressPercent || 0)) {
      toast.error('Progress tidak bisa mundur dari nilai sebelumnya')
      return
    }

    setSaving(true)
    try {
      const historyEntry = {
        percent: newPercent,
        note: note.trim() || `Progress diupdate ke ${newPercent}%`,
        updatedBy: logisUser.id,
        updatedByName: logisUser.name,
        updatedAt: new Date(),
      }

      await updateDoc(
        doc(db, 'logis_companies', companyId, 'projects', projectId),
        {
          progressPercent: newPercent,
          progressHistory: arrayUnion({
            ...historyEntry,
            updatedAt: serverTimestamp(),
          }),
          status: newPercent >= 100 ? 'completed' : 'active',
          updatedAt: serverTimestamp(),
        }
      )

      // Notifikasi ke owner/admin
      await createNotification({
        companyId,
        type: 'request_new',
        title: `Progress ${project.name} — ${newPercent}%`,
        message: `${logisUser.name} mengupdate progress ke ${newPercent}%. ${note.trim() ? `"${note.trim()}"` : ''}`,
        href: `/projects/${projectId}`,
        createdBy: logisUser.id,
        createdByName: logisUser.name,
        targetRoles: ['owner', 'admin'],
      })

      toast.success(
        newPercent >= 100
          ? '🎉 Proyek selesai 100%!'
          : `Progress diupdate ke ${newPercent}%`
      )

      // Update local state
      setProject({
        ...project,
        progressPercent: newPercent,
        status: newPercent >= 100 ? 'completed' : 'active',
        progressHistory: [
          ...(project.progressHistory || []),
          historyEntry,
        ],
      })
      setNote('')
      setShowForm(false)
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengupdate progress')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8" style={{ color: 'var(--text-muted)' }}>
        Proyek tidak ditemukan
      </div>
    )
  }

  const progress = project.progressPercent || 0
  const isCompleted = project.status === 'completed'
  const history = [...(project.progressHistory || [])].reverse()

  return (
    <div className="p-4 lg:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/projects"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={12} />
          Semua Proyek
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: '#F97316' }}>
              Detail Proyek
            </p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </h1>
            {project.location && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                📍 {project.location}
              </p>
            )}
          </div>
          <span
            className="text-xs px-3 py-1.5 font-semibold uppercase tracking-widest flex-shrink-0"
            style={{
              background: isCompleted
                ? 'rgba(34,197,94,0.1)'
                : 'rgba(249,115,22,0.1)',
              color: isCompleted ? '#22c55e' : '#F97316',
              border: isCompleted
                ? '1px solid rgba(34,197,94,0.3)'
                : '1px solid rgba(249,115,22,0.3)',
            }}
          >
            {isCompleted ? '✅ Selesai' : '🔨 Aktif'}
          </span>
        </div>
      </div>

      {/* Progress card */}
      <div className="p-6 mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-muted)' }}>
            <TrendingUp size={12} className="inline mr-1" />
            Progress Keseluruhan
          </p>
          <span className="text-3xl font-black font-mono"
            style={{ color: progress >= 100 ? '#22c55e' : '#F97316' }}>
            {progress}%
          </span>
        </div>

        {/* Progress bar besar */}
        <div className="h-4 w-full mb-4 overflow-hidden"
          style={{ background: 'rgba(245,240,235,0.06)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? '#22c55e'
                : progress >= 75
                ? '#F97316'
                : progress >= 50
                ? '#eab308'
                : '#F97316',
            }}
          />
        </div>

        {/* Milestone markers */}
        <div className="flex justify-between text-xs"
          style={{ color: 'var(--text-muted)' }}>
          {[0, 25, 50, 75, 100].map((m) => (
            <span key={m}
              style={{ color: progress >= m ? 'rgba(245,240,235,0.5)' : 'rgba(245,240,235,0.15)' }}>
              {m}%
            </span>
          ))}
        </div>

        {/* Update button */}
        {canUpdate && !isCompleted && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full mt-5 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            style={{ background: '#F97316', color: '#0a0a0a' }}
          >
            <TrendingUp size={15} />
            Update Progress
          </button>
        )}

        {/* Update form */}
        {showForm && !isCompleted && (
          <form onSubmit={handleUpdateProgress} className="mt-5 space-y-4">
            <div
              className="p-4"
              style={{ background: 'var(--bg-primary)', border: '1px solid rgba(245,240,235,0.08)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-secondary)' }}>
                  Progress Baru
                </label>
                <span className="text-lg font-black font-mono"
                  style={{ color: '#F97316' }}>
                  {newPercent}%
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={project.progressPercent || 0}
                max={100}
                step={5}
                value={newPercent}
                onChange={(e) => setNewPercent(Number(e.target.value))}
                className="w-full accent-orange-500"
                style={{ cursor: 'pointer' }}
              />

              <div className="flex justify-between text-xs mt-1"
                style={{ color: 'var(--text-muted)' }}>
                <span>{project.progressPercent || 0}% (sekarang)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Quick select buttons */}
            <div className="grid grid-cols-5 gap-2">
              {[25, 50, 75, 90, 100].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPercent(p)}
                  disabled={p < (project.progressPercent || 0)}
                  className="py-2 text-xs font-semibold transition-all"
                  style={{
                    background: newPercent === p
                      ? 'rgba(249,115,22,0.2)'
                      : 'rgba(245,240,235,0.04)',
                    color: newPercent === p
                      ? '#F97316'
                      : p < (project.progressPercent || 0)
                      ? 'rgba(245,240,235,0.1)'
                      : 'rgba(245,240,235,0.4)',
                    border: newPercent === p
                      ? '1px solid rgba(249,115,22,0.3)'
                      : '1px solid rgba(245,240,235,0.06)',
                    cursor: p < (project.progressPercent || 0)
                      ? 'not-allowed'
                      : 'pointer',
                  }}
                >
                  {p}%
                </button>
              ))}
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-secondary)' }}>
                Catatan Update (opsional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Pekerjaan struktur lantai 2 selesai, mulai dinding..."
                rows={2}
                className="w-full p-3 text-sm outline-none resize-none"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid rgba(245,240,235,0.08)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Warning jika 100% */}
            {newPercent >= 100 && (
              <div className="flex items-start gap-2 p-3"
                style={{
                  background: 'rgba(34,197,94,0.06)',
                  border: '1px solid rgba(34,197,94,0.2)',
                }}>
                <CheckCircle size={13}
                  style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'rgba(34,197,94,0.8)' }}>
                  Proyek akan ditandai sebagai <strong>Selesai</strong> setelah disimpan.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                style={{
                  background: saving ? '#c45a0e' : '#F97316',
                  color: '#0a0a0a',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}>
                {saving
                  ? <><Loader2 size={15} className="animate-spin" />Menyimpan...</>
                  : `Simpan — ${newPercent}%`}
              </button>
              <button type="button" onClick={() => {
                setShowForm(false)
                setNewPercent(project.progressPercent || 0)
                setNote('')
              }}
                className="px-4 py-3 text-sm"
                style={{
                  border: '1px solid rgba(245,240,235,0.1)',
                  color: 'var(--text-secondary)',
                }}>
                Batal
              </button>
            </div>
          </form>
        )}

        {/* Completed state */}
        {isCompleted && (
          <div className="mt-5 flex items-center gap-3 p-4"
            style={{
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#22c55e' }}>
                Proyek Selesai 🎉
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(34,197,94,0.6)' }}>
                Semua pekerjaan telah diselesaikan
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress history */}
      {history.length > 0 && (
        <div className="p-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--text-muted)' }}>
            <Clock size={12} className="inline mr-1" />
            Riwayat Update ({history.length})
          </p>
          <div className="space-y-3">
            {history.map((h, index) => (
              <div key={index}
                className="flex items-start gap-3 pb-3"
                style={{
                  borderBottom: index < history.length - 1
                    ? '1px solid rgba(245,240,235,0.04)'
                    : 'none',
                }}>
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full"
                    style={{
                      background: index === 0 ? '#F97316' : 'rgba(245,240,235,0.2)',
                    }} />
                  {index < history.length - 1 && (
                    <div className="w-px flex-1 mt-1"
                      style={{ background: 'rgba(245,240,235,0.06)', minHeight: 16 }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-black font-mono"
                      style={{ color: index === 0 ? '#F97316' : '#f5f0eb' }}>
                      {h.percent}%
                    </span>
                    <span className="text-xs"
                      style={{ color: 'var(--text-muted)' }}>
                      oleh {h.updatedByName}
                    </span>
                  </div>
                  {h.note && (
                    <p className="text-xs leading-relaxed mb-1"
                      style={{ color: 'rgba(245,240,235,0.5)' }}>
                      {h.note}
                    </p>
                  )}
                  <p className="text-xs"
                    style={{ color: 'var(--text-muted)' }}>
                    {h.updatedAt instanceof Date
                      ? format(h.updatedAt, 'd MMM yyyy, HH:mm', { locale: id })
                      : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href={`/inventory/${projectId}`}
          className="flex items-center justify-between p-4 transition-all"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245,240,235,0.06)'
          }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Gudang Digital
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Lihat stok proyek ini
            </p>
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </Link>

        <Link href="/requests"
          className="flex items-center justify-between p-4 transition-all"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245,240,235,0.06)'
          }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Request Material
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Lihat semua request
            </p>
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </Link>
      </div>
    </div>
  )
}