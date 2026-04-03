'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  requestNotificationPermission,
  setupForegroundMessages
} from '@/lib/firebase/fcm'
import { toast } from 'sonner'

export default function PWARegister() {
  const { logisUser, companyId } = useAuth()

  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.log('SW failed:', err))
    }
  }, [])

  // Setup FCM setelah user login
  useEffect(() => {
    if (!logisUser || !companyId) return

    async function setupPush() {
      // Cek apakah sudah punya izin
      if (Notification.permission === 'granted') {
        // Sudah ada izin — setup token langsung
        await requestNotificationPermission(logisUser!.id, companyId!)

        // Handle foreground messages (saat app sedang dibuka)
        await setupForegroundMessages((title, body, href) => {
          toast(title, {
            description: body,
            action: {
              label: 'Lihat',
              onClick: () => window.location.href = href,
            },
          })
        })
      } else if (Notification.permission === 'default') {
        // Belum diminta — tunda sampai user ada interaksi
        // Kita akan minta via prompt manual (lihat Step 7)
      }
    }

    setupPush()
  }, [logisUser, companyId])

  return null
}