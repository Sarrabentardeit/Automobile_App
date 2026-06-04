import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ChangeEtatModal from '../components/ChangeEtatModal'
import VehiculeFicheFinanciereModal from '../components/VehiculeFicheFinanciereModal'
import VehiculeFormModal from '../components/VehiculeFormModal'
import { fetchVehiculeBrands, fetchVehiculeCounts, fetchVehicules } from '../lib/api'
import { shareVehiculesCsv } from '../lib/exportVehiculesCsv'
import type { StoredUser } from '../lib/authStorage'
import {
  changeEtat,
  deleteVehicule,
  fetchUsers,
  type AppUser,
} from '../lib/vehiculeApi'
import {
  buildFilterQuery,
  buildListParams,
  ETATS_FILTRE,
  normalizeDateInput,
  type BrandFolder,
  type DateFilterMode,
  type VehiculeFilteredCounts,
} from '../lib/vehiculeFilters'
import type { VehiculeOpenOptions } from '../navigation/vehiculeNav'
import {
  ETAT_CONFIG,
  type EtatVehicule,
  type Vehicule,
  type VehiculeType,
} from '../types/vehicule'

export type { VehiculeOpenOptions } from '../navigation/vehiculeNav'

const PAGE_SIZE = 20
const BRAND_FOLDER_PAGE_SIZE = 12

const DATE_MODES: { mode: DateFilterMode; label: string }[] = [
  { mode: 'toutes', label: 'Toutes dates' },
  { mode: 'aujourdhui', label: "Aujourd'hui" },
  { mode: 'hier', label: 'Hier' },
  { mode: 'semaine', label: 'Cette semaine' },
]

type Props = {
  accessToken: string
  user: StoredUser
  refreshKey?: number
  archives?: boolean
  onOpenVehicule: (id: number, options?: VehiculeOpenOptions) => void
  onAddVehicule?: () => void
  onListChanged?: () => void
}

function BrandFolderCard({
  folder,
  archives,
  onPress,
}: {
  folder: BrandFolder
  archives?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.brandCard, pressed && styles.cardPressed]}
    >
      <View style={styles.brandCardTop}>
        <View style={styles.brandCardTitleRow}>
          <Ionicons name="folder-open" size={20} color="#f97316" />
          <Text style={styles.brandCardName} numberOfLines={1}>
            {folder.name}
          </Text>
        </View>
        <View style={styles.brandCountBadge}>
          <Text style={styles.brandCountText}>{folder.count}</Text>
        </View>
      </View>
      <Text style={styles.brandCardHint}>
        {archives
          ? 'Voir les archives de cette marque'
          : 'Voir les véhicules de cette marque'}
      </Text>
    </Pressable>
  )
}

function ActionIcon({
  onPress,
  icon,
  color,
  bg,
  title,
}: {
  onPress: () => void
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bg: string
  title: string
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionBtn, { backgroundColor: bg }]}
      accessibilityLabel={title}
    >
      <Ionicons name={icon} size={16} color={color} />
    </Pressable>
  )
}

