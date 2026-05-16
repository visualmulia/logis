'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection, onSnapshot, query, orderBy,
  deleteDoc, doc, getDocs, updateDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { LogisUser, UserRole, Project } from '@/types'
import { createInvite } from '@/lib/firebase/auth'
import { toast } from 'sonner'
import {
  Plus, Users, Mail, Trash2,
  Loader2, Copy, CheckCircle, X,
  Shield, Clock, FolderOpen, Check,
} from 'lucide-react'

const roleConfig: Record<UserRole, { label: string; color: string; desc: string }> = {
  owner:      { label: 'Owner',          color: '#F97316', desc: 'Akses penuh semua fitur' },
  admin:      { label: 'Admin',          color: '#a78bfa', desc: 'Kelola keuangan & pengadaan' },
  pm:         { label: 'Project Manager',color: '#38bdf8', desc: 'Kelola proyek & approve request' },
  supervisor: { label: 'Supervisor',     color: '#22c55e', desc: 'Monitor lapangan & laporan' },
  logistik:   { label: 'Logistik',       color: '#eab308', desc: 'Kelola gudang & penerimaan' },
  admin_site: { label: 'Admin Proyek',   color: '#f472b6', desc: 'Pegang petty cash lapangan' },
  readonly:   { label: 'Read Only',      color: '#94a3b8', desc: 'Hanya bisa lihat data' },
}

interface Invite {
  id: string
  email: string
  role: UserRole
  status: string
  projectId?: string | null
  createdAt: Date
}

