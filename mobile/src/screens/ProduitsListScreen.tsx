import { useCallback, useEffect, useMemo, useState } from 'react'
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
import ProduitDetailSheet from '../components/produits/ProduitDetailSheet'
import ProduitListItem from '../components/produits/ProduitListItem'
import ProduitsSkeleton from '../components/produits/ProduitsSkeleton'
import AppToast from '../components/ui/AppToast'
import { deleteProduit, fetchProduits } from '../lib/produitApi'
import { theme } from '../theme/appTheme'
import {
  isLegacyHuilesLiquidesCombinedLabel,
  isProduitAlert,
  mergeFilterCategories,
  type ProduitStock,
} from '../types/produitStock'

type Props = {
  accessToken: string
  canViewInventory: boolean
  refreshKey?: number
  drawerOpen?: boolean
}

export default function ProduitsListScreen({
  accessToken,
  canViewInventory,
  refreshKey = 0,
  drawerOpen = false,
}: Props) {
  const [products, setProducts] = useState<ProduitStock[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState('tous')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingProduit, setEditingProduit] = useState<ProduitStock | null>(null)
  const [detailProduit, setDetailProduit] = useState<ProduitStock | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchProduits(accessToken)
      setProducts(list)
    } catch (e) {
      setProducts([])
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
  }, [load, refreshKey, canViewInventory])

  const categoriesFromData = useMemo(() => {
    const s = new Set<string>()
    for (const p of products) {
      const c = p.categorie?.trim()
      if (c) s.add(c)
    }
    return [...s]
  }, [products])

  const filterChipCategories = useMemo(
    () => mergeFilterCategories(categoriesFromData),
    [categoriesFromData]
  )

  const filterChips = useMemo(() => ['tous', ...filterChipCategories], [filterChipCategories])

  useEffect(() => {
    if (filterCategorie === 'tous') return
    if (isLegacyHuilesLiquidesCombinedLabel(filterCategorie)) {
      setFilterCategorie('tous')
      return
    }
    if (!filterChipCategories.includes(filterCategorie)) {
      setFilterCategorie('tous')
    }
  }, [filterCategorie, filterChipCategories])

  const alertCount = useMemo(() => products.filter((p) => isProduitAlert(p)).length, [products])

  const filtered = useMemo(() => {
    let list = products
    if (showAlertsOnly) list = list.filter((p) => isProduitAlert(p))
    if (filterCategorie !== 'tous') {
      list = list.filter((p) => (p.categorie ?? '').trim() === filterCategorie)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          (p.categorie ?? '').toLowerCase().includes(q) ||
          (p.reference ?? '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [products, filterCategorie, search, showAlertsOnly])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const openAdd = () => {
    setEditingProduit(null)
    setShowForm(true)
  }

  const confirmDelete = (p: ProduitStock) => {
    Alert.alert(
      'Supprimer le produit',
      `Supprimer « ${p.nom} » du catalogue ? Cette action est définitive.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void deleteProduit(accessToken, p.id)
              .then(() => {
                showMsg('Produit supprimé')
                setDetailProduit(null)
                if (editingProduit?.id === p.id) {
                  setShowForm(false)
                  setEditingProduit(null)
                }
                return load()
              })
              .catch((e) =>
                showMsg(e instanceof Error ? e.message : 'Erreur', true)
              )
          },
        },
      ]
    )
  }

  if (!canViewInventory) {
    return (
      <View style={styles.denied}>
        <Ionicons name="cube-outline" size={48} color={theme.textSubtle} />
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>
          Vous n&apos;avez pas accès au catalogue produits.
        </Text>
      </View>
    )
  }

  const overlayOpen = showForm || !!detailProduit || drawerOpen

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="layers" size={24} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Produits</Text>
          </View>
          {products.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{products.length}</Text>
            </View>
          ) : null}
        </View>

        {alertCount > 0 ? (
          <Pressable
            style={[styles.alertBtn, showAlertsOnly && styles.alertBtnActive]}
            onPress={() => {
              setShowAlertsOnly((prev) => {
                if (!prev) {
                  setFilterCategorie('tous')
                  setSearch('')
                }
                return !prev
              })
            }}
          >
            <Ionicons
              name="warning"
              size={16}
              color={showAlertsOnly ? '#fff' : '#92400e'}
            />
            <Text style={[styles.alertBtnText, showAlertsOnly && styles.alertBtnTextActive]}>
              {alertCount} alerte{alertCount > 1 ? 's' : ''}
              {showAlertsOnly ? ' · filtre actif' : ''}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Nom, catégorie, référence…"
            placeholderTextColor={theme.textSubtle}
            clearButtonMode="while-editing"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {filterChips.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.filterChip,
                filterCategorie === cat && styles.filterChipActive,
              ]}
              onPress={() => setFilterCategorie(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterCategorie === cat && styles.filterChipTextActive,
                ]}
              >
                {cat === 'tous' ? 'Tous' : cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.listSectionHead}>
        <Text style={styles.listSectionTitle}>Catalogue</Text>
        <Text style={styles.listSectionCount}>
          {filtered.length} affiché{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )

  if (loading && products.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <ProduitsSkeleton />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProduitListItem produit={item} onPress={() => setDetailProduit(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={<View style={styles.footerSpacer} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="cube-outline" size={40} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucun produit'}</Text>
            <Text style={styles.emptySub}>
              {filterCategorie !== 'tous' || search || showAlertsOnly
                ? 'Modifiez les filtres ou ajoutez un produit.'
                : 'Ajoutez votre premier produit au catalogue.'}
            </Text>
            {!search && filterCategorie === 'tous' && !showAlertsOnly && !error ? (
              <Pressable style={styles.emptyCta} onPress={openAdd}>
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={styles.emptyCtaText}>Ajouter un produit</Text>
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

      <AddProduitFab onPress={openAdd} visible={!overlayOpen} />

      <ProduitDetailSheet
        visible={!!detailProduit}
        produit={detailProduit}
        onClose={() => setDetailProduit(null)}
        onEdit={() => {
          if (!detailProduit) return
          setEditingProduit(detailProduit)
          setDetailProduit(null)
          setShowForm(true)
        }}
        onDelete={() => {
          if (!detailProduit) return
          const p = detailProduit
          setDetailProduit(null)
          confirmDelete(p)
        }}
      />

      <ProduitFormModal
        visible={showForm}
        produit={editingProduit}
        categoriesFromData={categoriesFromData}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditingProduit(null)
        }}
        onSaved={() => {
          showMsg(editingProduit ? 'Produit modifié' : 'Produit ajouté au catalogue')
          void load()
        }}
      />

      <AppToast
        message={toast}
        type={toastError ? 'error' : 'success'}
        onDismiss={() => setToast(null)}
      />
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
  deniedSub: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  headerWrap: { marginBottom: 6 },
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
    ...theme.shadow.primaryBtn,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.3 },
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
  alertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.sm,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 12,
  },
  alertBtnActive: { backgroundColor: '#f59e0b', borderColor: '#d97706' },
  alertBtnText: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  alertBtnTextActive: { color: '#fff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 12 },
  chipsScroll: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primaryDark,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '800' },
  listSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  listSectionCount: { fontSize: 12, fontWeight: '600', color: theme.primary },
  separator: { height: 10 },
  footerSpacer: { height: 72 },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 },
  emptyRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.primarySoft,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
  emptySub: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    ...theme.shadow.primaryBtn,
  },
  emptyCtaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
