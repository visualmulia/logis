import { NextRequest, NextResponse } from 'next/server'
import { GoogleAuth } from 'google-auth-library'

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
          notification: {
            title,
            body,
          },
          webpush: {
            notification: {
              title,
              body,
              icon: `${appUrl}/icons/icon-192x192.png`,
              badge: `${appUrl}/icons/icon-72x72.png`,
              click_action: `${appUrl}${href}`,
            },
            fcm_options: {
              link: `${appUrl}${href}`,
            },
          },
          data: {
            href,
            url: `${appUrl}${href}`,
          },
        },
      }),
    }
  )

  if (!res.ok) {
    const error = await res.text()
    return { success: false, token, error }
  }

  return { success: true, token }
}

export async function POST(req: NextRequest) {
  try {
    const { tokens, title, body, href } = await req.json()

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({ message: 'No tokens provided' }, { status: 400 })
    }

    if (!process.env.FCM_SERVICE_ACCOUNT) {
      return NextResponse.json(
        { message: 'FCM_SERVICE_ACCOUNT not configured' },
        { status: 500 }
      )
    }

    const accessToken = await getAccessToken()

    const results = await Promise.allSettled(
      tokens.map((token: string) =>
        sendToToken(token, title, body, href || '/', accessToken)
      )
    )

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length

    const failed = results.filter(
      (r) => r.status === 'rejected' ||
        (r.status === 'fulfilled' && !r.value.success)
    ).length

    return NextResponse.json({
      message: `Sent ${succeeded}/${tokens.length} notifications`,
      succeeded,
      failed,
    })
  } catch (error) {
    console.error('FCM send error:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    )
  }
}