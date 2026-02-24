import { useState, useMemo } from 'react'
import { mockUsers } from '@/data/mock'
import { ALL_TOGGLE_KEYS, TOGGLE_PERMISSION_LABELS, VISIBILITY_OPTIONS, ROLE_PRESETS, ROLE_CONFIG, ALL_ROLES,
  type User, type Permissions, type TogglePermissionKey, type VehiculeVisibility, type Role } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Search, UserPlus, Pencil, Ban, CheckCircle, Shield, Eye, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

function countPerms(p: Permissions): number {
  const toggles = ALL_TOGGLE_KEYS.filter(k => p[k]).length
  const vis = p.vehiculeVisibility !== 'none' ? 1 : 0
  return toggles + vis
}

function isCustomized(role: Role, perms: Permissions): boolean {
  const preset = ROLE_PRESETS[role]
  if (perms.vehiculeVisibility !== preset.vehiculeVisibility) return true
  return ALL_TOGGLE_KEYS.some(k => perms[k] !== preset[k])
}

const TOTAL_PERMS = ALL_TOGGLE_KEYS.length + 1

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [filtreRole, setFiltreRole] = useState<Role | 'tous'>('tous')
  const [recherche, setRecherche] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPermsView, setShowPermsView] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const [formData, setFormData] = useState({
    nom_complet: '', email: '', telephone: '', password: '',
    role: 'technicien' as Role,
    permissions: { ...ROLE_PRESETS.technicien },
  })

  const filtered = useMemo(() =>
    users
      .filter(u => filtreRole === 'tous' || u.role === filtreRole)
      .filter(u => {
        if (!recherche) return true
        const q = recherche.toLowerCase()
        return u.nom_complet.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      })
  , [users, filtreRole, recherche])

  const openCreate = () => {
    setEditingUser(null)
    setFormData({
      nom_complet: '', email: '', telephone: '', password: '',
      role: 'technicien',
      permissions: { ...ROLE_PRESETS.technicien },
    })
    setShowForm(true)
  }

  const openEdit = (u: User) => {
    setEditingUser(u)
    setFormData({
      nom_complet: u.nom_complet, email: u.email, telephone: u.telephone, password: '',
      role: u.role,
      permissions: { ...u.permissions },
    })
    setShowForm(true)
  }

  const selectRole = (role: Role) => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: { ...ROLE_PRESETS[role] },
    }))
  }

  const resetToRoleDefaults = () => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...ROLE_PRESETS[prev.role] },
    }))
  }

  const togglePerm = (key: TogglePermissionKey) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }))
  }

  const setVisibility = (val: VehiculeVisibility) => {
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, vehiculeVisibility: val },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id
        ? { ...u, nom_complet: formData.nom_complet, email: formData.email, telephone: formData.telephone, role: formData.role, permissions: { ...formData.permissions } }
        : u
      ))
    } else {
      const newUser: User = {
        id: Math.max(...users.map(u => u.id)) + 1,
        nom_complet: formData.nom_complet,
        email: formData.email,
        telephone: formData.telephone,
        role: formData.role,
        permissions: { ...formData.permissions },
        statut: 'actif',
        date_creation: new Date().toISOString().split('T')[0],
        derniere_connexion: null,
      }
      setUsers(prev => [...prev, newUser])
    }
    setShowForm(false)
  }

  const toggleStatut = (userId: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, statut: u.statut === 'actif' ? 'inactif' : 'actif' } : u))
  }

  const hasCustom = isCustomized(formData.role, formData.permissions)

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{users.filter(u => u.statut === 'actif').length} membres actifs</p>
        </div>
        <Button onClick={openCreate} icon={<UserPlus className="w-4 h-4" />} className="text-xs sm:text-sm flex-shrink-0">
          <span className="hidden sm:inline">Nouveau compte</span>
          <span className="sm:hidden">Nouveau</span>
        </Button>
      </div>

      {/* Role filters - horizontal scroll mobile */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        <button onClick={() => setFiltreRole('tous')}
          className={cn('px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all whitespace-nowrap flex-shrink-0',
            filtreRole === 'tous' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
          )}>Tous ({users.length})</button>
        {ALL_ROLES.map(role => {
          const rc = ROLE_CONFIG[role]
          const count = users.filter(u => u.role === role).length
          return (
            <button key={role} onClick={() => setFiltreRole(role)}
              className={cn('px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all whitespace-nowrap flex-shrink-0',
                filtreRole === role ? `${rc.bg} ${rc.color} border-current` : 'bg-white text-gray-500 border-gray-200'
              )}>{rc.label} ({count})</button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
        />
      </div>

      {/* Desktop Table */}
      <Card padding="none" className="hidden md:block">
        <div className="grid grid-cols-7 gap-4 px-5 py-3 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
          <div className="col-span-2">Utilisateur</div><div>Rôle</div><div>Téléphone</div><div>Accès</div><div>Statut</div><div>Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">Aucun utilisateur trouvé</div>
        ) : (
          filtered.map(u => {
            const rc = ROLE_CONFIG[u.role]
            const permCount = countPerms(u.permissions)
            const custom = isCustomized(u.role, u.permissions)
            return (
              <div key={u.id} className="grid grid-cols-7 gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors items-center">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {u.nom_complet.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{u.nom_complet}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
                <div>
                  <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold', rc.bg, rc.color)}>
                    <Shield className="w-3 h-3" />{rc.label}
                  </span>
                  {custom && <span className="ml-1 text-[10px] text-orange-500 font-semibold">personnalisé</span>}
                </div>
                <div className="text-sm text-gray-600">{u.telephone}</div>
                <div>
                  <button onClick={() => setShowPermsView(u)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    <Eye className="w-3 h-3" />{permCount}/{TOTAL_PERMS} accès
                  </button>
                </div>
                <div>
                  <Badge variant={u.statut === 'actif' ? 'success' : 'danger'} dot>{u.statut === 'actif' ? 'Actif' : 'Inactif'}</Badge>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(u)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleStatut(u.id)} title={u.statut === 'actif' ? 'Désactiver' : 'Réactiver'}
                    className={cn('p-2 rounded-lg transition-colors', u.statut === 'actif' ? 'hover:bg-red-50 text-red-500' : 'hover:bg-green-50 text-green-500')}
                  >
                    {u.statut === 'actif' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </Card>

      {/* Mobile/Tablet Cards */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
            <p className="text-sm text-gray-400">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          filtered.map(u => {
            const rc = ROLE_CONFIG[u.role]
            const permCount = countPerms(u.permissions)
            const custom = isCustomized(u.role, u.permissions)
            return (
              <div key={u.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3.5">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {u.nom_complet.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{u.nom_complet}</p>
                    <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                  </div>
                  <Badge variant={u.statut === 'actif' ? 'success' : 'danger'} dot>
                    {u.statut === 'actif' ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-2.5">
                  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', rc.bg, rc.color)}>
                    <Shield className="w-2.5 h-2.5" />{rc.label}
                  </span>
                  {custom && <span className="text-[10px] text-orange-500 font-semibold">personnalisé</span>}
                  <button onClick={() => setShowPermsView(u)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 active:text-orange-800"
                  >
                    <Eye className="w-3 h-3" />{permCount}/{TOTAL_PERMS}
                  </button>
                </div>

                {u.telephone && (
                  <p className="text-[11px] text-gray-500 mb-2.5">{u.telephone}</p>
                )}

                <div className="flex gap-2 border-t border-gray-100 pt-2.5">
                  <button onClick={() => openEdit(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-gray-50 text-gray-600 text-xs font-semibold active:bg-gray-100 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />Modifier
                  </button>
                  <button onClick={() => toggleStatut(u.id)}
                    className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors',
                      u.statut === 'actif'
                        ? 'bg-red-50 text-red-600 active:bg-red-100'
                        : 'bg-green-50 text-green-600 active:bg-green-100'
                    )}
                  >
                    {u.statut === 'actif' ? <><Ban className="w-3.5 h-3.5" />Désactiver</> : <><CheckCircle className="w-3.5 h-3.5" />Activer</>}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* View permissions modal */}
      {showPermsView && (
        <Modal open onClose={() => setShowPermsView(null)} title={`Accès — ${showPermsView.nom_complet}`}
          subtitle={`${ROLE_CONFIG[showPermsView.role].label} · ${showPermsView.email}`}>
          <div className="space-y-1.5">
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Visibilité véhicules</p>
            {VISIBILITY_OPTIONS.map(opt => {
              const isActive = showPermsView.permissions.vehiculeVisibility === opt.value
              return (
                <div key={opt.value} className={cn('flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl', isActive ? 'bg-blue-50' : 'bg-gray-50 opacity-40')}>
                  <span className="text-base sm:text-lg">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs sm:text-sm font-semibold', isActive ? 'text-blue-800' : 'text-gray-400')}>{opt.label}</p>
                  </div>
                  {isActive && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0"><CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" /></div>}
                </div>
              )
            })}
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 mt-3">Autres accès</p>
            {ALL_TOGGLE_KEYS.map(key => {
              const config = TOGGLE_PERMISSION_LABELS[key]
              const hasIt = showPermsView.permissions[key]
              return (
                <div key={key} className={cn('flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl', hasIt ? 'bg-green-50' : 'bg-gray-50')}>
                  <span className="text-base sm:text-lg">{config.icon}</span>
                  <p className={cn('text-xs sm:text-sm font-semibold flex-1', hasIt ? 'text-green-800' : 'text-gray-400')}>{config.label}</p>
                  <div className={cn('w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0', hasIt ? 'bg-green-500' : 'bg-gray-300')}>
                    {hasIt ? <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" /> : <Ban className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
                  </div>
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      {/* Create/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}
        title={editingUser ? 'Modifier le compte' : 'Créer un compte'}
        subtitle={editingUser ? editingUser.email : 'Rôle + accès personnalisables'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input id="nom" label="Nom complet" required value={formData.nom_complet}
              onChange={e => setFormData(p => ({ ...p, nom_complet: e.target.value }))} placeholder="Nom et prénom" />
            <Input id="email" label="Email" type="email" required value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="exemple@elmecano.tn" />
          </div>
          <Input id="tel" label="Téléphone" value={formData.telephone}
            onChange={e => setFormData(p => ({ ...p, telephone: e.target.value }))} placeholder="Ex: 22130470" />
          {!editingUser && (
            <Input id="pw" label="Mot de passe" type="password" required value={formData.password}
              onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 8 caractères" />
          )}

          {/* Role selector */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-2">Rôle</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_ROLES.map(role => {
                const rc = ROLE_CONFIG[role]
                const isSelected = formData.role === role
                return (
                  <button key={role} type="button" onClick={() => selectRole(role)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 p-2.5 sm:p-3 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all active:scale-95',
                      isSelected ? `${rc.bg} ${rc.color} border-current shadow-md` : 'border-gray-200 text-gray-500 hover:border-gray-300',
                    )}
                  >
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    {rc.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-900">Accès</label>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                  Auto-remplis selon le rôle.
                  {hasCustom && <span className="text-orange-500 font-semibold"> Modifié</span>}
                </p>
              </div>
              {hasCustom && (
                <button type="button" onClick={resetToRoleDefaults}
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-orange-600 active:text-orange-800 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />Reset
                </button>
              )}
            </div>

            {/* Vehicule visibility */}
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Visibilité véhicules</p>
            <div className="space-y-1.5 mb-3 sm:mb-4">
              {VISIBILITY_OPTIONS.map(opt => {
                const isSelected = formData.permissions.vehiculeVisibility === opt.value
                return (
                  <button key={opt.value} type="button" onClick={() => setVisibility(opt.value)}
                    className={cn(
                      'w-full flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border-2 transition-all text-left active:scale-[0.98]',
                      isSelected ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200',
                    )}
                  >
                    <span className="text-base sm:text-lg flex-shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs sm:text-sm font-semibold', isSelected ? 'text-blue-800' : 'text-gray-700')}>{opt.label}</p>
                      <p className={cn('text-[10px] sm:text-xs', isSelected ? 'text-blue-600' : 'text-gray-400')}>{opt.description}</p>
                    </div>
                    <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300',
                    )}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Toggle permissions */}
            <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Autres accès</p>
            <div className="space-y-1.5">
              {ALL_TOGGLE_KEYS.map(key => {
                const config = TOGGLE_PERMISSION_LABELS[key]
                const isOn = formData.permissions[key]
                return (
                  <button key={key} type="button" onClick={() => togglePerm(key)}
                    className={cn(
                      'w-full flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border-2 transition-all text-left active:scale-[0.98]',
                      isOn ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200',
                    )}
                  >
                    <span className="text-base sm:text-lg flex-shrink-0">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs sm:text-sm font-semibold', isOn ? 'text-orange-800' : 'text-gray-700')}>{config.label}</p>
                      <p className={cn('text-[10px] sm:text-xs', isOn ? 'text-orange-600' : 'text-gray-400')}>{config.description}</p>
                    </div>
                    <div className={cn('w-9 h-5 sm:w-10 sm:h-6 rounded-full flex items-center transition-colors flex-shrink-0 px-0.5',
                      isOn ? 'bg-orange-500' : 'bg-gray-300',
                    )}>
                      <div className={cn('w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow transition-transform',
                        isOn ? 'translate-x-4' : 'translate-x-0',
                      )} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 pt-3 border-t border-gray-100 sticky bottom-0 bg-white">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1 text-xs sm:text-sm">Annuler</Button>
            <Button type="submit" className="flex-1 text-xs sm:text-sm">{editingUser ? 'Enregistrer' : 'Créer le compte'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
