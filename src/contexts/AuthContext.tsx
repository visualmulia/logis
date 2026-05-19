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
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getUserData } from '@/lib/firebase/auth'
import { LogisUser, CompanyProfile } from '@/types'

interface AuthContextType {
  firebaseUser: User | null
  logisUser: LogisUser | null
  companyId: string | null
  companyProfile: CompanyProfile | null
  isSuperAdmin: boolean
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  logisUser: null,
  companyId: null,
  companyProfile: null,
  isSuperAdmin: false,
  loading: true,
  refreshUser: async () => {},
})

async function findCompanyIdForUser(uid: string): Promise<string | null> {
  // Step 1: Cek apakah owner
  try {
    const ownerDoc = await getDoc(doc(db, 'logis_companies', uid))
    if (ownerDoc.exists()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('logis_company_id', uid)
      }
      return uid
    }
  } catch {}

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
    } catch {}
  }

  // Step 3: Cek document user_index — path langsung by UID
  // Ini yang paling reliable, tidak perlu collectionGroup
  try {
    const indexDoc = await getDoc(
      doc(db, 'user_company_index', uid)
    )
    if (indexDoc.exists()) {
      const cId = indexDoc.data().companyId as string
      if (typeof window !== 'undefined') {
        localStorage.setItem('logis_company_id', cId)
      }
      return cId
    }
  } catch {}

  // Step 4: CollectionGroup sebagai last resort
  try {
    const { collectionGroup, query, where, getDocs } = await import('firebase/firestore')
    const snap = await getDocs(
      query(collectionGroup(db, 'users'), where('id', '==', uid))
    )
    if (!snap.empty) {
      const cId = snap.docs[0].data().companyId as string
      if (cId) {
        // Simpan ke index untuk next time
        const { setDoc } = await import('firebase/firestore')
        await setDoc(doc(db, 'user_company_index', uid), {
          companyId: cId,
          updatedAt: new Date(),
        }).catch(() => {})
        if (typeof window !== 'undefined') {
          localStorage.setItem('logis_company_id', cId)
        }
        return cId
      }
    }
  } catch (err) {
    console.error('CollectionGroup failed:', err)
  }

  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [logisUser, setLogisUser] = useState<LogisUser | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
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

      // Fetch company profile
      let profileData: CompanyProfile | null = null
      try {
        const companyDoc = await getDoc(doc(db, 'logis_companies', cId))
        if (companyDoc.exists()) {
          const cData = companyDoc.data()
          profileData = {
            id: companyDoc.id,
            name: cData.name || '',
            address: cData.address || '',
            phone: cData.phone || '',
            ownerName: cData.ownerName || '',
            ownerEmail: cData.ownerEmail || '',
            plan: cData.plan || 'trial',
            trialStartDate: cData.trialStartDate?.toDate?.() || cData.trialStartDate,
            trialEndDate: cData.trialEndDate?.toDate?.() || cData.trialEndDate,
            isTrialActive: cData.isTrialActive ?? true,
            maxProjects: cData.maxProjects ?? 999,
            maxUsers: cData.maxUsers ?? 999,
            createdAt: cData.createdAt?.toDate?.() || cData.createdAt,
          } as CompanyProfile

          // Auto-downgrade: trial habis → fallback ke starter
          if (
            profileData.plan === 'trial' &&
            profileData.isTrialActive &&
            profileData.trialEndDate
          ) {
            const now = new Date()
            const end = profileData.trialEndDate instanceof Date
              ? profileData.trialEndDate
              : new Date(profileData.trialEndDate)
            if (now > end) {
              try {
                await updateDoc(doc(db, 'logis_companies', cId), {
                  plan: 'starter',
                  isTrialActive: false,
                  maxProjects: 1,
                  maxUsers: 3,
                  subscriptionStartDate: serverTimestamp(),
                  subscriptionEndDate: null,
                })
                // Update local profile
                profileData.plan = 'starter'
                profileData.isTrialActive = false
                profileData.maxProjects = 1
                profileData.maxUsers = 3
              } catch (e) {
                console.error('Auto-downgrade failed:', e)
              }
            }
          }

          setCompanyProfile(profileData)
        }
      } catch (err) {
        console.error('Failed to load company profile:', err)
      }

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

      // Cek superadmin status — via Firestore atau hardcoded email fallback
      try {
        const adminDoc = await getDoc(doc(db, 'system_admins', user.uid))
        const isHardcodedAdmin = user.email === 'ardyan.permana@gmail.com'
        setIsSuperAdmin(adminDoc.exists() || isHardcodedAdmin)
      } catch {
        setIsSuperAdmin(user.email === 'ardyan.permana@gmail.com')
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
        setCompanyProfile(null)
        setIsSuperAdmin(false)
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{ firebaseUser, logisUser, companyId, companyProfile, isSuperAdmin, loading, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}