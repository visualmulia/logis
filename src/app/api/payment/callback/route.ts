import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { PLAN_LIMITS } from '@/types'
import crypto from 'crypto'

const VALID_STATUSES = ['capture', 'settlement', 'deny', 'cancel', 'expire', 'pending']

function verifySignature(body: Record<string, unknown>): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY
  if (!serverKey) return false

  const orderId = body.order_id as string
  const statusCode = body.status_code as string
  const grossAmount = body.gross_amount as string
  const signatureKey = body.signature_key as string

  if (!orderId || !statusCode || !grossAmount || !signatureKey) return false

  const payload = orderId + statusCode + grossAmount + serverKey
  const expectedSignature = crypto.createHash('sha512').update(payload).digest('hex')

  return signatureKey === expectedSignature
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      order_id,
      transaction_status,
      gross_amount,
      metadata,
    } = body

    console.log('Midtrans callback:', { order_id, transaction_status, metadata })

    // Verify signature
    if (!verifySignature(body)) {
      console.error('Invalid Midtrans signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    if (!VALID_STATUSES.includes(transaction_status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Extract companyId dan plan dari metadata
    const companyId = metadata?.companyId
    const plan = metadata?.plan

    if (!companyId || !plan) {
      return NextResponse.json(
        { error: 'Missing metadata' },
        { status: 400 }
      )
    }

    // Success payment
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]
      if (!limits) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }

      await adminDb.collection('logis_companies').doc(companyId).update({
        plan: plan,
        isTrialActive: false,
        maxProjects: limits.maxProjects,
        maxUsers: limits.maxUsers,
        subscriptionStartDate: new Date(),
        updatedAt: new Date(),
      })

      // Simpan riwayat pembayaran
      await adminDb
        .collection('logis_companies')
        .doc(companyId)
        .collection('payments')
        .doc(order_id)
        .set({
          orderId: order_id,
          plan: plan,
          amount: Number(gross_amount),
          status: transaction_status,
          paidAt: new Date(),
          createdAt: new Date(),
        })

      return NextResponse.json({ status: 'success', message: 'Payment processed' })
    }

    // Failed/cancelled payment
    if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      await adminDb
        .collection('logis_companies')
        .doc(companyId)
        .collection('payments')
        .doc(order_id)
        .set({
          orderId: order_id,
          plan: plan,
          amount: Number(gross_amount),
          status: transaction_status,
          createdAt: new Date(),
        })

      return NextResponse.json({ status: 'failed', message: 'Payment failed or cancelled' })
    }

    // Pending
    return NextResponse.json({ status: 'pending' })
  } catch (error: unknown) {
    console.error('Midtrans callback error:', error)
    const message = error instanceof Error ? error.message : 'Callback processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
