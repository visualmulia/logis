'use client'

import { getFirebaseMessaging } from './config'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './config'

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

    // Ambil FCM token
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
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