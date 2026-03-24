import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, Permissions } from '@/types'
import { ROLE_PRESETS } from '@/types'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

const DEFAULT_PERMISSIONS: Permissions = {
  vehiculeVisibility: 'own',
  canAddVehicule: false,
  canEditVehicule: false,
  canChangeEtat: true,
  canAssignTechnicien: false,
  canManageUsers: false,
  canViewDashboard: true,
  canViewFinance: false,
}

function mergePermissions(role: string, raw: unknown): Permissions {
  const r = ['admin', 'responsable', 'technicien', 'financier'].includes(role) ? role : 'technicien'
  const base = ROLE_PRESETS[r as keyof typeof ROLE_PRESETS] ?? DEFAULT_PERMISSIONS
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

function mapApiUser(raw: {
  id: number
  email: string
  nom_complet: string
  telephone?: string
  role: string
  permissions?: unknown
  statut: string
  date_creation: string
  derniere_connexion?: string | null
}): User {
  return {
    id: raw.id,
    email: raw.email,
    nom_complet: raw.nom_complet,
    telephone: raw.telephone ?? '',
    role: ['admin', 'responsable', 'technicien', 'financier'].includes(raw.role) ? (raw.role as User['role']) : 'technicien',
    permissions: mergePermissions(raw.role, raw.permissions),
    statut: raw.statut === 'inactif' ? 'inactif' : 'actif',
    date_creation: raw.date_creation,
    derniere_connexion: raw.derniere_connexion ?? null,
  }
}

interface UsersContextType {
  users: User[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createUser: (data: {
    nom_complet: string
    email: string
    telephone: string
    password: string
    role: string
    permissions: Permissions
  }) => Promise<User>
  updateUser: (id: number, data: Partial<{
    nom_complet: string
    telephone: string
    role: string
    permissions: Permissions
    statut: 'actif' | 'inactif'
    password?: string
  }>) => Promise<User>
}

const UsersContext = createContext<UsersContextType | null>(null)

export function UsersProvider({ children }: { children: ReactNode }) {
  const { getAccessToken } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUsers([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const raw = await apiFetch<Array<Parameters<typeof mapApiUser>[0]>>('/users', { token })
      setUsers(Array.isArray(raw) ? raw.map(mapApiUser) : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement utilisateurs')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const createUser = useCallback(
    async (data: {
      nom_complet: string
      email: string
      telephone: string
      password: string
      role: string
      permissions: Permissions
    }) => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const raw = await apiFetch<Parameters<typeof mapApiUser>[0]>('/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          fullName: data.nom_complet,
          email: data.email,
          telephone: data.telephone,
          password: data.password,
          role: data.role,
          permissions: data.permissions,
        }),
      })
      const user = mapApiUser(raw)
      setUsers(prev => [...prev, user])
      return user
    },
    [getAccessToken]
  )

  const updateUser = useCallback(
    async (
      id: number,
      data: Partial<{
        nom_complet: string
        telephone: string
        role: string
        permissions: Permissions
        statut: 'actif' | 'inactif'
        password?: string
      }>
    ) => {
      const token = getAccessToken()
      if (!token) throw new Error('Non authentifié')
      const body: Record<string, unknown> = {}
      if (data.nom_complet != null) body.fullName = data.nom_complet
      if (data.telephone != null) body.telephone = data.telephone
      if (data.role != null) body.role = data.role
      if (data.permissions != null) body.permissions = data.permissions
      if (data.statut != null) body.statut = data.statut
      if (data.password != null) body.password = data.password

      const raw = await apiFetch<Parameters<typeof mapApiUser>[0]>(`/users/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(body),
      })
      const user = mapApiUser(raw)
      setUsers(prev => prev.map(u => (u.id === id ? user : u)))
      return user
    },
    [getAccessToken]
  )

  return (
    <UsersContext.Provider value={{ users, loading, error, refetch: fetchUsers, createUser, updateUser }}>
      {children}
    </UsersContext.Provider>
  )
}

export function useUsers() {
  const ctx = useContext(UsersContext)
  if (!ctx) throw new Error('useUsers must be used within UsersProvider')
  return ctx
}
