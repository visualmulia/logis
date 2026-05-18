import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initAdmin() {
  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT

  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT environment variable is not set')
  }

  const serviceAccount = JSON.parse(serviceAccountJson)

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    })
  }

  return getFirestore()
}

export const adminDb = initAdmin()
