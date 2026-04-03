import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
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
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}