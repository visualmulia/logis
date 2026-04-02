'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { logoutUser } from '@/lib/firebase/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutDashboard, PackageSearch, Warehouse,
  Wrench, Wallet, LogOut, ChevronRight,
  Building2, Menu, X, Sun, Moon, Users
} from 'lucide-react'

const navItems = [
  {
    label: 'Overview',
    href: '/overview',
    icon: LayoutDashboard,
    module: null,
    roles: null,
  },
  {
    label: 'Request Material',
    href: '/requests',
    icon: PackageSearch,
    module: '01',
    roles: null,
  },
  {
    label: 'Gudang Digital',
    href: '/projects',
    icon: Warehouse,
    module: '02',
    roles: ['owner', 'admin', 'pm', 'supervisor', 'logistik', 'admin_site'],
  },
  {
    label: 'Equipment Tracker',
    href: '/assets',
    icon: Wrench,
    module: '03',
    roles: ['owner', 'admin', 'pm', 'supervisor', 'logistik'],
  },
  {
    label: 'Petty Cash',
    href: '/petty-cash',
    icon: Wallet,
    module: '💰',
    roles: ['owner', 'admin', 'pm', 'admin_site'],
  },
  {
    label: 'Tim & Akses',
    href: '/team',
    icon: Users,
    module: null,
    roles: ['owner', 'admin'],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { logisUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isDark = theme === 'dark'

  async function handleLogout() {
    await logoutUser()
    toast.success('Berhasil logout')
    router.push('/login')
  }

  const sidebarBg = '#0d0d0d'
  const sidebarText = '#f5f0eb'
  const sidebarMuted = 'rgba(245,240,235,0.4)'
  const sidebarBorder = isDark
    ? 'rgba(245,240,235,0.06)'
    : 'rgba(245,240,235,0.08)'

  const SidebarContent = () => (
    <div className="flex flex-col h-full"
      style={{ background: sidebarBg }}>

      {/* Logo + close */}
      <div className="px-6 py-5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: `1px solid ${sidebarBorder}` }}>
        <div className="text-xl font-black tracking-[4px]"
          style={{ fontFamily: 'monospace', color: sidebarText }}>
          LOG<span style={{ color: '#F97316' }}>I</span>S
        </div>
        <button onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1"
          style={{ color: sidebarMuted }}>
          <X size={18} />
        </button>
      </div>

      {/* User info */}
      <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${sidebarBorder}` }}>
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(249,115,22,0.15)',
            border: '1px solid rgba(249,115,22,0.3)',
          }}>
          <Building2 size={14} style={{ color: '#F97316' }} />
        </div>
        <div className="overflow-hidden min-w-0">
          <div className="text-xs font-semibold truncate"
            style={{ color: sidebarText }}>
            {logisUser?.name || '...'}
          </div>
          <div className="uppercase tracking-widest"
            style={{ color: sidebarMuted, fontSize: '9px', fontWeight: 600 }}>
            {logisUser?.role || '—'}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="px-3 mb-3 uppercase tracking-widest"
          style={{ color: 'rgba(245,240,235,0.2)', fontSize: '9px', fontWeight: 600 }}>
          Menu Utama
        </div>
        
<ul className="space-y-0.5">
  {navItems
    .filter((item) =>
      item.roles === null ||
      (logisUser?.role && item.roles.includes(logisUser.role))
    )
    .map((item) => {
      const isActive =
        pathname === item.href ||
        (item.href !== '/overview' && pathname.startsWith(item.href))
      const Icon = item.icon
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-3 text-sm transition-all"
            style={{
              background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
              color: isActive ? '#F97316' : sidebarMuted,
              borderLeft: isActive
                ? '2px solid #F97316'
                : '2px solid transparent',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            <Icon size={15} className="flex-shrink-0" />
            <span className="flex-1 text-sm">{item.label}</span>
            {item.module && (
              <span className="font-mono opacity-30 flex-shrink-0"
                style={{ fontSize: '9px' }}>
                {item.module}
              </span>
            )}
            {isActive && (
              <ChevronRight size={11}
                style={{ color: '#F97316' }}
                className="flex-shrink-0" />
            )}
          </Link>
        </li>
      )
    })}
</ul>
      </nav>

      {/* Bottom: Theme toggle + Logout */}
      <div className="px-3 py-3 flex-shrink-0"
        style={{ borderTop: `1px solid ${sidebarBorder}` }}>

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all mb-1"
          style={{
            color: sidebarMuted,
            borderRadius: '2px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(249,115,22,0.08)'
            e.currentTarget.style.color = '#F97316'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = sidebarMuted
          }}>
          {isDark
            ? <Sun size={15} className="flex-shrink-0" />
            : <Moon size={15} className="flex-shrink-0" />
          }
          <span className="font-medium">
            {isDark ? 'Mode Terang' : 'Mode Gelap'}
          </span>
          {/* Toggle pill */}
          <div className="ml-auto flex-shrink-0 w-10 h-5 rounded-full relative transition-all"
            style={{
              background: isDark ? 'rgba(245,240,235,0.15)' : '#F97316',
            }}>
            <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{
                background: '#fff',
                left: isDark ? '2px' : '22px',
              }} />
          </div>
        </button>

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all"
          style={{ color: sidebarMuted, borderRadius: '2px' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
            e.currentTarget.style.color = '#ef4444'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = sidebarMuted
          }}>
          <LogOut size={15} className="flex-shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-60 z-50"
        style={{ background: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{
          background: sidebarBg,
          borderBottom: `1px solid ${sidebarBorder}`,
        }}>
        <div className="text-lg font-black tracking-[4px]"
          style={{ fontFamily: 'monospace', color: sidebarText }}>
          LOG<span style={{ color: '#F97316' }}>I</span>S
        </div>
        <div className="flex items-center gap-2">
          {/* Theme toggle mobile */}
          <button onClick={toggleTheme}
            className="p-2 rounded-full transition-all"
            style={{ color: sidebarMuted }}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {/* Hamburger */}
          <button onClick={() => setMobileOpen(true)}
            className="p-2"
            style={{ color: sidebarMuted }}>
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-72 z-50 flex flex-col"
            style={{ background: sidebarBg }}>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}