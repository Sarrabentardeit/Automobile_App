import type { ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { Permissions, Role } from '../types/permissions'

type IonIcon = ComponentProps<typeof Ionicons>['name']

export type MenuRouteId =
  | 'dashboard'
  | 'admin'
  | 'calendar'
  | 'stock'
  | 'produits'
  | 'clients'
  | 'reclamation'
  | 'vehicules'
  | 'vehicules_archives'
  | 'facturation_vente'
  | 'paiements_vente'
  | 'facturation_achat'
  | 'paiements_achat'
  | 'caisse'
  | 'fournisseurs_transactions'
  | 'fournisseurs'
  | 'devis'
  | 'money'
  | 'clients_dettes'
  | 'utilisateurs'
  | 'equipe_membres'
  | 'outils_ahmed'
  | 'checklists'
  | 'checklists_modeles'
  | 'documents'
  | 'contacts'

export type MenuItem = {
  id: MenuRouteId
  name: string
  icon: IonIcon
  requiredPermission?: keyof Permissions
  requireVehiculeAccess?: boolean
  requireAdmin?: boolean
  /** Écran déjà disponible sur mobile */
  implemented?: boolean
}

export type MenuCategory = {
  label: string | null
  items: MenuItem[]
}

export const MENU_STRUCTURE: MenuCategory[] = [
  {
    label: null,
    items: [
      { id: 'dashboard', name: 'Dashboard', icon: 'grid-outline', requiredPermission: 'canViewDashboard', implemented: true },
      {
        id: 'admin',
        name: 'Statistiques',
        icon: 'shield-outline',
        requiredPermission: 'canManageUsers',
        implemented: true,
      },
      { id: 'calendar', name: 'Calendrier', icon: 'calendar-outline', implemented: true },
    ],
  },
  {
    label: 'INVENTAIRE',
    items: [
      {
        id: 'stock',
        name: 'Stock Général',
        icon: 'cube-outline',
        requiredPermission: 'canViewInventory',
        implemented: true,
      },
      {
        id: 'produits',
        name: 'Produits',
        icon: 'layers-outline',
        requiredPermission: 'canViewInventory',
        implemented: true,
      },
    ],
  },
  {
    label: 'HISTORIQUE OPÉRATION',
    items: [
      {
        id: 'clients',
        name: 'Clients',
        icon: 'person-circle-outline',
        implemented: true,
      },
      {
        id: 'reclamation',
        name: 'Réclamations',
        icon: 'alert-circle-outline',
        implemented: true,
      },
      {
        id: 'vehicules',
        name: 'Véhicules',
        icon: 'car-outline',
        requireVehiculeAccess: true,
        implemented: true,
      },
      {
        id: 'vehicules_archives',
        name: 'Archives véhicules',
        icon: 'archive-outline',
        requireVehiculeAccess: true,
        implemented: true,
      },
    ],
  },
  {
    label: 'FINANCES',
    items: [
      {
        id: 'facturation_vente',
        name: 'Facturation vente',
        icon: 'document-text-outline',
        requiredPermission: 'canViewFinance',
        implemented: true,
      },
      { id: 'paiements_vente', name: 'Paiement partiel vente', icon: 'wallet-outline', requiredPermission: 'canViewFinance' },
      {
        id: 'facturation_achat',
        name: 'Facturation achat',
        icon: 'download-outline',
        requiredPermission: 'canViewFinance',
        implemented: true,
      },
      { id: 'paiements_achat', name: 'Paiement partiel achat', icon: 'wallet-outline', requiredPermission: 'canViewFinance' },
      { id: 'caisse', name: 'Suivi Argent Équipe', icon: 'cash-outline', requiredPermission: 'canViewFinance' },
      { id: 'fournisseurs_transactions', name: 'Transactions Fournisseurs', icon: 'receipt-outline', requiredPermission: 'canViewFinance' },
      {
        id: 'fournisseurs',
        name: 'Fournisseurs',
        icon: 'storefront-outline',
        requiredPermission: 'canViewFinance',
        implemented: true,
      },
      {
        id: 'devis',
        name: 'Demandes Devis',
        icon: 'clipboard-outline',
        requiredPermission: 'canViewFinance',
        implemented: true,
      },
      { id: 'money', name: 'Détails Money', icon: 'wallet-outline', requiredPermission: 'canViewFinance' },
      {
        id: 'clients_dettes',
        name: 'Clients avec Dettes',
        icon: 'card-outline',
        requiredPermission: 'canViewFinance',
        implemented: true,
      },
    ],
  },
  {
    label: 'ÉQUIPE',
    items: [
      {
        id: 'utilisateurs',
        name: 'Utilisateurs',
        icon: 'people-outline',
        requiredPermission: 'canManageUsers',
        implemented: true,
      },
      {
        id: 'equipe_membres',
        name: 'Membres équipe',
        icon: 'people-circle-outline',
        requiredPermission: 'canManageUsers',
        implemented: true,
      },
      {
        id: 'outils_ahmed',
        name: 'Opération Ahmed',
        icon: 'construct-outline',
        requiredPermission: 'canViewEquipeOutils',
        implemented: true,
      },
    ],
  },
  {
    label: 'AUTRES',
    items: [
      { id: 'checklists', name: 'Checklists', icon: 'checkbox-outline', implemented: true },
      {
        id: 'checklists_modeles',
        name: 'Modèles checklists',
        icon: 'options-outline',
        requireAdmin: true,
        implemented: true,
      },
      { id: 'documents', name: 'Documents', icon: 'folder-open-outline' },
      { id: 'contacts', name: 'Contacts Importants', icon: 'call-outline', implemented: true },
    ],
  },
]

export function hasMenuAccess(
  permissions: Permissions,
  role: Role,
  item: MenuItem
): boolean {
  if (item.requireAdmin && role !== 'admin') return false
  if (item.requireVehiculeAccess && permissions.vehiculeVisibility === 'none') return false
  if (item.requiredPermission && !permissions[item.requiredPermission]) return false
  return true
}

export function getMenuTitle(route: MenuRouteId): string {
  for (const cat of MENU_STRUCTURE) {
    const found = cat.items.find((i) => i.id === route)
    if (found) return found.name
  }
  return 'EL MECANO'
}

export function getDefaultRoute(permissions: Permissions, _role: Role): MenuRouteId {
  if (permissions.canViewDashboard) return 'dashboard'
  if (permissions.vehiculeVisibility !== 'none') return 'vehicules'
  if (permissions.canViewFinance) return 'caisse'
  return 'vehicules'
}
