'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { logoutUser } from '@/lib/firebase/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutDashboard,
  PackageSearch,
  Warehouse,
  Wrench,
  Wallet,
  LogOut,
  ChevronRight,
  Building2,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  {
    label: 'Overview',
    href: '/overview',
    icon: LayoutDashboard,
    module: null,
  },
  {
    label: 'Request Material',
    href: '/requests',
    icon: PackageSearch,
    module: '01',
  },
  {
    label: 'Gudang Digital',
    href: '/projects',
    icon: Warehouse,
    module: '02',
  },
  {
    label: 'Equipment Tracker',
    href: '/assets',
    icon: Wrench,
    module: '03',
  },
  {
    label: 'Petty Cash',
    href: '/petty-cash',
    icon: Wallet,
    module: '💰',
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { logisUser } = useAuth()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await logoutUser()
    toast.success('Berhasil logout')
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}
      >
        <div
          className="text-xl font-black tracking-[4px]"
          style={{ fontFamily: 'monospace', color: '#f5f0eb' }}
        >
          LOG<span style={{ color: '#F97316' }}>I</span>S
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1"
          style={{ color: 'rgba(245,240,235,0.4)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Company info */}
      <div
        className="px-6 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}
      >
        <div
          className="w-8 h-8 flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.2)',
          }}
        >
          <Building2 size={14} style={{ color: '#F97316' }} />
        </div>
        <div className="overflow-hidden">
          <div
            className="text-xs font-semibold truncate"
            style={{ color: '#f5f0eb' }}
          >
            {logisUser?.name || 'Loading...'}
          </div>
          <div
            className="uppercase tracking-widest"
            style={{
              color: 'rgba(245,240,235,0.3)',
              fontSize: '9px',
              fontWeight: 600,
            }}
          >
            {logisUser?.role || '—'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div
          className="px-3 mb-3 uppercase tracking-widest"
          style={{ color: 'rgba(245,240,235,0.2)', fontSize: '9px', fontWeight: 600 }}
        >
          Menu Utama
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/overview' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm transition-all"
                  style={{
                    background: isActive
                      ? 'rgba(249,115,22,0.1)'
                      : 'transparent',
                    color: isActive
                      ? '#F97316'
                      : 'rgba(245,240,235,0.5)',
                    borderLeft: isActive
                      ? '2px solid #F97316'
                      : '2px solid transparent',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <Icon size={15} />
                  <span className="flex-1">{item.label}</span>
                  {item.module && (
                    <span
                      className="font-mono opacity-40"
                      style={{ fontSize: '9px' }}
                    >
                      {item.module}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight size={12} style={{ color: '#F97316' }} />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div
        className="px-3 py-4"
        style={{ borderTop: '1px solid rgba(245,240,235,0.06)' }}
      >
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all"
          style={{ color: 'rgba(245,240,235,0.3)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444'
            e.currentTarget.style.background = 'rgba(239,68,68,0.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(245,240,235,0.3)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut size={15} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ─── DESKTOP sidebar (fixed, always visible) ─── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 z-50"
        style={{
          background: '#0d0d0d',
          borderRight: '1px solid rgba(245,240,235,0.06)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ─── MOBILE top bar ─── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{
          background: '#0d0d0d',
          borderBottom: '1px solid rgba(245,240,235,0.06)',
        }}
      >
        <div
          className="text-lg font-black tracking-[4px]"
          style={{ fontFamily: 'monospace', color: '#f5f0eb' }}
        >
          LOG<span style={{ color: '#F97316' }}>I</span>S
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="p-2"
          style={{ color: 'rgba(245,240,235,0.6)' }}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* ─── MOBILE drawer overlay ─── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="lg:hidden fixed left-0 top-0 h-full w-72 z-50 flex flex-col"
            style={{
              background: '#0d0d0d',
              borderRight: '1px solid rgba(245,240,235,0.06)',
            }}
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}