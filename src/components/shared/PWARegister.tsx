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

  // Register Service Worker untuk PWA (caching, offline, dll.)
  // Dihandle oleh @ducanh2912/next-pwa yang menggenerate sw.js di public/
  useEffect(() => {
    // Skip service worker untuk bot/crawler (Googlebot, dll.)
    const isBot = /bot|crawler|spider|crawling|googleother/i.test(
      navigator.userAgent
    )
    if (isBot || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('PWA SW registered:', reg.scope))
      .catch((err) => console.log('PWA SW failed:', err))
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
        // Prompt manual akan ditangani oleh NotificationPrompt.tsx
      }
    }

    setupPush()
  }, [logisUser, companyId])

  return null
}
