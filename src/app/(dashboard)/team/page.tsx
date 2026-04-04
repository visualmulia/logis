'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection, onSnapshot, query, orderBy,
  deleteDoc, doc
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { LogisUser } from '@/types'
import { createInvite } from '@/lib/firebase/auth'
import { toast } from 'sonner'
import {
  Plus, Users, Mail, Trash2,
  Loader2, Copy, CheckCircle, X,
  Shield, Clock
} from 'lucide-react'

type UserRole = 'owner' | 'admin' | 'pm' | 'supervisor' | 'logistik' | 'admin_site' | 'mandor' | 'readonly'

const roleConfig: Record<UserRole, { label: string; color: string; desc: string }> = {
  owner: { label: 'Owner', color: '#F97316', desc: 'Akses penuh semua fitur' },
  admin: { label: 'Admin', color: '#a78bfa', desc: 'Kelola keuangan & pengadaan' },
  pm: { label: 'Project Manager', color: '#38bdf8', desc: 'Kelola proyek & approve request' },
  supervisor: { label: 'Supervisor', color: '#22c55e', desc: 'Monitor lapangan & laporan' },
  logistik: { label: 'Logistik', color: '#eab308', desc: 'Kelola gudang & penerimaan' },
  admin_site: { label: 'Admin Proyek', color: '#f472b6', desc: 'Pegang petty cash lapangan' },
  mandor: { label: 'Mandor', color: 'rgba(245,240,235,0.6)', desc: 'Submit request material' },
  readonly: { label: 'Read Only', color: 'var(--text-muted)', desc: 'Hanya bisa lihat data' },
}

interface Invite {
  id: string
  email: string
  role: UserRole
  status: string
  createdAt: Date
}

