import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AppToast from '../components/ui/AppToast'
import { fetchCaisse, getSlotForUser, saveCaisse, teamMoneyMemberKey } from '../lib/caisseApi'
import { apiFetch } from '../lib/api'
import { theme } from '../theme/appTheme'
import {
  ALL_PRESENCE_STATUTS,
  PRESENCE_CONFIG,
  type CaisseState,
  type PresenceStatut,
  type TeamMemberSlots,
  type TeamMoneyDayEntry,
} from '../types/caisse'

type User = { id: number; nom_complet: string }

const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateFR(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function emptySlot(): TeamMemberSlots {
  return { inHand: null, taken: null, note: '', presence: null }
}

function dayInPeriod(date: string, year: number, month: number) {
  const [y, m] = date.split('-').map(Number)
  return y === year && m === month
}

type Props = {
  accessToken: string
  canViewFinance: boolean
  drawerOpen?: boolean
}

export default function CaisseScreen({ accessToken, canViewFinance, drawerOpen = false }: Props) {
  const [state, setState] = useState<CaisseState>({ data: [], updatedAt: null })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [selectedDay, setSelectedDay] = useState<TeamMoneyDayEntry | null>(null)
  const [editSlot, setEditSlot] = useState<{
    day: TeamMoneyDayEntry
    userId: number
    name: string
    slot: TeamMemberSlots
  } | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const load = useCallback(async () => {
    setError(null)
    try {
      const [caisseData, usersData] = await Promise.all([
        fetchCaisse(accessToken),
        apiFetch<User[]>('/users', { token: accessToken }),
      ])
      setState(caisseData)
      setUsers(Array.isArray(usersData) ? usersData.filter(u => (u as any).statut === 'actif') : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement')
    }
  }, [accessToken])

  useEffect(() => {
    if (!canViewFinance) return
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load, canViewFinance])

  const prevMonth = () =>
    setPeriod(p => p.month === 1 ? { year: p.year - 1, month: 12 } : { ...p, month: p.month - 1 })
  const nextMonth = () =>
    setPeriod(p => p.month === 12 ? { year: p.year + 1, month: 1 } : { ...p, month: p.month + 1 })

  const daysInPeriod = useMemo(
    () => state.data
      .filter(d => dayInPeriod(d.date, period.year, period.month))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [state, period]
  )

  const stats = useMemo(() => {
    let totalInHand = 0
    let totalTaken = 0
    for (const day of daysInPeriod) {
      for (const slot of Object.values(day.members)) {
        totalInHand += slot.inHand ?? 0
        totalTaken += slot.taken ?? 0
      }
    }
    return { totalInHand, totalTaken, solde: totalInHand - totalTaken }
  }, [daysInPeriod])

  const saveDay = useCallback(
    async (updatedDay: TeamMoneyDayEntry) => {
      const current = stateRef.current
      const exists = current.data.find(d => d.id === updatedDay.id)
      const nextData = exists
        ? current.data.map(d => (d.id === updatedDay.id ? updatedDay : d))
        : [...current.data, updatedDay]
      setSaving(true)
      try {
        const newState = await saveCaisse(accessToken, nextData, current.updatedAt)
        setState(newState)
        setSelectedDay(newState.data.find(d => d.id === updatedDay.id) ?? null)
        showMsg('Sauvegardé')
      } catch (e) {
        showMsg(e instanceof Error ? e.message : 'Erreur sauvegarde', true)
      } finally {
        setSaving(false)
      }
    },
    [accessToken]
  )

  const openEditSlot = (day: TeamMoneyDayEntry, userId: number, name: string) => {
    const raw = getSlotForUser(day.members, userId)
    const slot: TeamMemberSlots = {
      inHand: raw.inHand,
      taken: raw.taken,
      note: raw.note,
      presence: (raw.presence as PresenceStatut | null) ?? null,
    }
    setEditSlot({ day, userId, name, slot })
  }

  const confirmEditSlot = async () => {
    if (!editSlot) return
    const { day, userId, slot } = editSlot
    const key = teamMoneyMemberKey(userId)
    const updatedDay: TeamMoneyDayEntry = {
      ...day,
      members: { ...day.members, [key]: slot },
    }
    setEditSlot(null)
    await saveDay(updatedDay)
  }

  const addDayToday = () => {
    const date = today()
    if (state.data.find(d => d.date === date)) {
      showMsg('Un jour pour aujourd\'hui existe déjà')
      return
    }
    const newDay: TeamMoneyDayEntry = {
      id: Date.now(),
      date,
      members: Object.fromEntries(users.map(u => [teamMoneyMemberKey(u.id), emptySlot()])),
    }
    setSelectedDay(newDay)
  }

  if (!canViewFinance) {
    return (
      <View style={styles.denied}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.textSubtle} />
        <Text style={styles.deniedTitle}>Accès refusé</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.textSubtle} />
        <Text style={styles.emptyTitle}>Impossible de charger</Text>
        <Text style={styles.emptySub}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => void load()}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* En-tête navigation mois */}
      <View style={styles.navBar}>
        <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={theme.primaryDark} />
        </Pressable>
        <Text style={styles.navTitle}>
          {MONTHS[period.month - 1]} {period.year}
        </Text>
        <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={theme.primaryDark} />
        </Pressable>
      </View>

      {/* KPI résumé mois */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{daysInPeriod.length}</Text>
          <Text style={styles.kpiLabel}>jours</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: theme.success }]}>
            {stats.totalInHand.toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.kpiLabel}>en main</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: theme.danger }]}>
            {stats.totalTaken.toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.kpiLabel}>pris</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiTile}>
          <Text style={[styles.kpiValue, { color: stats.solde >= 0 ? theme.primaryDark : theme.danger }]}>
            {stats.solde.toLocaleString('fr-FR')}
          </Text>
          <Text style={styles.kpiLabel}>solde</Text>
        </View>
      </View>

      {/* Bouton ajouter aujourd'hui */}
      <View style={styles.addRow}>
        <Pressable style={styles.addBtn} onPress={addDayToday}>
          <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
          <Text style={styles.addBtnText}>Ajouter aujourd&apos;hui</Text>
        </Pressable>
      </View>

      {/* Liste des jours */}
      <FlatList
        data={daysInPeriod}
        keyExtractor={(d) => String(d.id)}
        contentContainerStyle={styles.listContent}
        scrollEnabled={!drawerOpen && !selectedDay && !editSlot}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={40} color={theme.textSubtle} />
            <Text style={styles.emptyTitle}>Aucun jour enregistré</Text>
            <Text style={styles.emptySub}>Ajoutez le jour actuel pour commencer.</Text>
          </View>
        }
        renderItem={({ item: day }) => {
          const isToday = day.date === today()
          const memberEntries = users.map(u => {
            const raw = getSlotForUser(day.members, u.id)
            const slot: TeamMemberSlots = {
              inHand: raw.inHand,
              taken: raw.taken,
              note: raw.note,
              presence: (raw.presence as PresenceStatut | null) ?? null,
            }
            return { u, slot }
          }).filter(({ slot }) =>
            slot.inHand != null || slot.taken != null || slot.note || slot.presence
          )

          return (
            <Pressable
              style={[styles.dayCard, isToday && styles.dayCardToday]}
              onPress={() => setSelectedDay(day)}
            >
              <View style={styles.dayHeader}>
                <View>
                  <Text style={[styles.dayDate, isToday && styles.dayDateToday]}>
                    {formatDateFR(day.date)}
                    {isToday ? '  ·  Aujourd\'hui' : ''}
                  </Text>
                  <Text style={styles.dayMemberCount}>
                    {memberEntries.length} membre{memberEntries.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
              </View>

              {memberEntries.length > 0 && (
                <View style={styles.dayPreview}>
                  {memberEntries.slice(0, 3).map(({ u, slot }) => (
                    <View key={u.id} style={styles.previewRow}>
                      <Text style={styles.previewName} numberOfLines={1}>{u.nom_complet}</Text>
                      {slot.presence ? (
                        <View style={[styles.presenceBadge, { borderColor: PRESENCE_CONFIG[slot.presence].color }]}>
                          <Text style={[styles.presenceText, { color: PRESENCE_CONFIG[slot.presence].color }]}>
                            {PRESENCE_CONFIG[slot.presence].label}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.previewAmounts}>
                          {slot.inHand != null ? `↓ ${slot.inHand}` : ''}
                          {slot.inHand != null && slot.taken != null ? '  ' : ''}
                          {slot.taken != null ? `↑ ${slot.taken}` : ''}
                        </Text>
                      )}
                    </View>
                  ))}
                  {memberEntries.length > 3 && (
                    <Text style={styles.moreMembersText}>+{memberEntries.length - 3} autres…</Text>
                  )}
                </View>
              )}
            </Pressable>
          )
        }}
      />

      {/* Modal détail jour */}
      <Modal
        visible={!!selectedDay && !editSlot}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedDay(null)}
      >
        {selectedDay && (
          <View style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{formatDateFR(selectedDay.date)}</Text>
              <Pressable onPress={() => setSelectedDay(null)} style={styles.modalClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>

            {saving && (
              <View style={styles.savingBar}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={styles.savingText}>Sauvegarde…</Text>
              </View>
            )}

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {users.map((u) => {
                const raw = getSlotForUser(selectedDay.members, u.id)
                const slot: TeamMemberSlots = {
                  inHand: raw.inHand, taken: raw.taken, note: raw.note,
                  presence: (raw.presence as PresenceStatut | null) ?? null,
                }
                const hasPres = !!slot.presence
                const presColor = slot.presence ? PRESENCE_CONFIG[slot.presence].color : theme.textSubtle
                const presLabel = slot.presence ? PRESENCE_CONFIG[slot.presence].label : null

                return (
                  <Pressable
                    key={u.id}
                    style={styles.memberRow}
                    onPress={() => openEditSlot(selectedDay, u.id, u.nom_complet)}
                  >
                    <View style={styles.memberLeft}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {u.nom_complet.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.memberName}>{u.nom_complet}</Text>
                        {slot.note ? (
                          <Text style={styles.memberNote} numberOfLines={1}>{slot.note}</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.memberRight}>
                      {hasPres ? (
                        <View style={[styles.presenceBadge, { borderColor: presColor }]}>
                          <Text style={[styles.presenceText, { color: presColor }]}>{presLabel}</Text>
                        </View>
                      ) : (
                        <View style={styles.amountsRow}>
                          {slot.inHand != null ? (
                            <View style={styles.amountChip}>
                              <Text style={styles.amountChipLabel}>Main</Text>
                              <Text style={[styles.amountChipVal, { color: theme.success }]}>
                                {slot.inHand.toLocaleString('fr-FR')}
                              </Text>
                            </View>
                          ) : null}
                          {slot.taken != null ? (
                            <View style={styles.amountChip}>
                              <Text style={styles.amountChipLabel}>Pris</Text>
                              <Text style={[styles.amountChipVal, { color: theme.danger }]}>
                                {slot.taken.toLocaleString('fr-FR')}
                              </Text>
                            </View>
                          ) : null}
                          {slot.inHand == null && slot.taken == null ? (
                            <Text style={styles.emptySlotText}>—</Text>
                          ) : null}
                        </View>
                      )}
                      <Ionicons name="pencil-outline" size={16} color={theme.textSubtle} />
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Modal édition slot */}
      <Modal
        visible={!!editSlot}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditSlot(null)}
      >
        {editSlot && (
          <View style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{editSlot.name}</Text>
                <Text style={styles.modalSubtitle}>{formatDateFR(editSlot.day.date)}</Text>
              </View>
              <Pressable onPress={() => setEditSlot(null)} style={styles.modalClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.editScroll} keyboardShouldPersistTaps="handled">
              {/* Présence */}
              <Text style={styles.editLabel}>Présence</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presenceScroll}>
                <Pressable
                  style={[styles.presenceChip, !editSlot.slot.presence && styles.presenceChipActive]}
                  onPress={() => setEditSlot(s => s && { ...s, slot: { ...s.slot, presence: null } })}
                >
                  <Text style={[styles.presenceChipText, !editSlot.slot.presence && styles.presenceChipTextActive]}>
                    Aucune
                  </Text>
                </Pressable>
                {ALL_PRESENCE_STATUTS.map(p => {
                  const active = editSlot.slot.presence === p
                  return (
                    <Pressable
                      key={p}
                      style={[
                        styles.presenceChip,
                        active && { backgroundColor: PRESENCE_CONFIG[p].color, borderColor: PRESENCE_CONFIG[p].color },
                      ]}
                      onPress={() => setEditSlot(s => s && { ...s, slot: { ...s.slot, presence: p as PresenceStatut } })}
                    >
                      <Text style={[styles.presenceChipText, active && { color: '#fff' }]}>
                        {PRESENCE_CONFIG[p].label}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* En main */}
              <Text style={styles.editLabel}>En main (DT)</Text>
              <TextInput
                style={styles.editInput}
                value={editSlot.slot.inHand != null ? String(editSlot.slot.inHand) : ''}
                onChangeText={v => {
                  const n = v === '' ? null : parseFloat(v.replace(',', '.'))
                  setEditSlot(s => s && { ...s, slot: { ...s.slot, inHand: n != null && !isNaN(n) ? n : null } })
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.textSubtle}
              />

              {/* Pris */}
              <Text style={styles.editLabel}>Pris (DT)</Text>
              <TextInput
                style={styles.editInput}
                value={editSlot.slot.taken != null ? String(editSlot.slot.taken) : ''}
                onChangeText={v => {
                  const n = v === '' ? null : parseFloat(v.replace(',', '.'))
                  setEditSlot(s => s && { ...s, slot: { ...s.slot, taken: n != null && !isNaN(n) ? n : null } })
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.textSubtle}
              />

              {/* Note */}
              <Text style={styles.editLabel}>Note</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editSlot.slot.note}
                onChangeText={v => setEditSlot(s => s && { ...s, slot: { ...s.slot, note: v } })}
                multiline
                placeholder="Optionnel…"
                placeholderTextColor={theme.textSubtle}
              />
            </ScrollView>

            <View style={styles.editFooter}>
              <Pressable
                style={[styles.editBtn, styles.editBtnCancel]}
                onPress={() => setEditSlot(null)}
              >
                <Text style={styles.editBtnCancelText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.editBtn, styles.editBtnSave]}
                onPress={() => void confirmEditSlot()}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.editBtnSaveText}>Enregistrer</Text>
                }
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderLight,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.primarySoft,
  },
  navTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderLight,
    marginBottom: 8,
  },
  kpiTile: { flex: 1, alignItems: 'center', gap: 2 },
  kpiDivider: { width: StyleSheet.hairlineWidth, backgroundColor: theme.borderLight },
  kpiValue: { fontSize: 15, fontWeight: '700', color: theme.primaryDark },
  kpiLabel: { fontSize: 10, color: theme.textMuted, textTransform: 'uppercase' },
  addRow: { paddingHorizontal: 16, paddingBottom: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#fed7aa',
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: theme.primaryDark },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  dayCard: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  dayCardToday: { borderColor: theme.primary, borderWidth: 1.5 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayDate: { fontSize: 14, fontWeight: '600', color: theme.text, textTransform: 'capitalize' },
  dayDateToday: { color: theme.primary },
  dayMemberCount: { fontSize: 12, color: theme.textSubtle, marginTop: 2 },
  dayPreview: { marginTop: 10, gap: 6 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewName: { fontSize: 13, color: theme.textSecondary, flex: 1, marginRight: 8 },
  previewAmounts: { fontSize: 12, color: theme.textMuted },
  moreMembersText: { fontSize: 11, color: theme.textSubtle, marginTop: 2 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  emptySub: { fontSize: 14, color: theme.textSubtle, textAlign: 'center', lineHeight: 20 },
  retryBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: theme.primary, borderRadius: 10, marginTop: 8 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  deniedTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  // Modal
  modalRoot: { flex: 1, backgroundColor: theme.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: theme.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.borderLight,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  modalSubtitle: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.surfaceMuted, alignItems: 'center', justifyContent: 'center',
  },
  savingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 8, backgroundColor: theme.primarySoft,
  },
  savingText: { fontSize: 13, color: theme.primaryDark },
  modalScroll: { padding: 16, gap: 4 },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  memberAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: theme.primaryDark },
  memberName: { fontSize: 14, fontWeight: '600', color: theme.text },
  memberNote: { fontSize: 12, color: theme.textSubtle, marginTop: 2 },
  memberRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  amountChip: { alignItems: 'center' },
  amountChipLabel: { fontSize: 10, color: theme.textSubtle },
  amountChipVal: { fontSize: 14, fontWeight: '700' },
  emptySlotText: { fontSize: 14, color: theme.border },
  presenceBadge: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  presenceText: { fontSize: 10, fontWeight: '600' },
  // Edit slot
  editScroll: { padding: 18, gap: 4 },
  editLabel: { fontSize: 12, fontWeight: '600', color: theme.textSubtle, marginTop: 12 },
  editInput: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: theme.text,
    backgroundColor: theme.surfaceMuted, marginTop: 6,
  },
  editTextArea: { minHeight: 72, textAlignVertical: 'top' },
  presenceScroll: { gap: 8, paddingVertical: 4, marginTop: 6 },
  presenceChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceMuted,
  },
  presenceChipActive: { backgroundColor: theme.primarySoft, borderColor: '#fed7aa' },
  presenceChipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  presenceChipTextActive: { color: theme.primaryDark },
  editFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.borderLight,
  },
  editBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  editBtnCancel: { backgroundColor: theme.surfaceMuted },
  editBtnSave: { backgroundColor: theme.primary },
  editBtnCancelText: { fontWeight: '600', color: theme.textSecondary, fontSize: 15 },
  editBtnSaveText: { fontWeight: '600', color: '#fff', fontSize: 15 },
})
