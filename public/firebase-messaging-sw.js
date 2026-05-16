/*
 * Firebase Cloud Messaging — Background Service Worker
 * ------------------------------------------------------------------
 * Service worker khusus untuk menangani push notification dari FCM
 * saat PWA Logis tidak sedang aktif (background / closed).
 *
 * File ini TIDAK digenerate oleh next-pwa. Didaftarkan secara manual
 * di src/lib/firebase/fcm.ts agar Firebase messaging SDK tahu SW mana
 * yang harus digunakan untuk menerima background messages.
 *
 * NOTE: Server mengirim data-only messages (tanpa top-level
 * `notification`). Jadi service worker INI yang bertanggung jawab
 * memanggil showNotification().
 */

// Parse Firebase config dari URL query string (dikirim saat registrasi)
const params = new URLSearchParams(self.location.search)
const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
}

// Firebase compat SDK v12.13.0 (CDN)
const FIREBASE_VERSION = '12.13.0'
importScripts(
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js`
)

// Inisialisasi Firebase App di service worker
firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

/**
 * Handler untuk background message dari FCM.
 * Dipicu saat app tidak aktif (background / closed).
 *
 * Karena server mengirim data-only message, kita perlu
 * memanggil showNotification() secara manual.
 */
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {}
  const notificationTitle = data.title || 'Logis'
  const notificationBody = data.body || ''
  const href = data.href || '/overview'
  const appUrl = self.location.origin

  const notificationOptions = {
    body: notificationBody,
    icon: data.icon || `${appUrl}/icons/icon-192x192.png`,
    badge: data.badge || `${appUrl}/icons/icon-72x72.png`,
    tag: data.tag || 'logis-push',
    requireInteraction: data.requireInteraction === 'true',
    data: {
      href,
      url: data.url || `${appUrl}${href}`,
      ...data,
    },
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

/**
 * Handler saat user mengetuk notifikasi.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const href = event.notification.data?.href || '/overview'
  const urlToOpen = new URL(href, self.location.origin).href

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Jika sudah ada tab yang terbuka, fokus ke tab tersebut
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Jika belum ada, buka tab baru
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})
