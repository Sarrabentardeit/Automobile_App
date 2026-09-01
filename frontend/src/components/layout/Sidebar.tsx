import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { Permissions, Role, TogglePermissionKey } from '@/types'
import { ROLE_CONFIG } from '@/types'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { LayoutDashboard, Car, Users, Wallet, X, LogOut, Package, Wrench, UsersRound, CalendarDays, AlertCircle, UserCircle, CreditCard, ClipboardList, Layers, Phone, Truck, Receipt, Bell, Shield, FileText, Import, Archive, SlidersHorizontal, FolderOpen, MessageSquare, ChevronDown, Banknote, Boxes, Settings2, Home, StickyNote } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationsContext'
import ProfileEditModal from '@/components/profile/ProfileEditModal'
import { resolveUploadUrl } from '@/lib/api'
import { cn, formatNotificationDisplay } from '@/lib/utils'

interface NavItemConfig {
  name: string
  href: string
  icon: typeof Car
  requiredPermission?: TogglePermissionKey
  requireVehiculeAccess?: boolean
  /** Visible uniquement pour le rôle admin (modèles checklist, etc.) */
  requireAdmin?: boolean
  disabled?: boolean
}

interface NavGroup {
  title: string
  items: NavItemConfig[]
}

interface NavCategory {
  id: string
  label: string | null
  icon?: typeof Car
  /** Section repliable */
  collapsible?: boolean
  defaultOpen?: boolean
  matchPath?: (pathname: string) => boolean
  items?: NavItemConfig[]
  groups?: NavGroup[]
}

const FINANCE_GROUPS: NavGroup[] = [
  {
    title: 'Vente',
    items: [
      { name: 'Factures', href: '/facturation-vente', icon: FileText, requiredPermission: 'canViewFinance' },
      { name: 'Paiements', href: '/facturation-vente/paiements-partiels', icon: Wallet, requiredPermission: 'canViewFinance' },
      { name: 'Devis', href: '/devis', icon: ClipboardList, requiredPermission: 'canViewFinance' },
    ],
  },
  {
    title: 'Achat',
    items: [
      { name: 'Factures', href: '/facturation-achat', icon: Import, requiredPermission: 'canViewFinance' },
      { name: 'Paiements', href: '/facturation-achat/paiements-partiels', icon: Wallet, requiredPermission: 'canViewFinance' },
    ],
  },
  {
    title: 'Trésorerie',
    items: [
      { name: 'Caisse équipe', href: '/caisse', icon: Wallet, requiredPermission: 'canViewFinance' },
      { name: 'Money', href: '/money', icon: Banknote, requiredPermission: 'canViewFinance' },
      { name: 'Dettes clients', href: '/clients/dettes', icon: CreditCard, requiredPermission: 'canViewFinance' },
    ],
  },
  {
    title: 'Fournisseurs',
    items: [
      { name: 'Liste', href: '/fournisseurs', icon: Truck, requiredPermission: 'canViewFinance' },
      { name: 'Transactions', href: '/fournisseurs/transactions', icon: Receipt, requiredPermission: 'canViewFinance' },
    ],
  },
]

