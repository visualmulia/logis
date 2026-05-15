'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, onSnapshot, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Asset, Project } from '@/types'
import Link from 'next/link'
import {
  Plus, Wrench, MapPin, Clock, CheckCircle,
  XCircle, Loader2, ChevronRight, Package,
  Search, FolderOpen,
} from 'lucide-react'

type AssetType = 'heavy_equipment' | 'power_tool' | 'scaffolding' | 'measuring' | 'vehicle' | 'other'

const typeConfig: Record<AssetType, { label: string; icon: string }> = {
  heavy_equipment: { label: 'Alat Berat',  icon: '🏗️' },
  power_tool:      { label: 'Power Tool',  icon: '🔧' },
  scaffolding:     { label: 'Scaffolding', icon: '🪜' },
  measuring:       { label: 'Alat Ukur',   icon: '📐' },
  vehicle:         { label: 'Kendaraan',   icon: '🚛' },
  other:           { label: 'Lainnya',     icon: '📦' },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active:      { label: 'Aktif Dipakai', color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  idle:        { label: 'Idle',          color: '#eab308', bg: 'rgba(234,179,8,0.1)'  },
  maintenance: { label: 'Servis',        color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  lost:        { label: 'Hilang',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  retired:     { label: 'Pensiun',       color: 'var(--text-muted)', bg: 'rgba(100,100,100,0.08)' },
}

const conditionConfig: Record<string, { label: string; color: string }> = {
  good:    { label: 'Baik',  color: '#22c55e' },
  fair:    { label: 'Cukup', color: '#eab308' },
  poor:    { label: 'Buruk', color: '#ef4444' },
  damaged: { label: 'Rusak', color: '#ef4444' },
}

// Role yang TIDAK bisa daftarkan aset baru
const READONLY_ASSET_ROLES = ['pm', 'supervisor', 'readonly']

export default function AssetsPage() {
  const { companyId, logisUser } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProject, setFilterProject] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const role = logisUser?.role || ''
  const canAddAsset = !READONLY_ASSET_ROLES.includes(role)
  const isPM = role === 'pm'

  useEffect(() => {
    if (!companyId) return

    // Fetch projects untuk label nama + filter
    getDocs(collection(db, 'logis_companies', companyId, 'projects')).then((snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project))
      // PM hanya lihat proyek yang di-assign
      if (isPM && logisUser?.projectIds?.length) {
        setProjects(all.filter((p) => logisUser.projectIds.includes(p.id)))
      } else {
        setProjects(all)
      }
    })

    const q = query(
      collection(db, 'logis_companies', companyId, 'assets'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastServiceDate: doc.data().lastServiceDate?.toDate(),
        nextServiceDue: doc.data().nextServiceDue?.toDate(),
        purchaseDate:   doc.data().purchaseDate?.toDate(),
        rentalEndDate:  doc.data().rentalEndDate?.toDate(),
        createdAt:      doc.data().createdAt?.toDate(),
      })) as Asset[]

      // PM hanya lihat aset di proyek yang di-assign
      if (isPM && logisUser?.projectIds?.length) {
        setAssets(data.filter(
          (a) => a.currentProjectId && logisUser.projectIds.includes(a.currentProjectId)
        ))
      } else {
        setAssets(data)
      }

      setLoading(false)
    })

    return () => unsub()
  }, [companyId, logisUser, isPM])

  // Helper: nama proyek dari ID
  function getProjectName(projectId: string | null): string {
    if (!projectId) return 'Tidak di proyek'
    return projects.find((p) => p.id === projectId)?.name || 'Proyek tidak ditemukan'
  }

  function getProjectLocation(projectId: string | null): string {
    if (!projectId) return ''
    return projects.find((p) => p.id === projectId)?.location || ''
  }

  // Filter logic
  const filtered = assets.filter((a) => {
    const matchStatus  = filterStatus === 'all' || a.status === filterStatus
    const matchProject = filterProject === 'all' || a.currentProjectId === filterProject
    const matchSearch  = searchQuery === '' ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchProject && matchSearch
  })

  const lostAssets       = assets.filter((a) => a.status === 'lost')
  const maintenanceDue   = assets.filter((a) => a.nextServiceDue && new Date() >= a.nextServiceDue)
  const idleAssets       = assets.filter((a) => a.status === 'idle')

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <p className="text-sm font-semibold tracking-wide mb-1"
            style={{ color: '#F97316' }}>
            Modul 03
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Equipment Tracker
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {assets.length} aset terdaftar · Semua terlacak dari satu tempat
          </p>
        </div>

        {/* Tombol Daftarkan Aset — hanya owner/admin/logistik */}
        {canAddAsset && (
          <Link
            href="/assets/new"
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold w-full sm:w-auto"
            style={{ background: '#F97316', color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Plus size={15} />
            Daftarkan Aset
          </Link>
        )}
      </div>

      {/* Alert summary */}
      {(lostAssets.length > 0 || maintenanceDue.length > 0 || idleAssets.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {lostAssets.length > 0 && (
            <div className="flex items-center gap-3 p-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <XCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
                  {lostAssets.length} Aset Hilang
                </p>
                <p className="text-sm" style={{ color: '#dc2626' }}>
                  Perlu investigasi segera
                </p>
              </div>
            </div>
          )}
          {maintenanceDue.length > 0 && (
            <div className="flex items-center gap-3 p-4"
              style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <Wrench size={18} style={{ color: '#eab308', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#eab308' }}>
                  {maintenanceDue.length} Perlu Servis
                </p>
                <p className="text-sm" style={{ color: '#ca8a04' }}>
                  Jadwal servis terlewat
                </p>
              </div>
            </div>
          )}
          {idleAssets.length > 0 && (
            <div className="flex items-center gap-3 p-4"
              style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <Clock size={18} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#38bdf8' }}>
                  {idleAssets.length} Aset Idle
                </p>
                <p className="text-sm" style={{ color: '#0284c7' }}>
                  Bisa dipindah ke proyek lain
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama aset atau nomor seri..."
            className="w-full pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Filter by project */}
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="py-2.5 px-3 text-sm font-semibold outline-none"
          style={{
            background: filterProject !== 'all' ? 'rgba(249,115,22,0.08)' : 'var(--bg-card)',
            border: filterProject !== 'all' ? '1px solid rgba(249,115,22,0.3)' : '1px solid var(--border-color)',
            color: filterProject !== 'all' ? '#F97316' : 'var(--text-secondary)',
            cursor: 'pointer',
            minWidth: '160px',
          }}
        >
          <option value="all" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            Semua Proyek
          </option>
          <option value="none" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            Tidak di Proyek
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-0 mb-6 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--border-color)' }}>
        {['all', 'active', 'idle', 'maintenance', 'lost'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-3 text-sm whitespace-nowrap transition-all ${filterStatus === s ? 'font-semibold' : 'font-medium'}`}
            style={{
              color: filterStatus === s ? '#F97316' : 'var(--text-secondary)',
              borderBottom: filterStatus === s ? '2px solid #F97316' : '2px solid transparent',
              background: 'transparent',
            }}>
            {s === 'all' ? 'Semua' : statusConfig[s]?.label}
            <span className="ml-1.5 opacity-60 text-xs">
              {s === 'all'
                ? assets.length
                : assets.filter((a) => a.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
          <Package size={40} className="mx-auto mb-4 opacity-30"
            style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm mb-4">
            {assets.length === 0
              ? 'Belum ada aset terdaftar'
              : searchQuery
              ? `Tidak ada aset dengan nama "${searchQuery}"`
              : 'Tidak ada aset dengan filter ini'}
          </p>
          {assets.length === 0 && canAddAsset && (
            <Link href="/assets/new"
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: '#F97316' }}>
              <Plus size={14} />
              Daftarkan aset pertama
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((asset) => {
            const status    = statusConfig[asset.status] || statusConfig.active
            const condition = conditionConfig[asset.condition] || conditionConfig.good
            const typeInfo  = typeConfig[asset.type as AssetType] || typeConfig.other
            const isServiceDue = asset.nextServiceDue && new Date() >= asset.nextServiceDue
            const projectName  = getProjectName(asset.currentProjectId)
            const projectLocation = getProjectLocation(asset.currentProjectId)

            return (
              <Link key={asset.id}
                href={`/assets/${asset.id}`}
                className="flex items-center gap-4 p-4 lg:p-5 transition-all group"
                style={{
                  background: 'var(--bg-card)',
                  border: asset.status === 'lost'
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid var(--border-color)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-secondary)'
                  if (asset.status !== 'lost')
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.03)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-card)'
                  e.currentTarget.style.borderColor = asset.status === 'lost'
                    ? 'rgba(239,68,68,0.3)'
                    : 'var(--border-color)'
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
                }}>

                {/* Type icon */}
                <div className="text-2xl flex-shrink-0 w-10 text-center">
                  {typeInfo.icon}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: ID + badges */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                      #{asset.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 font-semibold rounded-sm"
                      style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    {isServiceDue && (
                      <span className="text-xs px-2 py-0.5 font-semibold rounded-sm"
                        style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                        SERVICE DUE
                      </span>
                    )}
                    {asset.isRented && (
                      <span className="text-xs px-2 py-0.5 font-semibold rounded-sm"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                        SEWA
                      </span>
                    )}
                  </div>

                  {/* Row 2: Nama aset */}
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {asset.name}
                  </p>

                  {/* Row 3: Type + Kondisi + Lokasi Proyek */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {typeInfo.label}
                    </span>
                    <span className="text-xs font-medium" style={{ color: condition.color }}>
                      ● {condition.label}
                    </span>
                    {/* Lokasi proyek — info penting untuk PM */}
                    <span className="flex items-center gap-1 text-xs font-medium"
                      style={{
                        color: asset.currentProjectId ? '#F97316' : 'var(--text-secondary)',
                      }}>
                      <FolderOpen size={10} />
                      {projectName}
                    </span>
                    {projectLocation && (
                      <span className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--text-secondary)' }}>
                        <MapPin size={10} />
                        {projectLocation}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16}
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}