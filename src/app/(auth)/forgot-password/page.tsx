'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import { resetPassword } from '@/lib/firebase/auth'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Masukkan email Anda')
      return
    }

    setIsLoading(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
      toast.success('Link reset password telah dikirim ke email Anda')
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code
      if (code === 'auth/user-not-found') {
        toast.error('Email tidak terdaftar')
      } else {
        toast.error('Gagal mengirim email reset. Coba lagi.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/">
          <div
            className="text-3xl font-black tracking-[6px] mb-10"
            style={{ fontFamily: 'monospace', color: '#f5f0eb' }}
          >
            LOG<span style={{ color: '#F97316' }}>I</span>S
          </div>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#f5f0eb' }}>
            Lupa Password?
          </h1>
          <p className="text-sm" style={{ color: 'rgba(245,240,235,0.6)' }}>
            Masukkan email Anda dan kami akan kirimkan link untuk reset password.
          </p>
        </div>

        {sent ? (
          <div
            className="p-6 mb-6"
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="p-2"
                style={{
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                <Mail size={16} style={{ color: '#22c55e' }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                Email Terkirim
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Silakan cek inbox email <strong>{email}</strong> untuk link reset password.
              Link berlaku selama 1 jam.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'rgba(245,240,235,0.5)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(245,240,235,0.1)',
                  color: '#f5f0eb',
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid rgba(249,115,22,0.5)'
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(245,240,235,0.1)'
                }}
              />
            </div>

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
                  Mengirim...
                </>
              ) : (
                'Kirim Link Reset'
              )}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs mt-6 transition-colors"
          style={{ color: 'rgba(245,240,235,0.4)' }}
        >
          <ArrowLeft size={12} />
          Kembali ke Login
        </Link>
      </div>
    </div>
  )
}
