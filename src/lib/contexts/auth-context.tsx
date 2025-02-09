'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/utils/firebase'
import { useRouter } from 'next/navigation'
import nookies from 'nookies'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // ユーザーがログインしている場合
        setUser(user)
        const token = await user.getIdToken()
        nookies.set(undefined, 'auth', token, { path: '/' })
      } else {
        // ユーザーがログアウトしている場合
        setUser(null)
        nookies.destroy(undefined, 'auth')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 