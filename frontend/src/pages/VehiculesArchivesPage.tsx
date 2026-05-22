import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useUsers } from '@/contexts/UsersContext'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch } from '@/lib/api'
import { downloadVehiculesCsv } from '@/lib/exportVehiculesCsv'
import type { VehiculeType, Vehicule } from '@/types'
import type { VehiculesFilters } from '@/hooks/useVehicules'
import VehiculeCard from '@/components/vehicules/VehiculeCard'
import VehiculeForm from '@/components/vehicules/VehiculeForm'
import VehiculeFicheFinanciereModal from '@/components/vehicules/VehiculeFicheFinanciereModal'
import ChangeEtatModal from '@/components/vehicules/ChangeEtatModal'
import { Car, Bike, Search, Filter, ChevronLeft, ChevronRight, Archive, Trash2, Download, Folder, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND_FOLDER_PAGE_SIZE, type BrandFolder } from '@/lib/vehiculeBrands'

const VEHICLE_PAGE_SIZE = 20

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

export default function VehiculesArchivesPage() {
  const navigate = useNavigate()
  const { brand: brandParam } = useParams<{ brand?: string }>()
  const { user, permissions, getAccessToken } = useAuth()
  const { users } = useUsers()
  const {
    vehicules,
    total,
    page,
    limit,
    loading,
    fetchVehicules,
    changeEtat,
    fetchFilteredCounts,
    editVehicule,
    deleteVehicule,
    uploadVehiculeImage,
    fetchFicheFinanciere,
    patchFicheFinanciereAvance,
    createDepense,
    updateDepense,
    deleteDepense,
    createDepenseFromStock,
  } = useVehiculesContext()
  const toast = useToast()

  const [tab, setTab] = useState<VehiculeType>('voiture')
  const [recherche, setRecherche] = useState('')
  const [rechercheDebounced, setRechercheDebounced] = useState('')
  const [technicienId, setTechnicienId] = useState<number | undefined>()
  const [dateFilterMode, setDateFilterMode] = useState<'toutes' | 'aujourdhui' | 'hier' | 'semaine' | 'date'>('toutes')
  const [dateFilter, setDateFilter] = useState('')
  const [vehiclePage, setVehiclePage] = useState(1)
  const [folderPage, setFolderPage] = useState(1)
  const [brandFolders, setBrandFolders] = useState<BrandFolder[]>([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const isBrandView = Boolean(brandParam)
  const [changeEtatVehicule, setChangeEtatVehicule] = useState<Vehicule | null>(null)
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Vehicule | null>(null)
  const [ficheVehicule, setFicheVehicule] = useState<Vehicule | null>(null)
  const [exporting, setExporting] = useState(false)

  const techniciens = (users ?? []).filter(u => u.role === 'technicien')

  useEffect(() => {
    const t = setTimeout(() => setRechercheDebounced(recherche), 300)
    return () => clearTimeout(t)
  }, [recherche])

  const loadBrandFolders = useCallback(async () => {
    if (!user || !permissions) return
    const token = getAccessToken()
    if (!token) {
      setBrandFolders([])
      return
    }
    setBrandsLoading(true)
    try {
      const { date_debut, date_fin } = getDateRange(dateFilterMode, dateFilter)
      const params: Record<string, string | number | undefined> = {
        type: tab,
        etat: 'vert',
      }
      if (permissions.vehiculeVisibility === 'own') params.technicien_id = user.id
      else if (technicienId) params.technicien_id = technicienId
      if (date_debut) params.date_debut = date_debut
      if (date_fin) params.date_fin = date_fin
      if (rechercheDebounced) params.q = rechercheDebounced
      const res = await apiFetch<{ brands: BrandFolder[]; totalVehicles: number }>('/vehicules/brands', {
        token,
        params,
      })
      setBrandFolders(Array.isArray(res.brands) ? res.brands : [])
    } catch {
      setBrandFolders([])
    } finally {
      setBrandsLoading(false)
    }
  }, [
    getAccessToken,
    tab,
    technicienId,
    dateFilterMode,
    dateFilter,
    rechercheDebounced,
    permissions?.vehiculeVisibility,
    user?.id,
  ])

  const loadVehiclesForBrand = useCallback(() => {
    if (!brandParam || !user || !permissions) return
    const { date_debut, date_fin } = getDateRange(dateFilterMode, dateFilter)
    fetchVehicules({
      type: tab,
      etat: 'vert',
      technicien_id: permissions.vehiculeVisibility === 'own' ? user.id : technicienId,
      date_debut,
      date_fin,
      q: rechercheDebounced || undefined,
      marque: brandParam,
      page: vehiclePage,
      limit: VEHICLE_PAGE_SIZE,
    })
  }, [
    brandParam,
    tab,
    technicienId,
    dateFilterMode,
    dateFilter,
    rechercheDebounced,
    vehiclePage,
    permissions?.vehiculeVisibility,
    user?.id,
    fetchVehicules,
  ])

  useEffect(() => {
    if (isBrandView) loadVehiclesForBrand()
    else loadBrandFolders()
  }, [isBrandView, loadBrandFolders, loadVehiclesForBrand])

  useEffect(() => {
    setVehiclePage(1)
    setFolderPage(1)
  }, [tab, technicienId, dateFilterMode, dateFilter, rechercheDebounced, brandParam])

  if (!user || !permissions) return null

  const myVehicules = permissions.vehiculeVisibility === 'all'
    ? vehicules
    : permissions.vehiculeVisibility === 'own'
      ? vehicules.filter(
        v =>
          v.technicien_id === user.id ||
          v.responsable_id === user.id ||
          (v.technicien_ids?.includes(user.id) ?? false) ||
          (v.responsable_ids?.includes(user.id) ?? false)
      )
      : []

  const canEditFicheFinanciere = permissions.canEditVehicule || permissions.canViewFinance
  const selectedBrandFolder = brandParam ? brandFolders.find(b => b.slug === brandParam) : undefined
  const selectedBrandName =
    selectedBrandFolder?.name ??
    (brandParam
      ? brandParam.split('-').map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : '')).join(' ')
      : '')
  const folderTotalPages = Math.max(1, Math.ceil(brandFolders.length / BRAND_FOLDER_PAGE_SIZE))
  const paginatedBrandFolders = brandFolders.slice(
    (folderPage - 1) * BRAND_FOLDER_PAGE_SIZE,
    folderPage * BRAND_FOLDER_PAGE_SIZE
  )
  const vehicleTotalPages = Math.ceil(total / limit) || 1
  const vehiclesToRender = isBrandView ? myVehicules : []
  const contentLoading = isBrandView ? loading : brandsLoading
  const archiveTotal = brandFolders.reduce((s, b) => s + b.count, 0)

  const handleDelete = async (v: Vehicule) => {
    const ok = await deleteVehicule(v.id)
    if (ok) {
      toast.success('Véhicule supprimé')
      setDeleteConfirm(null)
      if (isBrandView) loadVehiclesForBrand()
      else loadBrandFolders()
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleExportExcel = async () => {
    const token = getAccessToken()
    if (!token) {
      toast.error('Non authentifié')
      return
    }
    setExporting(true)
    try {
      const { date_debut, date_fin } = getDateRange(dateFilterMode, dateFilter)
      const all: Vehicule[] = []
      let pageNum = 1
      const pageLimit = 50
      for (;;) {
        const params: Record<string, string | number | undefined> = {
          page: pageNum,
          limit: pageLimit,
          etat: 'vert',
          type: tab,
        }
        if (permissions.vehiculeVisibility === 'own') params.technicien_id = user.id
        else if (technicienId) params.technicien_id = technicienId
        if (date_debut) params.date_debut = date_debut
        if (date_fin) params.date_fin = date_fin
        if (rechercheDebounced.trim()) params.q = rechercheDebounced.trim()

        const res = await apiFetch<{ data: Vehicule[]; total: number }>('/vehicules', { token, params })
        const chunk = Array.isArray(res.data) ? res.data : []
        all.push(...chunk)
        const tot = res.total ?? 0
        if (all.length >= tot || chunk.length === 0) break
        pageNum += 1
      }

      const labelType = tab === 'moto' ? 'motos' : 'voitures'
      downloadVehiculesCsv(
        all,
        users ?? [],
        `archives-${labelType}-${new Date().toISOString().slice(0, 10)}.csv`
      )
      toast.success(all.length > 0 ? `${all.length} véhicule(s) exporté(s)` : 'Export vide (aucun résultat)')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export impossible')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
            <Archive className="w-5 h-5 sm:w-6 sm:h-6" />
            Archives véhicules validés
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            {isBrandView ? `${total} véhicule(s) validé(s)` : `${archiveTotal} véhicule(s) · ${brandFolders.length} marque(s)`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExportExcel()}
          disabled={exporting || loading}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{exporting ? 'Export…' : 'Exporter Excel'}</span>
          <span className="sm:hidden">{exporting ? '…' : 'Excel'}</span>
        </button>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        {([['voiture', Car, 'Voitures'] as const, ['moto', Bike, 'Motos'] as const]).map(([type, Icon, label]) => (
          <button
            key={type}
            onClick={() => {
              setTab(type)
              setVehiclePage(1)
              setFolderPage(1)
            }}
            className={cn(
              'flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all',
              tab === type ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:bg-gray-50 active:bg-gray-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

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
                  setVehiclePage(1)
              setFolderPage(1)
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
                onChange={e => {
                  setTechnicienId(e.target.value ? Number(e.target.value) : undefined)
                  setVehiclePage(1)
                  setFolderPage(1)
                }}
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
                setVehiclePage(1)
              setFolderPage(1)
              }}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] sm:text-xs text-gray-700 bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {contentLoading ? (
          <div className="bg-white rounded-2xl p-10 sm:p-16 text-center shadow-sm border border-gray-100">
            <p className="text-gray-500 font-medium text-sm sm:text-base">Chargement...</p>
          </div>
        ) : !isBrandView && brandFolders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 sm:p-16 text-center shadow-sm border border-gray-100">
            <Filter className="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-sm sm:text-base">Aucun véhicule validé trouvé</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Essayez de modifier les filtres</p>
          </div>
        ) : !isBrandView ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedBrandFolders.map(folder => (
              <button
                key={folder.slug}
                type="button"
                onClick={() => navigate(`/vehicules/archives/marque/${folder.slug}`)}
                className="group text-left bg-white rounded-2xl p-4 border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <h3 className="font-bold text-gray-900 truncate">{folder.name}</h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {folder.count}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Cliquer pour voir les archives de cette marque</p>
              </button>
            ))}
          </div>
        ) : (
          <section className="space-y-2.5 sm:space-y-3">
            <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/75 px-3 py-2 rounded-lg border border-gray-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => navigate('/vehicules/archives')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour aux dossiers
              </button>
              <h3 className="text-xs sm:text-sm font-bold text-gray-700">
                {selectedBrandName} ({total})
              </h3>
            </div>
            {vehiclesToRender.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <p className="text-gray-500 font-medium text-sm sm:text-base">Aucun véhicule archivé pour cette marque</p>
              </div>
            ) : (
              vehiclesToRender.map(v => (
                <VehiculeCard
                  key={v.id}
                  vehicule={v}
                  permissions={permissions}
                  onChangeEtat={() => setChangeEtatVehicule(v)}
                  allowChangeEtatWhenValidated
                  onFicheFinanciere={() => setFicheVehicule(v)}
                  onEdit={() => { setEditingVehicule(v); setShowEditForm(true) }}
                  onDelete={permissions.canEditVehicule ? () => setDeleteConfirm(v) : undefined}
                />
              ))
            )}
          </section>
        )}
      </div>

      {!isBrandView && folderTotalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500">
            Marques — page {folderPage} sur {folderTotalPages} ({brandFolders.length} dossiers)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFolderPage(p => Math.max(1, p - 1))}
              disabled={folderPage <= 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFolderPage(p => Math.min(folderTotalPages, p + 1))}
              disabled={folderPage >= folderTotalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isBrandView && vehicleTotalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-500">
            Véhicules — page {vehiclePage} sur {vehicleTotalPages} ({total} résultats)
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setVehiclePage(p => Math.max(1, p - 1))}
              disabled={vehiclePage <= 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setVehiclePage(p => Math.min(vehicleTotalPages, p + 1))}
              disabled={vehiclePage >= vehicleTotalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {changeEtatVehicule && (
        <ChangeEtatModal
          vehicule={changeEtatVehicule}
          onClose={() => setChangeEtatVehicule(null)}
          onConfirm={async (nouvelEtat, commentaire, pieces) => {
            const ok = await changeEtat(changeEtatVehicule.id, nouvelEtat, user.id, user.nom_complet, commentaire, pieces)
            if (ok) {
              toast.success('État mis à jour avec succès')
              setChangeEtatVehicule(null)
              if (isBrandView) loadVehiclesForBrand()
              else loadBrandFolders()
            } else {
              toast.error('Transition non autorisée')
            }
          }}
        />
      )}

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
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditForm && editingVehicule && (
        <VehiculeForm
          vehicule={editingVehicule}
          onClose={() => { setShowEditForm(false); setEditingVehicule(null) }}
          onSubmit={async (data, images) => {
            try {
              const updated = await editVehicule(editingVehicule.id, data)
              if (images.length > 0) {
                let failed = 0
                for (const image of images) {
                  try {
                    await uploadVehiculeImage(updated.id, image)
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
              toast.success('Véhicule modifié avec succès')
              setShowEditForm(false)
              setEditingVehicule(null)
              if (isBrandView) loadVehiclesForBrand()
              else loadBrandFolders()
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Erreur')
            }
          }}
        />
      )}

      <VehiculeFicheFinanciereModal
        open={!!ficheVehicule}
        vehicule={ficheVehicule}
        canEdit={canEditFicheFinanciere}
        onClose={() => setFicheVehicule(null)}
        fetchFiche={fetchFicheFinanciere}
        onSaveAvance={patchFicheFinanciereAvance}
        onAddDepense={createDepense}
        onUpdateDepense={updateDepense}
        onDeleteDepense={deleteDepense}
        onAddDepenseFromStock={createDepenseFromStock}
      />
    </div>
  )
}