export default function TeamPage() {
  const { companyId, logisUser } = useAuth()
  const [users, setUsers] = useState<LogisUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'logistik' as UserRole })
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)

  const canManage = ['owner', 'admin'].includes(logisUser?.role || '')

  useEffect(() => {
    if (!companyId) return

    const userUnsub = onSnapshot(
      query(collection(db, 'logis_companies', companyId, 'users'), orderBy('createdAt', 'asc')),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LogisUser)))
        setLoading(false)
      }
    )

    const inviteUnsub = onSnapshot(
      query(collection(db, 'logis_companies', companyId, 'invites'), orderBy('createdAt', 'desc')),
      (snap) => {
        setInvites(snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
        } as Invite)))
      }
    )

    return () => {
      userUnsub()
      inviteUnsub()
    }
  }, [companyId])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteForm.email.trim() || !companyId || !logisUser) return

    setInviting(true)
    try {
      const inviteId = await createInvite({
        companyId,
        companyName: 'Perusahaan Anda',
        email: inviteForm.email.toLowerCase().trim(),
        role: inviteForm.role,
        invitedByName: logisUser.name,
      })

      const baseUrl = window.location.origin
      const link = `${baseUrl}/join?invite=${inviteId}&company=${companyId}`
      setGeneratedLink(link)
      toast.success('Link undangan berhasil dibuat!')
    } catch {
      toast.error('Gagal membuat undangan')
    } finally {
      setInviting(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    toast.success('Link disalin!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function deleteInvite(inviteId: string) {
    if (!companyId) return
    try {
      await deleteDoc(doc(db, 'logis_companies', companyId, 'invites', inviteId))
      toast.success('Undangan dihapus')
    } catch {
      toast.error('Gagal menghapus undangan')
    }
  }

  const pendingInvites = invites.filter((i) => i.status === 'pending')

  const inputClass = "w-full px-4 py-3 text-sm outline-none"
  const inputStyle = {
    background: 'var(--bg-primary)',
    border: '1px solid rgba(245,240,235,0.08)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: '#F97316' }}
          >
            Manajemen Tim
          </p>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Anggota Tim
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {users.length} anggota aktif
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setShowInviteModal(true)
              setGeneratedLink('')
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest w-full sm:w-auto"
            style={{ background: '#F97316', color: '#0a0a0a' }}
          >
            <Plus size={15} />
            Undang Anggota
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: '#F97316' }}
          />
        </div>
      ) : (
        <>
          {/* Users list */}
          <div className="mb-8">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <Users size={12} />
              Anggota Aktif ({users.length})
            </p>
            <div className="space-y-2">
              {users.map((user) => {
                const role = roleConfig[user.role as UserRole] || roleConfig.readonly
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 p-4"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{
                        background: `${role.color}20`,
                        border: `1px solid ${role.color}40`,
                        color: role.color,
                      }}
                    >
                      {user.name?.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {user.name}
                          {user.id === logisUser?.id && (
                            <span
                              className="ml-2 text-xs"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              (Anda)
                            </span>
                          )}
                        </p>
                        <span
                          className="text-xs px-2 py-0.5 font-semibold"
                          style={{
                            background: `${role.color}15`,
                            color: role.color,
                          }}
                        >
                          {role.label}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {user.email}
                      </p>
                    </div>

                    {user.role === 'owner' && (
                      <Shield
                        size={14}
                        style={{ color: '#F97316', flexShrink: 0 }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pending invites */}
          {canManage && pendingInvites.length > 0 && (
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-muted)' }}
              >
                <Clock size={12} />
                Undangan Pending ({pendingInvites.length})
              </p>
              <div className="space-y-2">
                {pendingInvites.map((invite) => {
                  const role =
                    roleConfig[invite.role as UserRole] || roleConfig.readonly
                  return (
                    <div
                      key={invite.id}
                      className="flex items-center gap-4 p-4"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid rgba(234,179,8,0.15)',
                      }}
                    >
                      <Mail
                        size={16}
                        style={{ color: '#eab308', flexShrink: 0 }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-xs px-2 py-0.5 font-semibold"
                            style={{
                              background: `${role.color}15`,
                              color: role.color,
                            }}
                          >
                            {role.label}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: '#eab308' }}
                          >
                            Menunggu
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteInvite(invite.id)}
                        className="p-1.5 flex-shrink-0"
                        style={{ color: 'rgba(239,68,68,0.5)' }}
                        title="Hapus undangan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.8)' }}
        >
          <div
            className="w-full sm:max-w-md"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid rgba(245,240,235,0.1)',
              borderRadius: '12px 12px 0 0',
            }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}
            >
              <h3
                className="text-sm font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-primary)' }}
              >
                Undang Anggota Tim
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setGeneratedLink('')
                }}
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              {!generatedLink ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-widest mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Email Anggota
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, email: e.target.value })
                      }
                      placeholder="email@anggota.com"
                      className={inputClass}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-semibold uppercase tracking-widest mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Role / Jabatan
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) =>
                        setInviteForm({
                          ...inviteForm,
                          role: e.target.value as UserRole,
                        })
                      }
                      className={inputClass}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      {(Object.keys(roleConfig) as UserRole[])
                        .filter((r) => r !== 'owner')
                        .map((role) => (
                          <option
                            key={role}
                            value={role}
                            style={{ background: '#111' }}
                          >
                            {roleConfig[role].label} — {roleConfig[role].desc}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Role description */}
                  <div
                    className="p-3"
                    style={{
                      background: 'rgba(249,115,22,0.05)',
                      border: '1px solid rgba(249,115,22,0.15)',
                    }}
                  >
                    <p className="text-xs" style={{ color: 'rgba(245,240,235,0.5)' }}>
                      <span
                        style={{ color: '#F97316', fontWeight: 600 }}
                      >
                        {roleConfig[inviteForm.role].label}:
                      </span>{' '}
                      {roleConfig[inviteForm.role].desc}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                    style={{ background: '#F97316', color: '#0a0a0a' }}
                  >
                    {inviting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        Membuat link...
                      </>
                    ) : (
                      <>
                        <Mail size={15} />
                        Buat Link Undangan
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} style={{ color: '#22c55e' }} />
                    <p
                      className="text-sm font-semibold"
                      style={{ color: '#22c55e' }}
                    >
                      Link undangan berhasil dibuat!
                    </p>
                  </div>

                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Kirim link ini ke{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {inviteForm.email}
                    </strong>{' '}
                    via WhatsApp atau email. Link berlaku 7 hari.
                  </p>

                  {/* Link box */}
                  <div
                    className="p-3 flex items-center gap-3"
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid rgba(245,240,235,0.1)',
                    }}
                  >
                    <p
                      className="text-xs flex-1 truncate font-mono"
                      style={{ color: 'rgba(245,240,235,0.5)' }}
                    >
                      {generatedLink}
                    </p>
                    <button
                      onClick={copyLink}
                      className="flex-shrink-0"
                      style={{ color: copied ? '#22c55e' : '#F97316' }}
                    >
                      {copied ? (
                        <CheckCircle size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  </div>

                  {/* WhatsApp share */}
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Halo! Kamu diundang bergabung ke tim Logis. Klik link ini untuk membuat akun: ${generatedLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                    style={{ background: '#22c55e', color: '#fff' }}
                  >
                    📱 Kirim via WhatsApp
                  </a>

                  <button
                    onClick={() => {
                      setGeneratedLink('')
                      setInviteForm({ email: '', role: 'logistik' })
                    }}
                    className="w-full py-2.5 text-sm"
                    style={{
                      border: '1px solid rgba(245,240,235,0.1)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Undang Anggota Lain
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
