export type Role = 'admin' | 'responsable' | 'technicien' | 'financier'

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
