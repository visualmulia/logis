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

async function getTokensByRole(companyId: string, targetRoles: string[], senderId: string): Promise<string[]> {
  const tokens: string[] = []
  
  for (const role of targetRoles) {
    const usersSnap = await getDocs(
      query(
        collection(db, 'logis_companies', companyId, 'users'),
        where('role', '==', role),
        where('isActive', '==', true),
      )
    )
    
    usersSnap.docs.forEach((doc) => {
      if (doc.id === senderId) return // Skip sender
      const data = doc.data()
      if (data.fcmToken) tokens.push(data.fcmToken)
    })
  }
  
  return [...new Set(tokens)] // Remove duplicates
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

    // 2. Ambil FCM tokens by role
    const tokens = await getTokensByRole(params.companyId, params.targetRoles, params.createdBy)
    
    if (tokens.length === 0) return

    // 3. Kirim push via API
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
    console.error('Notification error:', err)
  }
}