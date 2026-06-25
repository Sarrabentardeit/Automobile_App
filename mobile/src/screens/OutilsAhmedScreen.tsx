import { useCallback, useEffect, useMemo, useState } from 'react'
import {
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
import AddOutilAhmedFab from '../components/outilsAhmed/AddOutilAhmedFab'
import OutilAhmedFormModal from '../components/outilsAhmed/OutilAhmedFormModal'
import OutilAhmedListItem from '../components/outilsAhmed/OutilAhmedListItem'
import OutilAhmedSkeleton from '../components/outilsAhmed/OutilAhmedSkeleton'
import AppToast from '../components/ui/AppToast'
import { fetchOutilsAhmed } from '../lib/outilAhmedApi'
import { formatMontant } from '../lib/formatMoney'
import { theme } from '../theme/appTheme'
import type { OutilAhmed } from '../types/outilAhmed'

const ACCENT = '#059669'

type Props = {
  accessToken: string
  canViewEquipeOutils: boolean
  drawerOpen?: boolean
}

export default function OutilsAhmedScreen({
  accessToken,
  canViewEquipeOutils,
  drawerOpen = false,
}: Props) {
  const [entries, setEntries] = useState<OutilAhmed[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<OutilAhmed | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchOutilsAhmed(accessToken)
      setEntries(list)
    } catch (e) {
      setEntries([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewEquipeOutils) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewEquipeOutils])

  const filtered = useMemo(() => {
    let list = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          o.vehicule.toLowerCase().includes(q) ||
          o.typeTravaux.toLowerCase().includes(q)
      )
    }
    return list
  }, [entries, search])

  const totalPrixAhmed = useMemo(
    () => filtered.reduce((s, o) => s + o.prixAhmed, 0),
    [filtered]
  )

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const openNew = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (entry: OutilAhmed) => {
    setEditing(entry)
    setShowForm(true)
  }

  const overlayOpen = showForm || drawerOpen

  if (!canViewEquipeOutils) {
    return (
      <View style={styles.denied}>
        <View style={styles.deniedRing}>
          <Ionicons name="construct-outline" size={36} color={ACCENT} />
        </View>
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>Vous n&apos;avez pas accès à l&apos;Opération Ahmed.</Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="construct" size={22} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Opération Ahmed</Text>
            <Text style={styles.heroSub}>Suivi travaux, prix garage & Ahmed</Text>
          </View>
          {entries.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{entries.length}</Text>
            </View>
          ) : null}
        </View>

        <LinearGradient
          colors={totalPrixAhmed >= 0 ? ['#ecfdf5', '#d1fae5'] : ['#fffbeb', '#ffedd5']}
          style={styles.kpiBanner}
        >
          <View style={styles.kpiIcon}>
            <Ionicons
              name="wallet-outline"
              size={20}
              color={totalPrixAhmed >= 0 ? ACCENT : '#d97706'}
            />
          </View>
          <View style={styles.kpiText}>
            <Text style={styles.kpiLabel}>Solde Prix Ahmed</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: totalPrixAhmed >= 0 ? '#047857' : '#b45309' },
              ]}
            >
              {formatMontant(totalPrixAhmed)} TND
            </Text>
            {search.trim() ? (
              <Text style={styles.kpiSub}>Sur les résultats filtrés</Text>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={ACCENT} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Véhicule, type de travaux…"
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
            {filtered.length} entrée{filtered.length !== 1 ? 's' : ''}
          </Text>
        </View>
      ) : null}
    </View>
  )

  if (loading && entries.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <OutilAhmedSkeleton />
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
          <OutilAhmedListItem entry={item} onPress={() => openEdit(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={<View style={styles.footerSpacer} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="construct-outline" size={44} color={ACCENT} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucune entrée'}</Text>
            <Text style={styles.emptySub}>
              {search.trim()
                ? 'Aucun résultat pour cette recherche.'
                : 'Ajoutez une entrée pour commencer le suivi.'}
            </Text>
            {!search.trim() && !error ? (
              <Pressable style={styles.emptyCta} onPress={openNew}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.emptyCtaText}>Nouvelle entrée</Text>
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
            tintColor={ACCENT}
          />
        }
      />

      <AddOutilAhmedFab onPress={openNew} visible={!overlayOpen} />

      <OutilAhmedFormModal
        visible={showForm}
        entry={editing}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={() => {
          showMsg(editing ? 'Entrée modifiée avec succès' : 'Entrée ajoutée avec succès')
          void load()
        }}
        onDeleted={() => {
          showMsg('Entrée supprimée')
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
    backgroundColor: '#ecfdf5',
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
    backgroundColor: ACCENT,
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
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
  },
  countBadgeText: { fontSize: 14, fontWeight: '800', color: '#047857' },
  kpiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 14,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiText: { flex: 1 },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  kpiSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
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
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 6,
  },
  resultsLabel: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  separator: { height: 10 },
  footerSpacer: { height: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10, paddingHorizontal: 24 },
  emptyRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#ecfdf5',
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
    backgroundColor: ACCENT,
    ...theme.shadow.primaryBtn,
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
