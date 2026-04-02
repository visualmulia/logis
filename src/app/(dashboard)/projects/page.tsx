'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Project } from '@/types'
import Link from 'next/link'
import { Plus, Building2, Calendar, TrendingUp, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export default function ProjectsPage() {
  const { companyId } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return

    const q = query(
      collection(db, 'logis_companies', companyId, 'projects'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Project[]
      setProjects(data)
      setLoading(false)
    })

    return () => unsub()
  }, [companyId])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: '#F97316' }}>
            Manajemen Proyek
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5f0eb' }}>
            Proyek Aktif
          </h1>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
            Kelola semua proyek dan pantau kondisinya
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest"
          style={{ background: '#F97316', color: '#0a0a0a' }}
        >
          <Plus size={15} />
          Proyek Baru
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'rgba(245,240,235,0.2)' }}>
          <Building2 size={40} className="mx-auto mb-4 opacity-30" style={{ color: '#f5f0eb' }} />
          <p className="text-sm mb-4">Belum ada proyek terdaftar</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: '#F97316' }}
          >
            <Plus size={14} />
            Buat proyek pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {projects.map((project) => (
  <Link
    key={project.id}
    href={`/inventory/${project.id}`}
    className="block p-4 lg:p-5 transition-all"
    style={{
      background: '#111111',
      border: '1px solid rgba(245,240,235,0.06)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(249,115,22,0.2)'
      e.currentTarget.style.background = '#151515'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(245,240,235,0.06)'
      e.currentTarget.style.background = '#111111'
    }}
  >
    {/* Row 1: Status dot + Nama proyek */}
    <div className="flex items-start gap-3 mb-3">
      <div
        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
        style={{
          background: project.status === 'active' ? '#22c55e' : '#eab308',
          boxShadow: project.status === 'active' ? '0 0 6px #22c55e' : 'none',
        }}
      />
      <h3 className="text-sm font-semibold leading-tight flex-1"
        style={{ color: '#f5f0eb' }}>
        {project.name}
      </h3>
    </div>

    {/* Row 2: Lokasi */}
    {project.location && (
      <div className="flex items-start gap-3 mb-2 pl-5">
        <span className="flex items-center gap-1.5 text-xs"
          style={{ color: 'rgba(245,240,235,0.3)' }}>
          <Building2 size={11} className="shrink-0" />
          <span className="line-clamp-1">{project.location}</span>
        </span>
      </div>
    )}

    {/* Row 3: Tanggal + Progress */}
    <div className="flex items-center justify-between gap-4 pl-5">
      {project.startDate ? (
        <span className="flex items-center gap-1.5 text-xs shrink-0"
          style={{ color: 'rgba(245,240,235,0.3)' }}>
          <Calendar size={11} />
          {format(project.startDate, 'd MMM yyyy', { locale: id })}
        </span>
      ) : (
        <span />
      )}

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="w-20 lg:w-24 h-1.5"
          style={{ background: 'rgba(245,240,235,0.08)' }}>
          <div
            className="h-full"
            style={{
              width: `${project.progressPercent || 0}%`,
              background: '#F97316',
            }}
          />
        </div>
        <span className="text-xs font-mono shrink-0"
          style={{ color: '#F97316' }}>
          {project.progressPercent || 0}%
        </span>
      </div>
    </div>
  </Link>
))}
        </div>
      )}
    </div>
  )
}