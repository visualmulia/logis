'use client'

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
      const cId = await getCompanyIdByUid(user.uid)
      if (cId) {
        setCompanyId(cId)
        const userData = await getUserData(user.uid, cId)
        setLogisUser(userData)
      }
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