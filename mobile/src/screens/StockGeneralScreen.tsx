import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ProduitFormModal from '../components/ProduitFormModal'
import AddProduitFab from '../components/produits/AddProduitFab'
import StockEditModal from '../components/stock/StockEditModal'
import StockGeneralSkeleton from '../components/stock/StockGeneralSkeleton'
import StockKpiStrip from '../components/stock/StockKpiStrip'
import StockListItem from '../components/stock/StockListItem'
import StockPaginationBar from '../components/stock/StockPaginationBar'
import StockTopVendusCard from '../components/stock/StockTopVendusCard'
import AppToast from '../components/ui/AppToast'
import { fetchFacturesAchatKpi, fetchFacturesVenteKpi } from '../lib/financeApi'
import {
  totalAchatGlobalFromFactures,
  totalVenduGlobalFromFactures,
} from '../lib/factureUtils'
import { deleteProduit, fetchProduits } from '../lib/produitApi'
import { currentYearMonth, produitsPlusVendusCeMois } from '../lib/stockGeneralParity'
import { fetchMouvementsStock } from '../lib/stockApi'
import { expectedRevenusFromProduits, isStockEpuise, isStockFaible } from '../lib/stockUtils'
import type { FactureAchatKpi, FactureVenteKpi } from '../types/financeKpi'
import { theme } from '../theme/appTheme'
import type { MouvementStock } from '../types/mouvementStock'
import {
  isLegacyHuilesLiquidesCombinedLabel,
  mergeFilterCategories,
  type ProduitStock,
} from '../types/produitStock'

type QuickFilter = 'all' | 'rupture' | 'low'

const PAGE_SIZE_STOCK = 30

type Props = {
  accessToken: string
  canViewInventory: boolean
  drawerOpen?: boolean
}

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!d) return iso
  return `${d}/${m}/${y}`
}

