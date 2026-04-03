'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  collection, query, where, orderBy,
  onSnapshot, updateDoc, doc, writeBatch,
  limit
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { LogisNotification } from '@/types'
import { Bell, X, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'

const notifIcons: Record<string, string> = {
  request_new: '📦',
  request_approved: '✅',
  request_rejected: '❌',
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

      // Filter by role
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
            style={{
              background: '#ef4444',
              fontSize: '9px',
              minWidth: '16px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 z-50 overflow-hidden"
          style={{
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
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#f5f0eb' }}
              >
                Notifikasi
              </p>
              {unreadCount > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 font-bold"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: '#ef4444',
                  }}
                >
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs flex items-center gap-1 transition-colors"
                  style={{ color: 'rgba(245,240,235,0.3)' }}
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck size={12} />
                  Baca semua
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
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {notifications.length === 0 ? (
              <div
                className="text-center py-10"
                style={{ color: 'rgba(245,240,235,0.2)' }}
              >
                <Bell
                  size={28}
                  className="mx-auto mb-2 opacity-30"
                  style={{ color: '#f5f0eb' }}
                />
                <p className="text-xs">Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.href}
                  onClick={() => {
                    markAsRead(notif.id)
                    setOpen(false)
                  }}
                  className="flex items-start gap-3 px-4 py-3 transition-all block"
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

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-xs font-semibold leading-tight"
                        style={{
                          color: notif.isRead
                            ? 'rgba(245,240,235,0.6)'
                            : '#f5f0eb',
                        }}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                          style={{ background: '#F97316' }}
                        />
                      )}
                    </div>
                    <p
                      className="text-xs mt-0.5 line-clamp-2 leading-relaxed"
                      style={{ color: 'rgba(245,240,235,0.35)' }}
                    >
                      {notif.message}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: 'rgba(245,240,235,0.2)' }}
                    >
                      {notif.createdAt
                        ? formatDistanceToNow(notif.createdAt, {
                            addSuffix: true,
                            locale: id,
                          })
                        : '—'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}