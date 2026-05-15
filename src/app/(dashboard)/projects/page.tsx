'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Project } from '@/types'
import Link from 'next/link'
import { Plus, Building2, Calendar, Warehouse, Loader2, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

// Role yang bisa tambah proyek baru
const CAN_ADD_PROJECT = ['owner', 'admin']

// Role yang hanya lihat proyek yang di-assign
const ASSIGNED_ONLY_ROLES = ['pm', 'supervisor', 'logistik', 'admin_site', 'readonly']

export default function ProjectsPage() {
  const { companyId, logisUser } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const role = logisUser?.role || ''
  const canAddProject = CAN_ADD_PROJECT.includes(role)
  const isAssignedOnly = ASSIGNED_ONLY_ROLES.includes(role)

  useEffect(() => {
    if (!companyId) return

    const q = query(
      collection(db, 'logis_companies', companyId, 'projects'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate(),
        endDate: doc.data().endDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Project[]

      // Filter proyek berdasarkan assignment untuk PM dan staff
      if (isAssignedOnly && logisUser?.projectIds?.length) {
        setProjects(all.filter((p) => logisUser.projectIds.includes(p.id)))
      } else {
        setProjects(all)
      }

      setLoading(false)
    })

    return () => unsub()
  }, [companyId, logisUser, isAssignedOnly])

  const statusColor = (status: string) =>
    status === 'active' ? '#22c55e' : '#eab308'

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 lg:mb-8">
        <div>
          <p className="text-sm font-semibold tracking-wide mb-1"
            style={{ color: '#F97316' }}>
            Modul 02 — Gudang Digital
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Pilih Proyek
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isAssignedOnly
              ? `${projects.length} proyek yang kamu kelola`
              : 'Pilih proyek untuk masuk ke gudang digital'}
          </p>
        </div>

        {/* Tombol Proyek Baru — hanya owner/admin */}
        {canAddProject && (
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
            style={{ background: '#F97316', color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Plus size={15} />
            Proyek Baru
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
          <Warehouse size={40} className="mx-auto mb-4 opacity-30"
            style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm mb-2">
            {isAssignedOnly
              ? 'Belum ada proyek yang di-assign ke kamu'
              : 'Belum ada proyek terdaftar'}
          </p>
          {isAssignedOnly && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Hubungi Owner atau Admin untuk assign proyek
            </p>
          )}
          {canAddProject && (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 text-sm font-semibold mt-4"
              style={{ color: '#F97316' }}
            >
              <Plus size={14} />
              Buat proyek pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/inventory/${project.id}`}
              className="block p-5 transition-all group"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -4px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)'
                e.currentTarget.style.background = 'var(--bg-card)'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03), 0 0 0 1px rgba(0,0,0,0.02)'
              }}
            >
              {/* Status + nama */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{
                      background: statusColor(project.status),
                      boxShadow: project.status === 'active'
                        ? `0 0 6px ${statusColor(project.status)}`
                        : 'none',
                    }}
                  />
                  <h3 className="text-base font-semibold leading-tight"
                    style={{ color: 'var(--text-primary)' }}>
                    {project.name}
                  </h3>
                </div>
                <ChevronRight size={16}
                  className="flex-shrink-0 mt-0.5 transition-colors group-hover:text-orange-500"
                  style={{ color: 'var(--text-muted)' }} />
              </div>

              {/* Lokasi */}
              {project.location && (
                <div className="flex items-center gap-1.5 mb-3"
                  style={{ color: 'var(--text-secondary)' }}>
                  <Building2 size={13} className="shrink-0" />
                  <span className="text-sm truncate">{project.location}</span>
                </div>
              )}

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Progress
                  </span>
                  <span className="text-sm font-mono font-bold"
                    style={{ color: '#F97316' }}>
                    {project.progressPercent || 0}%
                  </span>
                </div>
                <div className="h-1.5 w-full"
                  style={{ background: 'var(--border-color)' }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${project.progressPercent || 0}%`,
                      background: '#F97316',
                    }}
                  />
                </div>
              </div>

              {/* Tanggal + Gudang label */}
              <div className="flex items-center justify-between">
                {project.startDate ? (
                  <span className="text-xs flex items-center gap-1"
                    style={{ color: 'var(--text-secondary)' }}>
                    <Calendar size={11} />
                    {format(project.startDate, 'd MMM yyyy', { locale: id })}
                  </span>
                ) : <span />}

                <span className="text-xs flex items-center gap-1 font-semibold"
                  style={{ color: '#F97316' }}>
                  <Warehouse size={11} />
                  Buka Gudang
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}