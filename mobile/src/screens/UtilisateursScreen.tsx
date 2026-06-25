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
import AddUserFab from '../components/utilisateurs/AddUserFab'
import UserDetailSheet from '../components/utilisateurs/UserDetailSheet'
import UserFormModal from '../components/utilisateurs/UserFormModal'
import UserListItem from '../components/utilisateurs/UserListItem'
import UserPermissionsSheet from '../components/utilisateurs/UserPermissionsSheet'
import UsersSkeleton from '../components/utilisateurs/UsersSkeleton'
import AppToast from '../components/ui/AppToast'
import {
  deleteAppAccount,
  fetchAppAccounts,
  updateAppAccount,
} from '../lib/userApi'
import { ALL_ROLES, ROLE_STYLE, type Role } from '../types/permissions'
import { theme } from '../theme/appTheme'
import type { AppAccount } from '../types/appUser'

const PAGE_SIZE = 20

type FilterRole = Role | 'tous'

type Props = {
  accessToken: string
  canManageUsers: boolean
  isAdmin: boolean
  currentUserId: number
  drawerOpen?: boolean
}

export default function UtilisateursScreen({
  accessToken,
  canManageUsers,
  isAdmin,
  currentUserId,
  drawerOpen = false,
}: Props) {
  const [users, setUsers] = useState<AppAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<FilterRole>('tous')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AppAccount | null>(null)
  const [detail, setDetail] = useState<AppAccount | null>(null)
  const [permsView, setPermsView] = useState<AppAccount | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchAppAccounts(accessToken)
      setUsers(list)
    } catch (e) {
      setUsers([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canManageUsers) {
      setLoading(false)
      return
    }
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canManageUsers])

  useEffect(() => {
    setPage(1)
  }, [filterRole, search])

  const filtered = useMemo(() => {
    let list = users
    if (filterRole !== 'tous') {
      list = list.filter((u) => u.role === filterRole)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (u) =>
          u.nom_complet.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    }
    return list
  }, [users, filterRole, search])

  const activeCount = useMemo(() => users.filter((u) => u.statut === 'actif').length, [users])

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

  const openCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (u: AppAccount) => {
    setEditing(u)
    setDetail(null)
    setShowForm(true)
  }

  const toggleStatut = (u: AppAccount) => {
    const newStatut = u.statut === 'actif' ? 'inactif' : 'actif'
    void updateAppAccount(accessToken, u.id, { statut: newStatut })
      .then(() => {
        showMsg(newStatut === 'actif' ? 'Compte réactivé' : 'Compte désactivé')
        setDetail(null)
        return load()
      })
      .catch((e) => showMsg(e instanceof Error ? e.message : 'Erreur', true))
  }

  const confirmDelete = (u: AppAccount) => {
    if (u.id === currentUserId) {
      showMsg('Vous ne pouvez pas supprimer votre propre compte', true)
      return
    }
    Alert.alert(
      'Supprimer le compte',
      `« ${u.nom_complet} » (${u.email}) sera supprimé définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void deleteAppAccount(accessToken, u.id)
              .then(() => {
                showMsg('Compte supprimé')
                setDetail(null)
                return load()
              })
              .catch((e) => showMsg(e instanceof Error ? e.message : 'Suppression impossible', true))
          },
        },
      ]
    )
  }

  const overlayOpen = showForm || !!detail || !!permsView || drawerOpen

  if (!canManageUsers) {
    return (
      <View style={styles.denied}>
        <View style={styles.deniedRing}>
          <Ionicons name="lock-closed-outline" size={36} color={theme.primary} />
        </View>
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>Vous n&apos;avez pas la permission de gérer les utilisateurs.</Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="people" size={22} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Utilisateurs</Text>
            <Text style={styles.heroSub}>
              {loading ? 'Chargement…' : `${activeCount} actif${activeCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
          {users.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{users.length}</Text>
            </View>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Pressable
            onPress={() => setFilterRole('tous')}
            style={[styles.filterChip, filterRole === 'tous' && styles.filterChipOn]}
          >
            <Text style={[styles.filterText, filterRole === 'tous' && styles.filterTextOn]}>
              Tous ({users.length})
            </Text>
          </Pressable>
          {ALL_ROLES.map((role) => {
            const rc = ROLE_STYLE[role]
            const count = users.filter((u) => u.role === role).length
            const active = filterRole === role
            return (
              <Pressable
                key={role}
                onPress={() => setFilterRole(role)}
                style={[
                  styles.filterChip,
                  active && { backgroundColor: rc.bg, borderColor: rc.color },
                ]}
              >
                <Text style={[styles.filterText, active && { color: rc.color, fontWeight: '800' }]}>
                  {rc.label} ({count})
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Nom ou email…"
            placeholderTextColor={theme.textSubtle}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {filtered.length > 0 ? (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsLabel}>
            {filtered.length} compte{filtered.length !== 1 ? 's' : ''}
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

  if (loading && users.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <UsersSkeleton />
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
          <UserListItem user={item} onPress={() => setDetail(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="people-outline" size={44} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucun utilisateur'}</Text>
            <Text style={styles.emptySub}>
              {search.trim() || filterRole !== 'tous'
                ? 'Aucun résultat. Modifiez les filtres.'
                : 'Créez un compte pour commencer.'}
            </Text>
            {!search.trim() && filterRole === 'tous' && !error && isAdmin ? (
              <Pressable style={styles.emptyCta} onPress={openCreate}>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.emptyCtaText}>Nouveau compte</Text>
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

      {isAdmin ? <AddUserFab onPress={openCreate} visible={!overlayOpen} /> : null}

      <UserDetailSheet
        visible={!!detail}
        user={detail}
        canDelete={isAdmin && detail?.id !== currentUserId}
        onClose={() => setDetail(null)}
        onEdit={() => {
          if (!detail) return
          openEdit(detail)
        }}
        onViewPermissions={() => {
          if (!detail) return
          setPermsView(detail)
        }}
        onToggleStatut={() => {
          if (!detail) return
          toggleStatut(detail)
        }}
        onDelete={() => {
          if (!detail) return
          const u = detail
          setDetail(null)
          confirmDelete(u)
        }}
      />

      <UserPermissionsSheet
        visible={!!permsView}
        user={permsView}
        onClose={() => setPermsView(null)}
      />

      {isAdmin ? (
        <UserFormModal
          visible={showForm}
          user={editing}
          accessToken={accessToken}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={() => {
            showMsg(editing ? 'Compte mis à jour' : 'Compte créé')
            void load()
          }}
        />
      ) : null}

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
  filters: { gap: 8, marginBottom: 14, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  filterChipOn: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  filterTextOn: { color: theme.primaryDark, fontWeight: '800' },
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
