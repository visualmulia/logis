import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
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

    // 2. Kirim push via server API (FCM V1)
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

    // Kirim via server API route (FCM V1)
    await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        title: params.title,
        body: params.message,
        href: params.href,
      }),
    })
  } catch (err) {
    console.error('Push send failed:', err)
  }
}