export default function TeamPage() {
  const { companyId, logisUser } = useAuth()
  const [users, setUsers] = useState<LogisUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'logistik' as UserRole,
    projectId: '',
  })
  const [inviting, setInviting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)

  // Edit project assignment — multi select
  const [editingUser, setEditingUser] = useState<LogisUser | null>(null)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [savingProject, setSavingProject] = useState(false)

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
          id: d.id, ...d.data(),
          createdAt: d.data().createdAt?.toDate(),
        } as Invite)))
      }
    )

    getDocs(collection(db, 'logis_companies', companyId, 'projects')).then((snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project)))
    })

    return () => { userUnsub(); inviteUnsub() }
  }, [companyId])

  // Buka modal edit — load existing projectIds
  function openEditModal(user: LogisUser) {
    setEditingUser(user)
    setSelectedProjectIds(user.projectIds || (user.assignedProjectId ? [user.assignedProjectId] : []))
  }

  // Toggle project selection
  function toggleProject(projectId: string) {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    )
  }

  // Save multi-project assignment
  async function handleUpdateProjects() {
    if (!companyId || !editingUser) return
    setSavingProject(true)
    try {
      await updateDoc(
        doc(db, 'logis_companies', companyId, 'users', editingUser.id),
        {
          projectIds: selectedProjectIds,
          // assignedProjectId tetap untuk backward compat — pakai yang pertama
          assignedProjectId: selectedProjectIds[0] || null,
        }
      )
      toast.success(`${editingUser.name} berhasil di-assign ke ${selectedProjectIds.length} proyek!`)
      setEditingUser(null)
    } catch {
      toast.error('Gagal update proyek')
    } finally {
      setSavingProject(false)
    }
  }

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
      projectId: inviteForm.projectId || null,
    })
    const link = `${window.location.origin}/join?invite=${inviteId}&company=${companyId}`
    setGeneratedLink(link)
    
    // ─── Kirim Email Invitation via Resend ──────────────────
    try {
      const emailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: inviteForm.email.toLowerCase().trim(),
          subject: `Undangan Bergabung di Perusahaan Anda — ${roleConfig[inviteForm.role].label}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #1a1a1a; margin-bottom: 8px;">Anda Diundang! 🎉</h2>
              <p style="color: #555; line-height: 1.6;">
                <strong>${logisUser.name}</strong> mengundang Anda bergabung di 
                <strong>Perusahaan Anda</strong> sebagai <strong>${roleConfig[inviteForm.role].label}</strong> 
                di aplikasi <strong>Logis</strong>.
              </p>
              <div style="background: #f5f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0 0 8px 0; color: #555;"><strong>Role:</strong> ${roleConfig[inviteForm.role].label}</p>
                <p style="margin: 0 0 8px 0; color: #555;"><strong>Deskripsi:</strong> ${roleConfig[inviteForm.role].desc}</p>
                <p style="margin: 0; color: #999; font-size: 12px;">Link berlaku selama 7 hari.</p>
              </div>
              <a href="${link}" 
                style="display: inline-block; background: #F97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
                Bergabung Sekarang
              </a>
              <p style="color: #999; font-size: 12px; margin-top: 16px;">
                Jika tombol tidak berfungsi, salin link ini:<br/>
                <span style="color: #F97316;">${link}</span>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #999; font-size: 11px;">
                Email ini dikirim otomatis oleh Logis. Jangan membalas email ini.
              </p>
            </div>
          `,
        }),
      })
      if (emailRes.ok) {
        toast.success('Email undangan terkirim!')
      } else {
        toast.error('Email gagal terkirim, tapi link sudah dibuat.')
      }
    } catch {
      toast.error('Email gagal terkirim, tapi link sudah dibuat.')
    }
    
    toast.success('Link undangan berhasil dibuat!')
  } catch (error) {
    console.error('Invite error:', error)
    toast.error('Koneksi bermasalah. Cek tab Undangan Pending — undangan mungkin sudah tersimpan.')
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

  const inputClass = 'w-full px-4 py-3 text-sm outline-none'
  const inputStyle = {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <p className="text-sm font-semibold tracking-wide mb-1"
            style={{ color: '#F97316' }}>
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
            onClick={() => { setShowInviteModal(true); setGeneratedLink('') }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold w-full sm:w-auto"
            style={{ background: '#F97316', color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Plus size={15} />
            Undang Anggota
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin" style={{ color: '#F97316' }} />
        </div>
      ) : (
        <>
          {/* Users list */}
          <div className="mb-8">
            <p className="text-sm font-semibold tracking-wide mb-3 flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}>
              <Users size={14} />
              Anggota Aktif ({users.length})
            </p>
            <div className="space-y-2">
              {users.map((user) => {
                const role = roleConfig[user.role as UserRole] || roleConfig.readonly
                // Ambil semua nama proyek yang di-assign
                const assignedProjects = projects.filter(
                  (p) => (user.projectIds || []).includes(p.id) ||
                         p.id === user.assignedProjectId
                )
                return (
                  <div key={user.id}
                    className="flex items-center gap-4 p-4"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{
                        background: `${role.color}20`,
                        border: `1px solid ${role.color}40`,
                        color: role.color,
                      }}>
                      {user.name?.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {user.name}
                          {user.id === logisUser?.id && (
                            <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                              (Anda)
                            </span>
                          )}
                        </p>
                        <span className="text-xs px-2 py-0.5 font-semibold rounded-sm"
                          style={{ background: `${role.color}15`, color: role.color }}>
                          {role.label}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {user.email}
                      </p>
                      {/* Assigned projects */}
                      {assignedProjects.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {assignedProjects.map((p) => (
                            <span key={p.id}
                              className="text-xs flex items-center gap-1 px-1.5 py-0.5 rounded-sm"
                              style={{
                                background: 'rgba(249,115,22,0.08)',
                                color: '#F97316',
                                border: '1px solid rgba(249,115,22,0.2)',
                              }}>
                              <FolderOpen size={9} />
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {canManage && user.role !== 'owner' && (
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-xs px-2 py-1 shrink-0 transition-colors"
                          style={{
                            border: '1px solid rgba(249,115,22,0.3)',
                            color: '#F97316',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(249,115,22,0.08)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {assignedProjects.length > 0
                            ? `${assignedProjects.length} Proyek`
                            : '+ Assign Proyek'}
                        </button>
                      )}
                      {user.role === 'owner' && (
                        <Shield size={14} style={{ color: '#F97316' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pending invites */}
          {canManage && pendingInvites.length > 0 && (
            <div>
              <p className="text-sm font-semibold tracking-wide mb-3 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}>
                <Clock size={14} />
                Undangan Pending ({pendingInvites.length})
              </p>
              <div className="space-y-2">
                {pendingInvites.map((invite) => {
                  const role = roleConfig[invite.role as UserRole] || roleConfig.readonly
                  const inviteProject = projects.find((p) => p.id === invite.projectId)
                  return (
                    <div key={invite.id}
                      className="flex items-center gap-4 p-4"
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid rgba(234,179,8,0.2)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}>
                      <Mail size={16} style={{ color: '#eab308', flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs px-2 py-0.5 font-semibold rounded-sm"
                            style={{ background: `${role.color}15`, color: role.color }}>
                            {role.label}
                          </span>
                          {inviteProject && (
                            <span className="text-xs flex items-center gap-1 font-medium" style={{ color: '#F97316' }}>
                              <FolderOpen size={10} />
                              {inviteProject.name}
                            </span>
                          )}
                          <span className="text-xs font-medium" style={{ color: '#ca8a04' }}>Menunggu</span>
                        </div>
                      </div>
                      <button onClick={() => deleteInvite(invite.id)}
                        className="p-1.5 shrink-0"
                        style={{ color: '#ef4444' }}
                        title="Hapus undangan">
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

      {/* ── INVITE MODAL ────────────────────────────────── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full sm:max-w-md"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px 12px 0 0',
            }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 className="text-sm font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-primary)' }}>
                Undang Anggota Tim
              </h3>
              <button onClick={() => { setShowInviteModal(false); setGeneratedLink('') }}
                style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              {!generatedLink ? (
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}>
                      Email Anggota
                    </label>
                    <input type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="email@anggota.com"
                      className={inputClass} style={inputStyle} required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}>
                      Role / Jabatan
                    </label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                      className={inputClass} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {(Object.keys(roleConfig) as UserRole[])
                        .filter((r) => r !== 'owner')
                        .map((r) => (
                          <option key={r} value={r} style={{ background: 'var(--bg-card)' }}>
                            {roleConfig[r].label} — {roleConfig[r].desc}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2"
                      style={{ color: 'var(--text-secondary)' }}>
                      Assign ke Proyek
                    </label>
                    <select
                      value={inviteForm.projectId}
                      onChange={(e) => setInviteForm({ ...inviteForm, projectId: e.target.value })}
                      className={inputClass} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="" style={{ background: 'var(--bg-card)' }}>
                        — Pilih Proyek (opsional) —
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} style={{ background: 'var(--bg-card)' }}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      User akan otomatis diarahkan ke proyek ini setelah login
                    </p>
                  </div>
                  <div className="p-3"
                    style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span style={{ color: '#F97316', fontWeight: 600 }}>
                        {roleConfig[inviteForm.role].label}:
                      </span>{' '}
                      {roleConfig[inviteForm.role].desc}
                    </p>
                  </div>
                  <button type="submit" disabled={inviting}
                    className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: '#F97316', color: '#fff' }}>
                    {inviting
                      ? <><Loader2 size={15} className="animate-spin" />Membuat link...</>
                      : <><Mail size={15} />Buat Link Undangan</>}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} style={{ color: '#22c55e' }} />
                    <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
                      Link undangan berhasil dibuat!
                    </p>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Kirim link ini ke{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{inviteForm.email}</strong>{' '}
                    via WhatsApp atau email. Link berlaku 7 hari.
                  </p>
                  <div className="p-3 flex items-center gap-3"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <p className="text-xs flex-1 truncate font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {generatedLink}
                    </p>
                    <button onClick={copyLink} className="shrink-0"
                      style={{ color: copied ? '#22c55e' : '#F97316' }}>
                      {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <a href={`https://wa.me/?text=${encodeURIComponent(
                    `Halo! Kamu diundang bergabung ke tim Logis. Klik link ini untuk membuat akun: ${generatedLink}`
                  )}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: '#22c55e', color: '#fff' }}>
                    Kirim via WhatsApp
                  </a>
                  <button
                    onClick={() => { setGeneratedLink(''); setInviteForm({ email: '', role: 'logistik', projectId: '' }) }}
                    className="w-full py-2.5 text-sm"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                    Undang Anggota Lain
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROJECT ASSIGNMENT MODAL ───────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h3 className="text-sm font-bold"
                  style={{ color: 'var(--text-primary)' }}>
                  Assign Proyek
                </h3>
                <p className="text-sm mt-0.5" style={{ color: '#F97316' }}>
                  {editingUser.name} · {roleConfig[editingUser.role]?.label}
                </p>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Project checklist */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-sm font-semibold mb-3"
                style={{ color: 'var(--text-secondary)' }}>
                Pilih proyek yang dikelola
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {projects.length === 0 ? (
                  <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                    Belum ada proyek terdaftar
                  </p>
                ) : (
                  projects.map((p) => {
                    const isSelected = selectedProjectIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProject(p.id)}
                        className="w-full flex items-center gap-3 p-3 text-left transition-all"
                        style={{
                          background: isSelected
                            ? 'rgba(249,115,22,0.08)'
                            : 'var(--bg-secondary)',
                          border: isSelected
                            ? '1px solid rgba(249,115,22,0.3)'
                            : '1px solid var(--border-color)',
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-5 h-5 flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? '#F97316' : 'transparent',
                            border: isSelected
                              ? '1px solid #F97316'
                              : '1px solid var(--border-strong)',
                          }}
                        >
                          {isSelected && <Check size={12} color="#fff" />}
                        </div>

                        {/* Proyek info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold"
                            style={{ color: isSelected ? '#F97316' : 'var(--text-primary)' }}>
                            {p.name}
                          </p>
                          {p.location && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {p.location}
                            </p>
                          )}
                        </div>

                        {/* Status proyek */}
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: p.status === 'active' ? '#22c55e' : '#eab308',
                          }}
                        />
                      </button>
                    )
                  })
                )}
              </div>

              {/* Summary */}
              <p className="text-xs mt-3 mb-4"
                style={{ color: selectedProjectIds.length > 0 ? '#F97316' : 'var(--text-muted)' }}>
                {selectedProjectIds.length > 0
                  ? `${selectedProjectIds.length} proyek dipilih`
                  : 'Belum ada proyek dipilih — user tidak akan di-assign ke proyek manapun'}
              </p>
            </div>

            {/* Footer buttons */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleUpdateProjects}
                disabled={savingProject}
                className="flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: '#F97316', color: '#fff' }}>
                {savingProject
                  ? <><Loader2 size={14} className="animate-spin" />Menyimpan...</>
                  : 'Simpan Assignment'}
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-3 text-sm"
                style={{ border: '1px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}