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
import AppToast from '../components/ui/AppToast'
import NotePersonnelleFormModal from '../components/notes/NotePersonnelleFormModal'
import {
  createNotePersonnelle,
  deleteNotePersonnelle,
  fetchNotesPersonnelles,
  updateNotePersonnelle,
} from '../lib/notesPersonnellesApi'
import {
  cancelNoteLocalReminder,
  scheduleNoteLocalReminder,
  syncNoteLocalReminders,
} from '../lib/noteLocalReminders'
import { maybePromptBackgroundReminders } from '../lib/androidBackgroundReminders'
import { theme } from '../theme/appTheme'
import { NOTE_COULEURS, type NotePersonnelle, type NotePersonnelleInput } from '../types/notePersonnelle'

type Props = {
  accessToken: string
  refreshKey?: number
  drawerOpen?: boolean
  initialNoteId?: number | null
}

type NoteFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none' | 'done'
type RappelKind = 'overdue' | 'today' | 'upcoming' | 'none'

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function rappelKind(iso: string | null): RappelKind {
  if (!iso) return 'none'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'none'
  if (t < Date.now()) return 'overdue'
  if (t <= endOfDay().getTime()) return 'today'
  return 'upcoming'
}

function formatRappelSmart(iso: string | null): { label: string; kind: RappelKind } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const kind = rappelKind(iso)
  const now = Date.now()
  const diffMs = d.getTime() - now
  const absMin = Math.round(Math.abs(diffMs) / 60_000)
  const hhmm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (kind === 'overdue') {
    if (absMin < 60) return { kind, label: `En retard · il y a ${Math.max(1, absMin)} min` }
    if (absMin < 60 * 24) return { kind, label: `En retard · il y a ${Math.floor(absMin / 60)} h` }
    const days = Math.floor(absMin / (60 * 24))
    return { kind, label: days === 1 ? 'En retard · hier' : `En retard · il y a ${days} j` }
  }
  if (kind === 'today') {
    if (diffMs < 60 * 60_000) {
      return { kind, label: `Dans ${Math.max(1, Math.round(diffMs / 60_000))} min · ${hhmm}` }
    }
    return { kind, label: `Aujourd'hui · ${hhmm}` }
  }
  const tomorrow = startOfDay()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = startOfDay()
  dayAfter.setDate(dayAfter.getDate() + 2)
  if (d >= tomorrow && d < dayAfter) return { kind, label: `Demain · ${hhmm}` }
  const dateLabel = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  return { kind, label: `${dateLabel} · ${hhmm}` }
}

function colorHex(c?: string): string | null {
  if (!c) return null
  return NOTE_COULEURS.find(x => x.value === c)?.hex ?? null
}

