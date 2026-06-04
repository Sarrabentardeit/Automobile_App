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
import ContactImportantFormModal from '../components/ContactImportantFormModal'
import AddContactFab from '../components/contacts/AddContactFab'
import ContactImportantDetailSheet from '../components/contacts/ContactImportantDetailSheet'
import ContactImportantListItem from '../components/contacts/ContactImportantListItem'
import ContactsImportantsSkeleton from '../components/contacts/ContactsImportantsSkeleton'
import AppToast from '../components/ui/AppToast'
import {
  deleteContactImportant,
  fetchContactsImportants,
} from '../lib/contactImportantApi'
import { theme } from '../theme/appTheme'
import { CONTACT_CATEGORIES, type ContactImportant } from '../types/contactImportant'

type Props = {
  accessToken: string
  refreshKey?: number
  drawerOpen?: boolean
}

export default function ContactsImportantsScreen({
  accessToken,
  refreshKey = 0,
  drawerOpen = false,
}: Props) {
  const [contacts, setContacts] = useState<ContactImportant[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactImportant | null>(null)
  const [detailContact, setDetailContact] = useState<ContactImportant | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setError(null)
    try {
      const list = await fetchContactsImportants(accessToken, {
        q: searchDebounced || undefined,
        categorie: filterCat || undefined,
      })
      setContacts(list)
    } catch (e) {
      setContacts([])
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken, searchDebounced, filterCat])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, refreshKey])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const openAdd = () => {
    setEditingContact(null)
    setShowForm(true)
  }

  const confirmDelete = (c: ContactImportant) => {
    Alert.alert('Supprimer ce contact ?', `Supprimer « ${c.nom} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void deleteContactImportant(accessToken, c.id)
            .then(() => {
              showMsg('Contact supprimé')
              setDetailContact(null)
              return load()
            })
            .catch((e) =>
              showMsg(e instanceof Error ? e.message : 'Erreur', true)
            )
        },
      },
    ])
  }

  const overlayOpen = showForm || !!detailContact || drawerOpen

  const categoryChips = useMemo(
    () => (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        <Pressable
          style={[styles.filterChip, !filterCat && styles.filterChipActive]}
          onPress={() => setFilterCat('')}
        >
          <Text style={[styles.filterChipText, !filterCat && styles.filterChipTextActive]}>
            Tous
          </Text>
        </Pressable>
        {CONTACT_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.filterChip, filterCat === cat && styles.filterChipActive]}
            onPress={() => setFilterCat(filterCat === cat ? '' : cat)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterCat === cat && styles.filterChipTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    ),
    [filterCat]
  )

  const listHeader = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="call" size={24} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Contacts importants</Text>
          </View>
          {contacts.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{contacts.length}</Text>
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

        {categoryChips}
      </View>

      <View style={styles.listSectionHead}>
        <Text style={styles.listSectionTitle}>Liste</Text>
        <Text style={styles.listSectionCount}>
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  )

  if (loading && contacts.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.content}>
          {listHeader}
          <ContactsImportantsSkeleton />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ContactImportantListItem
            contact={item}
            onPress={() => setDetailContact(item)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={<View style={styles.footerSpacer} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Ionicons name="call-outline" size={40} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{error ?? 'Aucun contact'}</Text>
            <Text style={styles.emptySub}>
              {searchDebounced || filterCat
                ? 'Modifiez la recherche ou le filtre.'
                : 'Ajoutez des numéros utiles (fournisseur, dépannage…).'}
            </Text>
            {!searchDebounced && !filterCat && !error ? (
              <Pressable style={styles.emptyCta} onPress={openAdd}>
                <Ionicons name="add" size={22} color="#fff" />
                <Text style={styles.emptyCtaText}>Ajouter un contact</Text>
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

      <AddContactFab onPress={openAdd} visible={!overlayOpen} />

      <ContactImportantDetailSheet
        visible={!!detailContact}
        contact={detailContact}
        onClose={() => setDetailContact(null)}
        onEdit={() => {
          if (!detailContact) return
          setEditingContact(detailContact)
          setDetailContact(null)
          setShowForm(true)
        }}
        onDelete={() => {
          if (!detailContact) return
          const c = detailContact
          setDetailContact(null)
          confirmDelete(c)
        }}
      />

      <ContactImportantFormModal
        visible={showForm}
        contact={editingContact}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditingContact(null)
        }}
        onSaved={() => {
          showMsg(editingContact ? 'Contact modifié' : 'Contact ajouté')
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
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
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
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  filterChipTextActive: { color: theme.primaryDark, fontWeight: '800' },
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
