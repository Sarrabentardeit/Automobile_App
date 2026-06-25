import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import AddDevisFab from '../components/devis/AddDevisFab'
import DevisDetailSheet from '../components/devis/DevisDetailSheet'
import DevisFormModal from '../components/devis/DevisFormModal'
import DevisListItem from '../components/devis/DevisListItem'
import DevisSkeleton from '../components/devis/DevisSkeleton'
import DevisStatutBadge from '../components/devis/DevisStatutBadge'
import AppToast from '../components/ui/AppToast'
import { deleteDemandeDevis, fetchDemandesDevis } from '../lib/demandeDevisApi'
import { formatMontant } from '../lib/formatMoney'
import { theme } from '../theme/appTheme'
import {
  DEMANDE_DEVIS_STATUTS,
  type DemandeDevis,
  type DemandeDevisStatut,
} from '../types/demandeDevis'

const PAGE_SIZE = 15

type FilterStatut = DemandeDevisStatut | 'toutes'

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function DemandesDevisScreen({
  accessToken,
  canViewFinance,
  drawerOpen = false,
}: Props) {
  const [demandes, setDemandes] = useState<DemandeDevis[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterStatut, setFilterStatut] = useState<FilterStatut>('toutes')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState<DemandeDevis | null>(null)
  const [editing, setEditing] = useState<DemandeDevis | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [filterStatut])

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchDemandesDevis(accessToken)
      setDemandes(list)
    } catch (e) {
      setDemandes([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  const filtered = useMemo(() => {
    let list = demandes
    if (filterStatut !== 'toutes') {
      list = list.filter((d) => d.statut === filterStatut)
    }
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase()
      list = list.filter(
        (d) =>
          d.clientName.toLowerCase().includes(q) ||
          (d.vehicleRef ?? '').toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.clientTelephone ?? '').includes(q)
      )
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [demandes, filterStatut, searchDebounced])

  const stats = useMemo(() => {
    const enAttente = demandes.filter((d) => d.statut === 'en_attente').length
    const totalAccepte = demandes
      .filter((d) => d.statut === 'accepte' && d.montantEstime != null)
      .reduce((s, d) => s + (d.montantEstime ?? 0), 0)
    return { enAttente, totalAccepte }
  }, [demandes])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const openNew = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (d: DemandeDevis) => {
    setEditing(d)
    setDetail(null)
    setShowForm(true)
  }

  const confirmDelete = (d: DemandeDevis) => {
    Alert.alert('Supprimer', `Supprimer le devis de « ${d.clientName} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void deleteDemandeDevis(accessToken, d.id)
            .then(() => {
              showMsg('Demande de devis supprimée')
              setDetail(null)
              if (editing?.id === d.id) {
                setShowForm(false)
                setEditing(null)
              }
              return load()
            })
            .catch((e) =>
              showMsg(e instanceof Error ? e.message : 'Suppression impossible', true)
            )
        },
      },
    ])
  }

  const overlayOpen = showForm || !!detail || drawerOpen

  if (!canViewFinance) {
    return (
      <View style={styles.denied}>
        <View style={styles.deniedRing}>
          <Ionicons name="lock-closed-outline" size={36} color={theme.primary} />
        </View>
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>Vous n&apos;avez pas accès aux demandes de devis.</Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="clipboard" size={22} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Demandes Devis</Text>
            <Text style={styles.heroSub}>Suivi des devis clients</Text>
          </View>
          {demandes.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{demandes.length}</Text>
            </View>
          ) : null}
        </View>

        <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.kpiBanner}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>En attente</Text>
            <Text style={styles.kpiValue}>{stats.enAttente}</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiLabel}>Devis acceptés</Text>
            <Text style={styles.kpiValueSmall}>{formatMontant(stats.totalAccepte)}</Text>
          </View>
        </LinearGradient>

        <View style={styles.filtersWrap}>
          <Pressable
            onPress={() => setFilterStatut('toutes')}
            style={[styles.filterChip, filterStatut === 'toutes' && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                filterStatut === 'toutes' && styles.filterChipTextActive,
              ]}
            >
              Toutes ({demandes.length})
            </Text>
          </Pressable>
          {DEMANDE_DEVIS_STATUTS.map((s) => {
            const active = filterStatut === s
            const count = demandes.filter((d) => d.statut === s).length
            return (
              <Pressable
                key={s}
                onPress={() => setFilterStatut(s)}
                style={[styles.filterStatutChip, active && styles.filterStatutChipActive]}
              >
                <DevisStatutBadge statut={s} compact />
                <Text style={[styles.filterCount, active && styles.filterCountActive]}>
                  {count}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Client, véhicule, travaux…"
            placeholderTextColor={theme.textSubtle}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!loading && filtered.length > 0 ? (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsLabel}>
            {filtered.length} demande{filtered.length !== 1 ? 's' : ''}
          </Text>
          {totalPages > 1 ? (
            <Text style={styles.resultsPage}>
              Page {page}/{totalPages}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  )

  const listFooter =
    filtered.length > PAGE_SIZE ? (
      <View style={styles.pagerBar}>
        <Pressable
          style={[styles.pagerBtn, page <= 1 && styles.pagerDisabled]}
          disabled={page <= 1}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={styles.pagerLabel}>
          {page} / {totalPages}
        </Text>
        <Pressable
          style={[styles.pagerBtn, page >= totalPages && styles.pagerDisabled]}
          disabled={page >= totalPages}
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>
      </View>
    ) : (
      <View style={styles.footerSpacer} />
    )

  if (loading && demandes.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <DevisSkeleton />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={paginated}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DevisListItem demande={item} onPress={() => setDetail(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="document-text-outline" size={44} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucune demande de devis'}</Text>
            <Text style={styles.emptySub}>
              {searchDebounced || filterStatut !== 'toutes'
                ? 'Aucun résultat. Modifiez les filtres.'
                : 'Ajoutez une demande de devis pour commencer.'}
            </Text>
            {!error && !searchDebounced && filterStatut === 'toutes' ? (
              <Pressable style={styles.emptyCta} onPress={openNew}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.emptyCtaText}>Nouvelle demande</Text>
              </Pressable>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load().finally(() => setRefreshing(false))
            }}
            tintColor={theme.primary}
          />
        }
      />

      <AddDevisFab onPress={openNew} visible={!overlayOpen} />

      <DevisDetailSheet
        visible={!!detail}
        demande={detail}
        onClose={() => setDetail(null)}
        onEdit={() => {
          if (!detail) return
          openEdit(detail)
        }}
        onDelete={() => {
          if (!detail) return
          const d = detail
          setDetail(null)
          confirmDelete(d)
        }}
      />

      <DevisFormModal
        visible={showForm}
        demande={editing}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={() => {
          showMsg(
            editing
              ? 'Demande de devis modifiée avec succès'
              : 'Demande de devis ajoutée avec succès'
          )
          setDetail(null)
          void load()
        }}
        onDeleted={() => {
          showMsg('Demande de devis supprimée')
          void load()
        }}
      />

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 88 },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
    backgroundColor: theme.bg,
  },
  deniedRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  deniedTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  deniedSub: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  headerWrap: { marginBottom: 4 },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  heroSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  countBadge: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
  },
  countBadgeText: { fontSize: 14, fontWeight: '800', color: theme.primaryDark },
  kpiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginBottom: 14,
  },
  kpiItem: { flex: 1 },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.text,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  kpiValueSmall: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.text,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  kpiDivider: { width: 1, height: 48, backgroundColor: '#fed7aa', marginHorizontal: 14 },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  filterChipTextActive: { color: theme.primaryDark, fontWeight: '800' },
  filterStatutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 2,
    borderColor: theme.border,
  },
  filterStatutChipActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primarySoft,
  },
  filterCount: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textMuted,
    minWidth: 14,
    textAlign: 'center',
  },
  filterCountActive: { color: theme.primaryDark },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 12 },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 6,
  },
  resultsLabel: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  resultsPage: { fontSize: 12, fontWeight: '600', color: theme.textSubtle },
  separator: { height: 10 },
  pagerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  pagerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  pagerDisabled: { opacity: 0.4 },
  pagerLabel: { fontSize: 15, fontWeight: '700', color: theme.text, minWidth: 64, textAlign: 'center' },
  footerSpacer: { height: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10, paddingHorizontal: 24 },
  emptyRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
  emptySub: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
    ...theme.shadow.primaryBtn,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
