'use client'

import { useAuth } from '@/contexts/AuthContext'
import { logoutUser } from '@/lib/firebase/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LogOut, Loader2 } from 'lucide-react'

export default function OverviewPage() {
  const { logisUser, companyId, loading } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logoutUser()
    toast.success('Berhasil logout')
    router.push('/login')
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: '#F97316' }}
        />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen p-8"
      style={{ background: '#0a0a0a', color: '#f5f0eb' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div
          className="text-2xl font-black tracking-[4px]"
          style={{ fontFamily: 'monospace' }}
        >
          LOG<span style={{ color: '#F97316' }}>I</span>S
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm px-4 py-2 transition-all"
          style={{
            border: '1px solid rgba(245,240,235,0.1)',
            color: 'rgba(245,240,235,0.5)',
          }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>

      {/* Welcome */}
      <div
        className="p-8 mb-8"
        style={{
          background: '#111111',
          border: '1px solid rgba(245,240,235,0.08)',
        }}
      >
        <div
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: '#F97316' }}
        >
          ✓ Auth berhasil
        </div>
        <h1 className="text-3xl font-bold mb-2">
          Selamat datang, {logisUser?.name || 'User'}!
        </h1>
        <p style={{ color: 'rgba(245,240,235,0.5)' }}>
          Company ID: {companyId} · Role:{' '}
          <span
            className="font-semibold uppercase"
            style={{ color: '#F97316' }}
          >
            {logisUser?.role}
          </span>
        </p>
      </div>

      {/* Coming soon modules */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { num: '01', name: 'Request Material', status: 'Segera' },
          { num: '02', name: 'Gudang Digital', status: 'Segera' },
          { num: '03', name: 'Equipment Tracker', status: 'Segera' },
          { num: '04', name: 'Dashboard', status: 'Segera' },
        ].map((mod) => (
          <div
            key={mod.num}
            className="p-6"
            style={{
              background: '#111111',
              border: '1px solid rgba(245,240,235,0.08)',
            }}
          >
            <div
              className="text-xs font-mono mb-3"
              style={{ color: 'rgba(245,240,235,0.3)' }}
            >
              {mod.num}
            </div>
            <div className="text-sm font-semibold mb-2">{mod.name}</div>
            <div
              className="text-xs px-2 py-1 inline-block"
              style={{
                background: 'rgba(249,115,22,0.1)',
                color: '#F97316',
                border: '1px solid rgba(249,115,22,0.2)',
              }}
            >
              {mod.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}