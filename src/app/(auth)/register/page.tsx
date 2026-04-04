'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react'
import { registerCompany } from '@/lib/firebase/auth'

const registerSchema = z.object({
  companyName: z.string().min(3, 'Nama perusahaan minimal 3 karakter'),
  ownerName: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor HP tidak valid'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

const inputStyle = {
  background: '#111111',
  border: '1px solid rgba(245,240,235,0.1)',
  color: '#f5f0eb',
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterForm) {
  setIsLoading(true)
  try {
    await registerCompany({
  companyName: data.companyName,
  companyAddress: '-',
  companyPhone: data.phone || '-',
  ownerName: data.ownerName,
  ownerEmail: data.email,
  password: data.password,
})
    toast.success('Akun berhasil dibuat! Selamat datang di Logis.')
    
    // Tunggu sebentar supaya Firebase Auth state update dulu
    await new Promise((resolve) => setTimeout(resolve, 1000))
    router.push('/overview')
    
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === 'auth/email-already-in-use') {
      toast.error('Email sudah terdaftar. Silakan login.')
    } else {
      toast.error('Gagal membuat akun. Coba lagi.')
      console.error(error)
    }
  } finally {
    setIsLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div
          className="text-3xl font-black tracking-[6px] mb-10"
          style={{ fontFamily: 'monospace', color: '#f5f0eb' }}
        >
          LOG<span style={{ color: '#F97316' }}>I</span>S
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="p-2"
              style={{
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.3)',
              }}
            >
              <Building2 size={18} style={{ color: '#F97316' }} />
            </div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#F97316' }}
            >
              Daftar Gratis — Paket Starter
            </span>
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: '#f5f0eb' }}
          >
            Daftarkan perusahaan Anda
          </h1>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.5)' }}>
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className="font-medium"
              style={{ color: '#F97316' }}
            >
              Masuk di sini
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company name */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'rgba(245,240,235,0.5)' }}
            >
              Nama Perusahaan
            </label>
            <input
              {...register('companyName')}
              placeholder="PT Karya Bangun Nusantara"
              className="w-full px-4 py-3 text-sm outline-none"
              style={{
                ...inputStyle,
                border: errors.companyName
                  ? '1px solid #ef4444'
                  : inputStyle.border,
              }}
            />
            {errors.companyName && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                {errors.companyName.message}
              </p>
            )}
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(245,240,235,0.5)' }}
              >
                Nama Anda
              </label>
              <input
                {...register('ownerName')}
                placeholder="Budi Hartono"
                className="w-full px-4 py-3 text-sm outline-none"
                style={{
                  ...inputStyle,
                  border: errors.ownerName
                    ? '1px solid #ef4444'
                    : inputStyle.border,
                }}
              />
              {errors.ownerName && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {errors.ownerName.message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(245,240,235,0.5)' }}
              >
                Nomor HP
              </label>
              <input
                {...register('phone')}
                placeholder="08123456789"
                className="w-full px-4 py-3 text-sm outline-none"
                style={{
                  ...inputStyle,
                  border: errors.phone
                    ? '1px solid #ef4444'
                    : inputStyle.border,
                }}
              />
              {errors.phone && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              className="block text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'rgba(245,240,235,0.5)' }}
            >
              Email
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="budi@perusahaan.com"
              className="w-full px-4 py-3 text-sm outline-none"
              style={{
                ...inputStyle,
                border: errors.email
                  ? '1px solid #ef4444'
                  : inputStyle.border,
              }}
            />
            {errors.email && (
              <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(245,240,235,0.5)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 karakter"
                  className="w-full px-4 py-3 pr-10 text-sm outline-none"
                  style={{
                    ...inputStyle,
                    border: errors.password
                      ? '1px solid #ef4444'
                      : inputStyle.border,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(245,240,235,0.3)' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(245,240,235,0.5)' }}
              >
                Konfirmasi
              </label>
              <input
                {...register('confirmPassword')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                className="w-full px-4 py-3 text-sm outline-none"
                style={{
                  ...inputStyle,
                  border: errors.confirmPassword
                    ? '1px solid #ef4444'
                    : inputStyle.border,
                }}
              />
              {errors.confirmPassword && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          {/* Info box */}
          <div
            className="p-4 text-xs leading-relaxed"
            style={{
              background: 'rgba(249,115,22,0.05)',
              border: '1px solid rgba(249,115,22,0.2)',
              color: 'rgba(245,240,235,0.5)',
            }}
          >
            Dengan mendaftar, Anda memulai dengan{' '}
            <span style={{ color: '#F97316', fontWeight: 600 }}>
              Paket Starter gratis
            </span>{' '}
            — 1 proyek aktif, unlimited duration. Upgrade kapan saja saat
            bisnis Anda berkembang.
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 text-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            style={{
              background: isLoading ? '#c45a0e' : '#F97316',
              color: '#0a0a0a',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Membuat akun...
              </>
            ) : (
              'Buat Akun Gratis'
            )}
          </button>
        </form>

        <p
          className="text-xs text-center mt-8"
          style={{ color: 'rgba(245,240,235,0.2)' }}
        >
          © 2025 Logis. Dibuat untuk kontraktor Indonesia.
        </p>
      </div>
    </div>
  )
}