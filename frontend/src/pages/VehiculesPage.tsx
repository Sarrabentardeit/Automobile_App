import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useToast } from '@/contexts/ToastContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { ETAT_CONFIG, type EtatVehicule, type VehiculeType, type Vehicule } from '@/types'
import VehiculeCard from '@/components/vehicules/VehiculeCard'
import VehiculeForm from '@/components/vehicules/VehiculeForm'
import ChangeEtatModal from '@/components/vehicules/ChangeEtatModal'
import { Car, Bike, Search, Plus, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function VehiculesPage() {
  const { user, permissions } = useAuth()
  const { vehicules, addVehicule, editVehicule, changeEtat } = useVehiculesContext()
  const toast = useToast()
  const { addNotification } = useNotifications()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tab, setTab] = useState<VehiculeType>('voiture')
  const [filtreEtat, setFiltreEtat] = useState<EtatVehicule | 'tous'>(
    (searchParams.get('etat') as EtatVehicule) || 'tous'
  )
  const [recherche, setRecherche] = useState('')
  const [dateFilterMode, setDateFilterMode] = useState<'toutes' | 'aujourdhui' | 'hier' | 'semaine' | 'date'>('toutes')
  const [dateFilter, setDateFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null)
  const [changeEtatVehicule, setChangeEtatVehicule] = useState<Vehicule | null>(null)

  if (!user || !permissions) return null

  const myVehicules = permissions.vehiculeVisibility === 'all'
    ? vehicules
    : permissions.vehiculeVisibility === 'own'
      ? vehicules.filter(v => v.technicien_id === user.id)
      : []

  const filtered = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const weekStart = new Date(today)
    const day = today.getDay() === 0 ? 7 : today.getDay()
    weekStart.setDate(today.getDate() - (day - 1))
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    const selectedDate = dateFilterMode === 'date' && dateFilter
      ? (() => {
          const d = new Date(dateFilter)
          d.setHours(0, 0, 0, 0)
          return d
        })()
      : null

    return myVehicules
      .filter(v => v.type === tab)
      .filter(v => filtreEtat === 'tous' || v.etat_actuel === filtreEtat)
      .filter(v => {
        if (!recherche) return true
        const q = recherche.toLowerCase()
        return v.modele.toLowerCase().includes(q)
          || v.immatriculation.toLowerCase().includes(q)
          || v.defaut.toLowerCase().includes(q)
      })
      .filter(v => {
        if (dateFilterMode === 'toutes') return true
        const d = new Date(v.date_entree)
        if (Number.isNaN(d.getTime())) return true
        d.setHours(0, 0, 0, 0)

        if (dateFilterMode === 'aujourdhui') return d.getTime() === today.getTime()
        if (dateFilterMode === 'hier') return d.getTime() === yesterday.getTime()
        if (dateFilterMode === 'semaine') return d >= weekStart && d <= weekEnd
        if (dateFilterMode === 'date' && selectedDate) return d.getTime() === selectedDate.getTime()
        return true
      })
      .sort((a, b) => {
        const order: Record<EtatVehicule, number> = { rouge: 0, mauve: 1, orange: 2, bleu: 3, vert: 4 }
        return order[a.etat_actuel] - order[b.etat_actuel]
      })
  }, [myVehicules, tab, filtreEtat, recherche, dateFilterMode, dateFilter])

  const etats: EtatVehicule[] = ['orange', 'mauve', 'bleu', 'rouge', 'vert']
  const countByEtat = (etat: EtatVehicule) => myVehicules.filter(v => v.type === tab && v.etat_actuel === etat).length

  const handleFilterEtat = (etat: EtatVehicule | 'tous') => {
    setFiltreEtat(etat)
    if (etat === 'tous') searchParams.delete('etat')
    else searchParams.set('etat', etat)
    setSearchParams(searchParams)
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Véhicules</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {permissions.vehiculeVisibility === 'all'
              ? `${myVehicules.length} véhicule(s) au total`
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

      {/* Tabs - full width on mobile */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        {([['voiture', Car, 'Voitures'] as const, ['moto', Bike, 'Motos'] as const]).map(([type, Icon, label]) => (
          <button key={type} onClick={() => setTab(type)}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all',
              tab === type ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:bg-gray-50 active:bg-gray-100',
            )}
          >
            <Icon className="w-4 h-4" />{label} ({myVehicules.filter(v => v.type === type).length})
          </button>
        ))}
      </div>

      {/* Color filters - horizontal scroll on mobile */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
        <button onClick={() => handleFilterEtat('tous')}
          className={cn('px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border-2 transition-all whitespace-nowrap flex-shrink-0',
            filtreEtat === 'tous' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
          )}
        >
          Tous ({myVehicules.filter(v => v.type === tab).length})
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

      {/* Search + Date filters */}
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
                  if (mode === 'toutes') setDateFilter('')
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs text-gray-500 whitespace-nowrap">Jour précis</span>
            <input
              type="date"
              value={dateFilter}
              onChange={e => {
                setDateFilter(e.target.value)
                setDateFilterMode(e.target.value ? 'date' : 'toutes')
              }}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] sm:text-xs text-gray-700 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Vehicle list */}
      <div className="space-y-2.5 sm:space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 sm:p-16 text-center shadow-sm border border-gray-100">
            <Filter className="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm sm:text-base">Aucun véhicule trouvé</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Essayez de modifier les filtres</p>
          </div>
        ) : (
          filtered.map(v => (
            <VehiculeCard
              key={v.id}
              vehicule={v}
              permissions={permissions}
              onChangeEtat={() => setChangeEtatVehicule(v)}
              onEdit={() => { setEditingVehicule(v); setShowAddForm(true) }}
            />
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <VehiculeForm
          vehicule={editingVehicule}
          onClose={() => { setShowAddForm(false); setEditingVehicule(null) }}
          onSubmit={(data) => {
            const techId = data.technicien_id
            if (editingVehicule) {
              editVehicule(editingVehicule.id, data)
              if (techId) addNotification(techId, `Vous avez été assigné au véhicule ${data.modele} ${data.immatriculation ? `(${data.immatriculation})` : ''} - ${data.defaut}`)
              toast.success('Véhicule modifié avec succès')
            } else {
              addVehicule(data, user.id, user.nom_complet)
              if (techId) addNotification(techId, `Nouveau véhicule assigné : ${data.modele} ${data.immatriculation ? `(${data.immatriculation})` : ''} - ${data.defaut}`)
              toast.success('Véhicule ajouté avec succès')
            }
            setShowAddForm(false)
            setEditingVehicule(null)
          }}
        />
      )}

      {/* Change Etat Modal */}
      {changeEtatVehicule && (
        <ChangeEtatModal
          vehicule={changeEtatVehicule}
          onClose={() => setChangeEtatVehicule(null)}
          onConfirm={(nouvelEtat, commentaire, pieces) => {
            changeEtat(changeEtatVehicule.id, nouvelEtat, user.id, user.nom_complet, commentaire, pieces)
            toast.success('État mis à jour avec succès')
            setChangeEtatVehicule(null)
          }}
        />
      )}
    </div>
  )
}
