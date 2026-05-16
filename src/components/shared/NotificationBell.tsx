'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection, query, orderBy,
  onSnapshot, updateDoc, doc, writeBatch,
  deleteDoc, limit
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { LogisNotification } from '@/types'
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

const notifIcons: Record<string, string> = {
  request_new:          '📦',
  request_approved:     '✅',
  request_rejected:     '❌',
  request_po_issued:    '📄',
  request_on_delivery:  '🚛',
  request_completed:    '✅',
  request_discrepancy:  '⚠️',
  request_pm_review:    '👀',
  request_revision:     '🔄',
  project_progress:     '📈',
  petty_cash_new:       '💰',
  petty_cash_approved:  '✅',
  petty_cash_rejected:  '❌',
  asset_service_due:    '🔧',
  asset_lost:           '🚨',
  stock_critical:       '⚠️',
}

// Warna tetap — panel selalu dark (#111) jadi warna teks harus terang
const C = {
  title:      '#ffffff',              // ← putih solid, tidak transparan
  message:    'rgba(255,255,255,0.88)', // ← lebih terang
  time:       'rgba(255,255,255,0.60)', // ← sedikit lebih terang
  header:     '#ffffff',
  badge:      '#ef4444',
  divider:    'rgba(255,255,255,0.12)',
  deleteBtn:  '#ff6b6b',
  deleteAll:  '#ff6b6b',
  markRead:   'rgba(255,255,255,0.75)',
  counter:    'rgba(255,255,255,0.55)',
  unreadDot:  '#F97316',
  unreadBg:   'rgba(249,115,22,0.12)',
  hoverBg:    'rgba(255,255,255,0.10)',
}

export default function NotificationBell() {
  const { companyId, logisUser } = useAuth()
  const [notifications, setNotifications] = useState<LogisNotification[]>([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    if (!companyId || !logisUser) return
    const q = query(
      collection(db, 'logis_companies', companyId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    )
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
      })) as LogisNotification[]
      setNotifications(
        all.filter(
          (n) =>
            n.targetRoles.includes(logisUser.role) ||
            n.createdBy === logisUser.id
        )
      )
    })
    return () => unsub()
  }, [companyId, logisUser])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markAsRead(notifId: string) {
    if (!companyId) return
    await updateDoc(
      doc(db, 'logis_companies', companyId, 'notifications', notifId),
      { isRead: true }
    )
  }

  async function markAllRead() {
    if (!companyId) return
    const batch = writeBatch(db)
    notifications.filter((n) => !n.isRead).forEach((n) => {
      batch.update(
        doc(db, 'logis_companies', companyId, 'notifications', n.id),
        { isRead: true }
      )
    })
    await batch.commit()
  }

  async function deleteNotif(e: React.MouseEvent, notifId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!companyId) return
    await deleteDoc(doc(db, 'logis_companies', companyId, 'notifications', notifId))
  }

  async function deleteAllRead() {
    if (!companyId) return
    const batch = writeBatch(db)
    notifications.filter((n) => n.isRead).forEach((n) => {
      batch.delete(doc(db, 'logis_companies', companyId, 'notifications', n.id))
    })
    await batch.commit()
  }

  return (
    <div ref={panelRef} style={{ position: 'relative', zIndex: 100 }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 transition-all"
        style={{ color: open ? '#F97316' : 'rgba(245,240,235,0.4)' }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center rounded-full text-white font-bold"
            style={{
              background: C.badge,
              fontSize: '9px',
              minWidth: '16px',
              height: '16px',
              padding: '0 3px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute z-50 overflow-hidden"
          style={{
            bottom: 'calc(100% + 8px)',
            left: 0,
            right: 'auto',
            width: '320px',
            maxWidth: 'calc(100vw - 80px)',
            background: '#111111',
            border: '1px solid rgba(245,240,235,0.12)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${C.divider}` }}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest"
                style={{ color: C.header }}>
                Notifikasi
              </p>
              {unreadCount > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 font-bold rounded"
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#ff6b6b' }}
                >
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs flex items-center gap-1 transition-opacity hover:opacity-100"
                  style={{ color: C.markRead }}
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck size={12} />
                  <span>Baca semua</span>
                </button>
              )}
              {notifications.some((n) => n.isRead) && (
                <button
                  onClick={deleteAllRead}
                  className="text-xs flex items-center gap-1 transition-opacity hover:opacity-100"
                  style={{ color: C.deleteAll }}
                  title="Hapus semua yang sudah dibaca"
                >
                  <Trash2 size={12} />
                  <span>Hapus</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ color: C.markRead }}
                className="hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell size={28} className="mx-auto mb-2"
                  style={{ color: 'rgba(245,240,235,0.2)' }} />
                <p className="text-xs" style={{ color: C.time }}>
                  Tidak ada notifikasi
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 px-4 py-3 group transition-colors"
                  style={{
                    background: notif.isRead ? 'transparent' : C.unreadBg,
                    borderBottom: `1px solid ${C.divider}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.hoverBg
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notif.isRead
                      ? 'transparent'
                      : C.unreadBg
                  }}
                >
                  {/* Icon */}
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {notifIcons[notif.type] || '🔔'}
                  </span>

                  {/* Content */}
                  <Link
  href={notif.href}
  onClick={() => { markAsRead(notif.id); setOpen(false) }}
  className="flex-1 min-w-0 cursor-pointer block"
>
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-xs font-semibold leading-snug"
                        style={{ color: notif.isRead ? C.message : C.title }}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                          style={{ background: C.unreadDot }}
                        />
                      )}
                    </div>
                    <p
                      className="text-xs leading-relaxed mb-1"
                      style={{
                        color: C.message,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}
                    >
                      {notif.message}
                    </p>
                    <p className="text-xs" style={{ color: C.time }}>
                      {notif.createdAt
                        ? formatDistanceToNow(notif.createdAt, {
                            addSuffix: true,
                            locale: id,
                          })
                        : '—'}
                    </p>
                  </Link>

                  {/* Tombol hapus — selalu terlihat */}
                  <button
                    onClick={(e) => deleteNotif(e, notif.id)}
                    className="flex-shrink-0 p-1 mt-0.5 transition-opacity"
                    style={{ color: C.deleteBtn }}
                    title="Hapus notifikasi"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderTop: `1px solid ${C.divider}` }}
            >
              <p className="text-xs" style={{ color: C.counter }}>
                {notifications.length} notifikasi
              </p>
              <button
                onClick={deleteAllRead}
                className="text-xs flex items-center gap-1 transition-opacity hover:opacity-100"
                style={{ color: C.deleteAll }}
              >
                <Trash2 size={11} />
                Hapus yang sudah dibaca
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}