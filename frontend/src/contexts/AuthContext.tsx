import { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect, type ReactNode } from 'react'
import type { User, Permissions, Role } from '@/types'
import { ROLE_PRESETS } from '@/types'
import { apiFetch, setAuthBridge, type LoginResponse, type RegisterResponse, type RefreshResponse } from '@/lib/api'

const STORAGE_USER = 'elmecano_user'
const STORAGE_ACCESS = 'elmecano_access_token'
const STORAGE_REFRESH = 'elmecano_refresh_token'
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

interface AuthContextType {
  user: User | null
  permissions: Permissions | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  getAccessToken: () => string | null
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function mapRole(role: string): Role {
  const r = role.toLowerCase()
  if (r === 'admin' || r === 'responsable' || r === 'technicien' || r === 'financier') {
    return r as Role
  }
  return 'technicien'
}

function mergePermissions(role: string, raw: unknown): Permissions {
  const r = mapRole(role) as keyof typeof ROLE_PRESETS
  const base = ROLE_PRESETS[r] ?? ROLE_PRESETS.technicien
  if (!raw || typeof raw !== 'object') return base
  const p = raw as Record<string, unknown>
  return {
    vehiculeVisibility: (p.vehiculeVisibility as Permissions['vehiculeVisibility']) ?? base.vehiculeVisibility,
    canAddVehicule: Boolean(p.canAddVehicule ?? base.canAddVehicule),
    canEditVehicule: Boolean(p.canEditVehicule ?? base.canEditVehicule),
    canChangeEtat: Boolean(p.canChangeEtat ?? base.canChangeEtat),
    canAssignTechnicien: Boolean(p.canAssignTechnicien ?? base.canAssignTechnicien),
    canManageUsers: Boolean(p.canManageUsers ?? base.canManageUsers),
    canViewDashboard: Boolean(p.canViewDashboard ?? base.canViewDashboard),
    canViewFinance: Boolean(p.canViewFinance ?? base.canViewFinance),
  }
}

function backendUserToFrontend(res: LoginResponse['user']): User {
  const role = mapRole(res.role)
  const permissions = mergePermissions(role, res.permissions)
  return {
    id: res.id,
    email: res.email,
    nom_complet: res.fullName,
    telephone: res.telephone ?? '',
    role,
    permissions,
    statut: 'actif',
    date_creation: new Date().toISOString().slice(0, 10),
    derniere_connexion: new Date().toISOString(),
  }
}

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadStoredUser)

  const permissions = user ? user.permissions : null

  const persistAuth = useCallback((u: User, accessToken: string, refreshToken: string) => {
    setUser(u)
    localStorage.setItem(STORAGE_USER, JSON.stringify(u))
    localStorage.setItem(STORAGE_ACCESS, accessToken)
    localStorage.setItem(STORAGE_REFRESH, refreshToken)
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed) return { success: false, error: 'Veuillez saisir votre email' }
      if (!password) return { success: false, error: 'Veuillez saisir votre mot de passe' }

      try {
        const res = await apiFetch<LoginResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: trimmed, password }),
        })
        const u = backendUserToFrontend(res.user)
        persistAuth(u, res.accessToken, res.refreshToken)
        return { success: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur de connexion'
        return { success: false, error: msg }
      }
    },
    [persistAuth]
  )

  const register = useCallback(
    async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed) return { success: false, error: 'Veuillez saisir votre email' }
      if (!password) return { success: false, error: 'Veuillez saisir votre mot de passe' }
      if (!fullName.trim()) return { success: false, error: 'Veuillez saisir votre nom' }

      try {
        const res = await apiFetch<RegisterResponse>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email: trimmed, password, fullName: fullName.trim() }),
        })
        const u = backendUserToFrontend(res.user)
        persistAuth(u, res.accessToken, res.refreshToken)
        return { success: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur lors de l\'inscription'
        return { success: false, error: msg }
      }
    },
    [persistAuth]
  )

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_USER)
    localStorage.removeItem(STORAGE_ACCESS)
    localStorage.removeItem(STORAGE_REFRESH)
  }, [])

  const getAccessToken = useCallback(() => localStorage.getItem(STORAGE_ACCESS), [])

  // Au chargement : si on a un token mais pas de user (ancienne session), on considère déconnecté
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_ACCESS)
    const storedUser = localStorage.getItem(STORAGE_USER)
    if (!token || !storedUser) {
      setUser(null)
    }
  }, [])

  // useLayoutEffect garantit que le bridge est prêt avant tout useEffect dans les composants enfants
  useLayoutEffect(() => {
    setAuthBridge({
      refresh: async () => {
        const refreshToken = localStorage.getItem(STORAGE_REFRESH)
        if (!refreshToken) return null
        try {
          const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok || !json.accessToken) return null
          localStorage.setItem(STORAGE_ACCESS, json.accessToken)
          if (json.refreshToken) localStorage.setItem(STORAGE_REFRESH, json.refreshToken)
          return json.accessToken as string
        } catch {
          return null
        }
      },
      onSessionExpired: () => {
        setUser(null)
        localStorage.removeItem(STORAGE_USER)
        localStorage.removeItem(STORAGE_ACCESS)
        localStorage.removeItem(STORAGE_REFRESH)
      },
    })
    return () => setAuthBridge(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        login,
        register,
        logout,
        getAccessToken,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
