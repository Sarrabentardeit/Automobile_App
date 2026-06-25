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
import AddClientDetteFab from '../components/clientsDettes/AddClientDetteFab'
import ClientDetteDetailSheet from '../components/clientsDettes/ClientDetteDetailSheet'
import ClientDetteFormModal from '../components/clientsDettes/ClientDetteFormModal'
import ClientDetteListItem from '../components/clientsDettes/ClientDetteListItem'
import ClientDettesSkeleton from '../components/clientsDettes/ClientDettesSkeleton'
import AppToast from '../components/ui/AppToast'
import { deleteClientDette, fetchClientsDettes } from '../lib/clientDetteApi'
import { formatMontant } from '../lib/formatMoney'
import { theme } from '../theme/appTheme'
import type { ClientAvecDette } from '../types/clientDette'

const PAGE_SIZE = 15

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function ClientsDettesScreen({
  accessToken,
  canViewFinance,
  drawerOpen = false,
}: Props) {
  const [clients, setClients] = useState<ClientAvecDette[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [detailClient, setDetailClient] = useState<ClientAvecDette | null>(null)
  const [editing, setEditing] = useState<ClientAvecDette | null>(null)
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
      const list = await fetchClientsDettes(accessToken)
      setClients(list)
    } catch (e) {
      setClients([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  const filtered = useMemo(() => {
    let list = clients
    if (searchDebounced) {
      const q = searchDebounced.toLowerCase()
      list = list.filter(
        (c) =>
          c.clientName.toLowerCase().includes(q) ||
          c.telephoneClient.toLowerCase().includes(q) ||
          c.designation.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => b.reste - a.reste)
  }, [clients, searchDebounced])

  const totalDettes = useMemo(
    () => filtered.reduce((s, c) => s + c.reste, 0),
    [filtered]
  )

  const withDebt = useMemo(() => clients.filter((c) => c.reste > 0).length, [clients])

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

  const openEdit = (c: ClientAvecDette) => {
    setEditing(c)
    setDetailClient(null)
    setShowForm(true)
  }

  const confirmDelete = (c: ClientAvecDette) => {
    Alert.alert(
      'Supprimer',
      `Supprimer « ${c.clientName} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void deleteClientDette(accessToken, c.id)
              .then(() => {
                showMsg('Client avec dette supprimé')
                setDetailClient(null)
                if (editing?.id === c.id) {
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
      ]
    )
  }

  const overlayOpen = showForm || !!detailClient || drawerOpen

  if (!canViewFinance) {
    return (
      <View style={styles.denied}>
        <View style={styles.deniedRing}>
          <Ionicons name="lock-closed-outline" size={36} color={theme.primary} />
        </View>
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>
          Vous n&apos;avez pas accès aux clients avec dettes.
        </Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="card" size={22} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Clients avec Dettes</Text>
            <Text style={styles.heroSub}>Suivi des créances clients</Text>
          </View>
          {clients.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{clients.length}</Text>
            </View>
          ) : null}
        </View>

        <LinearGradient colors={['#fff7ed', '#ffedd5']} style={styles.kpiBanner}>
          <View style={styles.kpiLeft}>
            <Text style={styles.kpiLabel}>Total reste</Text>
            <Text style={styles.kpiValue}>{formatMontant(totalDettes)}</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiRight}>
            <Text style={styles.kpiStatN}>{withDebt}</Text>
            <Text style={styles.kpiStatL}>avec dette</Text>
            <Text style={styles.kpiStatNSmall}>{clients.length}</Text>
            <Text style={styles.kpiStatLSmall}>total</Text>
          </View>
        </LinearGradient>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Nom, téléphone, désignation…"
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
            {searchDebounced
              ? `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`
              : `${filtered.length} créance${filtered.length !== 1 ? 's' : ''}`}
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

  if (loading && clients.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <ClientDettesSkeleton />
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
          <ClientDetteListItem client={item} onPress={() => setDetailClient(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="wallet-outline" size={44} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucun client avec dette'}</Text>
            <Text style={styles.emptySub}>
              {searchDebounced
                ? 'Aucun résultat. Essayez un autre terme.'
                : 'Ajoutez une créance pour commencer le suivi.'}
            </Text>
            {!error && !searchDebounced ? (
              <Pressable style={styles.emptyCta} onPress={openNew}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.emptyCtaText}>Ajouter une créance</Text>
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

      <AddClientDetteFab onPress={openNew} visible={!overlayOpen} />

      <ClientDetteDetailSheet
        visible={!!detailClient}
        client={detailClient}
        onClose={() => setDetailClient(null)}
        onEdit={() => {
          if (!detailClient) return
          openEdit(detailClient)
        }}
        onDelete={() => {
          if (!detailClient) return
          const c = detailClient
          setDetailClient(null)
          confirmDelete(c)
        }}
      />

      <ClientDetteFormModal
        visible={showForm}
        client={editing}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={() => {
          showMsg(
            editing
              ? 'Client avec dette modifié avec succès'
              : 'Client avec dette ajouté avec succès'
          )
          setDetailClient(null)
          void load()
        }}
        onDeleted={() => {
          showMsg('Client avec dette supprimé')
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
  kpiLeft: { flex: 1 },
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
  kpiDivider: { width: 1, height: 48, backgroundColor: '#fed7aa', marginHorizontal: 14 },
  kpiRight: { alignItems: 'center', minWidth: 72 },
  kpiStatN: { fontSize: 20, fontWeight: '800', color: theme.primaryDark },
  kpiStatL: { fontSize: 10, fontWeight: '600', color: theme.textMuted, marginBottom: 6 },
  kpiStatNSmall: { fontSize: 16, fontWeight: '700', color: theme.textSecondary },
  kpiStatLSmall: { fontSize: 10, fontWeight: '600', color: theme.textMuted },
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
