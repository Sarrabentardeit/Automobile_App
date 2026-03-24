import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useUsers } from '@/contexts/UsersContext'
import { useToast } from '@/contexts/ToastContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { ETAT_CONFIG, type EtatVehicule, type VehiculeType, type Vehicule } from '@/types'
import type { VehiculesFilters } from '@/hooks/useVehicules'
import VehiculeCard from '@/components/vehicules/VehiculeCard'
import VehiculeForm from '@/components/vehicules/VehiculeForm'
import ChangeEtatModal from '@/components/vehicules/ChangeEtatModal'
import { Car, Bike, Search, Plus, Filter, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

function getDateRange(mode: string, dateFilter: string): { date_debut?: string; date_fin?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (mode === 'toutes') return {}
  if (mode === 'aujourdhui') return { date_debut: fmt(today), date_fin: fmt(today) }
  if (mode === 'hier') {
    const y = new Date(today)
    y.setDate(y.getDate() - 1)
    return { date_debut: fmt(y), date_fin: fmt(y) }
  }
  if (mode === 'semaine') {
    const day = today.getDay() === 0 ? 7 : today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (day - 1))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return { date_debut: fmt(weekStart), date_fin: fmt(weekEnd) }
  }
  if (mode === 'date' && dateFilter) return { date_debut: dateFilter, date_fin: dateFilter }
  return {}
}

