'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { loginUser } from '@/lib/firebase/auth'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    try {
      await loginUser(data.email, data.password)
      toast.success('Selamat datang kembali!')
      router.push('/overview')
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        toast.error('Email atau password salah')
      } else {
        toast.error('Terjadi kesalahan. Coba lagi.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* LEFT — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        {/* Grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow */}
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 65%)',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/">
  <div
    className="text-4xl font-black tracking-[6px]"
    style={{ fontFamily: 'monospace', color: '#f5f0eb' }}
  >
    LOG
    <span style={{ color: '#F97316' }}>I</span>S
  </div>
</Link>
        </div>

        {/* Center quote */}
        <div className="relative z-10">
          <div
            className="text-5xl font-black leading-tight mb-6"
            style={{
              fontFamily: 'monospace',
              color: '#f5f0eb',
              letterSpacing: '1px',
            }}
          >
            KENDALI
            <br />
            <span style={{ color: '#F97316' }}>PENUH</span>
            <br />
            PROYEK ANDA
          </div>
          <p
            className="text-base leading-relaxed"
            style={{ color: 'rgba(245,240,235,0.5)' }}
          >
            Dari satu layar, Anda tahu kondisi semua
            <br />
            proyek secara real-time. Sebelum masalah
            <br />
            kecil jadi kerugian besar.
          </p>
        </div>

        {/* Bottom stats */}
        <div
          className="relative z-10 flex gap-8 pt-8"
          style={{ borderTop: '1px solid rgba(245,240,235,0.08)' }}
        >
          <div>
            <div
              className="text-3xl font-black"
              style={{ color: '#F97316', fontFamily: 'monospace' }}
            >
              4
            </div>
            <div
              className="text-xs mt-1 uppercase tracking-widest"
              style={{ color: 'rgba(245,240,235,0.3)' }}
            >
              Modul Terintegrasi
            </div>
          </div>
          <div>
            <div
              className="text-3xl font-black"
              style={{ color: '#F97316', fontFamily: 'monospace' }}
            >
              91%
            </div>
            <div
              className="text-xs mt-1 uppercase tracking-widest"
              style={{ color: 'rgba(245,240,235,0.3)' }}
            >
              Masalah Bisa Dicegah
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div
            className="lg:hidden text-3xl font-black tracking-[6px] mb-10"
            style={{ fontFamily: 'monospace', color: '#f5f0eb' }}
          >
            LOG<span style={{ color: '#F97316' }}>I</span>S
          </div>

          <div className="mb-8">
            <h1
              className="text-2xl font-bold mb-2"
              style={{ color: '#f5f0eb' }}
            >
              Masuk ke akun Anda
            </h1>
            <p className="text-sm" style={{ color: 'rgba(245,240,235,0.5)' }}>
              Belum punya akun?{' '}
              <Link
                href="/register-company"
                className="font-medium transition-colors"
                style={{ color: '#F97316' }}
              >
                Daftar Perusahaan
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                placeholder="nama@perusahaan.com"
                className="w-full px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: '#111111',
                  border: errors.email
                    ? '1px solid #ef4444'
                    : '1px solid rgba(245,240,235,0.1)',
                  color: '#f5f0eb',
                }}
                onFocus={(e) => {
                  if (!errors.email)
                    e.target.style.border =
                      '1px solid rgba(249,115,22,0.5)'
                }}
                onBlur={(e) => {
                  if (!errors.email)
                    e.target.style.border =
                      '1px solid rgba(245,240,235,0.1)'
                }}
              />
              {errors.email && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
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
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 text-sm outline-none transition-all"
                  style={{
                    background: '#111111',
                    border: errors.password
                      ? '1px solid #ef4444'
                      : '1px solid rgba(245,240,235,0.1)',
                    color: '#f5f0eb',
                  }}
                  onFocus={(e) => {
                    if (!errors.password)
                      e.target.style.border =
                        '1px solid rgba(249,115,22,0.5)'
                  }}
                  onBlur={(e) => {
                    if (!errors.password)
                      e.target.style.border =
                        '1px solid rgba(245,240,235,0.1)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(245,240,235,0.3)' }}
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs mt-1" style={{ color: '#ef4444' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs transition-colors"
                style={{ color: 'rgba(245,240,235,0.4)' }}
              >
                Lupa password?
              </Link>
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
                  Memverifikasi...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-xs text-center mt-8"
            style={{ color: 'rgba(245,240,235,0.2)' }}
          >
            © 2025 Logis. Dibuat untuk kontraktor Indonesia.
          </p>
        </div>
      </div>
    </div>
  )
}