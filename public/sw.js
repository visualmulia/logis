const CACHE_NAME = 'logis-v1'
const STATIC_ASSETS = [
  '/',
  '/overview',
  '/offline',
]

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate
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

// Fetch — Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET dan Firebase requests
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('firestore') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis')
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response baru
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback ke cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/offline')
        })
      })
  )
})