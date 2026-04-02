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
  serverTimestamp,
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
  ownerName: string
  email: string
  password: string
  phone: string
}): Promise<void> {
  // 1. Buat user di Firebase Auth
  const credential = await createUserWithEmailAndPassword(
    auth,
    data.email,
    data.password
  )

  const uid = credential.user.uid

  // 2. Update display name
  await updateProfile(credential.user, {
    displayName: data.ownerName,
  })

  // 3. Buat dokumen company di Firestore
  const companyId = uid // Gunakan uid owner sebagai companyId
  await setDoc(doc(db, 'logis_companies', companyId), {
    id: companyId,
    name: data.companyName,
    plan: 'starter',
    projectLimit: 1,
    subscriptionEnd: null,
    ownerId: uid,
    createdAt: serverTimestamp(),
  })

  // 4. Buat dokumen user di Firestore
  await setDoc(
    doc(db, 'logis_companies', companyId, 'users', uid),
    {
      id: uid,
      companyId,
      name: data.ownerName,
      email: data.email,
      phone: data.phone,
      role: 'owner' as UserRole,
      projectIds: [],
      isActive: true,
      createdAt: serverTimestamp(),
    }
  )
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
  return sendPasswordResetEmail(auth, email)
}

// ============================================
// INVITE USER
// ============================================
export async function createInvite(data: {
  companyId: string
  companyName: string
  email: string
  role: UserRole
  invitedByName: string
}): Promise<string> {
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore')
  const inviteRef = await addDoc(
    collection(db, 'logis_companies', data.companyId, 'invites'),
    {
      companyId: data.companyId,
      companyName: data.companyName,
      email: data.email.toLowerCase(),
      role: data.role,
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
      projectIds: [],
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