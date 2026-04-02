import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Permissions, TogglePermissionKey } from '@/types'
import { ROLE_CONFIG } from '@/types'
import { useState, useRef, useEffect } from 'react'
import { LayoutDashboard, Car, Users, Wallet, X, LogOut, Package, DollarSign, Wrench, UsersRound, CalendarDays, AlertCircle, UserCircle, CreditCard, ClipboardList, Layers, Phone, BarChart2, Truck, Receipt, Bell, Shield, FileText, ShoppingCart } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationsContext'
import { cn } from '@/lib/utils'

interface NavItemConfig {
  name: string
  href: string
  icon: typeof Car
  requiredPermission?: TogglePermissionKey
  requireVehiculeAccess?: boolean
  disabled?: boolean
}

interface NavCategory {
  label: string | null
  items: NavItemConfig[]
}

const NAV_STRUCTURE: NavCategory[] = [
  {
    label: null,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredPermission: 'canViewDashboard' },
      { name: 'Statistiques', href: '/admin', icon: Shield, requiredPermission: 'canManageUsers' },
      { name: 'Calendrier', href: '/calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'INVENTAIRE',
    items: [
      { name: 'Stock Général', href: '/stock-general', icon: Package, requiredPermission: 'canViewInventory' },
      { name: 'Produits', href: '/produits', icon: Layers, requiredPermission: 'canViewInventory' },
    ],
  },
  {
    label: 'HISTORIQUE OPÉRATION',
    items: [
      { name: 'Clients', href: '/clients', icon: UserCircle },
      { name: 'Réclamations', href: '/reclamation', icon: AlertCircle },
      { name: 'Véhicules', href: '/vehicules', icon: Car, requireVehiculeAccess: true },

    ],
  },
  {
    label: 'FINANCES',
    items: [
      { name: 'Facturation', href: '/facturation', icon: FileText, requiredPermission: 'canViewFinance' },
      { name: 'Achats (entrée stock)', href: '/achats', icon: ShoppingCart, requiredPermission: 'canViewFinance' },
      { name: 'Suivi Argent Équipe', href: '/caisse', icon: Wallet, requiredPermission: 'canViewFinance' },
      { name: 'Transactions Fournisseurs', href: '/fournisseurs/transactions', icon: Receipt, requiredPermission: 'canViewFinance' },
      { name: 'Fournisseurs', href: '/fournisseurs', icon: Truck, requiredPermission: 'canViewFinance' },
      { name: 'Demandes Devis', href: '/devis', icon: ClipboardList, requiredPermission: 'canViewFinance' },
      { name: 'Détails Money', href: '/money', icon: Wallet, requiredPermission: 'canViewFinance' },
      { name: 'Clients avec Dettes', href: '/clients/dettes', icon: CreditCard, requiredPermission: 'canViewFinance' },

    ],
  },
  {
    label: 'ÉQUIPE',
    items: [
      { name: 'Utilisateurs', href: '/utilisateurs', icon: Users, requiredPermission: 'canManageUsers' },
      { name: 'Membres équipe', href: '/equipe/membres', icon: UsersRound, requiredPermission: 'canManageUsers' },
      { name: 'Outils Mohamed', href: '/outils/mohamed', icon: Wrench, requiredPermission: 'canViewEquipeOutils' },
      { name: 'Outils Ahmed', href: '/outils/ahmed', icon: Wrench, requiredPermission: 'canViewEquipeOutils' },
    ],
  },
  {
    label: 'AUTRES',
    items: [
      { name: 'Checklists', href: '/checklists', icon: ClipboardList },
      { name: 'Contacts Importants', href: '/contacts-importants', icon: Phone },
      { name: 'Rapports', href: '#', icon: BarChart2, disabled: true },
    ],
  },
]

function hasAccess(permissions: Permissions, item: NavItemConfig): boolean {
  if (item.disabled) return false
  if (item.requireVehiculeAccess && permissions.vehiculeVisibility === 'none') return false
  if (item.requiredPermission && !permissions[item.requiredPermission]) return false
  return true
}

function SidebarNavItem({ item, onClose }: { item: NavItemConfig; onClose: () => void }) {
  const Icon = item.icon
  if (item.disabled) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 cursor-not-allowed opacity-60"
        title="Bientôt disponible"
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        {item.name}
      </div>
    )
  }
  return (
    <NavLink
      to={item.href}
      end
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'
        )
      }
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      {item.name}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { user, permissions, logout } = useAuth()
  const { myNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const myNotifs = myNotifications(user?.id ?? 0)
  const unread = unreadCount(user?.id ?? 0)

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  if (!user || !permissions) return null

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[260px] bg-gray-950 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="El Mecano" className="w-10 h-10 rounded-lg object-contain" />
            <span className="font-extrabold text-lg tracking-tight">EL MECANO</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0">
              {user.nom_complet.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user.nom_complet}</p>
              <p
                className={cn(
                  'text-[11px] font-medium px-1.5 py-0.5 rounded-md inline-block mt-0.5',
                  ROLE_CONFIG[user.role].bg,
                  ROLE_CONFIG[user.role].color
                )}
              >
                {ROLE_CONFIG[user.role].label}
              </p>
            </div>
            <div className="relative flex-shrink-0" ref={notifRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowNotif(!showNotif) }}
                className={cn(
                  'relative p-2 rounded-xl transition-colors',
                  showNotif ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'
                )}
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-red-500/40 ring-2 ring-gray-950">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute top-0 left-full ml-2 w-80 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-orange-200 text-gray-900 z-[100]">
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-orange-50 rounded-t-2xl">
                    <span className="text-sm font-bold">Notifications</span>
                    {unread > 0 && (
                      <button
                        onClick={() => markAllAsRead(user.id)}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        Tout marquer lu
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">   
                    {myNotifs.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500 text-center">Aucune notification</p>
                    ) : (
                      myNotifs.slice(0, 20).map(n => (
                        <div
                          key={n.id}
                          className={cn('p-3 text-left cursor-pointer hover:bg-gray-50', !n.read && 'bg-orange-50/50')}
                          onClick={() => {
                            markAsRead(n.id)
                            setShowNotif(false)
                            if (n.reclamationId != null) navigate('/reclamation')
                            else if (n.vehiculeId != null) navigate(`/vehicules/${n.vehiculeId}`)
                            else if (n.type?.startsWith('vehicule_')) navigate('/vehicules')
                          }}
                        >
                          {n.title && <p className="text-xs font-semibold text-orange-600">{n.title}</p>}
                          <p className="text-sm text-gray-800">{n.message}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(n.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-6">
          {NAV_STRUCTURE.map((category) => {
            const visibleItems = category.items.filter((item) => hasAccess(permissions, item) || item.disabled)
            if (visibleItems.length === 0) return null

            return (
              <div key={category.label ?? 'main'} className="space-y-1">
                {category.label && (
                  <p className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {category.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <SidebarNavItem key={item.href + item.name} item={item} onClose={onClose} />
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
