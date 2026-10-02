import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseClient } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = getSupabaseClient()

    // Check initial session
    client.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setUser(session.user)
          setProfile(p)
          setLoading(false)
        })
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          setUser(session.user)
          setProfile(p)
        })
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const client = getSupabaseClient()
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, email, whatsapp_number, role')
      .eq('id', userId)
      .single()
    if (error) return null
    return data
  }

  async function logoutFn() {
    const client = getSupabaseClient()
    await client.auth.signOut()
  }

  const value = { user, profile, loading, logout: logoutFn }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}