'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Asset } from '@/types'
import Link from 'next/link'
import {
  Plus, Wrench, AlertTriangle, MapPin,
  Clock, CheckCircle, XCircle, Loader2,
  ChevronRight, Package
} from 'lucide-react'

type AssetType = 'heavy_equipment' | 'power_tool' | 'scaffolding' | 'measuring' | 'vehicle' | 'other'

const typeConfig: Record<AssetType, { label: string; icon: string }> = {
  heavy_equipment: { label: 'Alat Berat', icon: '🏗️' },
  power_tool: { label: 'Power Tool', icon: '🔧' },
  scaffolding: { label: 'Scaffolding', icon: '🪜' },
  measuring: { label: 'Alat Ukur', icon: '📐' },
  vehicle: { label: 'Kendaraan', icon: '🚛' },
  other: { label: 'Lainnya', icon: '📦' },
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktif', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  idle: { label: 'Idle', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  maintenance: { label: 'Servis', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  lost: { label: 'Hilang', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  retired: { label: 'Pensiun', color: 'var(--text-muted)', bg: 'rgba(245,240,235,0.05)' },
}

const conditionConfig: Record<string, { label: string; color: string }> = {
  good: { label: 'Baik', color: '#22c55e' },
  fair: { label: 'Cukup', color: '#eab308' },
  poor: { label: 'Buruk', color: '#ef4444' },
  damaged: { label: 'Rusak', color: '#ef4444' },
}

export default function AssetsPage() {
  const { companyId } = useAuth()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (!companyId) return

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
        purchaseDate: doc.data().purchaseDate?.toDate(),
        rentalEndDate: doc.data().rentalEndDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Asset[]
      setAssets(data)
      setLoading(false)
    })

    return () => unsub()
  }, [companyId])

  const filtered = assets.filter((a) => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const matchType = filterType === 'all' || a.type === filterType
    return matchStatus && matchType
  })

  const lostAssets = assets.filter((a) => a.status === 'lost')
  const maintenanceDue = assets.filter((a) => {
    if (!a.nextServiceDue) return false
    return new Date() >= a.nextServiceDue
  })
  const idleAssets = assets.filter((a) => a.status === 'idle')

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
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
        <Link
          href="/assets/new"
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest w-full sm:w-auto"
          style={{ background: '#F97316', color: '#0a0a0a' }}>
          <Plus size={15} />
          Daftarkan Aset
        </Link>
      </div>

      {/* Alert summary */}
      {(lostAssets.length > 0 || maintenanceDue.length > 0 || idleAssets.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {lostAssets.length > 0 && (
            <div className="flex items-center gap-3 p-4"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#ef4444' }}>
                  {lostAssets.length} Aset Hilang
                </p>
                <p className="text-xs" style={{ color: 'rgba(239,68,68,0.6)' }}>
                  Perlu investigasi segera
                </p>
              </div>
            </div>
          )}
          {maintenanceDue.length > 0 && (
            <div className="flex items-center gap-3 p-4"
              style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)' }}>
              <Wrench size={16} style={{ color: '#eab308', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#eab308' }}>
                  {maintenanceDue.length} Perlu Servis
                </p>
                <p className="text-xs" style={{ color: 'rgba(234,179,8,0.6)' }}>
                  Jadwal servis terlewat
                </p>
              </div>
            </div>
          )}
          {idleAssets.length > 0 && (
            <div className="flex items-center gap-3 p-4"
              style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)' }}>
              <Clock size={16} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: '#38bdf8' }}>
                  {idleAssets.length} Aset Idle
                </p>
                <p className="text-xs" style={{ color: 'rgba(56,189,248,0.6)' }}>
                  Bisa dipindah ke proyek lain
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-0" style={{ border: '1px solid rgba(245,240,235,0.08)' }}>
          {['all', 'active', 'idle', 'maintenance', 'lost'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-all"
              style={{
                background: filterStatus === s ? '#F97316' : 'transparent',
                color: filterStatus === s ? '#0a0a0a' : 'rgba(245,240,235,0.4)',
                borderRight: '1px solid rgba(245,240,235,0.08)',
              }}>
              {s === 'all' ? 'Semua' : statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24" style={{ color: 'var(--text-muted)' }}>
          <Package size={40} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-primary)' }} />
          <p className="text-sm mb-4">
            {assets.length === 0 ? 'Belum ada aset terdaftar' : 'Tidak ada aset dengan filter ini'}
          </p>
          {assets.length === 0 && (
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
            const status = statusConfig[asset.status] || statusConfig.active
            const condition = conditionConfig[asset.condition] || conditionConfig.good
            const typeInfo = typeConfig[asset.type as AssetType] || typeConfig.other
            const isServiceDue = asset.nextServiceDue && new Date() >= asset.nextServiceDue

            return (
              <Link key={asset.id}
                href={`/assets/${asset.id}`}
                className="flex items-center gap-4 p-5 transition-all group"
                style={{
                  background: 'var(--bg-card)',
                  border: asset.status === 'lost'
                    ? '1px solid rgba(239,68,68,0.25)'
                    : '1px solid var(--border-color)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#151515'
                  if (asset.status !== 'lost')
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#111111'
                  e.currentTarget.style.borderColor = asset.status === 'lost'
                    ? 'rgba(239,68,68,0.25)'
                    : 'rgba(245,240,235,0.06)'
                }}>

                {/* Type icon */}
                <div className="text-2xl flex-shrink-0 w-10 text-center">
                  {typeInfo.icon}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono"
                      style={{ color: 'var(--text-muted)' }}>
                      {asset.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-0.5 font-semibold"
                      style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    {isServiceDue && (
                      <span className="text-xs px-2 py-0.5 font-semibold"
                        style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
                        ⚠ SERVICE DUE
                      </span>
                    )}
                    {asset.isRented && (
                      <span className="text-xs px-2 py-0.5 font-semibold"
                        style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                        SEWA
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {asset.name}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {typeInfo.label}
                    </span>
                    <span className="text-xs"
                      style={{ color: condition.color }}>
                      ● {condition.label}
                    </span>
                    {asset.currentProjectId && (
                      <span className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--text-muted)' }}>
                        <MapPin size={10} />
                        Proyek aktif
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