export default function StockGeneralScreen({
  accessToken,
  canViewInventory,
  drawerOpen = false,
}: Props) {
  const listRef = useRef<FlatList<ProduitStock>>(null)
  const [produits, setProduits] = useState<ProduitStock[]>([])
  const [mouvements, setMouvements] = useState<MouvementStock[]>([])
  const [facturesVente, setFacturesVente] = useState<FactureVenteKpi[] | null>(null)
  const [facturesAchat, setFacturesAchat] = useState<FactureAchatKpi[] | null>(null)
  const [pageStock, setPageStock] = useState(1)
  const [showTopVendus, setShowTopVendus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('tous')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [showActivity, setShowActivity] = useState(false)
  const [editProduit, setEditProduit] = useState<ProduitStock | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [list, mov, vente, achat] = await Promise.all([
        fetchProduits(accessToken),
        fetchMouvementsStock(accessToken, 100),
        fetchFacturesVenteKpi(accessToken).catch(() => null),
        fetchFacturesAchatKpi(accessToken).catch(() => null),
      ])
      setProduits(list)
      setMouvements(mov)
      setFacturesVente(vente)
      setFacturesAchat(achat)
    } catch (e) {
      setProduits([])
      setMouvements([])
      setFacturesVente(null)
      setFacturesAchat(null)
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewInventory) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewInventory])

  const categoriesFromData = useMemo(() => {
    const s = new Set<string>()
    for (const p of produits) {
      const c = p.categorie?.trim()
      if (c) s.add(c)
    }
    return [...s]
  }, [produits])

  const filterChips = useMemo(
    () => ['tous', ...mergeFilterCategories(categoriesFromData)],
    [categoriesFromData]
  )

  useEffect(() => {
    if (filterCategorie === 'tous') return
    if (isLegacyHuilesLiquidesCombinedLabel(filterCategorie)) {
      setFilterCategorie('tous')
      return
    }
    if (!filterChips.includes(filterCategorie)) setFilterCategorie('tous')
  }, [filterCategorie, filterChips])

  const stockEpuise = useMemo(() => produits.filter(isStockEpuise), [produits])
  const aCommander = useMemo(
    () => produits.filter(isStockFaible).sort((a, b) => (a.quantite ?? 0) - (b.quantite ?? 0)),
    [produits]
  )

  const filtered = useMemo(() => {
    let list = produits
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          (p.categorie ?? '').toLowerCase().includes(q) ||
          (p.reference ?? '').toLowerCase().includes(q)
      )
    }
    if (filterCategorie !== 'tous') {
      list = list.filter((p) => (p.categorie ?? '').trim() === filterCategorie)
    }
    if (quickFilter === 'rupture') list = list.filter(isStockEpuise)
    if (quickFilter === 'low') list = list.filter(isStockFaible)
    return [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [produits, search, filterCategorie, quickFilter])

  const totalFilteredCount = filtered.length
  const totalPagesStock =
    totalFilteredCount === 0 ? 0 : Math.ceil(totalFilteredCount / PAGE_SIZE_STOCK)

  const paginated = useMemo(() => {
    const start = (pageStock - 1) * PAGE_SIZE_STOCK
    return filtered.slice(start, start + PAGE_SIZE_STOCK)
  }, [filtered, pageStock])

  useEffect(() => {
    setPageStock(1)
  }, [search, filterCategorie, quickFilter])

  useEffect(() => {
    if (totalPagesStock > 0 && pageStock > totalPagesStock) setPageStock(totalPagesStock)
  }, [totalPagesStock, pageStock])

  const expectedRev = useMemo(() => expectedRevenusFromProduits(produits), [produits])
  const totalAchat = useMemo(
    () => (facturesAchat ? totalAchatGlobalFromFactures(facturesAchat) : null),
    [facturesAchat]
  )
  const totalVendu = useMemo(
    () => (facturesVente ? totalVenduGlobalFromFactures(facturesVente) : null),
    [facturesVente]
  )
  const ceMois = useMemo(() => currentYearMonth(), [])
  const topVendus = useMemo(
    () => produitsPlusVendusCeMois(facturesVente, ceMois),
    [facturesVente, ceMois]
  )

  const activityPreview = useMemo(
    () =>
      [...mouvements]
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
        .slice(0, 6),
    [mouvements]
  )

  const showCategoryChips = filterChips.length > 2

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const confirmDelete = (p: ProduitStock) => {
    Alert.alert('Supprimer', `Supprimer « ${p.nom} » du catalogue ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void deleteProduit(accessToken, p.id)
            .then(() => {
              showMsg('Produit supprimé')
              setEditProduit(null)
              return load()
            })
            .catch((e) => showMsg(e instanceof Error ? e.message : 'Erreur', true))
        },
      },
    ])
  }

  const overlayOpen = !!editProduit || showNewForm || drawerOpen

  if (!canViewInventory) {
    return (
      <View style={styles.denied}>
        <Ionicons name="cube-outline" size={48} color={theme.textSubtle} />
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>Vous n&apos;avez pas accès au stock général.</Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="cube" size={24} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Stock Général</Text>
            <Text style={styles.heroSub}>Quantités et valeur en stock</Text>
          </View>
          {produits.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{produits.length}</Text>
            </View>
          ) : null}
        </View>

        <StockKpiStrip
          totalAchat={totalAchat}
          totalVendu={totalVendu}
          expectedRevenus={expectedRev}
          loading={loading}
        />

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher…"
            placeholderTextColor={theme.textSubtle}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>

        {(stockEpuise.length > 0 || aCommander.length > 0) ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickFilters}
          >
            <Pressable
              style={[styles.quickChip, quickFilter === 'all' && styles.quickChipActive]}
              onPress={() => setQuickFilter('all')}
            >
              <Text style={[styles.quickChipText, quickFilter === 'all' && styles.quickChipTextActive]}>
                Tous
              </Text>
            </Pressable>
            {stockEpuise.length > 0 ? (
              <Pressable
                style={[styles.quickChip, quickFilter === 'rupture' && styles.quickChipRupture]}
                onPress={() => setQuickFilter((f) => (f === 'rupture' ? 'all' : 'rupture'))}
              >
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={quickFilter === 'rupture' ? '#fff' : '#dc2626'}
                />
                <Text
                  style={[
                    styles.quickChipText,
                    quickFilter === 'rupture' && styles.quickChipTextActive,
                  ]}
                >
                  Rupture ({stockEpuise.length})
                </Text>
              </Pressable>
            ) : null}
            {aCommander.length > 0 ? (
              <Pressable
                style={[styles.quickChip, quickFilter === 'low' && styles.quickChipLow]}
                onPress={() => setQuickFilter((f) => (f === 'low' ? 'all' : 'low'))}
              >
                <Ionicons
                  name="warning"
                  size={14}
                  color={quickFilter === 'low' ? '#fff' : '#b45309'}
                />
                <Text
                  style={[styles.quickChipText, quickFilter === 'low' && styles.quickChipTextActive]}
                >
                  Stock bas ({aCommander.length})
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        ) : null}

        {showCategoryChips ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {filterChips.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.filterChip, filterCategorie === cat && styles.filterChipActive]}
                onPress={() => setFilterCategorie(cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterCategorie === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat === 'tous' ? 'Toutes' : cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  )

  const listFooter = (
    <View>
      {totalFilteredCount > 0 ? (
        <StockPaginationBar
          page={pageStock}
          totalPages={totalPagesStock}
          totalCount={totalFilteredCount}
          pageSize={PAGE_SIZE_STOCK}
          onPrev={() => {
            setPageStock((p) => Math.max(1, p - 1))
            listRef.current?.scrollToOffset({ offset: 0, animated: true })
          }}
          onNext={() => {
            setPageStock((p) => Math.min(totalPagesStock, p + 1))
            listRef.current?.scrollToOffset({ offset: 0, animated: true })
          }}
        />
      ) : null}
      <StockTopVendusCard
        items={topVendus}
        expanded={showTopVendus}
        onToggle={() => setShowTopVendus((v) => !v)}
      />
      {activityPreview.length > 0 ? (
        <View style={styles.activityBlock}>
          <Pressable
            style={styles.activityToggle}
            onPress={() => setShowActivity((v) => !v)}
          >
            <Ionicons name="time-outline" size={18} color={theme.primary} />
            <Text style={styles.activityToggleText}>Activité récente</Text>
            <Text style={styles.activityCount}>{mouvements.length}</Text>
            <Ionicons
              name={showActivity ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textMuted}
            />
          </Pressable>
          {showActivity
            ? activityPreview.map((m) => (
                <View key={m.id} style={styles.activityRow}>
                  <View
                    style={[
                      styles.activityDot,
                      m.type === 'entree' ? styles.dotIn : styles.dotOut,
                    ]}
                  />
                  <View style={styles.activityBody}>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {m.produitNom}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {formatDateFr(m.date)} · {m.origine === 'achat' ? 'Achat' : 'Vente'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.activityQte,
                      m.type === 'entree' ? styles.movEntree : styles.movSortie,
                    ]}
                  >
                    {m.type === 'entree' ? '+' : '−'}
                    {m.quantite}
                  </Text>
                </View>
              ))
            : null}
        </View>
      ) : null}
      <View style={styles.footerSpacer} />
    </View>
  )

  if (loading && produits.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <StockGeneralSkeleton />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={paginated}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <StockListItem produit={item} onPress={() => setEditProduit(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={theme.primary} />
            <Text style={styles.emptyTitle}>{error ?? 'Aucun produit'}</Text>
            <Text style={styles.emptySub}>
              {produits.length === 0
                ? 'Ajoutez un produit pour commencer.'
                : 'Aucun résultat pour ces filtres.'}
            </Text>
            {produits.length === 0 && !error ? (
              <Pressable style={styles.emptyCta} onPress={() => setShowNewForm(true)}>
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={styles.emptyCtaText}>Nouveau produit</Text>
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

      <AddProduitFab onPress={() => setShowNewForm(true)} visible={!overlayOpen} />

      <StockEditModal
        visible={!!editProduit}
        produit={editProduit}
        accessToken={accessToken}
        onClose={() => setEditProduit(null)}
        onSaved={(p) => {
          showMsg('Produit modifié')
          setProduits((prev) => prev.map((x) => (x.id === p.id ? p : x)))
        }}
        onDelete={() => {
          if (editProduit) confirmDelete(editProduit)
        }}
      />

      <ProduitFormModal
        visible={showNewForm}
        produit={null}
        categoriesFromData={categoriesFromData}
        accessToken={accessToken}
        onClose={() => setShowNewForm(false)}
        onSaved={() => {
          showMsg('Produit ajouté')
          setShowNewForm(false)
          void load()
        }}
      />

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  denied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: theme.bg,
  },
  deniedTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 12 },
  deniedSub: { fontSize: 14, color: theme.textMuted, textAlign: 'center', marginTop: 6 },
  headerWrap: { marginBottom: 4 },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderTopWidth: 3,
    borderTopColor: theme.primary,
    ...theme.shadow.sm,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: theme.text },
  heroSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  countBadge: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: 14, fontWeight: '800', color: theme.primaryDark },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 12 },
  quickFilters: { gap: 8, paddingRight: 4, marginBottom: 10 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  quickChipActive: { backgroundColor: theme.primary, borderColor: theme.primaryDark },
  quickChipRupture: { backgroundColor: '#dc2626', borderColor: '#b91c1c' },
  quickChipLow: { backgroundColor: '#d97706', borderColor: '#b45309' },
  quickChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  quickChipTextActive: { color: '#fff', fontWeight: '700' },
  chipsScroll: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: { backgroundColor: theme.primary, borderColor: theme.primaryDark },
  filterChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '800' },
  separator: { height: 8 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  emptySub: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primary,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700' },
  activityBlock: {
    marginTop: 12,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  activityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  activityToggleText: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.text },
  activityCount: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  dotIn: { backgroundColor: '#059669' },
  dotOut: { backgroundColor: '#dc2626' },
  activityBody: { flex: 1, minWidth: 0 },
  activityName: { fontSize: 14, fontWeight: '600', color: theme.text },
  activityMeta: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  activityQte: { fontSize: 14, fontWeight: '800' },
  movEntree: { color: '#059669' },
  movSortie: { color: '#dc2626' },
  footerSpacer: { height: 88 },
})
