'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { registerCompany } from '@/lib/firebase/auth'
import {
  Loader2, Eye, EyeOff,
  Building2, CheckCircle
} from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  companyName: z.string().min(3, 'Nama perusahaan minimal 3 karakter'),
  companyAddress: z.string().min(10, 'Alamat minimal 10 karakter'),
  companyPhone: z.string().min(10, 'Nomor telepon tidak valid'),
  ownerName: z.string().min(2, 'Nama minimal 2 karakter'),
  ownerEmail: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof schema>

export default function RegisterCompanyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  })

  async function nextStep() {
    const valid = await trigger(['companyName', 'companyAddress', 'companyPhone'])
    if (valid) setStep(2)
  }

  async function onSubmit(data: RegisterForm) {
    setIsLoading(true)
    try {
      await registerCompany({
        companyName: data.companyName,
        companyAddress: data.companyAddress,
        companyPhone: data.companyPhone,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        password: data.password,
      })
      toast.success('Perusahaan berhasil didaftarkan! Selamat datang di Logis.')
      await new Promise((r) => setTimeout(r, 500))
      router.push('/overview')
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code
      if (code === 'auth/email-already-in-use') {
        toast.error('Email sudah terdaftar. Silakan login.')
        router.push('/login')
      } else {
        toast.error('Gagal mendaftarkan perusahaan. Coba lagi.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    background: '#111111',
    border: '1px solid rgba(245,240,235,0.1)',
    color: '#f5f0eb',
    outline: 'none',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,240,235,0.5)',
    marginBottom: '8px',
  }

  const errorStyle = { color: '#ef4444', fontSize: '11px', marginTop: '4px' }

  return (
    <div className="min-h-screen flex"
      style={{ background: '#0a0a0a' }}>

      {/* Left — Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/">
            <div className="text-2xl font-black tracking-[4px] mb-10"
              style={{ fontFamily: 'monospace', color: '#f5f0eb' }}>
              LOG<span style={{ color: '#F97316' }}>I</span>S
            </div>
          </Link>

          {/* Trial badge */}
          <div className="flex items-center gap-2 px-4 py-2 mb-6 w-fit"
            style={{
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.2)',
            }}>
            <CheckCircle size={13} style={{ color: '#F97316' }} />
            <span className="text-xs font-semibold" style={{ color: '#F97316' }}>
              Trial 30 hari — Full fitur — Gratis
            </span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: step >= s ? '#F97316' : 'rgba(245,240,235,0.08)',
                    color: step >= s ? '#0a0a0a' : 'rgba(245,240,235,0.3)',
                  }}>
                  {s}
                </div>
                <span className="text-xs"
                  style={{ color: step >= s ? '#f5f0eb' : 'rgba(245,240,235,0.3)' }}>
                  {s === 1 ? 'Data Perusahaan' : 'Akun Owner'}
                </span>
                {s === 1 && (
                  <div className="w-8 h-px mx-1"
                    style={{ background: step > 1 ? '#F97316' : 'rgba(245,240,235,0.1)' }} />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* STEP 1 — Data Perusahaan */}
            {step === 1 && (
              <>
                <div>
                  <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5f0eb' }}>
                    Daftarkan Perusahaan
                  </h1>
                  <p className="text-sm mb-6" style={{ color: 'rgba(245,240,235,0.4)' }}>
                    Data perusahaan konstruksi Anda
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Nama Perusahaan</label>
                  <input {...register('companyName')}
                    placeholder="PT. Bangun Sejahtera Indonesia"
                    style={{
                      ...inputStyle,
                      border: errors.companyName
                        ? '1px solid #ef4444'
                        : inputStyle.border,
                    }} />
                  {errors.companyName && (
                    <p style={errorStyle}>{errors.companyName.message}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Alamat Perusahaan</label>
                  <textarea {...register('companyAddress')}
                    placeholder="Jl. Raya Kuta No. 88, Kuta, Badung, Bali"
                    rows={2}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      border: errors.companyAddress
                        ? '1px solid #ef4444'
                        : inputStyle.border,
                    }} />
                  {errors.companyAddress && (
                    <p style={errorStyle}>{errors.companyAddress.message}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Nomor Telepon PIC</label>
                  <input {...register('companyPhone')}
                    placeholder="08123456789"
                    style={{
                      ...inputStyle,
                      border: errors.companyPhone
                        ? '1px solid #ef4444'
                        : inputStyle.border,
                    }} />
                  {errors.companyPhone && (
                    <p style={errorStyle}>{errors.companyPhone.message}</p>
                  )}
                </div>

                <button type="button" onClick={nextStep}
                  className="w-full py-3 text-sm font-bold uppercase tracking-widest mt-2"
                  style={{ background: '#F97316', color: '#0a0a0a' }}>
                  Lanjut →
                </button>
              </>
            )}

            {/* STEP 2 — Akun Owner */}
            {step === 2 && (
              <>
                <div>
                  <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5f0eb' }}>
                    Buat Akun Owner
                  </h1>
                  <p className="text-sm mb-6" style={{ color: 'rgba(245,240,235,0.4)' }}>
                    Akun ini akan jadi admin utama perusahaan
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Nama Lengkap</label>
                  <input {...register('ownerName')}
                    placeholder="Nama Anda"
                    style={{
                      ...inputStyle,
                      border: errors.ownerName
                        ? '1px solid #ef4444'
                        : inputStyle.border,
                    }} />
                  {errors.ownerName && (
                    <p style={errorStyle}>{errors.ownerName.message}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Email</label>
                  <input {...register('ownerEmail')}
                    type="email"
                    placeholder="email@perusahaan.com"
                    style={{
                      ...inputStyle,
                      border: errors.ownerEmail
                        ? '1px solid #ef4444'
                        : inputStyle.border,
                    }} />
                  {errors.ownerEmail && (
                    <p style={errorStyle}>{errors.ownerEmail.message}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Password</label>
                  <div className="relative">
                    <input {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 karakter"
                      style={{
                        ...inputStyle,
                        paddingRight: '44px',
                        border: errors.password
                          ? '1px solid #ef4444'
                          : inputStyle.border,
                      }} />
                    <button type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(245,240,235,0.3)' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p style={errorStyle}>{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Konfirmasi Password</label>
                  <input {...register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    style={{
                      ...inputStyle,
                      border: errors.confirmPassword
                        ? '1px solid #ef4444'
                        : inputStyle.border,
                    }} />
                  {errors.confirmPassword && (
                    <p style={errorStyle}>{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="px-5 py-3 text-sm font-semibold"
                    style={{
                      border: '1px solid rgba(245,240,235,0.1)',
                      color: 'rgba(245,240,235,0.4)',
                    }}>
                    ← Kembali
                  </button>
                  <button type="submit" disabled={isLoading}
                    className="flex-1 py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                    style={{
                      background: isLoading ? '#c45a0e' : '#F97316',
                      color: '#0a0a0a',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}>
                    {isLoading ? (
                      <><Loader2 size={15} className="animate-spin" />Mendaftarkan...</>
                    ) : (
                      <><Building2 size={15} />Daftarkan Perusahaan</>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="text-xs text-center mt-6" style={{ color: 'rgba(245,240,235,0.3)' }}>
            Sudah punya akun?{' '}
            <Link href="/login" style={{ color: '#F97316' }}>
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Info panel (desktop only) */}
      <div className="hidden lg:flex flex-col justify-center p-12 w-96"
        style={{
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
}}>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#F97316' }}>
            Yang kamu dapatkan
          </p>
          <h2 className="text-xl font-bold mb-6" style={{ color: '#f5f0eb' }}>
            Trial 30 hari,<br />semua fitur aktif
          </h2>
          <div className="space-y-4">
            {[
              'Request material dari lapangan',
              'Gudang digital real-time',
              'Equipment tracker',
              'Petty cash dengan approval',
              'Export laporan PDF',
              'Push notification ke HP',
              'Invite tim unlimited',
              'Dashboard command center',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle size={14} style={{ color: '#F97316', flexShrink: 0 }} />
                <span className="text-sm" style={{ color: 'rgba(245,240,235,0.6)' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4"
          style={{
            background: 'rgba(249,115,22,0.06)',
            border: '1px solid rgba(249,115,22,0.15)',
          }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#F97316' }}>
            Tidak perlu kartu kredit
          </p>
          <p className="text-xs" style={{ color: 'rgba(245,240,235,0.4)' }}>
            Daftar gratis, coba 30 hari penuh,
            baru putuskan plan yang cocok.
          </p>
        </div>
      </div>
    </div>
  )
}