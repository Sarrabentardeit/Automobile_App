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
import { Ionicons } from '@expo/vector-icons'
import AddReclamationFab from '../components/reclamations/AddReclamationFab'
import ReclamationFormModal from '../components/reclamations/ReclamationFormModal'
import ReclamationListItem from '../components/reclamations/ReclamationListItem'
import ReclamationStatutFilter from '../components/reclamations/ReclamationStatutFilter'
import ReclamationStatsStrip from '../components/reclamations/ReclamationStatsStrip'
import ReclamationsSkeleton from '../components/reclamations/ReclamationsSkeleton'
import AppToast from '../components/ui/AppToast'
import { fetchReclamations } from '../lib/reclamationApi'
import { fetchUsers } from '../lib/vehiculeApi'
import { theme } from '../theme/appTheme'
import type { Reclamation, ReclamationStatut } from '../types/reclamation'

type FilterStatut = 'toutes' | ReclamationStatut

type Props = {
  accessToken: string
  drawerOpen?: boolean
}

export default function ReclamationsScreen({ accessToken, drawerOpen = false }: Props) {
  const [reclamations, setReclamations] = useState<Reclamation[]>([])
  const [assignableNames, setAssignableNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<FilterStatut>('toutes')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Reclamation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [list, users] = await Promise.all([
        fetchReclamations(accessToken),
        fetchUsers(accessToken).catch(() => []),
      ])
      setReclamations(list)
      setAssignableNames(
        users
          .filter((u) => u.statut === 'actif')
          .map((u) => u.nom_complet.trim())
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'fr'))
      )
    } catch (e) {
      setReclamations([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const filtered = useMemo(() => {
    let list = reclamations
    if (filterStatut !== 'toutes') {
      list = list.filter((r) => r.statut === filterStatut)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          (r.vehicleRef ?? '').toLowerCase().includes(q) ||
          (r.sujet ?? '').toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  }, [reclamations, filterStatut, search])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const openNew = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (r: Reclamation) => {
    setEditing(r)
    setShowForm(true)
  }

  const overlayOpen = showForm || drawerOpen

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Réclamations</Text>
            <Text style={styles.heroSub}>Suivi des réclamations clients</Text>
          </View>
        </View>

        {!loading ? <ReclamationStatsStrip reclamations={reclamations} /> : null}

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher (client, véhicule, sujet…)"
            placeholderTextColor={theme.textSubtle}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>

        <ReclamationStatutFilter value={filterStatut} onChange={setFilterStatut} />
      </View>
    </View>
  )

  if (loading && reclamations.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <ReclamationsSkeleton />
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
          <ReclamationListItem reclamation={item} onPress={() => openEdit(item)} />
        )}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={40} color={theme.textSubtle} />
            <Text style={styles.emptyTitle}>{error ?? 'Aucune réclamation'}</Text>
            <Text style={styles.emptySub}>
              {filterStatut !== 'toutes' || search.trim()
                ? 'Modifiez les filtres ou ajoutez une réclamation.'
                : 'Ajoutez une réclamation pour commencer.'}
            </Text>
            {!error ? (
              <Pressable style={styles.emptyCta} onPress={openNew}>
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={styles.emptyCtaText}>Nouvelle réclamation</Text>
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

      <AddReclamationFab onPress={openNew} visible={!overlayOpen} />

      <ReclamationFormModal
        visible={showForm}
        reclamation={editing}
        assignableNames={assignableNames}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={() => {
          const wasEdit = !!editing
          showMsg(
            wasEdit ? 'Réclamation modifiée avec succès' : 'Réclamation ajoutée avec succès'
          )
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
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.text, paddingVertical: 12 },
  separator: { height: 10 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  emptySub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingHorizontal: 20 },
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
})
