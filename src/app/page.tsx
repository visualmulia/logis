'use client'

import Link from 'next/link'
import {
  Package, Warehouse, Wrench, Wallet,
  Users, TrendingUp, Shield, Zap,
  ChevronRight, CheckCircle, Star
} from 'lucide-react'

const features = [
  {
    icon: Package,
    title: 'Request Material',
    desc: 'Lapangan request, kantor approve. Semua tercatat dan bisa dilacak real-time.',
    color: '#F97316',
  },
  {
    icon: Warehouse,
    title: 'Gudang Digital',
    desc: 'Stok material, APD, dan tools terpantau. Alert otomatis saat stok kritis.',
    color: '#22c55e',
  },
  {
    icon: Wrench,
    title: 'Equipment Tracker',
    desc: 'Setiap alat punya kartu digital. Tahu posisi, kondisi, dan jadwal servisnya.',
    color: '#38bdf8',
  },
  {
    icon: Wallet,
    title: 'Petty Cash',
    desc: 'Kas lapangan dengan pre-approval, anomaly detection, dan bukti foto.',
    color: '#a78bfa',
  },
  {
    icon: TrendingUp,
    title: 'Progress Proyek',
    desc: 'PM update progress langsung dari sistem. Owner pantau dari mana saja.',
    color: '#eab308',
  },
  {
    icon: Shield,
    title: 'Role-based Access',
    desc: 'Mandor, logistik, supervisor — setiap role lihat yang relevan saja.',
    color: '#ef4444',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    period: 'selamanya',
    color: '#6b7280',
    features: ['1 proyek aktif', '3 user lapangan', 'Request material', 'Gudang digital'],
    cta: 'Mulai Gratis',
    highlight: false,
  },
  {
    name: 'Builder',
    price: 'Rp 799.000',
    period: '/bulan',
    color: '#F97316',
    features: ['5 proyek aktif', 'Unlimited user', 'Semua modul', 'Export PDF', 'Push notification'],
    cta: 'Coba 30 Hari Gratis',
    highlight: true,
  },
  {
    name: 'Prime',
    price: 'Rp 1.899.000',
    period: '/bulan',
    color: '#a78bfa',
    features: ['15 proyek aktif', 'Unlimited user', 'Semua modul', 'Priority support', 'Custom report'],
    cta: 'Coba 30 Hari Gratis',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#f5f0eb' }}>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(245,240,235,0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}
          className="flex items-center justify-between h-16">
          <div className="text-xl font-black tracking-[4px]"
            style={{ fontFamily: 'monospace', color: '#f5f0eb' }}>
            LOG<span style={{ color: '#F97316' }}>I</span>S
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"
              className="text-sm font-medium"
              style={{ color: 'rgba(245,240,235,0.5)' }}>
              Masuk
            </Link>
            <Link href="/register-company"
              className="px-4 py-2 text-sm font-bold uppercase tracking-widest"
              style={{ background: '#F97316', color: '#0a0a0a' }}>
              Daftar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px' }}>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.2)',
              color: '#F97316',
            }}>
            <Star size={12} />
            Trial 30 Hari — Full Fitur — Tanpa Kartu Kredit
          </div>

          <h1 className="font-black mb-6 leading-tight"
            style={{ fontSize: 'clamp(32px, 6vw, 64px)', color: '#f5f0eb' }}>
            Kendali Penuh<br />
            <span style={{ color: '#F97316' }}>Proyek Konstruksi</span><br />
            di Satu Sistem
          </h1>

          <p className="mx-auto mb-10 leading-relaxed"
            style={{
              maxWidth: 560, fontSize: 18,
              color: 'rgba(245,240,235,0.6)',
            }}>
            Dari request material lapangan sampai laporan keuangan kantor —
            semua real-time, semua terlacak, semua bisa diakses dari HP.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register-company"
              className="flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest"
              style={{ background: '#F97316', color: '#0a0a0a' }}>
              Mulai Trial Gratis 30 Hari
              <ChevronRight size={16} />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 px-8 py-4 text-sm font-semibold"
              style={{
                border: '1px solid rgba(245,240,235,0.2)',
                color: 'rgba(245,240,235,0.6)',
              }}>
              Sudah punya akun? Masuk
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16"
            style={{ borderTop: '1px solid rgba(245,240,235,0.06)', paddingTop: 32 }}>
            {[
              { value: '4 Modul', label: 'Operasional Lengkap' },
              { value: 'Real-time', label: 'Update Langsung' },
              { value: '8 Role', label: 'Akses Berbasis Jabatan' },
              { value: 'PWA', label: 'Install di HP' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-black mb-1"
                  style={{ color: '#F97316', fontFamily: 'monospace' }}>
                  {stat.value}
                </div>
                <div className="text-xs uppercase tracking-widest"
                  style={{ color: 'rgba(245,240,235,0.35)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '60px 24px',
        borderTop: '1px solid rgba(245,240,235,0.06)',
      }}>
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#F97316' }}>
            Fitur Lengkap
          </p>
          <h2 className="text-3xl font-black" style={{ color: '#f5f0eb' }}>
            Semua yang dibutuhkan tim konstruksi
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="p-6"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(245,240,235,0.06)',
                }}>
                <div className="w-10 h-10 flex items-center justify-center mb-4"
                  style={{ background: `${f.color}15`, border: `1px solid ${f.color}30` }}>
                  <Icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="font-bold mb-2" style={{ color: '#f5f0eb' }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed"
                  style={{ color: 'rgba(245,240,235,0.5)' }}>
                  {f.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '60px 24px',
        borderTop: '1px solid rgba(245,240,235,0.06)',
      }}>
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#F97316' }}>
            Harga Transparan
          </p>
          <h2 className="text-3xl font-black mb-4" style={{ color: '#f5f0eb' }}>
            Pilih plan sesuai kebutuhan
          </h2>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
            Semua plan dimulai dengan trial 30 hari penuh — tidak perlu kartu kredit
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.name}
              className="p-6 flex flex-col"
              style={{
                background: '#111111',
                border: plan.highlight
                  ? `2px solid ${plan.color}`
                  : '1px solid rgba(245,240,235,0.06)',
                position: 'relative',
              }}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold uppercase tracking-widest"
                  style={{ background: plan.color, color: '#0a0a0a' }}>
                  Paling Populer
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: plan.color }}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black" style={{ color: '#f5f0eb' }}>
                    {plan.price}
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm"
                    style={{ color: 'rgba(245,240,235,0.7)' }}>
                    <CheckCircle size={14} style={{ color: plan.color, flexShrink: 0 }} />
                    {feat}
                  </li>
                ))}
              </ul>

              <Link href="/register-company"
                className="w-full py-3 text-sm font-bold uppercase tracking-widest text-center block"
                style={{
                  background: plan.highlight ? plan.color : 'transparent',
                  color: plan.highlight ? '#0a0a0a' : plan.color,
                  border: `1px solid ${plan.color}`,
                }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '60px 24px 80px',
        borderTop: '1px solid rgba(245,240,235,0.06)',
        textAlign: 'center',
      }}>
        <h2 className="text-3xl font-black mb-4" style={{ color: '#f5f0eb' }}>
          Siap digitalisasi lapangan?
        </h2>
        <p className="mb-8 text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
          Daftar sekarang, gratis 30 hari, tidak perlu kartu kredit.
        </p>
        <Link href="/register-company"
          className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest"
          style={{ background: '#F97316', color: '#0a0a0a' }}>
          <Zap size={16} />
          Mulai Sekarang — Gratis
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(245,240,235,0.06)',
        padding: '24px',
        textAlign: 'center',
      }}>
        <p className="text-xs" style={{ color: 'rgba(245,240,235,0.2)' }}>
          © 2026 Logis — Sistem Administrasi & Logistik Konstruksi Indonesia
        </p>
      </footer>
    </div>
  )
}