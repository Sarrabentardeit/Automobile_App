export type Role = 'admin' | 'responsable' | 'technicien' | 'financier'

export type VehiculeVisibility = 'all' | 'own' | 'none'

export type TogglePermissionKey =
  | 'canAddVehicule'
  | 'canEditVehicule'
  | 'canChangeEtat'
  | 'canAssignTechnicien'
  | 'canManageUsers'
  | 'canViewDashboard'
  | 'canViewFinance'
  | 'canViewInventory'
  | 'canViewEquipeOutils'

export const ALL_ROLES: Role[] = ['admin', 'responsable', 'technicien', 'financier']

export const ROLE_STYLE: Record<Role, { label: string; color: string; bg: string; border: string }> = {
  admin: { label: 'Admin', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  responsable: { label: 'Responsable', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  technicien: { label: 'Technicien', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  financier: { label: 'Financier', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
}

export const ALL_TOGGLE_KEYS: TogglePermissionKey[] = [
  'canViewDashboard',
  'canAddVehicule',
  'canEditVehicule',
  'canChangeEtat',
  'canAssignTechnicien',
  'canManageUsers',
  'canViewFinance',
  'canViewInventory',
  'canViewEquipeOutils',
]

export const TOGGLE_PERMISSION_LABELS: Record<
  TogglePermissionKey,
  { label: string; description: string }
> = {
  canViewDashboard: { label: 'Voir le dashboard', description: 'Tableau de bord et statistiques' },
  canAddVehicule: { label: 'Ajouter un véhicule', description: 'Créer de nouvelles fiches' },
  canEditVehicule: { label: 'Modifier un véhicule', description: 'Modifier les informations' },
  canChangeEtat: { label: "Changer l'état", description: "Modifier l'avancement" },
  canAssignTechnicien: { label: 'Assigner technicien', description: 'Affecter un technicien' },
  canManageUsers: { label: 'Gérer les utilisateurs', description: 'Créer et modifier des comptes' },
  canViewFinance: { label: 'Accès finance', description: 'Données financières' },
  canViewInventory: { label: 'Accès inventaire', description: 'Stock et produits' },
  canViewEquipeOutils: { label: 'Accès outils équipe', description: 'Opération Ahmed' },
}

export const VISIBILITY_OPTIONS: {
  value: VehiculeVisibility
  label: string
  description: string
}[] = [
  { value: 'all', label: 'Tous les véhicules', description: 'Liste complète du garage' },
  { value: 'own', label: 'Ses véhicules', description: 'Uniquement les assignés' },
  { value: 'none', label: 'Aucun accès', description: 'Pas de liste véhicules' },
]

export const TOTAL_PERMISSION_SLOTS = ALL_TOGGLE_KEYS.length + 1

export function countPermissions(p: Permissions): number {
  const toggles = ALL_TOGGLE_KEYS.filter((k) => p[k]).length
  const vis = p.vehiculeVisibility !== 'none' ? 1 : 0
  return toggles + vis
}

export function isPermissionsCustomized(role: Role, perms: Permissions): boolean {
  const preset = ROLE_PRESETS[role]
  if (perms.vehiculeVisibility !== preset.vehiculeVisibility) return true
  return ALL_TOGGLE_KEYS.some((k) => perms[k] !== preset[k])
}

export type Permissions = {
  vehiculeVisibility: 'all' | 'own' | 'none'
  canAddVehicule: boolean
  canEditVehicule: boolean
  canChangeEtat: boolean
  canAssignTechnicien: boolean
  canManageUsers: boolean
  canViewDashboard: boolean
  canViewFinance: boolean
  canViewInventory: boolean
  canViewEquipeOutils: boolean
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  responsable: 'Responsable',
  technicien: 'Technicien',
  financier: 'Financier',
}

export const ROLE_PRESETS: Record<Role, Permissions> = {
  admin: {
    vehiculeVisibility: 'all',
    canAddVehicule: true,
    canEditVehicule: true,
    canChangeEtat: true,
    canAssignTechnicien: true,
    canManageUsers: true,
    canViewDashboard: true,
    canViewFinance: true,
    canViewInventory: true,
    canViewEquipeOutils: true,
  },
  responsable: {
    vehiculeVisibility: 'all',
    canAddVehicule: true,
    canEditVehicule: true,
    canChangeEtat: true,
    canAssignTechnicien: true,
    canManageUsers: false,
    canViewDashboard: true,
    canViewFinance: true,
    canViewInventory: true,
    canViewEquipeOutils: true,
  },
  technicien: {
    vehiculeVisibility: 'own',
    canAddVehicule: false,
    canEditVehicule: false,
    canChangeEtat: true,
    canAssignTechnicien: false,
    canManageUsers: false,
    canViewDashboard: true,
    canViewFinance: false,
    canViewInventory: false,
    canViewEquipeOutils: false,
  },
  financier: {
    vehiculeVisibility: 'all',
    canAddVehicule: false,
    canEditVehicule: false,
    canChangeEtat: false,
    canAssignTechnicien: false,
    canManageUsers: false,
    canViewDashboard: true,
    canViewFinance: true,
    canViewInventory: true,
    canViewEquipeOutils: false,
  },
}

export function mapRole(role: string): Role {
  const r = role.toLowerCase()
  if (r === 'admin' || r === 'responsable' || r === 'technicien' || r === 'financier') {
    return r
  }
  return 'technicien'
}

export function mergePermissions(role: string, raw: unknown): Permissions {
  const r = mapRole(role)
  const base = ROLE_PRESETS[r]
  if (!raw || typeof raw !== 'object') return base
  const p = raw as Record<string, unknown>
  return {
    vehiculeVisibility:
      (p.vehiculeVisibility as Permissions['vehiculeVisibility']) ?? base.vehiculeVisibility,
    canAddVehicule: Boolean(p.canAddVehicule ?? base.canAddVehicule),
    canEditVehicule: Boolean(p.canEditVehicule ?? base.canEditVehicule),
    canChangeEtat: Boolean(p.canChangeEtat ?? base.canChangeEtat),
    canAssignTechnicien: Boolean(p.canAssignTechnicien ?? base.canAssignTechnicien),
    canManageUsers: Boolean(p.canManageUsers ?? base.canManageUsers),
    canViewDashboard: Boolean(p.canViewDashboard ?? base.canViewDashboard),
    canViewFinance: Boolean(p.canViewFinance ?? base.canViewFinance),
    canViewInventory: Boolean(p.canViewInventory ?? base.canViewInventory),
    canViewEquipeOutils: Boolean(p.canViewEquipeOutils ?? base.canViewEquipeOutils),
  }
}
