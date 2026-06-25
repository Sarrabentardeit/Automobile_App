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
import { Ionicons } from '@expo/vector-icons'
import AddFournisseurFab from '../components/fournisseurs/AddFournisseurFab'
import FournisseurDetailSheet from '../components/fournisseurs/FournisseurDetailSheet'
import FournisseurFormModal from '../components/fournisseurs/FournisseurFormModal'
import FournisseurListItem from '../components/fournisseurs/FournisseurListItem'
import FournisseursSkeleton from '../components/fournisseurs/FournisseursSkeleton'
import AppToast from '../components/ui/AppToast'
import { deleteFournisseur, fetchFournisseurs } from '../lib/fournisseurApi'
import { theme } from '../theme/appTheme'
import type { Fournisseur } from '../types/fournisseur'

const PAGE_SIZE = 15

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function FournisseursScreen({
  accessToken,
  canViewFinance,
  drawerOpen = false,
}: Props) {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState<Fournisseur | null>(null)
  const [editing, setEditing] = useState<Fournisseur | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchFournisseurs(accessToken)
      setFournisseurs(list)
    } catch (e) {
      setFournisseurs([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  const filtered = useMemo(() => {
    let list = fournisseurs
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase()
      list = list.filter(
        (f) =>
          f.nom.toLowerCase().includes(q) ||
          f.telephone.includes(q) ||
          (f.email && f.email.toLowerCase().includes(q)) ||
          (f.contact && f.contact.toLowerCase().includes(q))
      )
    }
    return [...list].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [fournisseurs, searchDebounced])

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

  const openEdit = (f: Fournisseur) => {
    setEditing(f)
    setDetail(null)
    setShowForm(true)
  }

  const confirmDelete = (f: Fournisseur) => {
    Alert.alert('Supprimer', `Supprimer « ${f.nom} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void deleteFournisseur(accessToken, f.id)
            .then(() => {
              showMsg('Fournisseur supprimé')
              setDetail(null)
              if (editing?.id === f.id) {
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
        <Text style={styles.deniedSub}>
          Vous n&apos;avez pas accès aux fournisseurs.
        </Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="storefront" size={22} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Fournisseurs</Text>
            <Text style={styles.heroSub}>Pièces, huiles, équipements…</Text>
          </View>
          {fournisseurs.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{fournisseurs.length}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Nom, téléphone, email, contact…"
            placeholderTextColor={theme.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {filtered.length > 0 ? (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsLabel}>
            {filtered.length} fournisseur{filtered.length > 1 ? 's' : ''}
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

  if (loading && fournisseurs.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <FournisseursSkeleton />
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
          <FournisseurListItem fournisseur={item} onPress={() => setDetail(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="storefront-outline" size={44} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucun fournisseur'}</Text>
            <Text style={styles.emptySub}>
              {searchDebounced
                ? 'Aucun résultat. Essayez un autre terme.'
                : 'Ajoutez vos fournisseurs pour les retrouver rapidement.'}
            </Text>
            {!error && !searchDebounced ? (
              <Pressable style={styles.emptyCta} onPress={openNew}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.emptyCtaText}>Ajouter un fournisseur</Text>
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

      <AddFournisseurFab onPress={openNew} visible={!overlayOpen} />

      <FournisseurDetailSheet
        visible={!!detail}
        fournisseur={detail}
        onClose={() => setDetail(null)}
        onEdit={() => {
          if (!detail) return
          openEdit(detail)
        }}
        onDelete={() => {
          if (!detail) return
          const f = detail
          setDetail(null)
          confirmDelete(f)
        }}
      />

      <FournisseurFormModal
        visible={showForm}
        fournisseur={editing}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={() => {
          showMsg(
            editing ? 'Fournisseur modifié avec succès' : 'Fournisseur ajouté avec succès'
          )
          setDetail(null)
          void load()
        }}
        onDeleted={() => {
          showMsg('Fournisseur supprimé')
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
