'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Loader2, TrendingUp, Package, Wrench, AlertTriangle } from 'lucide-react'

export default function OverviewPage() {
  const { logisUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: '#F97316' }}
        >
          Command Center
        </p>
        <h1 className="text-2xl font-bold" style={{ color: '#f5f0eb' }}>
          Selamat datang, {logisUser?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(245,240,235,0.4)' }}>
          Berikut ringkasan kondisi operasional hari ini
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Proyek Aktif',
            value: '—',
            icon: TrendingUp,
            color: '#F97316',
          },
          {
            label: 'Request Pending',
            value: '—',
            icon: Package,
            color: '#eab308',
          },
          {
            label: 'Aset Terdaftar',
            value: '—',
            icon: Wrench,
            color: '#22c55e',
          },
          {
            label: 'Perlu Perhatian',
            value: '—',
            icon: AlertTriangle,
            color: '#ef4444',
          },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="p-6"
              style={{
                background: '#111111',
                border: '1px solid rgba(245,240,235,0.06)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="p-2"
                  style={{
                    background: `${stat.color}15`,
                    border: `1px solid ${stat.color}30`,
                  }}
                >
                  <Icon size={14} style={{ color: stat.color }} />
                </div>
              </div>
              <div
                className="text-3xl font-black mb-1"
                style={{
                  fontFamily: 'monospace',
                  color: '#f5f0eb',
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs uppercase tracking-widest"
                style={{ color: 'rgba(245,240,235,0.3)' }}
              >
                {stat.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modules status */}
      <div
        className="p-6"
        style={{
          background: '#111111',
          border: '1px solid rgba(245,240,235,0.06)',
        }}
      >
        <div
          className="text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ color: 'rgba(245,240,235,0.3)' }}
        >
          Status Modul
        </div>
        <div className="space-y-3">
          {[
            { num: '01', name: 'Request Material', status: 'active', label: 'Aktif' },
            { num: '02', name: 'Gudang Digital', status: 'soon', label: 'Segera' },
            { num: '03', name: 'Equipment Tracker', status: 'soon', label: 'Segera' },
            { num: '04', name: 'Command Dashboard', status: 'soon', label: 'Segera' },
          ].map((mod) => (
            <div
              key={mod.num}
              className="flex items-center gap-4 py-3"
              style={{ borderBottom: '1px solid rgba(245,240,235,0.04)' }}
            >
              <span
                className="font-mono text-xs w-6"
                style={{ color: 'rgba(245,240,235,0.2)' }}
              >
                {mod.num}
              </span>
              <span
                className="flex-1 text-sm font-medium"
                style={{ color: '#f5f0eb' }}
              >
                {mod.name}
              </span>
              <span
                className="text-xs px-3 py-1 font-semibold"
                style={
                  mod.status === 'active'
                    ? {
                        background: 'rgba(34,197,94,0.1)',
                        color: '#22c55e',
                        border: '1px solid rgba(34,197,94,0.2)',
                      }
                    : {
                        background: 'rgba(245,240,235,0.05)',
                        color: 'rgba(245,240,235,0.3)',
                        border: '1px solid rgba(245,240,235,0.08)',
                      }
                }
              >
                {mod.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}