function uniqueCategories(list: NotePersonnelle[]): string[] {
  const map = new Map<string, string>()
  for (const n of list) {
    const raw = (n.categorie || '').trim().replace(/\s+/g, ' ')
    if (!raw) continue
    const key = raw.toLocaleLowerCase('fr')
    if (!map.has(key)) map.set(key, raw)
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

type NoteRow =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'note'; key: string; note: NotePersonnelle }

function groupNoteRows(list: NotePersonnelle[]): NoteRow[] {
  const buckets = new Map<string, { label: string; notes: NotePersonnelle[] }>()
  for (const n of list) {
    const label = (n.categorie || '').trim().replace(/\s+/g, ' ')
    const key = label ? label.toLocaleLowerCase('fr') : '__none__'
    const bucket = buckets.get(key) ?? { label: label || 'Sans catégorie', notes: [] }
    bucket.notes.push(n)
    buckets.set(key, bucket)
  }
  const groups = [...buckets.entries()].sort((a, b) => {
    if (a[0] === '__none__') return 1
    if (b[0] === '__none__') return -1
    return a[1].label.localeCompare(b[1].label, 'fr')
  })
  const rows: NoteRow[] = []
  for (const [key, group] of groups) {
    rows.push({ kind: 'header', key: `h-${key}`, label: group.label, count: group.notes.length })
    for (const note of group.notes) rows.push({ kind: 'note', key: `n-${note.id}`, note })
  }
  return rows
}

function sortNotesSmart(list: NotePersonnelle[]): NotePersonnelle[] {
  const rank = (n: NotePersonnelle) => {
    if (n.epinglee) return 0
    const k = rappelKind(n.rappelAt)
    if (k === 'overdue') return 1
    if (k === 'today') return 2
    if (k === 'upcoming') return 3
    return 4
  }
  return [...list].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    const ta = a.rappelAt ? new Date(a.rappelAt).getTime() : 0
    const tb = b.rappelAt ? new Date(b.rappelAt).getTime() : 0
    if (ra >= 1 && ra <= 3 && ta !== tb) return ta - tb
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export default function NotesPersonnellesScreen({
  accessToken,
  refreshKey = 0,
  initialNoteId = null,
}: Props) {
  const [notes, setNotes] = useState<NotePersonnelle[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [categorieFilter, setCategorieFilter] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NotePersonnelle | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const load = useCallback(async () => {
    const list = await fetchNotesPersonnelles(accessToken)
    setNotes(list)
    void syncNoteLocalReminders(list).catch(() => undefined)
  }, [accessToken])

  useEffect(() => {
    setLoading(true)
    void load()
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
  }, [load, refreshKey])

  useEffect(() => {
    if (initialNoteId == null || notes.length === 0) return
    const n = notes.find(x => x.id === initialNoteId)
    if (!n) return
    setEditing(n)
    setShowForm(true)
    setFilter('all')
  }, [initialNoteId, notes])

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const counts = useMemo(() => {
    const active = notes.filter(n => !n.faite)
    return {
      all: active.length,
      overdue: active.filter(n => rappelKind(n.rappelAt) === 'overdue').length,
      today: active.filter(n => rappelKind(n.rappelAt) === 'today').length,
      upcoming: active.filter(n => rappelKind(n.rappelAt) === 'upcoming').length,
      none: active.filter(n => rappelKind(n.rappelAt) === 'none').length,
      done: notes.filter(n => n.faite).length,
    }
  }, [notes])

  const baseList = useMemo(() => {
    let list = notes
    if (filter === 'done') list = list.filter(n => n.faite)
    else {
      list = list.filter(n => !n.faite)
      if (filter === 'overdue') list = list.filter(n => rappelKind(n.rappelAt) === 'overdue')
      if (filter === 'today') list = list.filter(n => rappelKind(n.rappelAt) === 'today')
      if (filter === 'upcoming') list = list.filter(n => rappelKind(n.rappelAt) === 'upcoming')
      if (filter === 'none') list = list.filter(n => rappelKind(n.rappelAt) === 'none')
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        n =>
          n.titre.toLowerCase().includes(q) ||
          n.contenu.toLowerCase().includes(q) ||
          (n.categorie || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [notes, search, filter])

  const filtered = useMemo(() => {
    let list = baseList
    if (categorieFilter === '__none__') {
      list = list.filter(n => !(n.categorie || '').trim())
    } else if (categorieFilter) {
      list = list.filter(
        n => (n.categorie || '').trim().toLocaleLowerCase('fr') === categorieFilter
      )
    }
    return filter === 'done'
      ? [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : sortNotesSmart(list)
  }, [baseList, categorieFilter, filter])

  const categories = useMemo(() => uniqueCategories(notes), [notes])
  const categoryChips = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    let none = 0
    for (const n of baseList) {
      const label = (n.categorie || '').trim().replace(/\s+/g, ' ')
      if (!label) {
        none += 1
        continue
      }
      const key = label.toLocaleLowerCase('fr')
      const prev = counts.get(key)
      counts.set(key, { label: prev?.label ?? label, count: (prev?.count ?? 0) + 1 })
    }
    return {
      none,
      items: [...counts.entries()]
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    }
  }, [baseList])
  const rows = useMemo(() => groupNoteRows(filtered), [filtered])

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await load()
    } catch {
      showMsg('Erreur rafraîchissement', true)
    } finally {
      setRefreshing(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (n: NotePersonnelle) => {
    setEditing(n)
    setShowForm(true)
  }

  const save = async (data: NotePersonnelleInput) => {
    if (editing) {
      const updated = await updateNotePersonnelle(accessToken, editing.id, data)
      setNotes(prev => sortNotesSmart(prev.map(n => (n.id === editing.id ? updated : n))))
      void scheduleNoteLocalReminder(updated).catch(() => undefined)
      if (data.rappelAt) void maybePromptBackgroundReminders()
      showMsg('Note modifiée')
    } else {
      const created = await createNotePersonnelle(accessToken, data)
      setNotes(prev => sortNotesSmart([created, ...prev]))
      void scheduleNoteLocalReminder(created).catch(() => undefined)
      if (data.rappelAt) void maybePromptBackgroundReminders()
      showMsg('Note ajoutée')
    }
  }

  const toggleDone = async (n: NotePersonnelle) => {
    try {
      const updated = await updateNotePersonnelle(accessToken, n.id, { faite: !n.faite })
      setNotes(prev => prev.map(x => (x.id === n.id ? updated : x)))
      if (updated.faite) void cancelNoteLocalReminder(updated.id).catch(() => undefined)
      else void scheduleNoteLocalReminder(updated).catch(() => undefined)
      showMsg(n.faite ? 'Note réouverte' : 'Note faite')
    } catch (e) {
      showMsg(e instanceof Error ? e.message : 'Erreur', true)
    }
  }

  const confirmDelete = (n: NotePersonnelle) => {
    Alert.alert('Supprimer', 'Supprimer cette note ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteNotePersonnelle(accessToken, n.id)
              setNotes(prev => prev.filter(x => x.id !== n.id))
              void cancelNoteLocalReminder(n.id).catch(() => undefined)
              showMsg('Note supprimée')
            } catch (e) {
              showMsg(e instanceof Error ? e.message : 'Erreur', true)
            }
          })()
        },
      },
    ])
  }

  const chips: { id: NoteFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Toutes', count: counts.all },
    { id: 'overdue', label: 'Retard', count: counts.overdue },
    { id: 'today', label: "Auj.", count: counts.today },
    { id: 'upcoming', label: 'À venir', count: counts.upcoming },
    { id: 'none', label: 'Sans', count: counts.none },
    { id: 'done', label: 'Faites', count: counts.done },
  ]

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        {(counts.overdue > 0 || counts.today > 0 || counts.upcoming > 0) && filter !== 'done' ? (
          <View style={styles.statsRow}>
            <Pressable
              onPress={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}
              style={[styles.statCard, styles.statOverdue, filter === 'overdue' && styles.statActive]}
            >
              <Text style={[styles.statNum, { color: theme.danger }]}>{counts.overdue}</Text>
              <Text style={styles.statLabel}>Retard</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter(filter === 'today' ? 'all' : 'today')}
              style={[styles.statCard, styles.statToday, filter === 'today' && styles.statActive]}
            >
              <Text style={[styles.statNum, { color: '#0369a1' }]}>{counts.today}</Text>
              <Text style={styles.statLabel}>Aujourd&apos;hui</Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter(filter === 'upcoming' ? 'all' : 'upcoming')}
              style={[styles.statCard, styles.statSoon, filter === 'upcoming' && styles.statActive]}
            >
              <Text style={[styles.statNum, { color: '#7c3aed' }]}>{counts.upcoming}</Text>
              <Text style={styles.statLabel}>À venir</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={theme.textSubtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher…"
            placeholderTextColor={theme.textSubtle}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          horizontal
          data={chips}
          keyExtractor={i => i.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const active = filter === item.id
            const isDanger = item.id === 'overdue'
            const isSky = item.id === 'today'
            return (
              <Pressable
                onPress={() => setFilter(item.id)}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                  active && isDanger && styles.chipDanger,
                  active && isSky && styles.chipSky,
                ]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.label} ({item.count})
                </Text>
              </Pressable>
            )
          }}
        />
        {categoryChips.items.length > 0 ? (
          <FlatList
            horizontal
            data={[
              { key: '__all__', label: 'Toutes', count: null as number | null },
              ...categoryChips.items.map(c => ({ key: c.key, label: c.label, count: c.count as number | null })),
              ...(categoryChips.none > 0
                ? [{ key: '__none__', label: 'Sans catégorie', count: categoryChips.none as number | null }]
                : []),
            ]}
            keyExtractor={i => i.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            renderItem={({ item }) => {
              const active =
                item.key === '__all__' ? categorieFilter == null : categorieFilter === item.key
              return (
                <Pressable
                  onPress={() => setCategorieFilter(item.key === '__all__' || active ? null : item.key)}
                  style={[styles.chip, active && styles.chipCat]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item.count == null ? item.label : `${item.label} (${item.count})`}
                  </Text>
                </Pressable>
              )
            }}
          />
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-text-outline" size={40} color={theme.border} />
              <Text style={styles.emptyTitle}>Aucune note</Text>
              <Text style={styles.muted}>
                {search || filter !== 'all' ? 'Modifiez les filtres.' : 'Ajoutez une note.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return (
                <View style={styles.groupHead}>
                  <Text style={styles.groupTitle}>{item.label}</Text>
                  <Text style={styles.groupCount}>{item.count}</Text>
                </View>
              )
            }
            const note = item.note
            const rappel = formatRappelSmart(note.rappelAt)
            const color = colorHex(note.couleur)
            return (
              <Pressable style={styles.card} onPress={() => openEdit(note)}>
                {color ? <View style={[styles.colorBar, { backgroundColor: color }]} /> : null}
                <View style={styles.cardInner}>
                  <View style={styles.cardTop}>
                    <Text
                      style={[styles.cardTitle, note.faite && styles.doneText]}
                      numberOfLines={2}
                    >
                      {note.titre || 'Sans titre'}
                    </Text>
                    <Pressable onPress={() => confirmDelete(note)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={theme.textSubtle} />
                    </Pressable>
                  </View>
                  {note.contenu ? (
                    <Text
                      style={[styles.cardBody, note.faite && styles.doneText]}
                      numberOfLines={3}
                    >
                      {note.contenu}
                    </Text>
                  ) : null}
                  <View style={styles.cardFooter}>
                    {rappel ? (
                      <View
                        style={[
                          styles.badge,
                          rappel.kind === 'overdue' && styles.badgeDue,
                          rappel.kind === 'today' && styles.badgeToday,
                          rappel.kind === 'upcoming' && styles.badgeSoon,
                        ]}
                      >
                        <Ionicons
                          name={
                            rappel.kind === 'overdue'
                              ? 'warning-outline'
                              : rappel.kind === 'today'
                                ? 'notifications-outline'
                                : 'calendar-outline'
                          }
                          size={12}
                          color={
                            rappel.kind === 'overdue'
                              ? theme.danger
                              : rappel.kind === 'today'
                                ? '#0369a1'
                                : '#7c3aed'
                          }
                        />
                        <Text
                          style={[
                            styles.badgeText,
                            rappel.kind === 'overdue' && styles.badgeTextDue,
                            rappel.kind === 'today' && styles.badgeTextToday,
                            rappel.kind === 'upcoming' && styles.badgeTextSoon,
                          ]}
                          numberOfLines={1}
                        >
                          {rappel.label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.dateText}>
                        {new Date(note.updatedAt).toLocaleDateString('fr-FR')}
                      </Text>
                    )}
                    <Pressable
                      onPress={() => toggleDone(note)}
                      style={[styles.doneBtn, note.faite && styles.doneBtnActive]}
                    >
                      <Ionicons
                        name={note.faite ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={note.faite ? theme.success : theme.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            )
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={openAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <NotePersonnelleFormModal
        visible={showForm}
        note={editing}
        categories={categories}
        onClose={() => setShowForm(false)}
        onSave={save}
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
  toolbar: { paddingTop: 10, paddingHorizontal: 12, gap: 8 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statOverdue: { backgroundColor: theme.dangerSoft, borderColor: '#fecaca' },
  statToday: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
  statSoon: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
  statActive: { borderWidth: 2, borderColor: theme.primary },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', color: theme.textMuted, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: theme.text, padding: 0 },
  chips: { gap: 6, paddingVertical: 2, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  chipActive: { backgroundColor: theme.dark, borderColor: theme.dark },
  chipCat: { backgroundColor: '#f97316', borderColor: '#f97316' },
  chipDanger: { backgroundColor: theme.danger, borderColor: theme.danger },
  chipSky: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 100, gap: 10, paddingTop: 6 },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  groupCount: { fontSize: 11, color: theme.textSubtle },
  center: { alignItems: 'center', paddingTop: 48, gap: 8 },
  muted: { color: theme.textMuted, fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.textSecondary, marginTop: 8 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    flexDirection: 'row',
    ...theme.shadow.sm,
  },
  colorBar: { width: 5 },
  cardInner: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: theme.text },
  cardBody: { marginTop: 8, fontSize: 14, color: theme.textSecondary, lineHeight: 20 },
  doneText: { textDecorationLine: 'line-through', color: theme.textMuted },
  cardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 1,
    maxWidth: '85%',
  },
  badgeDue: { backgroundColor: theme.dangerSoft },
  badgeToday: { backgroundColor: '#e0f2fe' },
  badgeSoon: { backgroundColor: '#ede9fe' },
  badgeText: { fontSize: 11, fontWeight: '600', color: theme.textMuted, flexShrink: 1 },
  badgeTextDue: { color: theme.danger },
  badgeTextToday: { color: '#0369a1' },
  badgeTextSoon: { color: '#7c3aed' },
  dateText: { fontSize: 12, color: theme.textSubtle },
  doneBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.surfaceMuted,
  },
  doneBtnActive: { backgroundColor: theme.successSoft },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.fab,
  },
})
