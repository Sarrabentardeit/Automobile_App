import type { Permissions, Role } from './permissions'

export type UserStatut = 'actif' | 'inactif'

export type AppAccount = {
  id: number
  email: string
  nom_complet: string
  telephone: string
  role: Role
  permissions: Permissions
  statut: UserStatut
  date_creation: string
  derniere_connexion: string | null
}

export type AppAccountUpdate = Partial<{
  nom_complet: string
  telephone: string
  role: Role
  permissions: Permissions
  statut: UserStatut
  password: string
}>

export type AppAccountCreate = {
  nom_complet: string
  email: string
  telephone: string
  password: string
  role: Role
  permissions: Permissions
}
