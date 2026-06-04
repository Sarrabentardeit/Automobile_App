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
import TeamMemberFormModal from '../components/TeamMemberFormModal'
import AddTeamMemberFab from '../components/equipe/AddTeamMemberFab'
import TeamMemberDetailSheet from '../components/equipe/TeamMemberDetailSheet'
import TeamMemberListItem from '../components/equipe/TeamMemberListItem'
import TeamMembersSkeleton from '../components/equipe/TeamMembersSkeleton'
import AppToast from '../components/ui/AppToast'
import { deleteTeamMember, fetchTeamMembers } from '../lib/teamMemberApi'
import { theme } from '../theme/appTheme'
import type { TeamMember } from '../types/teamMember'

type Props = {
  accessToken: string
  canManageUsers: boolean
  refreshKey?: number
  drawerOpen?: boolean
}

export default function EquipeMembresScreen({
  accessToken,
  canManageUsers,
  refreshKey = 0,
  drawerOpen = false,
}: Props) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [detailMember, setDetailMember] = useState<TeamMember | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchTeamMembers(accessToken)
      setMembers(list)
    } catch (e) {
      setMembers([])
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
  }, [load, refreshKey, canManageUsers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone ?? '').toLowerCase().includes(q)
    )
  }, [members, search])

  const existingNames = useMemo(() => members.map((m) => m.name), [members])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const openAdd = () => {
    setEditingMember(null)
    setShowForm(true)
  }

  const confirmDelete = (m: TeamMember) => {
    Alert.alert(
      'Supprimer ce membre ?',
      `« ${m.name} » sera retiré de la liste. Il n'apparaîtra plus dans la Caisse.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            void deleteTeamMember(accessToken, m.id)
              .then(() => {
                showMsg('Membre supprimé')
                setDetailMember(null)
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

  if (!canManageUsers) {
    return (
      <View style={styles.denied}>
        <Ionicons name="people-circle-outline" size={48} color={theme.textSubtle} />
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>
          Vous n&apos;avez pas la permission de gérer les membres équipe.
        </Text>
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="people-circle" size={24} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Membres équipe</Text>
          </View>
          {members.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{members.length}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.primary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher…"
            placeholderTextColor={theme.textSubtle}
            clearButtonMode="while-editing"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.textSubtle} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.listSectionHead}>
        <Text style={styles.listSectionTitle}>Liste des membres</Text>
        <Text style={styles.listSectionCount}>
          {filtered.length} affiché{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )

  if (loading && members.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <TeamMembersSkeleton />
        </View>
      </View>
    )
  }

  const formOpen = showForm
  const overlayOpen = formOpen || !!detailMember || drawerOpen

  return (
    <View style={styles.root}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TeamMemberListItem member={item} onPress={() => setDetailMember(item)} />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={<View style={styles.footerSpacer} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="people-outline" size={40} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucun membre'}</Text>
            <Text style={styles.emptySub}>
              {search.trim()
                ? 'Aucun résultat pour cette recherche.'
                : 'Ajoutez les membres affichés dans Suivi Argent Équipe.'}
            </Text>
            {!search.trim() && !error ? (
              <Pressable style={styles.emptyCta} onPress={openAdd}>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={styles.emptyCtaText}>Ajouter un membre</Text>
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

      <AddTeamMemberFab onPress={openAdd} visible={!overlayOpen} />

      <TeamMemberDetailSheet
        visible={!!detailMember}
        member={detailMember}
        onClose={() => setDetailMember(null)}
        onEdit={() => {
          if (!detailMember) return
          setEditingMember(detailMember)
          setDetailMember(null)
          setShowForm(true)
        }}
        onDelete={() => {
          if (!detailMember) return
          const m = detailMember
          setDetailMember(null)
          confirmDelete(m)
        }}
      />

      <TeamMemberFormModal
        visible={showForm}
        member={editingMember}
        accessToken={accessToken}
        existingNames={existingNames}
        onClose={() => {
          setShowForm(false)
          setEditingMember(null)
        }}
        onSaved={() => {
          showMsg(editingMember ? 'Membre mis à jour' : 'Membre ajouté')
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
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
