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
  request_new: '📦',
  request_approved: '✅',
  request_rejected: '❌',
  request_po_issued: '📄',
  petty_cash_new: '💰',
  petty_cash_approved: '✅',
  petty_cash_rejected: '❌',
  asset_service_due: '🔧',
  asset_lost: '🚨',
  stock_critical: '⚠️',
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

      const filtered = all.filter(
        (n) =>
          n.targetRoles.includes(logisUser.role) ||
          n.createdBy === logisUser.id
      )

      setNotifications(filtered)
    })

    return () => unsub()
  }, [companyId, logisUser])

  // Close on outside click
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
    notifications
      .filter((n) => !n.isRead)
      .forEach((n) => {
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
    await deleteDoc(
      doc(db, 'logis_companies', companyId, 'notifications', notifId)
    )
  }

  async function deleteAllRead() {
    if (!companyId) return
    const batch = writeBatch(db)
    notifications
      .filter((n) => n.isRead)
      .forEach((n) => {
        batch.delete(
          doc(db, 'logis_companies', companyId, 'notifications', n.id)
        )
      })
    await batch.commit()
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 transition-all"
        style={{ color: open ? '#F97316' : 'rgba(245,240,235,0.4)' }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: '#ef4444', fontSize: '9px', minWidth: '16px' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed sm:absolute z-50 overflow-hidden"
          style={{
            // Desktop: dropdown dari bell
            // Mobile: full width di bawah navbar
            top: 'var(--notif-top, 56px)',
            right: 0,
            left: 'auto',
            width: '320px',
            maxWidth: 'calc(100vw - 16px)',
            background: '#111111',
            border: '1px solid rgba(245,240,235,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(245,240,235,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#f5f0eb' }}>
                Notifikasi
              </p>
              {unreadCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 font-bold"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs flex items-center gap-1"
                  style={{ color: 'rgba(245,240,235,0.4)' }}
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck size={12} />
                  <span className="hidden sm:inline">Baca semua</span>
                </button>
              )}
              {notifications.some((n) => n.isRead) && (
                <button
                  onClick={deleteAllRead}
                  className="text-xs flex items-center gap-1"
                  style={{ color: 'rgba(239,68,68,0.4)' }}
                  title="Hapus semua yang sudah dibaca"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Hapus dibaca</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ color: 'rgba(245,240,235,0.3)' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '420px' }}>
            {notifications.length === 0 ? (
              <div className="text-center py-10"
                style={{ color: 'rgba(245,240,235,0.2)' }}>
                <Bell size={28} className="mx-auto mb-2 opacity-30"
                  style={{ color: '#f5f0eb' }} />
                <p className="text-xs">Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 px-4 py-3 transition-all group"
                  style={{
                    background: notif.isRead
                      ? 'transparent'
                      : 'rgba(249,115,22,0.04)',
                    borderBottom: '1px solid rgba(245,240,235,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(245,240,235,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notif.isRead
                      ? 'transparent'
                      : 'rgba(249,115,22,0.04)'
                  }}
                >
                  {/* Icon */}
                  <span className="text-base flex-shrink-0 mt-0.5">
                    {notifIcons[notif.type] || '🔔'}
                  </span>

                  {/* Content — clickable */}
                  <Link
                    href={notif.href}
                    onClick={() => {
                      markAsRead(notif.id)
                      setOpen(false)
                    }}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold leading-tight"
                        style={{
                          color: notif.isRead
                            ? 'rgba(245,240,235,0.6)'
                            : '#f5f0eb',
                        }}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                          style={{ background: '#F97316' }} />
                      )}
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed"
                      style={{
                        color: 'rgba(245,240,235,0.4)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>
                      {notif.message}
                    </p>
                    <p className="text-xs mt-1"
                      style={{ color: 'rgba(245,240,235,0.2)' }}>
                      {notif.createdAt
                        ? formatDistanceToNow(notif.createdAt, {
                            addSuffix: true,
                            locale: id,
                          })
                        : '—'}
                    </p>
                  </Link>

                  {/* Delete button — selalu terlihat di mobile, hover di desktop */}
                  <button
                    onClick={(e) => deleteNotif(e, notif.id)}
                    className="flex-shrink-0 p-1 mt-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    style={{ color: 'rgba(239,68,68,0.5)' }}
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
              style={{ borderTop: '1px solid rgba(245,240,235,0.06)' }}
            >
              <p className="text-xs" style={{ color: 'rgba(245,240,235,0.2)' }}>
                {notifications.length} notifikasi
              </p>
              <button
                onClick={deleteAllRead}
                className="text-xs flex items-center gap-1"
                style={{ color: 'rgba(239,68,68,0.35)' }}
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