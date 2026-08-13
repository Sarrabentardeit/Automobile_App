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
  | 'chat'
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

export type MenuGroup = {
  title: string
  items: MenuItem[]
}

export type MenuCategory = {
  id: string
  label: string | null
  icon?: IonIcon
  collapsible?: boolean
  defaultOpen?: boolean
  matchRoutes?: MenuRouteId[]
  items?: MenuItem[]
  groups?: MenuGroup[]
}

export function categoryMenuItems(category: MenuCategory): MenuItem[] {
  if (category.groups?.length) return category.groups.flatMap((g) => g.items)
  return category.items ?? []
}

export const MENU_STRUCTURE: MenuCategory[] = [
  {
    id: 'accueil',
    label: 'Accueil',
    icon: 'home-outline',
    collapsible: true,
    defaultOpen: true,
    matchRoutes: ['dashboard', 'admin', 'calendar', 'chat'],
    items: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        icon: 'grid-outline',
        requiredPermission: 'canViewDashboard',
        implemented: true,
      },
      {
        id: 'admin',
        name: 'Statistiques',
        icon: 'shield-outline',
        requiredPermission: 'canManageUsers',
        implemented: true,
      },
      { id: 'calendar', name: 'Calendrier', icon: 'calendar-outline', implemented: true },
      { id: 'chat', name: 'Chat', icon: 'chatbubbles-outline', implemented: true },
    ],
  },
  {
    id: 'atelier',
    label: 'Atelier',
    icon: 'car-outline',
    collapsible: true,
    defaultOpen: true,
    matchRoutes: ['vehicules', 'vehicules_archives', 'clients', 'reclamation'],
    items: [
      {
        id: 'vehicules',
        name: 'Véhicules',
        icon: 'car-outline',
        requireVehiculeAccess: true,
        implemented: true,
      },
      {
        id: 'vehicules_archives',
        name: 'Archives',
        icon: 'archive-outline',
        requireVehiculeAccess: true,
        implemented: true,
      },
      { id: 'clients', name: 'Clients', icon: 'person-circle-outline', implemented: true },
      {
        id: 'reclamation',
        name: 'Réclamations',
        icon: 'alert-circle-outline',
        implemented: true,
      },
    ],
  },
  {
    id: 'inventaire',
    label: 'Inventaire',
    icon: 'cube-outline',
    collapsible: true,
    matchRoutes: ['stock', 'produits'],
    items: [
      {
        id: 'stock',
        name: 'Stock',
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
    id: 'finance',
    label: 'Finance',
    icon: 'cash-outline',
    collapsible: true,
    matchRoutes: [
      'facturation_vente',
      'paiements_vente',
      'facturation_achat',
      'paiements_achat',
      'caisse',
      'money',
      'clients_dettes',
      'fournisseurs',
      'fournisseurs_transactions',
      'devis',
    ],
    groups: [
      {
        title: 'Vente',
        items: [
          {
            id: 'facturation_vente',
            name: 'Factures',
            icon: 'document-text-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
          {
            id: 'paiements_vente',
            name: 'Paiements',
            icon: 'wallet-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
          {
            id: 'devis',
            name: 'Devis',
            icon: 'clipboard-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
        ],
      },
      {
        title: 'Achat',
        items: [
          {
            id: 'facturation_achat',
            name: 'Factures',
            icon: 'download-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
          {
            id: 'paiements_achat',
            name: 'Paiements',
            icon: 'wallet-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
        ],
      },
      {
        title: 'Trésorerie',
        items: [
          {
            id: 'caisse',
            name: 'Caisse équipe',
            icon: 'cash-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
          {
            id: 'money',
            name: 'Money',
            icon: 'wallet-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
          {
            id: 'clients_dettes',
            name: 'Dettes clients',
            icon: 'card-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
        ],
      },
      {
        title: 'Fournisseurs',
        items: [
          {
            id: 'fournisseurs',
            name: 'Liste',
            icon: 'storefront-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
          {
            id: 'fournisseurs_transactions',
            name: 'Transactions',
            icon: 'receipt-outline',
            requiredPermission: 'canViewFinance',
            implemented: true,
          },
        ],
      },
    ],
  },
  {
    id: 'equipe',
    label: 'Équipe',
    icon: 'people-outline',
    collapsible: true,
    matchRoutes: ['equipe_membres', 'utilisateurs', 'outils_ahmed'],
    items: [
      {
        id: 'equipe_membres',
        name: 'Membres',
        icon: 'people-circle-outline',
        requiredPermission: 'canManageUsers',
        implemented: true,
      },
      {
        id: 'utilisateurs',
        name: 'Comptes',
        icon: 'people-outline',
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
    id: 'outils',
    label: 'Outils',
    icon: 'settings-outline',
    collapsible: true,
    matchRoutes: ['checklists', 'checklists_modeles', 'documents', 'contacts'],
    items: [
      { id: 'checklists', name: 'Checklists', icon: 'checkbox-outline', implemented: true },
      {
        id: 'checklists_modeles',
        name: 'Modèles checklist',
        icon: 'options-outline',
        requireAdmin: true,
        implemented: true,
      },
      { id: 'documents', name: 'Documents', icon: 'folder-open-outline', implemented: true },
      { id: 'contacts', name: 'Contacts', icon: 'call-outline', implemented: true },
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
    const found = categoryMenuItems(cat).find((i) => i.id === route)
    if (found) return found.name
  }
  return 'EL MECANO'
}

export function initialOpenMenuSections(route: MenuRouteId): Record<string, boolean> {
  const open: Record<string, boolean> = {}
  for (const cat of MENU_STRUCTURE) {
    if (!cat.collapsible) continue
    open[cat.id] = Boolean(cat.defaultOpen || cat.matchRoutes?.includes(route))
  }
  return open
}

/** @deprecated use matchRoutes on categories — kept for any old imports */
export const FINANCE_ROUTE_IDS: MenuRouteId[] =
  MENU_STRUCTURE.find((c) => c.id === 'finance')?.matchRoutes ?? []

export function getDefaultRoute(permissions: Permissions, _role: Role): MenuRouteId {
  if (permissions.canViewDashboard) return 'dashboard'
  if (permissions.vehiculeVisibility !== 'none') return 'vehicules'
  if (permissions.canViewFinance) return 'caisse'
  return 'vehicules'
}