const NAV_STRUCTURE: NavCategory[] = [
  {
    id: 'accueil',
    label: 'Accueil',
    icon: Home,
    collapsible: true,
    defaultOpen: true,
    matchPath: (p) =>
      p.startsWith('/dashboard') ||
      p.startsWith('/admin') ||
      p.startsWith('/calendar') ||
      p.startsWith('/chat') ||
      p.startsWith('/notes'),
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredPermission: 'canViewDashboard' },
      { name: 'Statistiques', href: '/admin', icon: Shield, requiredPermission: 'canManageUsers' },
      { name: 'Calendrier', href: '/calendar', icon: CalendarDays },
      { name: 'Chat', href: '/chat', icon: MessageSquare },
      { name: 'Mes notes', href: '/notes', icon: StickyNote },
    ],
  },
  {
    id: 'atelier',
    label: 'Atelier',
    icon: Car,
    collapsible: true,
    defaultOpen: true,
    matchPath: (p) =>
      p.startsWith('/vehicules') ||
      p.startsWith('/reclamation') ||
      (p.startsWith('/clients') && !p.startsWith('/clients/dettes')),
    items: [
      { name: 'Véhicules', href: '/vehicules', icon: Car, requireVehiculeAccess: true },
      { name: 'Archives', href: '/vehicules/archives', icon: Archive, requireVehiculeAccess: true },
      { name: 'Clients', href: '/clients', icon: UserCircle },
      { name: 'Réclamations', href: '/reclamation', icon: AlertCircle },
    ],
  },
  {
    id: 'inventaire',
    label: 'Inventaire',
    icon: Boxes,
    collapsible: true,
    matchPath: (p) => p.startsWith('/stock-general') || p.startsWith('/produits'),
    items: [
      { name: 'Stock', href: '/stock-general', icon: Package, requiredPermission: 'canViewInventory' },
      { name: 'Produits', href: '/produits', icon: Layers, requiredPermission: 'canViewInventory' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: Banknote,
    collapsible: true,
    matchPath: (p) =>
      p.startsWith('/facturation-vente') ||
      p.startsWith('/facturation-achat') ||
      p.startsWith('/caisse') ||
      p.startsWith('/money') ||
      p.startsWith('/clients/dettes') ||
      p.startsWith('/fournisseurs') ||
      p.startsWith('/devis'),
    groups: FINANCE_GROUPS,
  },
  {
    id: 'equipe',
    label: 'Équipe',
    icon: UsersRound,
    collapsible: true,
    matchPath: (p) =>
      p.startsWith('/utilisateurs') ||
      p.startsWith('/equipe') ||
      p.startsWith('/outils/ahmed') ||
      p.startsWith('/outils/nouri'),
    items: [
      { name: 'Membres', href: '/equipe/membres', icon: UsersRound, requiredPermission: 'canManageUsers' },
      { name: 'Comptes', href: '/utilisateurs', icon: Users, requiredPermission: 'canManageUsers' },
      { name: 'Opération Ahmed', href: '/outils/ahmed', icon: Wrench, requiredPermission: 'canViewEquipeOutils' },
      { name: 'Opération Nouri', href: '/outils/nouri', icon: Wrench, requiredPermission: 'canViewEquipeOutils' },
    ],
  },
  {
    id: 'outils',
    label: 'Outils',
    icon: Settings2,
    collapsible: true,
    matchPath: (p) =>
      p.startsWith('/checklists') ||
      p.startsWith('/documents') ||
      p.startsWith('/contacts-importants'),
    items: [
      { name: 'Checklists', href: '/checklists', icon: ClipboardList },
      { name: 'Modèles checklist', href: '/checklists/modeles', icon: SlidersHorizontal, requireAdmin: true },
      { name: 'Documents', href: '/documents', icon: FolderOpen },
      { name: 'Contacts', href: '/contacts-importants', icon: Phone },
    ],
  },
]

function categoryItems(category: NavCategory): NavItemConfig[] {
  if (category.groups?.length) return category.groups.flatMap((g) => g.items)
  return category.items ?? []
}

function initialOpenSections(pathname: string): Record<string, boolean> {
  const open: Record<string, boolean> = {}
  for (const cat of NAV_STRUCTURE) {
    if (!cat.collapsible) continue
    open[cat.id] = Boolean(cat.defaultOpen || cat.matchPath?.(pathname))
  }
  return open
}

function hasAccess(permissions: Permissions, item: NavItemConfig, role: Role): boolean {
  if (item.disabled) return false
  if (item.requireAdmin && role !== 'admin') return false
  if (item.requireVehiculeAccess && permissions.vehiculeVisibility === 'none') return false
  if (item.requiredPermission && !permissions[item.requiredPermission]) return false
  return true
}

function SidebarNavItem({
  item,
  onClose,
  nested = false,
}: {
  item: NavItemConfig
  onClose: () => void
  nested?: boolean
}) {
  const Icon = item.icon
  if (item.disabled) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl text-sm text-gray-500 cursor-not-allowed opacity-60',
          nested ? 'px-3 py-2' : 'px-3 py-2.5'
        )}
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
          'flex items-center gap-3 rounded-xl text-sm font-medium transition-all',
          nested ? 'px-3 py-2' : 'px-3 py-2.5',
          isActive
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        )
      }
    >
      <Icon className={cn('flex-shrink-0', nested ? 'w-4 h-4' : 'w-[18px] h-[18px]')} />
      {item.name}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, permissions, logout, updateProfile } = useAuth()
  const { myNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [avatarKey, setAvatarKey] = useState(0)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    initialOpenSections(location.pathname)
  )
  const notifRef = useRef<HTMLDivElement>(null)
  const notifPanelRef = useRef<HTMLDivElement>(null)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number } | null>(null)

  const myNotifs = myNotifications(user?.id ?? 0)
  const unread = unreadCount(user?.id ?? 0)

  const updateNotifPos = useCallback(() => {
    const el = notifRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const panelW = 320
    const gap = 8
    let left = rect.right + gap
    if (left + panelW > window.innerWidth - 12) {
      left = Math.max(12, rect.left - panelW - gap)
    }
    setNotifPos({ top: rect.top, left })
  }, [])

  const toggleNotif = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (showNotif) {
      setShowNotif(false)
      return
    }
    updateNotifPos()
    setShowNotif(true)
  }

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev }
      let changed = false
      for (const cat of NAV_STRUCTURE) {
        if (cat.collapsible && cat.matchPath?.(location.pathname) && !next[cat.id]) {
          next[cat.id] = true
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [location.pathname])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as Node
      if (notifRef.current?.contains(target)) return
      if (notifPanelRef.current?.contains(target)) return
      setShowNotif(false)
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  useEffect(() => {
    if (!showNotif) return
    const onReposition = () => updateNotifPos()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [showNotif, updateNotifPos])

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
            <button
              type="button"
              onClick={() => {
                setProfileError(null)
                setShowProfile(true)
              }}
              className="flex items-center gap-3 flex-1 min-w-0 text-left rounded-xl hover:bg-white/5 -ml-1 pl-1 py-1 transition-colors"
              title="Modifier mon profil"
            >
              {user.avatarUrl ? (
                <img
                  src={resolveUploadUrl(user.avatarUrl, avatarKey || undefined)}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover shadow-lg flex-shrink-0 ring-2 ring-orange-400/40 bg-gray-800"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0">
                  {user.nom_complet.charAt(0)}
                </div>
              )}
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
            </button>
            <div className="relative flex-shrink-0" ref={notifRef}>
              <button
                onClick={toggleNotif}
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
              {showNotif && notifPos
                ? createPortal(
                    <div
                      ref={notifPanelRef}
                      className="fixed w-80 overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-orange-200 text-gray-900 z-[200]"
                      style={{
                        top: notifPos.top,
                        left: notifPos.left,
                        maxHeight: `min(20rem, calc(100vh - ${notifPos.top}px - 12px))`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-orange-50 rounded-t-2xl sticky top-0 z-10">
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
                                if (n.notePersonnelleId != null) navigate(`/notes?note=${n.notePersonnelleId}`)
                                else if (n.type === 'note_rappel') navigate('/notes')
                                else if (n.reclamationId != null) navigate('/reclamation')
                                else if (n.vehiculeId != null) navigate(`/vehicules/${n.vehiculeId}`)
                                else if (n.type?.startsWith('vehicule_')) navigate('/vehicules')
                              }}
                            >
                              {(() => {
                                const { label, message } = formatNotificationDisplay(n)
                                return (
                                  <>
                                    {label ? (
                                      <p className="text-xs font-semibold text-orange-600">{label}</p>
                                    ) : null}
                                    <p className="text-sm text-gray-800">{message}</p>
                                  </>
                                )
                              })()}
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {new Date(n.date).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>,
                    document.body
                  )
                : null}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-2">
          {NAV_STRUCTURE.map((category) => {
            const allItems = categoryItems(category)
            const visibleFlat = allItems.filter(
              (item) => hasAccess(permissions, item, user.role) || item.disabled
            )
            if (visibleFlat.length === 0) return null

            const sectionActive = Boolean(category.matchPath?.(location.pathname))
            const isOpen = !category.collapsible || openSections[category.id]
            const SectionIcon = category.icon

            if (category.collapsible) {
              const visibleGroups = category.groups
                ?.map((g) => ({
                  ...g,
                  items: g.items.filter(
                    (item) => hasAccess(permissions, item, user.role) || item.disabled
                  ),
                }))
                .filter((g) => g.items.length > 0)

              return (
                <div key={category.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleSection(category.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all',
                      sectionActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    )}
                    aria-expanded={isOpen}
                  >
                    {SectionIcon ? (
                      <SectionIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    ) : null}
                    <span className="flex-1 text-left">{category.label}</span>
                    <ChevronDown
                      className={cn(
                        'w-3.5 h-3.5 text-gray-500 transition-transform',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen ? (
                    <div className="ml-2 pl-2 border-l border-white/10 space-y-2 py-0.5 mb-1">
                      {visibleGroups?.length
                        ? visibleGroups.map((group) => (
                            <div key={group.title} className="space-y-0.5">
                              <p className="px-3 pt-1 pb-0.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                {group.title}
                              </p>
                              {group.items.map((item) => (
                                <SidebarNavItem
                                  key={item.href + item.name}
                                  item={item}
                                  onClose={onClose}
                                  nested
                                />
                              ))}
                            </div>
                          ))
                        : visibleFlat.map((item) => (
                            <SidebarNavItem
                              key={item.href + item.name}
                              item={item}
                              onClose={onClose}
                              nested
                            />
                          ))}
                    </div>
                  ) : null}
                </div>
              )
            }

            return (
              <div key={category.id} className="space-y-0.5 pb-1 mb-1 border-b border-white/5">
                {visibleFlat.map((item) => (
                  <SidebarNavItem key={item.href + item.name} item={item} onClose={onClose} />
                ))}
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

      <ProfileEditModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        initialFullName={user.nom_complet}
        initialTelephone={user.telephone}
        initialAvatarUrl={user.avatarUrl}
        saving={profileSaving}
        error={profileError}
        onSave={async (data) => {
          setProfileSaving(true)
          setProfileError(null)
          const res = await updateProfile(data)
          setProfileSaving(false)
          if (!res.success) {
            setProfileError(res.error ?? 'Erreur')
            return
          }
          setAvatarKey(Date.now())
          setShowProfile(false)
        }}
      />
    </>
  )
}
