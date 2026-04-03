import {
  collection, addDoc, serverTimestamp,
  getDocs, query, where
} from 'firebase/firestore'
import { db } from './config'
import { NotificationType } from '@/types'

interface CreateNotifParams {
  companyId: string
  type: NotificationType
  title: string
  message: string
  href: string
  createdBy: string
  createdByName: string
  targetRoles: string[]
}

export async function createNotification(params: CreateNotifParams) {
  try {
    // 1. Simpan ke Firestore (in-app notification)
    await addDoc(
      collection(db, 'logis_companies', params.companyId, 'notifications'),
      {
        companyId: params.companyId,
        type: params.type,
        title: params.title,
        message: params.message,
        href: params.href,
        isRead: false,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        targetRoles: params.targetRoles,
        createdAt: serverTimestamp(),
      }
    )

    // 2. Kirim push ke user yang punya FCM token
    await sendPushToTargets(params)
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

async function sendPushToTargets(params: CreateNotifParams) {
  try {
    // Ambil semua user yang punya FCM token dan role sesuai
    const usersSnap = await getDocs(
      query(
        collection(db, 'logis_companies', params.companyId, 'users'),
        where('isActive', '==', true)
      )
    )

    const tokens: string[] = []
    usersSnap.docs.forEach((d) => {
      const data = d.data()
      // Skip pengirim notifikasi
      if (d.id === params.createdBy) return
      // Cek role
      if (!params.targetRoles.includes(data.role)) return
      // Ambil FCM token kalau ada
      if (data.fcmToken) tokens.push(data.fcmToken)
    })

    if (tokens.length === 0) return

    // Kirim via FCM REST API
    await Promise.allSettled(
      tokens.map((token) =>
        fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${process.env.NEXT_PUBLIC_FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: params.title,
              body: params.message,
              icon: '/icons/icon-192x192.png',
              click_action: `https://logis-rho.vercel.app${params.href}`,
            },
            data: {
              href: params.href,
            },
          }),
        })
      )
    )
  } catch (err) {
    console.error('Push send failed:', err)
  }
}