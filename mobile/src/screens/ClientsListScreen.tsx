import { useCallback, useEffect, useState } from 'react'
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
import ClientFormModal from '../components/ClientFormModal'
import AddClientFab from '../components/clients/AddClientFab'
import ClientDetailSheet from '../components/clients/ClientDetailSheet'
import ClientListItem from '../components/clients/ClientListItem'
import ClientsSkeleton from '../components/clients/ClientsSkeleton'
import AppToast from '../components/ui/AppToast'
import { deleteClient, fetchClients } from '../lib/clientApi'
import { theme } from '../theme/appTheme'
import type { Client } from '../types/client'

const PAGE_SIZE = 12

type Props = {
  accessToken: string
  refreshKey?: number
  drawerOpen?: boolean
}

export default function ClientsListScreen({
  accessToken,
  refreshKey = 0,
  drawerOpen = false,
}: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(
    async (pageNum: number) => {
      setError(null)
      try {
        const res = await fetchClients(accessToken, {
          q: searchDebounced || undefined,
          page: pageNum,
          limit: PAGE_SIZE,
        })
        setClients(res.data ?? [])
        setTotal(res.total ?? 0)
        setPage(res.page ?? pageNum)
      } catch (e) {
        setClients([])
        setError(e instanceof Error ? e.message : 'Erreur chargement')
      }
    },
    [accessToken, searchDebounced]
  )

  useEffect(() => {
    setLoading(true)
    void load(page).finally(() => setLoading(false))
  }, [load, page, refreshKey])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const openAdd = () => {
    setEditingClient(null)
    setShowForm(true)
  }

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const confirmDelete = (c: Client) => {
    Alert.alert('Supprimer', `Supprimer « ${c.nom} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void deleteClient(accessToken, c.id)
            .then(() => {
              showMsg('Client supprimé')
              return load(page)
            })
            .catch((e) =>
              showMsg(e instanceof Error ? e.message : 'Erreur', true)
            )
        },
      },
    ])
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={24} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Clients</Text>
            <Text style={styles.heroSub}>Carnet d&apos;adresses atelier</Text>
          </View>
          {total > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{total}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un client…"
            placeholderTextColor={theme.textSubtle}
            clearButtonMode="while-editing"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8} style={styles.searchClear}>
              <Ionicons name="close-circle" size={20} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {!loading && (clients.length > 0 || searchDebounced) ? (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsLabel}>
            {searchDebounced ? `${total} résultat${total !== 1 ? 's' : ''}` : `${total} contact${total !== 1 ? 's' : ''}`}
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
    total > PAGE_SIZE ? (
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
          <ClientsSkeleton />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={clients}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ClientListItem client={item} onPress={() => setDetailClient(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="people-outline" size={44} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucun client'}</Text>
            <Text style={styles.emptySub}>
              {searchDebounced
                ? 'Aucun résultat. Essayez un autre terme.'
                : 'Ajoutez votre premier contact pour l’atelier.'}
            </Text>
            {!searchDebounced && !error ? (
              <Pressable style={styles.emptyCta} onPress={openAdd}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.emptyCtaText}>Ajouter un client</Text>
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
              void load(page).finally(() => setRefreshing(false))
            }}
            tintColor={theme.primary}
          />
        }
      />

      <AddClientFab
        onPress={openAdd}
        visible={!showForm && !detailClient && !drawerOpen}
      />

      <ClientDetailSheet
        visible={!!detailClient}
        client={detailClient}
        onClose={() => setDetailClient(null)}
        onEdit={() => {
          if (!detailClient) return
          setEditingClient(detailClient)
          setDetailClient(null)
          setShowForm(true)
        }}
        onDelete={() => {
          if (!detailClient) return
          const c = detailClient
          setDetailClient(null)
          confirmDelete(c)
        }}
      />

      <ClientFormModal
        visible={showForm}
        client={editingClient}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditingClient(null)
        }}
        onSaved={() => {
          showMsg(editingClient ? 'Client mis à jour' : 'Client ajouté')
          setDetailClient(null)
          void load(page)
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
  headerWrap: { marginBottom: 10 },
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
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
  heroSub: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
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
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    paddingVertical: 12,
  },
  searchClear: { padding: 2 },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  resultsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resultsPage: { fontSize: 12, fontWeight: '600', color: theme.primary },
  separator: { height: 10 },
  pagerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 96,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pagerBtn: { padding: 8 },
  pagerDisabled: { opacity: 0.35 },
  pagerLabel: { fontSize: 15, fontWeight: '700', color: theme.textSecondary },
  footerSpacer: { height: 96 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28 },
  emptyRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: theme.primarySoft,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  emptySub: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 21,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: theme.radius.sm,
    ...theme.shadow.primaryBtn,
  },
  emptyCtaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
