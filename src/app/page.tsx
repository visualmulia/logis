'use client'

import Link from 'next/link'
import {
  Package, Warehouse, Wrench, Wallet,
  TrendingUp, Shield, Zap,
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
    color: '#16a34a',
  },
  {
    icon: Wrench,
    title: 'Equipment Tracker',
    desc: 'Setiap alat punya kartu digital. Tahu posisi, kondisi, dan jadwal servisnya.',
    color: '#0284c7',
  },
  {
    icon: Wallet,
    title: 'Petty Cash',
    desc: 'Kas lapangan dengan pre-approval, anomaly detection, dan bukti foto.',
    color: '#7c3aed',
  },
  {
    icon: TrendingUp,
    title: 'Progress Proyek',
    desc: 'PM update progress langsung dari sistem. Owner pantau dari mana saja.',
    color: '#b45309',
  },
  {
    icon: Shield,
    title: 'Role-based Access',
    desc: 'Mandor, logistik, supervisor — setiap role lihat yang relevan saja.',
    color: '#be123c',
  },
]

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    period: 'selamanya',
    color: '#6b7280',
    borderColor: '#E8DDD4',
    features: ['1 proyek aktif', '3 user lapangan', 'Request material', 'Gudang digital'],
    cta: 'Mulai Gratis',
    highlight: false,
  },
  {
    name: 'Builder',
    price: 'Rp 799.000',
    period: '/bulan',
    color: '#F97316',
    borderColor: '#F97316',
    features: ['5 proyek aktif', 'Unlimited user', 'Semua modul', 'Export PDF', 'Push notification'],
    cta: 'Coba 30 Hari Gratis',
    highlight: true,
  },
  {
    name: 'Prime',
    price: 'Rp 1.899.000',
    period: '/bulan',
    color: '#7c3aed',
    borderColor: '#E8DDD4',
    features: ['15 proyek aktif', 'Unlimited user', 'Semua modul', 'Priority support', 'Custom report'],
    cta: 'Coba 30 Hari Gratis',
    highlight: false,
  },
]

// Warm Cream color palette
const C = {
  bg: '#FDF8F3',
  bgCard: '#FFFFFF',
  bgSection: '#F5EDE0',
  text: '#2D1B0E',
  textSecondary: '#7A5C42',
  textMuted: '#B09070',
  border: '#E8DDD4',
  borderStrong: '#D4C4B4',
  orange: '#F97316',
  sidebarBg: '#1C1008',
}

