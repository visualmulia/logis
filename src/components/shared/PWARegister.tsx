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
      // Ambil config dari process.env dan ubah jadi query string
      const firebaseConfig = new URLSearchParams({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      }).toString()

      // Sisipkan config ke URL sw.js
      navigator.serviceWorker
        .register(`/sw.js?${firebaseConfig}`)
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