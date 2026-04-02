'use client'

import { db } from '@/lib/firebase/config'
import { doc, getDoc } from 'firebase/firestore'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { getUserData, getCompanyIdByUid } from '@/lib/firebase/auth'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [logisUser, setLogisUser] = useState<LogisUser | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadUserData(user: User) {
  try {
    // Step 1: Cek apakah owner
    const ownerDoc = await getDoc(doc(db, 'logis_companies', user.uid))
    if (ownerDoc.exists()) {
      const cId = user.uid
      setCompanyId(cId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('logis_company_id', cId)
      }
      const userData = await getUserData(user.uid, cId)
      setLogisUser(userData)
      return
    }

    // Step 2: Cek localStorage
    const storedCId =
      typeof window !== 'undefined'
        ? localStorage.getItem('logis_company_id')
        : null

    if (storedCId) {
      const userDoc = await getDoc(
        doc(db, 'logis_companies', storedCId, 'users', user.uid)
      )
      if (userDoc.exists()) {
        setCompanyId(storedCId)
        setLogisUser(userDoc.data() as LogisUser)
        return
      }
    }

    console.warn('Company not found for user:', user.uid)
  } catch (error) {
    console.error('Error fetching user data:', error)
  }
}

  async function refreshUser() {
    if (firebaseUser) {
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
      }

      setLoading(false)
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