export default function LandingPage() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(253,248,243,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}
          className="flex items-center justify-between h-16">
          <div className="text-xl font-black tracking-[4px]"
            style={{ fontFamily: 'monospace', color: C.text }}>
            LOG<span style={{ color: C.orange }}>I</span>S
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"
              className="text-sm font-medium"
              style={{ color: C.textSecondary }}>
              Masuk
            </Link>
            <Link href="/register-company"
              className="px-4 py-2 text-sm font-bold uppercase tracking-widest"
              style={{ background: C.orange, color: '#fff' }}>
              Daftar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px' }}>
        <div className="text-center">

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-semibold uppercase tracking-widest"
            style={{
              background: 'rgba(249,115,22,0.08)',
              border: `1px solid rgba(249,115,22,0.25)`,
              color: C.orange,
              borderRadius: 4,
            }}>
            <Star size={12} />
            Trial 30 Hari — Full Fitur — Tanpa Kartu Kredit
          </div>

          <h1 className="font-black mb-6 leading-tight"
            style={{ fontSize: 'clamp(32px, 6vw, 64px)', color: C.text }}>
            Kendali Penuh<br />
            <span style={{ color: C.orange }}>Proyek Konstruksi</span><br />
            di Satu Sistem
          </h1>

          <p className="mx-auto mb-10 leading-relaxed"
            style={{ maxWidth: 560, fontSize: 18, color: C.textSecondary }}>
            Dari request material lapangan sampai laporan keuangan kantor —
            semua real-time, semua terlacak, semua bisa diakses dari HP.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register-company"
              className="flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest"
              style={{ background: C.orange, color: '#fff' }}>
              Mulai Trial Gratis 30 Hari
              <ChevronRight size={16} />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 px-8 py-4 text-sm font-semibold"
              style={{
                border: `1px solid ${C.borderStrong}`,
                color: C.textSecondary,
                background: C.bgCard,
              }}>
              Sudah punya akun? Masuk
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16"
            style={{ borderTop: `1px solid ${C.border}`, paddingTop: 32 }}>
            {[
              { value: '4 Modul', label: 'Operasional Lengkap' },
              { value: 'Real-time', label: 'Update Langsung' },
              { value: '8 Role', label: 'Akses Berbasis Jabatan' },
              { value: 'PWA', label: 'Install di HP' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-black mb-1"
                  style={{ color: C.orange, fontFamily: 'monospace' }}>
                  {stat.value}
                </div>
                <div className="text-xs uppercase tracking-widest"
                  style={{ color: C.textMuted }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{
        background: C.bgSection,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: '60px 0',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: C.orange }}>
              Fitur Lengkap
            </p>
            <h2 className="text-3xl font-black" style={{ color: C.text }}>
              Semua yang dibutuhkan tim konstruksi
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="p-6"
                  style={{
                    background: C.bgCard,
                    border: `1px solid ${C.border}`,
                  }}>
                  <div className="w-10 h-10 flex items-center justify-center mb-4"
                    style={{
                      background: `${f.color}12`,
                      border: `1px solid ${f.color}25`,
                    }}>
                    <Icon size={18} style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold mb-2" style={{ color: C.text }}>
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: C.textSecondary }}>
                    {f.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Logis */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 24px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: C.orange }}>
              Mengapa Logis?
            </p>
            <h2 className="text-3xl font-black mb-6" style={{ color: C.text }}>
              Dirancang khusus untuk kontraktor Indonesia
            </h2>
            <div className="space-y-4">
              {[
                {
                  title: 'Bahasa Indonesia',
                  desc: 'Seluruh antarmuka dalam Bahasa Indonesia. Mudah dipahami tim lapangan.',
                },
                {
                  title: 'Offline-ready',
                  desc: 'PWA yang bisa diinstall di HP. Tetap bisa diakses meski sinyal lemah.',
                },
                {
                  title: 'Harga terjangkau',
                  desc: 'Mulai dari gratis. Tidak ada biaya setup atau kontrak jangka panjang.',
                },
                {
                  title: 'Data aman',
                  desc: 'Tersimpan di Firebase Google. Backup otomatis, tidak ada risiko kehilangan data.',
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${C.orange}15`, borderRadius: 3 }}>
                    <CheckCircle size={14} style={{ color: C.orange }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-0.5" style={{ color: C.text }}>
                      {item.title}
                    </p>
                    <p className="text-sm" style={{ color: C.textSecondary }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual card */}
          <div className="p-8"
            style={{
              background: C.bgSection,
              border: `1px solid ${C.border}`,
            }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-6"
              style={{ color: C.textMuted }}>
              Command Center — Real-time
            </p>
            <div className="space-y-3">
              {[
                { label: 'Proyek Aktif', value: '3', color: C.orange },
                { label: 'Request Pending', value: '7', color: '#b45309' },
                { label: 'Aset Terdaftar', value: '12', color: '#16a34a' },
                { label: 'Kas Bulan Ini', value: 'Rp 4,2jt', color: '#7c3aed' },
              ].map((item) => (
                <div key={item.label}
                  className="flex items-center justify-between p-4"
                  style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                  <span className="text-sm font-medium" style={{ color: C.textSecondary }}>
                    {item.label}
                  </span>
                  <span className="text-xl font-black font-mono" style={{ color: item.color }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 flex items-center gap-2"
              style={{ background: 'rgba(249,115,22,0.08)', border: `1px solid rgba(249,115,22,0.2)` }}>
              <div className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: C.orange }} />
              <span className="text-xs font-semibold" style={{ color: C.orange }}>
                Data diupdate real-time dari lapangan
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{
        background: C.bgSection,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: '60px 0',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: C.orange }}>
              Harga Transparan
            </p>
            <h2 className="text-3xl font-black mb-4" style={{ color: C.text }}>
              Pilih plan sesuai kebutuhan
            </h2>
            <p className="text-sm" style={{ color: C.textSecondary }}>
              Semua plan dimulai dengan trial 30 hari penuh — tidak perlu kartu kredit
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.name}
                className="p-6 flex flex-col"
                style={{
                  background: C.bgCard,
                  border: plan.highlight
                    ? `2px solid ${plan.borderColor}`
                    : `1px solid ${plan.borderColor}`,
                  position: 'relative',
                }}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold uppercase tracking-widest"
                    style={{ background: plan.color, color: '#fff', whiteSpace: 'nowrap' }}>
                    Paling Populer
                  </div>
                )}

                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                    style={{ color: plan.color }}>
                    {plan.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black" style={{ color: C.text }}>
                      {plan.price}
                    </span>
                    <span className="text-sm" style={{ color: C.textMuted }}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm"
                      style={{ color: C.textSecondary }}>
                      <CheckCircle size={14} style={{ color: plan.color, flexShrink: 0 }} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link href="/register-company"
                  className="w-full py-3 text-sm font-bold uppercase tracking-widest text-center block"
                  style={{
                    background: plan.highlight ? plan.color : 'transparent',
                    color: plan.highlight ? '#fff' : plan.color,
                    border: `1px solid ${plan.color}`,
                  }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: '60px 24px 80px',
        textAlign: 'center',
      }}>
        <h2 className="text-3xl font-black mb-4" style={{ color: C.text }}>
          Siap digitalisasi lapangan?
        </h2>
        <p className="mb-8 text-sm" style={{ color: C.textSecondary }}>
          Daftar sekarang, gratis 30 hari, tidak perlu kartu kredit.
        </p>
        <Link href="/register-company"
          className="inline-flex items-center gap-2 px-8 py-4 text-sm font-bold uppercase tracking-widest"
          style={{ background: C.orange, color: '#fff' }}>
          <Zap size={16} />
          Mulai Sekarang — Gratis
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${C.border}`,
        padding: '24px',
        textAlign: 'center',
        background: C.bgSection,
      }}>
        <div className="text-lg font-black tracking-[4px] mb-2"
          style={{ fontFamily: 'monospace', color: C.text }}>
          LOG<span style={{ color: C.orange }}>I</span>S
        </div>
        <p className="text-xs" style={{ color: C.textMuted }}>
          © 2026 Logis — Sistem Administrasi & Logistik Konstruksi Indonesia
        </p>
      </footer>
    </div>
  )
}