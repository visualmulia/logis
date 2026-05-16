'use client'

import { getFirebaseMessaging } from './config'
import { getToken, onMessage, deleteToken } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

/**
 * Scope untuk FCM service worker. Harus sama dengan scope
 * firebase-messaging-sw.js (root).
 */
const FCM_SW_SCOPE = '/'

function getFirebaseConfigQuery(): string {
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  })
  return params.toString()
}

/**
 * Register firebase-messaging-sw.js secara eksplisit.
 * FCM SDK web memerlukan service worker khusus yang meng-handle
 * onBackgroundMessage agar push notification muncul saat app closed.
 */
async function registerFCMServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    const query = getFirebaseConfigQuery()
    const reg = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?${query}`,
      { scope: FCM_SW_SCOPE }
    )
    // Tunggu sampai SW aktif agar getToken() tidak gagal
    const sw = reg.installing || reg.waiting
    if (sw) {
      await new Promise<void>((resolve) => {
        const handler = () => {
          if (reg.active) {
            sw.removeEventListener('statechange', handler)
            resolve()
          }
        }
        sw.addEventListener('statechange', handler)
      })
    }
    return reg
  } catch (err) {
    console.error('FCM SW registration failed:', err)
    return null
  }
}

export async function requestNotificationPermission(
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    // Minta izin notifikasi
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Notification permission denied')
      return false
    }

    const messaging = await getFirebaseMessaging()
    if (!messaging) return false

    // Register FCM service worker secara eksplisit
    const swReg = await registerFCMServiceWorker()
    if (!swReg) return false

    // Ambil FCM token menggunakan FCM SW (bukan SW default dari next-pwa)
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    })

    if (!token) return false

    // Simpan token ke Firestore
    await setDoc(
      doc(db, 'logis_companies', companyId, 'users', userId),
      { fcmToken: token, fcmUpdatedAt: serverTimestamp() },
      { merge: true }
    )

    console.log('FCM token saved:', token.slice(0, 20) + '...')
    return true
  } catch (err) {
    console.error('FCM setup failed:', err)
    return false
  }
}

/**
 * Hapus FCM token dan bersihkan di Firestore.
 * Dipakai saat logout.
 */
export async function removeFCMToken(userId: string, companyId: string): Promise<void> {
  try {
    const messaging = await getFirebaseMessaging()
    if (messaging) {
      await deleteToken(messaging)
    }
    await setDoc(
      doc(db, 'logis_companies', companyId, 'users', userId),
      { fcmToken: null, fcmUpdatedAt: serverTimestamp() },
      { merge: true }
    )
  } catch (err) {
    console.error('FCM token removal failed:', err)
  }
}

export async function setupForegroundMessages(
  onNotification: (title: string, body: string, href: string) => void
) {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Logis'
    const body = payload.notification?.body || ''
    const href = payload.data?.href || '/overview'
    onNotification(title, body, href)
  })
}
