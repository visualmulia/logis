import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET() {
  try {
    // Total companies
    const companiesSnap = await adminDb.collection('logis_companies').count().get()
    const totalCompanies = companiesSnap.data().count

    // Total users (collectionGroup)
    const usersSnap = await adminDb.collectionGroup('users').count().get()
    const totalUsers = usersSnap.data().count

    // Total projects (collectionGroup)
    const projectsSnap = await adminDb.collectionGroup('projects').count().get()
    const totalProjects = projectsSnap.data().count

    // Total requests (collectionGroup)
    const requestsSnap = await adminDb.collectionGroup('requests').count().get()
    const totalRequests = requestsSnap.data().count

    // Recent companies
    const recentSnap = await adminDb
      .collection('logis_companies')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    const recentCompanies = recentSnap.docs.map((d) => {
      const data = d.data()
      const createdAt = data.createdAt?.toDate?.()
      return {
        id: d.id,
        name: data.name || '—',
        ownerEmail: data.ownerEmail || '—',
        createdAt: createdAt ? createdAt.toISOString() : null,
      }
    })

    return NextResponse.json({
      totalCompanies,
      totalUsers,
      totalProjects,
      totalRequests,
      recentCompanies,
    })
  } catch (error: unknown) {
    console.error('Admin stats error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
