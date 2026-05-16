import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'
import { z } from 'zod'

// ─── Rate Limiting ─────────────────────────────────────────────
const rateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 10

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimit.get(ip)
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) return false
  record.count++
  return true
}

// ─── Zod Validation ────────────────────────────────────────────
const notificationSchema = z.object({
  tokens: z.array(z.string().min(1)).min(1).max(500),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  href: z.string().max(200).optional().default('/'),
})

// ─── FCM Config ────────────────────────────────────────────────
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT || '{}')
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  })
  const client = await auth.getClient()
  const tokenResponse = await client.getAccessToken()
  return tokenResponse.token || ''
}

// ─── POST Handler ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests', retryAfter: 60 }, { status: 429 })
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parseResult = notificationSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Validation failed', details: parseResult.error.issues }, { status: 400 })
  }

  const { tokens, title, body: messageBody, href } = parseResult.data

  if (!process.env.FCM_SERVICE_ACCOUNT || !PROJECT_ID) {
    return NextResponse.json({ error: 'FCM not configured' }, { status: 500 })
  }

  try {
    const accessToken = await getAccessToken()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.logis-app.web.id'

    const results = await Promise.all(
      tokens.map(async (token) => {
        try {
          const res = await fetch(
            `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              // ── Data-only message ──
              // Kita kirim SEMUA data di `data` payload (bukan `notification`).
              // Ini memaksa FCM untuk selalu memanggil service worker kita
              // (firebase-messaging-sw.js) via onBackgroundMessage,
              // sehingga kita punya full control atas click behavior & display.
              body: JSON.stringify({
                message: {
                  token,
                  data: {
                    title,
                    body: messageBody,
                    href,
                    url: `${appUrl}${href}`,
                    icon: `${appUrl}/icons/icon-192x192.png`,
                    badge: `${appUrl}/icons/icon-72x72.png`,
                    tag: 'logis-push',
                    requireInteraction: 'true',
                  },
                  webpush: {
                    fcm_options: { link: `${appUrl}${href}` },
                    headers: {
                      Urgency: 'high',
                    },
                  },
                },
              }),
            }
          )

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}))
            console.warn('FCM send failed for token:', token.slice(0, 20) + '...', errData)
            // TODO: Jika error UNREGISTERED / INVALID_ARGUMENT,
            // hapus token dari Firestore agar tidak terus dikirim.
            // Butuh Firebase Admin SDK untuk akses Firestore dari server.
          }

          return res.ok
        } catch { return false }
      })
    )

    const sent = results.filter(Boolean).length
    return NextResponse.json({ success: true, sent, failed: results.length - sent })

  } catch (error) {
    console.error('FCM error:', error)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
