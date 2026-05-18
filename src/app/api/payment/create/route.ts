import { NextResponse } from 'next/server'
import midtransClient from 'midtrans-client'

const snap = new midtransClient.Snap({
  isProduction: process.env.NODE_ENV === 'production',
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, amount, plan, companyId, customerName, customerEmail } = body

    if (!orderId || !amount || !plan || !companyId || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://logis-app.web.id'

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: customerName || 'Logis User',
        email: customerEmail,
      },
      item_details: [
        {
          id: plan,
          price: amount,
          quantity: 1,
          name: `Logis ${plan.toUpperCase()} Plan`,
        },
      ],
      callbacks: {
        finish: `${appUrl}/upgrade?status=success&order_id=${orderId}`,
        error: `${appUrl}/upgrade?status=failed&order_id=${orderId}`,
      },
      metadata: {
        companyId,
        plan,
      },
    }

    const transaction = await snap.createTransaction(parameter)

    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    })
  } catch (error: unknown) {
    console.error('Midtrans create transaction error:', error)
    const message = error instanceof Error ? error.message : 'Payment creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
