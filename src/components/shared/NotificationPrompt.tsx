'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { requestNotificationPermission } from '@/lib/firebase/fcm'
import { Bell, X } from 'lucide-react'

export default function NotificationPrompt() {
  const { logisUser, companyId } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!logisUser) return

    // Tampilkan prompt hanya jika belum pernah diminta
    const dismissed = localStorage.getItem('logis_notif_dismissed')
    if (dismissed) return

    if (
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      // Delay 3 detik supaya tidak langsung muncul
      const timer = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [logisUser])

  async function handleAllow() {
    if (!logisUser || !companyId) return
    setShow(false)
    const success = await requestNotificationPermission(
      logisUser.id,
      companyId
    )
    if (success) {
      localStorage.setItem('logis_notif_dismissed', 'allowed')
    }
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('logis_notif_dismissed', 'dismissed')
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-50 p-4"
      style={{
        background: '#1a1a1a',
        border: '1px solid rgba(249,115,22,0.3)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(249,115,22,0.1)',
            border: '1px solid rgba(249,115,22,0.3)',
          }}
        >
          <Bell size={18} style={{ color: '#F97316' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold mb-1" style={{ color: '#f5f0eb' }}>
            Aktifkan Notifikasi
          </p>
          <p
            className="text-xs leading-relaxed mb-3"
            style={{ color: 'rgba(245,240,235,0.5)' }}
          >
            Dapatkan alert langsung di HP saat ada request baru,
            approval, atau hal yang perlu perhatian — meski Logis
            tidak sedang dibuka.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAllow}
              className="flex-1 py-2 text-xs font-bold uppercase tracking-widest"
              style={{ background: '#F97316', color: '#0a0a0a' }}
            >
              Aktifkan
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-xs"
              style={{
                border: '1px solid rgba(245,240,235,0.1)',
                color: 'rgba(245,240,235,0.4)',
              }}
            >
              Nanti
            </button>
          </div>
        </div>
        <button onClick={handleDismiss}
          style={{ color: 'rgba(245,240,235,0.3)', flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}