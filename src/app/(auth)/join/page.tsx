'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { registerViaInvite } from '@/lib/firebase/auth'
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor HP tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type JoinForm = z.infer<typeof schema>

interface InviteData {
  companyId: string
  companyName: string
  email: string
  role: string
  invitedByName: string
  status: string
}

export default function JoinPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const inviteId = searchParams.get('invite')
  const companyId = searchParams.get('company')

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [inviteError, setInviteError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<JoinForm>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!inviteId || !companyId) {
      setInviteError('Link undangan tidak valid')
      setLoadingInvite(false)
      return
    }

    getDoc(doc(db, 'logis_companies', companyId, 'invites', inviteId))
      .then((snap) => {
        if (!snap.exists()) {
          setInviteError('Undangan tidak ditemukan')
          return
        }
        const data = snap.data() as InviteData
        if (data.status === 'used') {
          setInviteError('Undangan ini sudah digunakan')
          return
        }
        setInvite(data)
      })
      .catch(() => setInviteError('Gagal memuat undangan'))
      .finally(() => setLoadingInvite(false))
  }, [inviteId, companyId])

  async function onSubmit(data: JoinForm) {
    if (!invite || !inviteId || !companyId) return
    setIsLoading(true)
    try {
      // Simpan companyId dulu sebelum register
      localStorage.setItem('logis_company_id', companyId)

      await registerViaInvite({
        inviteId,
        companyId,
        name: data.name,
        email: invite.email,
        password: data.password,
        phone: data.phone,
        role: invite.role as never,
      })
      toast.success('Akun berhasil dibuat! Selamat bergabung.')
      await new Promise((r) => setTimeout(r, 500))
      router.push('/overview')
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code
      if (code === 'auth/email-already-in-use') {
        toast.error('Email sudah terdaftar. Silakan login.')
        router.push('/login')
      } else {
        toast.error('Gagal membuat akun')
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

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#F97316' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#0a0a0a' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-3xl font-black tracking-[6px] mb-10"
          style={{ fontFamily: 'monospace', color: '#f5f0eb' }}>
          LOG<span style={{ color: '#F97316' }}>I</span>S
        </div>

        {inviteError ? (
          /* Error state */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <XCircle size={32} style={{ color: '#ef4444' }} />
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ color: '#f5f0eb' }}>
              Link Tidak Valid
            </h1>
            <p className="text-sm mb-6" style={{ color: 'rgba(245,240,235,0.4)' }}>
              {inviteError}
            </p>
            <Link href="/login"
              className="text-sm font-semibold"
              style={{ color: '#F97316' }}>
              Kembali ke Login
            </Link>
          </div>
        ) : invite ? (
          /* Valid invite */
          <>
            {/* Invite info */}
            <div className="p-5 mb-6"
              style={{
                background: 'rgba(249,115,22,0.06)',
                border: '1px solid rgba(249,115,22,0.2)',
              }}>
              <div className="flex items-start gap-3">
                <CheckCircle size={18} style={{ color: '#F97316', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-sm font-bold mb-1" style={{ color: '#f5f0eb' }}>
                    Undangan dari {invite.companyName}
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(245,240,235,0.5)' }}>
                    Diundang oleh <strong>{invite.invitedByName}</strong> sebagai{' '}
                    <span className="uppercase font-bold" style={{ color: '#F97316' }}>
                      {invite.role}
                    </span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(245,240,235,0.4)' }}>
                    Email: {invite.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5f0eb' }}>
                Buat akun Anda
              </h1>
              <p className="text-sm" style={{ color: 'rgba(245,240,235,0.4)' }}>
                Lengkapi data untuk mulai menggunakan Logis
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label style={labelStyle}>Nama Lengkap</label>
                <input {...register('name')} placeholder="Nama kamu"
                  style={{ ...inputStyle, border: errors.name ? '1px solid #ef4444' : inputStyle.border }} />
                {errors.name && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.name.message}</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Nomor HP</label>
                <input {...register('phone')} placeholder="08123456789"
                  style={{ ...inputStyle, border: errors.phone ? '1px solid #ef4444' : inputStyle.border }} />
                {errors.phone && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <div className="relative">
                  <input {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 karakter"
                    style={{ ...inputStyle, border: errors.password ? '1px solid #ef4444' : inputStyle.border, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(245,240,235,0.3)' }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.password.message}</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Konfirmasi Password</label>
                <input {...register('confirmPassword')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  style={{ ...inputStyle, border: errors.confirmPassword ? '1px solid #ef4444' : inputStyle.border }} />
                {errors.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.confirmPassword.message}</p>
                )}
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-2"
                style={{
                  background: isLoading ? '#c45a0e' : '#F97316',
                  color: '#0a0a0a',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}>
                {isLoading ? (
                  <><Loader2 size={15} className="animate-spin" />Membuat akun...</>
                ) : 'Bergabung ke ' + invite.companyName}
              </button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  )
}