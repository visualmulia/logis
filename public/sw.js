const CACHE_NAME = 'logis-v2'

// Install — minimal cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/offline'])
    })
  )
  self.skipWaiting()
})

// Activate — hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch — HANYA intercept untuk offline fallback
// Jangan cache halaman auth/join
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip semua request ini — biarkan browser handle normal
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/join') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/_next') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('securetoken')
  ) {
    return // Biarkan request jalan normal
  }

  // Untuk halaman lain — network first, fallback offline
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match('/offline') || new Response('Offline')
      })
  )
})