import { NextRequest, NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = 'noreply@logis-app.web.id'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, subject, html, text } = body

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      )
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend error:', errorData)
      return NextResponse.json(
        { error: 'Failed to send email', details: errorData },
        { status: 500 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, id: data.id })

  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}