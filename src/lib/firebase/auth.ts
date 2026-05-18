import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { auth, db } from './config'
import { LogisUser, UserRole } from '@/types'

// ============================================
// LOGIN
// ============================================
export async function loginUser(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password)
}

// ============================================
// REGISTER PERUSAHAAN BARU (Owner)
// ============================================
export async function registerCompany(data: {
  companyName: string
  companyAddress: string
  companyPhone: string
  ownerName: string
  ownerEmail: string
  password: string
  firstProjectName?: string
}): Promise<void> {
  // 1. Buat user di Firebase Auth
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.ownerEmail,
    data.password
  )
  const uid = credential.user.uid

  // 2. Update display name
  await updateProfile(credential.user, { displayName: data.ownerName })

  // 3. Starter plan (free tier) — 1 proyek, 3 user
  const now = new Date()

  // 4. Buat company document
  const companyId = uid
  await setDoc(doc(db, 'logis_companies', companyId), {
    id: companyId,
    name: data.companyName,
    address: data.companyAddress,
    phone: data.companyPhone,
    ownerName: data.ownerName,
    ownerEmail: data.ownerEmail,
    plan: 'starter',
    trialStartDate: now,
    trialEndDate: now,
    isTrialActive: false,
    maxProjects: 1,
    maxUsers: 3,
    createdAt: serverTimestamp(),
  })

  // 5. Buat user document untuk owner
  await setDoc(
    doc(db, 'logis_companies', companyId, 'users', uid),
    {
      id: uid,
      companyId,
      name: data.ownerName,
      email: data.ownerEmail,
      phone: data.companyPhone,
      role: 'owner' as UserRole,
      projectIds: [],
      isActive: true,
      createdAt: serverTimestamp(),
    }
  )

  // 6. Buat proyek pertama jika nama diberikan
  if (data.firstProjectName?.trim()) {
    await addDoc(collection(db, 'logis_companies', companyId, 'projects'), {
      companyId,
      name: data.firstProjectName.trim(),
      location: '-',
      description: 'Proyek pertama',
      budgetTotal: 0,
      budgetUsed: 0,
      progressPercent: 0,
      status: 'active',
      healthScore: 'healthy',
      pmId: uid,
      startDate: Timestamp.fromDate(new Date()),
      endDate: null,
      createdAt: serverTimestamp(),
    })
  }

  // 7. Simpan ke localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('logis_company_id', companyId)
  }
}

// ============================================
// GET USER DATA dari Firestore
// ============================================
export async function getUserData(
  uid: string,
  companyId: string
): Promise<LogisUser | null> {
  const userDoc = await getDoc(
    doc(db, 'logis_companies', companyId, 'users', uid)
  )
  if (!userDoc.exists()) return null
  return userDoc.data() as LogisUser
}

// ============================================
// GET COMPANY ID dari user
// ============================================
export async function getCompanyIdByUid(
  uid: string
): Promise<string | null> {
  // Owner: companyId = uid mereka sendiri
  const companyDoc = await getDoc(doc(db, 'logis_companies', uid))
  if (companyDoc.exists()) return uid

  // Kalau bukan owner, cari di subcollection
  // (untuk sesi berikutnya saat invite user)
  return null
}

// ============================================
// LOGOUT
// ============================================
export async function logoutUser(): Promise<void> {
  return signOut(auth)
}

// ============================================
// RESET PASSWORD
// ============================================
export async function resetPassword(email: string): Promise<void> {
  const actionCodeSettings = {
    url: 'https://logis-app.web.id/auth/action',
    handleCodeInApp: false,
  }
  return sendPasswordResetEmail(auth, email, actionCodeSettings)
}

// ============================================
// INVITE USER
// ============================================
// Ganti seluruh fungsi createInvite:
export async function createInvite(data: {
  companyId: string
  companyName: string
  email: string
  role: UserRole
  invitedByName: string
  projectId?: string | null  // ← tambahkan ini
}): Promise<string> {
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
  const inviteRef = await addDoc(
    collection(db, 'logis_companies', data.companyId, 'invites'),
    {
      companyId: data.companyId,
      companyName: data.companyName,
      email: data.email.toLowerCase(),
      role: data.role,
      projectId: data.projectId || null,  // ← tambahkan ini
      invitedByName: data.invitedByName,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  )
  return inviteRef.id
}

// ============================================
// REGISTER VIA INVITE
// ============================================
export async function registerViaInvite(data: {
  inviteId: string
  companyId: string
  name: string
  email: string
  password: string
  phone: string
  role: UserRole
  projectId?: string | null  // ← tambahkan
}): Promise<void> {
  const { doc, setDoc, updateDoc, serverTimestamp: st } =
    await import('firebase/firestore')

  // 1. Buat user di Firebase Auth
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  )
  const uid = credential.user.uid

  // 2. Update display name
  await updateProfile(credential.user, { displayName: data.name })

  // 3. Simpan companyId di localStorage SEBELUM Firestore write
  if (typeof window !== 'undefined') {
    localStorage.setItem('logis_company_id', data.companyId)
  }

  // 4. Buat user doc
  await setDoc(
  doc(db, 'logis_companies', data.companyId, 'users', uid),
  {
    id: uid,
    companyId: data.companyId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role,
    projectIds: data.projectId ? [data.projectId] : [],
    assignedProjectId: data.projectId || null,  // ← tambahkan
    isActive: true,
    createdAt: st(),
  }
)

  // 5. Mark invite as used
  try {
    await updateDoc(
      doc(db, 'logis_companies', data.companyId, 'invites', data.inviteId),
      { status: 'used', usedAt: st(), usedBy: uid }
    )
  } catch {
    // Non-critical — lanjutkan meski gagal
    console.warn('Could not mark invite as used')
  }
}

// ============================================
// GET COMPANY ID — Support invited users
// ============================================
export async function getCompanyIdByUidFull(uid: string): Promise<string | null> {
  const { collection, query, where, getDocs, getDoc, doc } = await import('firebase/firestore')

  // Cek apakah owner
  const ownerDoc = await getDoc(doc(db, 'logis_companies', uid))
  if (ownerDoc.exists()) return uid

  // Cari di semua companies — untuk invited users
  // Kita simpan companyId di localStorage saat register via invite
  const storedCompanyId = typeof window !== 'undefined'
    ? localStorage.getItem('logis_company_id')
    : null
  if (storedCompanyId) {
    const userDoc = await getDoc(
      doc(db, 'logis_companies', storedCompanyId, 'users', uid)
    )
    if (userDoc.exists()) return storedCompanyId
  }

  return null
}