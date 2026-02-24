import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, Permissions } from '@/types'
import { mockUsers } from '@/data/mock'

interface AuthContextType {
  user: User | null
  permissions: Permissions | null
  login: (email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('elmecano_user')
    if (!saved) return null
    try { return JSON.parse(saved) } catch { return null }
  })

  const permissions = user ? user.permissions : null

  const login = useCallback((email: string, _password: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return { success: false, error: 'Veuillez saisir votre email' }

    const found = mockUsers.find(u => u.email.toLowerCase() === trimmed)
    if (!found) return { success: false, error: 'Aucun compte trouvé avec cet email' }
    if (found.statut === 'inactif') return { success: false, error: 'Ce compte est désactivé. Contactez l\'admin.' }

    setUser(found)
    localStorage.setItem('elmecano_user', JSON.stringify(found))
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('elmecano_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
