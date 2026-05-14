import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'
import { z } from 'zod'

// ─── Rate Limiting ─────────────────────────────────────────────
const rateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 menit
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

async function sendToToken(
  token: string,
  title: string,
  body: string,
  href: string,
  accessToken: string
): Promise<{ success: boolean; token: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logis-rho.vercel.app'

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon: `${appUrl}/icons/icon-192x192.png`,
              badge: `${appUrl}/icons/icon-72x72.png`,
              click_action: `${appUrl}${href}`,
            },
            fcm_options: { link: `${appUrl}${href}` },
          },
          data: { href, url: `${appUrl}${href}` },
        },
      }),
    }
  )

  if (!res.ok) {
    const errorText = await res.text()
    return { success: false, token, error: errorText }
  }

  return { success: true, token }
}

// ─── POST Handler ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Rate limit check
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', retryAfter: 60 },
      { status: 429 }
    )
  }

  // Validate body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const parseResult = notificationSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parseResult.error.issues },
      { status: 400 }
    )
  }

  const { tokens, title, body: messageBody, href } = parseResult.data

  // Validate FCM config
  if (!process.env.FCM_SERVICE_ACCOUNT || !PROJECT_ID) {
    return NextResponse.json(
      { error: 'FCM not configured on server' },
      { status: 500 }
    )
  }

  try {
    const accessToken = await getAccessToken()

    const results = await Promise.all(
      tokens.map((token) => sendToToken(token, title, messageBody, href, accessToken))
    )

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount
    const failures = results.filter((r) => !r.success).map((r) => ({
      token: r.token,
      error: r.error,
    }))

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      failures: failures.length > 0 ? failures : undefined,
    })
  } catch (error) {
    console.error('FCM send error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