function VehiculeRow({
  item,
  permissions,
  archives,
  onView,
  onChangeEtat,
  onFicheFinanciere,
  onOrdre,
  onEdit,
  onDelete,
}: {
  item: Vehicule
  permissions: StoredUser['permissions']
  archives?: boolean
  onView: () => void
  onChangeEtat: () => void
  onFicheFinanciere: () => void
  onOrdre: () => void
  onEdit: () => void
  onDelete?: () => void
}) {
  const cfg = ETAT_CONFIG[item.etat_actuel] ?? { label: item.etat_actuel, color: '#6b7280' }
  const days = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(item.date_entree).getTime()) / (1000 * 60 * 60 * 24)
    )
  )
  const showChangeEtat =
    permissions.canChangeEtat &&
    (item.etat_actuel !== 'vert' || archives)

  return (
    <Pressable
      onPress={onView}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={[styles.cardBar, { backgroundColor: cfg.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardModel} numberOfLines={1}>
            {item.modele}
          </Text>
          <View style={[styles.badge, { backgroundColor: cfg.color }]}>
            <Text style={styles.badgeText}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.cardImmat} numberOfLines={1}>
          {item.immatriculation || 'Sans immatriculation'}
        </Text>
        {item.defaut ? (
          <Text style={styles.cardDefaut} numberOfLines={2}>
            {item.defaut}
          </Text>
        ) : null}
        <View style={styles.cardMeta}>
          <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
          <Text style={styles.cardMetaText}>{days} j</Text>
          {item.client_telephone ? (
            <>
              <Ionicons
                name="call-outline"
                size={14}
                color="#9ca3af"
                style={styles.metaIconSpacer}
              />
              <Text style={styles.cardMetaText} numberOfLines={1}>
                {item.client_telephone}
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.cardActions}>
          {showChangeEtat ? (
            <ActionIcon
              title="Changer l'état"
              icon="swap-horizontal"
              color="#ea580c"
              bg="#fff7ed"
              onPress={onChangeEtat}
            />
          ) : null}
          <ActionIcon
            title="Fiche financière"
            icon="wallet-outline"
            color="#059669"
            bg="#ecfdf5"
            onPress={onFicheFinanciere}
          />
          <ActionIcon
            title="Ordre de réparation"
            icon="clipboard-outline"
            color="#4f46e5"
            bg="#eef2ff"
            onPress={onOrdre}
          />
          {permissions.canEditVehicule ? (
            <ActionIcon
              title="Modifier"
              icon="pencil-outline"
              color="#6b7280"
              bg="#f3f4f6"
              onPress={onEdit}
            />
          ) : null}
          {onDelete ? (
            <ActionIcon
              title="Supprimer"
              icon="trash-outline"
              color="#dc2626"
              bg="#fef2f2"
              onPress={onDelete}
            />
          ) : null}
          <ActionIcon
            title="Voir détails"
            icon="eye-outline"
            color="#6b7280"
            bg="#f3f4f6"
            onPress={onView}
          />
        </View>
      </View>
    </Pressable>
  )
}

export default function VehiculesListScreen({
  accessToken,
  user,
  refreshKey = 0,
  archives = false,
  onOpenVehicule,
  onAddVehicule,
  onListChanged,
}: Props) {
  const permissions = user.permissions
  const visibility = permissions.vehiculeVisibility
  const canEditFicheFinanciere =
    permissions.canEditVehicule || permissions.canViewFinance

  const [changeEtatVehicule, setChangeEtatVehicule] = useState<Vehicule | null>(null)
  const [ficheVehicule, setFicheVehicule] = useState<Vehicule | null>(null)
  const [editVehicule, setEditVehicule] = useState<Vehicule | null>(null)

  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState<VehiculeFilteredCounts | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [tab, setTab] = useState<VehiculeType>('voiture')
  const [filtreEtat, setFiltreEtat] = useState<EtatVehicule | 'tous'>('tous')
  const [technicienId, setTechnicienId] = useState<number | undefined>()
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('toutes')
  const [dateFilter, setDateFilter] = useState('')
  const [dateFilterDebounced, setDateFilterDebounced] = useState('')
  const [showTechnicienPicker, setShowTechnicienPicker] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<BrandFolder | null>(null)
  const [brands, setBrands] = useState<BrandFolder[]>([])
  const [totalVehiclesBrands, setTotalVehiclesBrands] = useState(0)
  const [folderPage, setFolderPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const showBrandFolders = selectedBrand === null
  const showVehicleList = selectedBrand !== null

  const techniciens = useMemo(
    () => users.filter((u) => u.role === 'technicien' && u.statut === 'actif'),
    [users]
  )

  const filterOpts = useMemo(
    () => ({
      tab,
      filtreEtat: archives ? ('tous' as const) : filtreEtat,
      technicienId,
      dateFilterMode,
      dateFilter: dateFilterDebounced,
      search: searchDebounced,
      userId: user.id,
      visibility,
      archives,
    }),
    [
      tab,
      filtreEtat,
      technicienId,
      dateFilterMode,
      dateFilterDebounced,
      searchDebounced,
      user.id,
      visibility,
      archives,
    ]
  )

  const baseOpts = useMemo(
    () => ({
      ...filterOpts,
      marque: selectedBrand?.slug,
    }),
    [filterOpts, selectedBrand]
  )

  useEffect(() => {
    setSelectedBrand(null)
    setFolderPage(1)
  }, [tab, filtreEtat, technicienId, dateFilterMode, dateFilterDebounced, searchDebounced, archives])

  const folderTotalPages = Math.max(1, Math.ceil(brands.length / BRAND_FOLDER_PAGE_SIZE))

  const paginatedBrands = useMemo(() => {
    const start = (folderPage - 1) * BRAND_FOLDER_PAGE_SIZE
    return brands.slice(start, start + BRAND_FOLDER_PAGE_SIZE)
  }, [brands, folderPage])

  useEffect(() => {
    if (folderPage > folderTotalPages) setFolderPage(folderTotalPages)
  }, [folderPage, folderTotalPages])

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const t = setTimeout(() => setDateFilterDebounced(dateFilter.trim()), 400)
    return () => clearTimeout(t)
  }, [dateFilter])

  const dateInputInvalid =
    dateFilter.trim().length > 0 &&
    dateFilterMode === 'date' &&
    !normalizeDateInput(dateFilter)

  useEffect(() => {
    void fetchUsers(accessToken).then(setUsers).catch(() => setUsers([]))
  }, [accessToken])

  const loadCounts = useCallback(async () => {
    try {
      const q = buildFilterQuery(filterOpts)
      const data = await fetchVehiculeCounts(accessToken, {
        type: q.type,
        ...('etat' in q ? { etat: q.etat } : { exclude_etat: q.exclude_etat }),
        technicien_id: q.technicien_id,
        date_debut: q.date_debut,
        date_fin: q.date_fin,
        q: q.q,
        includeEtat: !archives,
      })
      setCounts(data)
    } catch {
      setCounts(null)
    }
  }, [accessToken, filterOpts, archives])

  const loadBrands = useCallback(async () => {
    setError(null)
    try {
      const res = await fetchVehiculeBrands(accessToken, buildFilterQuery(filterOpts))
      setBrands(Array.isArray(res.brands) ? res.brands : [])
      setTotalVehiclesBrands(res.totalVehicles ?? 0)
      void loadCounts()
    } catch (e) {
      setBrands([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken, filterOpts, loadCounts])

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      if (pageNum === 1) setError(null)
      try {
        const params = buildListParams({ ...baseOpts, page: pageNum, limit: PAGE_SIZE })
        const res = await fetchVehicules(accessToken, params)
        setTotal(res.total)
        setPage(res.page)
        setVehicules((prev) =>
          append ? [...prev, ...(res.data ?? [])] : res.data ?? []
        )
        if (pageNum === 1) void loadCounts()
      } catch (e) {
        if (!append) {
          setVehicules([])
          setError(e instanceof Error ? e.message : 'Erreur chargement')
        }
      }
    },
    [accessToken, baseOpts, loadCounts]
  )

  useEffect(() => {
    setLoading(true)
    if (showBrandFolders) {
      void loadBrands().finally(() => setLoading(false))
    } else {
      void load(1, false).finally(() => setLoading(false))
    }
  }, [showBrandFolders, loadBrands, load, refreshKey, selectedBrand])

  const onRefresh = async () => {
    setRefreshing(true)
    if (showBrandFolders) {
      await loadBrands()
    } else {
      await load(1, false)
    }
    setRefreshing(false)
  }

  const refreshList = () => {
    if (showBrandFolders) void loadBrands()
    else void load(1, false)
    onListChanged?.()
  }

  const confirmDelete = (v: Vehicule) => {
    Alert.alert(
      'Supprimer ce véhicule ?',
      `${v.modele}${v.immatriculation ? ` (${v.immatriculation})` : ''}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteVehicule(accessToken, v.id)
                refreshList()
              } catch (e) {
                Alert.alert(
                  'Erreur',
                  e instanceof Error ? e.message : 'Suppression impossible'
                )
              }
            })()
          },
        },
      ]
    )
  }

  const handleChangeEtat = async (
    etat: EtatVehicule,
    commentaire: string,
    pieces: string
  ) => {
    if (!changeEtatVehicule) return
    await changeEtat(accessToken, changeEtatVehicule.id, {
      nouvel_etat: etat,
      commentaire,
      pieces_utilisees: pieces,
    })
    setChangeEtatVehicule(null)
    refreshList()
  }

  const onEndReached = async () => {
    if (loadingMore || loading || vehicules.length >= total) return
    setLoadingMore(true)
    await load(page + 1, true)
    setLoadingMore(false)
  }

  const totalAll = showBrandFolders
    ? totalVehiclesBrands || counts?.total || 0
    : counts?.total ?? total
  const countByEtat = (etat: EtatVehicule) => counts?.byEtat?.[etat] ?? 0

  const handleExportArchives = async () => {
    if (!archives || exporting) return
    setExporting(true)
    try {
      const all: Vehicule[] = []
      const pageLimit = 100
      let pageNum = 1
      for (;;) {
        const params = buildListParams({ ...filterOpts, page: pageNum, limit: pageLimit })
        const res = await fetchVehicules(accessToken, params)
        const chunk = res.data ?? []
        all.push(...chunk)
        const tot = res.total ?? 0
        if (all.length >= tot || chunk.length === 0) break
        pageNum += 1
      }
      const labelType = tab === 'moto' ? 'motos' : 'voitures'
      await shareVehiculesCsv(
        all,
        users,
        `archives-${labelType}-${new Date().toISOString().slice(0, 10)}.csv`
      )
      Alert.alert(
        'Export',
        all.length > 0
          ? `${all.length} véhicule(s) exporté(s)`
          : 'Export vide (aucun résultat)'
      )
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Export impossible')
    } finally {
      setExporting(false)
    }
  }

  const selectedTechName =
    technicienId == null
      ? 'Tous techniciens'
      : techniciens.find((t) => t.id === technicienId)?.nom_complet ?? 'Technicien'

  const filtersHeader = (
    <View style={styles.filtersBlock}>
      <View style={styles.pageTitleRow}>
        <View style={styles.pageTitleText}>
          <Text style={styles.pageTitle}>
            {archives ? 'Archives véhicules' : 'Véhicules'}
          </Text>
          <Text style={styles.pageSubtitle}>
            {showBrandFolders
              ? archives
                ? `${totalAll} véhicule${totalAll !== 1 ? 's' : ''} validé${totalAll !== 1 ? 's' : ''} · ${brands.length} marque${brands.length !== 1 ? 's' : ''}`
                : `${totalAll} véhicule${totalAll !== 1 ? 's' : ''} · ${brands.length} marque${brands.length !== 1 ? 's' : ''}`
              : archives
                ? `${totalAll} archive${totalAll !== 1 ? 's' : ''}${selectedBrand ? ` · ${selectedBrand.name}` : ''}`
                : `${totalAll} véhicule${totalAll !== 1 ? 's' : ''} en cours`}
          </Text>
        </View>
        {archives ? (
          <Pressable
            style={({ pressed }) => [
              styles.exportBtn,
              (exporting || loading) && styles.exportBtnDisabled,
              pressed && !exporting && styles.addVehiculeBtnPressed,
            ]}
            disabled={exporting || loading}
            onPress={() => void handleExportArchives()}
          >
            <Ionicons name="download-outline" size={20} color="#374151" />
            <Text style={styles.exportBtnText}>
              {exporting ? 'Export…' : 'Exporter'}
            </Text>
          </Pressable>
        ) : onAddVehicule ? (
          <Pressable
            style={({ pressed }) => [
              styles.addVehiculeBtn,
              pressed && styles.addVehiculeBtnPressed,
            ]}
            onPress={onAddVehicule}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addVehiculeBtnText}>Ajouter</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(['voiture', 'moto'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActiveDark]}
          >
            <Ionicons
              name={t === 'voiture' ? 'car-outline' : 'bicycle-outline'}
              size={18}
              color={tab === t ? '#fff' : '#6b7280'}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'voiture' ? 'Voitures' : 'Motos'}
              {tab === t ? ` (${totalAll})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {!archives ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.etatRow}
        >
          <Pressable
            onPress={() => setFiltreEtat('tous')}
            style={[styles.etatChip, filtreEtat === 'tous' && styles.etatChipTousActive]}
          >
            <Text
              style={[
                styles.etatChipText,
                filtreEtat === 'tous' && styles.etatChipTextTousActive,
              ]}
            >
              Tous ({totalAll})
            </Text>
          </Pressable>
          {ETATS_FILTRE.map((etat) => {
            const cfg = ETAT_CONFIG[etat]
            const active = filtreEtat === etat
            const count = countByEtat(etat)
            return (
              <Pressable
                key={etat}
                onPress={() => setFiltreEtat(etat)}
                style={[
                  styles.etatChip,
                  {
                    borderColor: cfg.color,
                    backgroundColor: active ? `${cfg.color}18` : '#fff',
                  },
                  active && styles.etatChipEtatActive,
                ]}
              >
                <Text style={[styles.etatChipTextEtat, { color: cfg.color }]}>
                  {cfg.label} ({count})
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher modèle, immatriculation..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateRow}
      >
        {DATE_MODES.map(({ mode, label }) => (
          <Pressable
            key={mode}
            onPress={() => {
              setDateFilterMode(mode)
              setDateFilter('')
            }}
            style={[styles.dateChip, dateFilterMode === mode && styles.dateChipActive]}
          >
            <Text
              style={[
                styles.dateChipText,
                dateFilterMode === mode && styles.dateChipTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.datePreciseRow}>
        <Text style={styles.datePreciseLabel}>
          {archives ? 'Date validation' : 'Jour précis'}
        </Text>
        <TextInput
          style={[styles.datePreciseInput, dateInputInvalid && styles.datePreciseInputInvalid]}
          placeholder="AAAA-MM-JJ"
          placeholderTextColor="#9ca3af"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          value={dateFilter}
          onChangeText={(v) => {
            setDateFilter(v)
            setDateFilterMode(v.trim() ? 'date' : 'toutes')
          }}
        />
      </View>
      {dateInputInvalid ? (
        <Text style={styles.dateHintError}>
          Format attendu : AAAA-MM-JJ (ex. 2026-06-03)
        </Text>
      ) : archives && dateFilterMode !== 'toutes' ? (
        <Text style={styles.dateHint}>
          Filtre sur la date de validation (sortie)
        </Text>
      ) : null}

      {visibility === 'all' && techniciens.length > 0 ? (
        <Pressable
          style={styles.techSelect}
          onPress={() => setShowTechnicienPicker(!showTechnicienPicker)}
        >
          <Ionicons name="person-outline" size={18} color="#6b7280" />
          <Text style={styles.techSelectText} numberOfLines={1}>
            {selectedTechName}
          </Text>
          <Ionicons
            name={showTechnicienPicker ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#6b7280"
          />
        </Pressable>
      ) : null}

      {showTechnicienPicker ? (
        <View style={styles.techList}>
          <Pressable
            style={[styles.techItem, technicienId == null && styles.techItemActive]}
            onPress={() => {
              setTechnicienId(undefined)
              setShowTechnicienPicker(false)
            }}
          >
            <Text style={styles.techItemText}>Tous techniciens</Text>
          </Pressable>
          {techniciens.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.techItem, technicienId === t.id && styles.techItemActive]}
              onPress={() => {
                setTechnicienId(t.id)
                setShowTechnicienPicker(false)
              }}
            >
              <Text style={styles.techItemText}>{t.nom_complet}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {showVehicleList ? (
        <Text style={styles.countText}>
          {total} véhicule{total !== 1 ? 's' : ''}
          {selectedBrand ? ` · ${selectedBrand.name}` : ''}
          {archives ? ' (archives)' : ''}
        </Text>
      ) : (
        <Text style={styles.countText}>
          {brands.length} marque{brands.length !== 1 ? 's' : ''} — touchez un dossier
        </Text>
      )}
    </View>
  )

  const brandBackBar = selectedBrand ? (
    <View style={styles.brandBackBar}>
      <Pressable style={styles.brandBackBtn} onPress={() => setSelectedBrand(null)}>
        <Ionicons name="arrow-back" size={18} color="#374151" />
        <Text style={styles.brandBackText}>
          {archives ? 'Retour aux dossiers' : 'Retour aux marques'}
        </Text>
      </Pressable>
      <Text style={styles.brandBackCount}>
        {selectedBrand.name} ({total})
      </Text>
    </View>
  ) : null

  const listHeader = (
    <>
      {filtersHeader}
      {brandBackBar}
    </>
  )

  const isEmpty = showBrandFolders ? brands.length === 0 : vehicules.length === 0

  const brandPaginationFooter =
    showBrandFolders && brands.length > 0 && folderTotalPages > 1 ? (
      <View style={styles.folderPagination}>
        <Text style={styles.folderPaginationLabel}>
          Marques — page {folderPage} / {folderTotalPages} ({brands.length} dossiers)
        </Text>
        <View style={styles.folderPaginationBtns}>
          <Pressable
            style={[styles.folderPageBtn, folderPage <= 1 && styles.folderPageBtnDisabled]}
            disabled={folderPage <= 1}
            onPress={() => setFolderPage((p) => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={22} color="#374151" />
          </Pressable>
          <Pressable
            style={[
              styles.folderPageBtn,
              folderPage >= folderTotalPages && styles.folderPageBtnDisabled,
            ]}
            disabled={folderPage >= folderTotalPages}
            onPress={() => setFolderPage((p) => Math.min(folderTotalPages, p + 1))}
          >
            <Ionicons name="chevron-forward" size={22} color="#374151" />
          </Pressable>
        </View>
      </View>
    ) : null

  return (
    <View style={styles.root}>
      {loading && isEmpty ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : error && isEmpty ? (
        <View style={styles.centered}>
          <Ionicons name="filter-outline" size={40} color="#d1d5db" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void onRefresh()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : showBrandFolders ? (
        <FlatList
          key="brand-folders-list"
          data={paginatedBrands}
          keyExtractor={(item) => item.slug}
          numColumns={2}
          columnWrapperStyle={styles.brandRow}
          renderItem={({ item }) => (
            <BrandFolderCard
              folder={item}
              archives={archives}
              onPress={() => setSelectedBrand(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor="#f97316"
              colors={['#f97316']}
            />
          }
          ListFooterComponent={brandPaginationFooter}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Ionicons name="folder-open-outline" size={36} color="#e5e7eb" />
                <Text style={styles.emptyText}>Aucune marque trouvée</Text>
                <Text style={styles.emptySub}>Essayez de modifier les filtres</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          key="vehicle-list"
          data={vehicules}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <VehiculeRow
              item={item}
              permissions={permissions}
              archives={archives}
              onView={() => onOpenVehicule(item.id)}
              onChangeEtat={() => setChangeEtatVehicule(item)}
              onFicheFinanciere={() => setFicheVehicule(item)}
              onOrdre={() => onOpenVehicule(item.id, { initialTab: 'ordres' })}
              onEdit={() => setEditVehicule(item)}
              onDelete={
                permissions.canEditVehicule ? () => confirmDelete(item) : undefined
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor="#f97316"
              colors={['#f97316']}
            />
          }
          onEndReached={() => void onEndReached()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} color="#f97316" />
            ) : vehicules.length >= total && vehicules.length > 0 ? (
              <Text style={styles.endText}>Fin de la liste</Text>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Ionicons name="filter-outline" size={36} color="#e5e7eb" />
                <Text style={styles.emptyText}>Aucun véhicule trouvé</Text>
                <Text style={styles.emptySub}>Essayez de modifier les filtres</Text>
              </View>
            ) : null
          }
        />
      )}

      {changeEtatVehicule ? (
        <ChangeEtatModal
          visible
          vehicule={changeEtatVehicule}
          onClose={() => setChangeEtatVehicule(null)}
          onConfirm={handleChangeEtat}
        />
      ) : null}

      <VehiculeFicheFinanciereModal
        visible={!!ficheVehicule}
        vehicule={ficheVehicule}
        accessToken={accessToken}
        canEdit={canEditFicheFinanciere}
        onClose={() => setFicheVehicule(null)}
      />

      <VehiculeFormModal
        visible={!!editVehicule}
        vehicule={editVehicule}
        accessToken={accessToken}
        onClose={() => setEditVehicule(null)}
        onSaved={() => {
          setEditVehicule(null)
          refreshList()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  filtersBlock: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  pageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pageTitleText: { flex: 1, minWidth: 0 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  addVehiculeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexShrink: 0,
    shadowColor: '#f97316',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addVehiculeBtnPressed: { backgroundColor: '#ea580c' },
  addVehiculeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActiveDark: { backgroundColor: '#111827' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#fff' },
  etatRow: { gap: 8, paddingBottom: 12 },
  etatChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  etatChipTousActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  etatChipEtatActive: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  etatChipText: { fontSize: 11, fontWeight: '800', color: '#6b7280' },
  etatChipTextTousActive: { color: '#fff' },
  etatChipTextEtat: { fontSize: 11, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 11,
  },
  dateRow: { gap: 8, marginBottom: 10 },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  dateChipActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  dateChipText: { fontSize: 11, fontWeight: '600', color: '#4b5563' },
  dateChipTextActive: { color: '#fff' },
  datePreciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  datePreciseLabel: { fontSize: 11, color: '#6b7280', fontWeight: '500' },
  datePreciseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  datePreciseInputInvalid: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  dateHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dateHintError: {
    fontSize: 11,
    color: '#dc2626',
    marginTop: -4,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  techSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  techSelectText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  techList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  techItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  techItemActive: { backgroundColor: '#fff7ed' },
  techItemText: { fontSize: 13, color: '#374151' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  archiveIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  countText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardPressed: { opacity: 0.92 },
  cardBar: { width: 4, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 14, minWidth: 0 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  cardModel: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  cardImmat: {
    fontSize: 13,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  cardDefaut: { fontSize: 13, color: '#374151', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardMetaText: { fontSize: 12, color: '#9ca3af', marginLeft: 4, maxWidth: 140 },
  metaIconSpacer: { marginLeft: 12 },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#dc2626', marginBottom: 12, marginTop: 8 },
  retryBtn: {
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 12, fontWeight: '600' },
  emptySub: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 4 },
  footerLoader: { marginVertical: 16 },
  endText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, marginVertical: 12 },
  brandRow: { gap: 10, marginBottom: 10 },
  brandCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 100,
  },
  brandCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  brandCardTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  brandCardName: { flex: 1, fontSize: 16, fontWeight: '800', color: '#111827' },
  brandCountBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  brandCountText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  brandCardHint: { fontSize: 11, color: '#9ca3af', marginTop: 10 },
  brandBackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  brandBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandBackText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  brandBackCount: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  folderPagination: {
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  folderPaginationLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
    textAlign: 'center',
  },
  folderPaginationBtns: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  folderPageBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  folderPageBtnDisabled: { opacity: 0.35 },
})