export default function VehiculesPage() {
  const { user, permissions } = useAuth()
  const { users } = useUsers()
  const {
    vehicules,
    total,
    page,
    limit,
    stats,
    loading,
    addVehicule,
    editVehicule,
    deleteVehicule,
    changeEtat,
    uploadVehiculeImage,
    fetchVehicules,
  } = useVehiculesContext()
  const toast = useToast()
  const { addNotification } = useNotifications()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState<VehiculeType>('voiture')
  const [filtreEtat, setFiltreEtat] = useState<EtatVehicule | 'tous'>(
    (searchParams.get('etat') as EtatVehicule) || 'tous'
  )
  const [recherche, setRecherche] = useState('')
  const [rechercheDebounced, setRechercheDebounced] = useState('')
  const [technicienId, setTechnicienId] = useState<number | undefined>()
  const [dateFilterMode, setDateFilterMode] = useState<'toutes' | 'aujourdhui' | 'hier' | 'semaine' | 'date'>('toutes')
  const [dateFilter, setDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null)
  const [changeEtatVehicule, setChangeEtatVehicule] = useState<Vehicule | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Vehicule | null>(null)

  if (!user || !permissions) return null

  const techniciens = (users ?? []).filter(u => u.role === 'technicien')

  useEffect(() => {
    const t = setTimeout(() => setRechercheDebounced(recherche), 300)
    return () => clearTimeout(t)
  }, [recherche])

  const loadVehicules = useCallback(() => {
    const { date_debut, date_fin } = getDateRange(dateFilterMode, dateFilter)
    const filters: VehiculesFilters = {
      type: tab,
      etat: filtreEtat === 'tous' ? undefined : filtreEtat,
      technicien_id: permissions.vehiculeVisibility === 'own' ? user.id : technicienId,
      date_debut,
      date_fin,
      q: rechercheDebounced || undefined,
      page: currentPage,
      limit: PAGE_SIZE,
    }
    fetchVehicules(filters)
  }, [
    tab,
    filtreEtat,
    technicienId,
    dateFilterMode,
    dateFilter,
    currentPage,
    rechercheDebounced,
    permissions.vehiculeVisibility,
    user?.id,
    fetchVehicules,
  ])

  useEffect(() => {
    loadVehicules()
  }, [loadVehicules])

  const myVehicules = permissions.vehiculeVisibility === 'all'
    ? vehicules
    : permissions.vehiculeVisibility === 'own'
      ? vehicules.filter(v => v.technicien_id === user.id)
      : []

  const etats: EtatVehicule[] = ['orange', 'mauve', 'bleu', 'rouge', 'vert']
  const countByEtat = (etat: EtatVehicule) => stats?.byEtat?.[etat] ?? 0
  const totalAll = stats?.total ?? total

  const handleFilterEtat = (etat: EtatVehicule | 'tous') => {
    setFiltreEtat(etat)
    setCurrentPage(1)
    if (etat === 'tous') searchParams.delete('etat')
    else searchParams.set('etat', etat)
    setSearchParams(searchParams)
  }

  const handleTabChange = (t: VehiculeType) => {
    setTab(t)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(total / limit) || 1

  const handleDelete = async (v: Vehicule) => {
    const ok = await deleteVehicule(v.id)
    if (ok) {
      toast.success('Véhicule supprimé')
      setDeleteConfirm(null)
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Véhicules</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {permissions.vehiculeVisibility === 'all'
              ? `${totalAll} véhicule(s) au total`
              : `${myVehicules.length} véhicule(s) assigné(s)`}
          </p>
        </div>
        {permissions.canAddVehicule && (
          <button onClick={() => { setEditingVehicule(null); setShowAddForm(true) }}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-orange-500/25 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un véhicule</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        {([['voiture', Car, 'Voitures'] as const, ['moto', Bike, 'Motos'] as const]).map(([type, Icon, label]) => (
          <button key={type} onClick={() => handleTabChange(type)}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all',
              tab === type ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:bg-gray-50 active:bg-gray-100',
            )}
          >
            <Icon className="w-4 h-4" />{label} ({tab === type ? total : '—'})
          </button>
        ))}
      </div>

      {/* Color filters */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        <button onClick={() => handleFilterEtat('tous')}
          className={cn('px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all whitespace-nowrap flex-shrink-0',
            filtreEtat === 'tous' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          )}
        >
          Tous ({total})
        </button>
        {etats.map(etat => {
          const cfg = ETAT_CONFIG[etat]
          const count = countByEtat(etat)
          return (
            <button key={etat} onClick={() => handleFilterEtat(etat)}
              className={cn('px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all whitespace-nowrap flex-shrink-0',
                filtreEtat === etat ? 'scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
              )}
              style={{
                backgroundColor: filtreEtat === etat ? `${cfg.color}15` : 'white',
                borderColor: cfg.color, color: cfg.color,
              }}
            >
              {cfg.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Search + Date + Technicien filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher modèle, immatriculation..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              ['toutes', 'Toutes dates'],
              ['aujourdhui', "Aujourd'hui"],
              ['hier', 'Hier'],
              ['semaine', 'Cette semaine'],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setDateFilterMode(mode as typeof dateFilterMode)
                  setDateFilter('')
                  setCurrentPage(1)
                }}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-medium border transition-all',
                  dateFilterMode === mode
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {permissions.vehiculeVisibility === 'all' && techniciens.length > 0 && (
              <select
                value={technicienId ?? ''}
                onChange={e => { setTechnicienId(e.target.value ? Number(e.target.value) : undefined); setCurrentPage(1) }}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] sm:text-xs text-gray-700 bg-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Tous techniciens</option>
                {techniciens.map(t => (
                  <option key={t.id} value={t.id}>{t.nom_complet}</option>
                ))}
              </select>
            )}
            <span className="text-[11px] sm:text-xs text-gray-500 whitespace-nowrap">Jour précis</span>
            <input
              type="date"
              value={dateFilter}
              onChange={e => {
                setDateFilter(e.target.value)
                setDateFilterMode(e.target.value ? 'date' : 'toutes')
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] sm:text-xs text-gray-700 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Vehicle list */}
      <div className="space-y-2.5 sm:space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-10 sm:p-16 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 font-medium text-sm sm:text-base">Chargement...</p>
          </div>
        ) : myVehicules.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 sm:p-16 text-center shadow-sm border border-gray-100">
            <Filter className="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm sm:text-base">Aucun véhicule trouvé</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Essayez de modifier les filtres</p>
          </div>
        ) : (
          myVehicules.map(v => (
            <VehiculeCard
              key={v.id}
              vehicule={v}
              permissions={permissions}
              onChangeEtat={() => setChangeEtatVehicule(v)}
              onEdit={() => { setEditingVehicule(v); setShowAddForm(true) }}
              onDelete={permissions.canEditVehicule ? () => setDeleteConfirm(v) : undefined}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500">
            Page {page} sur {totalPages} ({total} résultat{total > 1 ? 's' : ''})
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Supprimer ce véhicule ?</h3>
            <p className="text-sm text-gray-600 mb-4">
              {deleteConfirm.modele} {deleteConfirm.immatriculation && `(${deleteConfirm.immatriculation})`}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <VehiculeForm
          vehicule={editingVehicule}
          onClose={() => { setShowAddForm(false); setEditingVehicule(null) }}
          onSubmit={async (data, images) => {
            const techId = data.technicien_id
            try {
              let savedVehiculeId: number | null = null
              if (editingVehicule) {
                const updated = await editVehicule(editingVehicule.id, data)
                savedVehiculeId = updated.id
                if (techId) addNotification(techId, `Vous avez été assigné au véhicule ${data.modele} ${data.immatriculation ? `(${data.immatriculation})` : ''} - ${data.defaut}`)
                toast.success('Véhicule modifié avec succès')
              } else {
                const created = await addVehicule(data, user.id, user.nom_complet)
                savedVehiculeId = created.id
                if (techId) addNotification(techId, `Nouveau véhicule assigné : ${data.modele} ${data.immatriculation ? `(${data.immatriculation})` : ''} - ${data.defaut}`)
                toast.success('Véhicule ajouté avec succès')
              }
              if (savedVehiculeId && images.length > 0) {
                let failed = 0
                for (const image of images) {
                  try {
                    await uploadVehiculeImage(savedVehiculeId, image)
                  } catch {
                    failed += 1
                  }
                }
                if (failed > 0) {
                  toast.error(`${failed} photo(s) n'ont pas pu être envoyées.`)
                } else {
                  toast.success(`${images.length} photo(s) enregistrée(s).`)
                }
              }
              setShowAddForm(false)
              setEditingVehicule(null)
              loadVehicules()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Erreur')
            }
          }}
        />
      )}

      {/* Change Etat Modal */}
      {changeEtatVehicule && (
        <ChangeEtatModal
          vehicule={changeEtatVehicule}
          onClose={() => setChangeEtatVehicule(null)}
          onConfirm={async (nouvelEtat, commentaire, pieces) => {
            const ok = await changeEtat(changeEtatVehicule.id, nouvelEtat, user.id, user.nom_complet, commentaire, pieces)
            if (ok) {
              toast.success('État mis à jour avec succès')
              setChangeEtatVehicule(null)
            } else {
              toast.error('Transition non autorisée')
            }
          }}
        />
      )}
    </div>
  )
}
