'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import { auth } from '@/lib/firebase/config'
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
} from 'firebase/auth'

function AuthActionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const mode = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  // Reset password states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Verify email states
  const [verifying, setVerifying] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)

  useEffect(() => {
    if (!oobCode) {
      setError('Link tidak valid atau sudah kadaluarsa.')
      setLoading(false)
      return
    }

    async function verifyCode() {
      try {
        if (mode === 'resetPassword' && oobCode) {
          const userEmail = await verifyPasswordResetCode(auth, oobCode)
          setEmail(userEmail)
        } else if (mode === 'verifyEmail' && oobCode) {
          await checkActionCode(auth, oobCode)
        } else {
          setError('Aksi tidak dikenal.')
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Link tidak valid'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    verifyCode()
  }, [mode, oobCode])

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!oobCode) return

    if (newPassword.length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password tidak cocok')
      return
    }

    setResetting(true)
    try {
      await confirmPasswordReset(auth, oobCode, newPassword)
      setSuccess(true)
      toast.success('Password berhasil diubah!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal reset password'
      toast.error(message)
    } finally {
      setResetting(false)
    }
  }

  async function handleVerifyEmail() {
    if (!oobCode) return
    setVerifying(true)
    try {
      await applyActionCode(auth, oobCode)
      setVerifySuccess(true)
      toast.success('Email berhasil diverifikasi!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal verifikasi email'
      toast.error(message)
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 size={32} className="animate-spin mb-4" style={{ color: '#F97316' }} />
        <p className="text-sm" style={{ color: 'rgba(245,240,235,0.5)' }}>
          Memverifikasi link...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-8">
        <div className="p-4 mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle size={32} style={{ color: '#ef4444' }} />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: '#f5f0eb' }}>
          Link Tidak Valid
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'rgba(245,240,235,0.5)' }}>
          {error}
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2.5 text-sm font-bold"
          style={{ background: '#F97316', color: '#0a0a0a' }}
        >
          Kembali ke Login
        </button>
      </div>
    )
  }

  // RESET PASSWORD MODE
  if (mode === 'resetPassword') {
    if (success) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-8">
          <div className="p-4 mb-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <CheckCircle size={32} style={{ color: '#22c55e' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#f5f0eb' }}>
            Password Berhasil Diubah
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: 'rgba(245,240,235,0.5)' }}>
            Password untuk <strong>{email}</strong> telah berhasil diperbarui.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 text-sm font-bold"
            style={{ background: '#F97316', color: '#0a0a0a' }}
          >
            Masuk Sekarang
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#f5f0eb' }}>
              Reset Password
            </h1>
            <p className="text-sm" style={{ color: 'rgba(245,240,235,0.5)' }}>
              Buat password baru untuk akun <strong>{email}</strong>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(245,240,235,0.5)' }}
              >
                Password Baru
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  className="w-full px-4 py-3 pr-12 text-sm outline-none"
                  style={{
                    background: '#111111',
                    border: '1px solid rgba(245,240,235,0.1)',
                    color: '#f5f0eb',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5"
                  style={{ color: 'rgba(245,240,235,0.6)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(245,240,235,0.5)' }}
              >
                Konfirmasi Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full px-4 py-3 text-sm outline-none"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(245,240,235,0.1)',
                  color: '#f5f0eb',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={resetting}
              className="w-full py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              style={{
                background: resetting ? '#c45a0e' : '#F97316',
                color: '#0a0a0a',
                cursor: resetting ? 'not-allowed' : 'pointer',
              }}
            >
              {resetting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                'Simpan Password Baru'
              )}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // VERIFY EMAIL MODE
  if (mode === 'verifyEmail') {
    if (verifySuccess) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-8">
          <div className="p-4 mb-4" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
            <CheckCircle size={32} style={{ color: '#22c55e' }} />
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: '#f5f0eb' }}>
            Email Terverifikasi
          </h1>
          <p className="text-sm text-center mb-6" style={{ color: 'rgba(245,240,235,0.5)' }}>
            Email Anda telah berhasil diverifikasi. Silakan login.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2.5 text-sm font-bold"
            style={{ background: '#F97316', color: '#0a0a0a' }}
          >
            Masuk
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-8">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#f5f0eb' }}>
          Verifikasi Email
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'rgba(245,240,235,0.5)' }}>
          Klik tombol di bawah untuk menyelesaikan verifikasi email Anda.
        </p>
        <button
          onClick={handleVerifyEmail}
          disabled={verifying}
          className="px-6 py-2.5 text-sm font-bold flex items-center gap-2"
          style={{
            background: verifying ? '#c45a0e' : '#F97316',
            color: '#0a0a0a',
            cursor: verifying ? 'not-allowed' : 'pointer',
          }}
        >
          {verifying ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Memverifikasi...
            </>
          ) : (
            'Verifikasi Email Saya'
          )}
        </button>
      </div>
    )
  }

  // Unknown mode
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-8">
      <AlertTriangle size={32} className="mb-4" style={{ color: '#ef4444' }} />
      <h1 className="text-xl font-bold mb-2" style={{ color: '#f5f0eb' }}>
        Aksi Tidak Dikenal
      </h1>
      <button
        onClick={() => router.push('/login')}
        className="px-6 py-2.5 text-sm font-bold"
        style={{ background: '#F97316', color: '#0a0a0a' }}
      >
        Kembali ke Login
      </button>
    </div>
  )
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a]">
          <Loader2 size={32} className="animate-spin mb-4" style={{ color: '#F97316' }} />
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.5)' }}>
            Memuat...
          </p>
        </div>
      }
    >
      <AuthActionContent />
    </Suspense>
  )
}
