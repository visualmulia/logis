'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase/config'
import {
  doc,
  getDoc,
} from 'firebase/firestore'
import { getUserData } from '@/lib/firebase/auth'
import { LogisUser } from '@/types'

interface AuthContextType {
  firebaseUser: User | null
  logisUser: LogisUser | null
  companyId: string | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  logisUser: null,
  companyId: null,
  loading: true,
  refreshUser: async () => {},
})

async function findCompanyIdForUser(uid: string): Promise<string | null> {
  // Step 1: Cek apakah owner (companyId == uid)
  const ownerDoc = await getDoc(doc(db, 'logis_companies', uid))
  if (ownerDoc.exists()) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('logis_company_id', uid)
    }
    return uid
  }

  // Step 2: Cek localStorage
  const stored = typeof window !== 'undefined'
    ? localStorage.getItem('logis_company_id')
    : null

  if (stored) {
    try {
      const userDoc = await getDoc(
        doc(db, 'logis_companies', stored, 'users', uid)
      )
      if (userDoc.exists()) return stored
    } catch {
      // stale, lanjut
    }
  }

  // Step 3: CollectionGroup query by id
  try {
    const { collectionGroup, query, where, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(
      query(collectionGroup(db, 'users'), where('id', '==', uid))
    )
    if (!snap.empty) {
      const cId = snap.docs[0].data().companyId as string
      if (cId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('logis_company_id', cId)
        }
        return cId
      }
    }
  } catch {
    // permission denied — lanjut ke step 4
  }

  // Step 4: CollectionGroup query by email — FALLBACK BARU
  try {
    const currentEmail = auth.currentUser?.email
    if (!currentEmail) return null

    const { collectionGroup, query, where, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(
      query(collectionGroup(db, 'users'), where('email', '==', currentEmail))
    )
    if (!snap.empty) {
      const data = snap.docs[0].data()
      const cId = data.companyId as string
      if (cId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('logis_company_id', cId)
        }
        return cId
      }
    }
  } catch {
    // gagal juga
  }

  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [logisUser, setLogisUser] = useState<LogisUser | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadUserData(user: User) {
  try {
    console.log('Loading user data for:', user.uid, user.email)

    const cId = await findCompanyIdForUser(user.uid)
    console.log('Found companyId:', cId)

    if (!cId) {
      console.warn('No company found for user:', user.uid)
      setLoading(false)
      return
    }

      // Simpan ke localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('logis_company_id', cId)
      }

      setCompanyId(cId)

      // Cek apakah owner atau member
      if (cId === user.uid) {
        // Owner — ambil dari subcollection users
        const userData = await getUserData(user.uid, cId)
        setLogisUser(userData)
      } else {
        // Invited member
        const userDoc = await getDoc(
          doc(db, 'logis_companies', cId, 'users', user.uid)
        )
        if (userDoc.exists()) {
          setLogisUser(userDoc.data() as LogisUser)
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function refreshUser() {
    if (firebaseUser) {
      setLoading(true)
      await loadUserData(firebaseUser)
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)

      if (user) {
        await loadUserData(user)
      } else {
        setLogisUser(null)
        setCompanyId(null)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{ firebaseUser, logisUser, companyId, loading, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}