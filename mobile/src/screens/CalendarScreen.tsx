import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import CalendarAssignmentCard from '../components/calendar/CalendarAssignmentCard'
import CalendarAssignmentDetailModal from '../components/calendar/CalendarAssignmentDetailModal'
import CalendarAssignmentFormModal from '../components/calendar/CalendarAssignmentFormModal'
import CalendarMonthGrid from '../components/calendar/CalendarMonthGrid'
import CalendarSkeleton from '../components/calendar/CalendarSkeleton'
import AppToast from '../components/ui/AppToast'
import {
  deleteCalendarAssignment,
  fetchCalendarAssignments,
} from '../lib/calendarApi'
import {
  formatDateFr,
  getCalendarGrid,
  MONTH_NAMES,
  relativeDayLabel,
  todayDateStr,
} from '../lib/calendarGrid'
import { fetchVehicules } from '../lib/api'
import { fetchUsers, type AppUser } from '../lib/vehiculeApi'
import { mapRole } from '../types/permissions'
import { theme } from '../theme/appTheme'
import type { CalendarAssignment } from '../types/calendarAssignment'
import type { Vehicule } from '../types/vehicule'

type Props = {
  accessToken: string
  userRole: string
  drawerOpen?: boolean
}

export default function CalendarScreen({
  accessToken,
  userRole,
  drawerOpen = false,
}: Props) {
  const canManage = mapRole(userRole) !== 'technicien'
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr())
  const [assignments, setAssignments] = useState<CalendarAssignment[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [detailAssignment, setDetailAssignment] = useState<CalendarAssignment | null>(null)
  const [editing, setEditing] = useState<CalendarAssignment | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const memberNames = useMemo(
    () =>
      users
        .filter(
          (u) =>
            u.statut === 'actif' && (u.role === 'technicien' || u.role === 'responsable')
        )
        .map((u) => u.nom_complet.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'fr')),
    [users]
  )

  const grid = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const title = `${MONTH_NAMES[viewMonth - 1]} ${viewYear}`

  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, CalendarAssignment[]>()
    assignments.forEach((a) => {
      const list = map.get(a.date) ?? []
      list.push(a)
      map.set(a.date, list)
    })
    return map
  }, [assignments])

  const countByDate = useMemo(() => {
    const map = new Map<string, number>()
    assignmentsByDate.forEach((list, date) => map.set(date, list.length))
    return map
  }, [assignmentsByDate])

  const dayAssignments = useMemo(
    () => assignmentsByDate.get(selectedDate) ?? [],
    [assignmentsByDate, selectedDate]
  )

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const load = useCallback(async () => {
    try {
      const [list, userList, vehRes] = await Promise.all([
        fetchCalendarAssignments(accessToken, { year: viewYear, month: viewMonth }),
        fetchUsers(accessToken).catch(() => [] as AppUser[]),
        fetchVehicules(accessToken, { page: 1, limit: 300 }).catch(() => ({
          data: [] as Vehicule[],
          total: 0,
          page: 1,
          limit: 300,
        })),
      ])
      setAssignments(list)
      setUsers(userList)
      setVehicules(vehRes.data ?? [])
    } catch (e) {
      setAssignments([])
      showMsg(e instanceof Error ? e.message : 'Erreur chargement', true)
    }
  }, [accessToken, viewYear, viewMonth])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const goPrev = () => {
    if (viewMonth === 1) {
      setViewMonth(12)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }

  const goNext = () => {
    if (viewMonth === 12) {
      setViewMonth(1)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  const goToday = () => {
    const t = new Date()
    setViewYear(t.getFullYear())
    setViewMonth(t.getMonth() + 1)
    setSelectedDate(todayDateStr())
  }

  const openAdd = () => {
    setEditing(null)
    setShowForm(true)
  }

  const openDetail = (a: CalendarAssignment) => {
    setDetailAssignment(a)
  }

  const openEdit = (a: CalendarAssignment) => {
    setDetailAssignment(null)
    setEditing(a)
    setSelectedDate(a.date)
    setShowForm(true)
  }

  const confirmDelete = (a: CalendarAssignment) => {
    Alert.alert('Supprimer', `Supprimer l'affectation de ${a.memberName} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          void deleteCalendarAssignment(accessToken, a.id)
            .then(() => {
              setDetailAssignment(null)
              showMsg('Affectation supprimée')
              return load()
            })
            .catch((e) =>
              showMsg(e instanceof Error ? e.message : 'Erreur suppression', true)
            )
        },
      },
    ])
  }

  const selectedDayRel = relativeDayLabel(selectedDate)

  const monthTotal = assignments.filter((a) => {
    const [y, m] = a.date.split('-').map(Number)
    return y === viewYear && m === viewMonth
  }).length

  return (
    <View style={styles.root}>
      <ScrollView
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
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="calendar" size={22} color="#fff" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Calendrier</Text>
              <Text style={styles.heroSub}>
                {canManage
                  ? 'Affectations équipe & véhicules'
                  : 'Vos affectations (lecture seule)'}
              </Text>
            </View>
            {monthTotal > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{monthTotal}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.monthNav}>
            <Pressable style={styles.navBtn} onPress={goPrev}>
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </Pressable>
            <Pressable style={styles.monthCenter} onPress={goToday}>
              <Text style={styles.monthTitle}>{title}</Text>
              <Text style={styles.todayLink}>Aujourd&apos;hui</Text>
            </Pressable>
            <Pressable style={styles.navBtn} onPress={goNext}>
              <Ionicons name="chevron-forward" size={22} color={theme.text} />
            </Pressable>
          </View>
        </View>

        {loading ? (
          <CalendarSkeleton />
        ) : (
          <>
            <CalendarMonthGrid
              grid={grid}
              selectedDate={selectedDate}
              countByDate={countByDate}
              onSelectDate={setSelectedDate}
            />

            <View style={styles.dayPanel}>
              {selectedDayRel ? (
                <View style={styles.relBadge}>
                  <Ionicons name="today-outline" size={14} color={theme.primaryDark} />
                  <Text style={styles.relBadgeText}>{selectedDayRel}</Text>
                </View>
              ) : null}
              <View style={styles.dayHeader}>
                <View>
                  <Text style={styles.dayTitle}>{formatDateFr(selectedDate)}</Text>
                  <Text style={styles.daySub}>
                    {dayAssignments.length} affectation{dayAssignments.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                {canManage ? (
                  <Pressable style={styles.addBtn} onPress={openAdd}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Affecter</Text>
                  </Pressable>
                ) : null}
              </View>

              {dayAssignments.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Ionicons name="calendar-outline" size={36} color={theme.textSubtle} />
                  <Text style={styles.emptyText}>Aucune affectation ce jour</Text>
                  {canManage ? (
                    <Pressable style={styles.emptyCta} onPress={openAdd}>
                      <Text style={styles.emptyCtaText}>Planifier un travail</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                dayAssignments.map((a) => (
                  <CalendarAssignmentCard
                    key={a.id}
                    assignment={a}
                    onPress={() => openDetail(a)}
                  />
                ))
              )}
            </View>
          </>
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {canManage && !showForm && !detailAssignment && !drawerOpen ? (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={openAdd}
          accessibilityLabel="Nouvelle affectation"
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      ) : null}

      <CalendarAssignmentDetailModal
        visible={!!detailAssignment}
        assignment={detailAssignment}
        canManage={canManage}
        onClose={() => setDetailAssignment(null)}
        onEdit={() => detailAssignment && openEdit(detailAssignment)}
        onDelete={() => detailAssignment && confirmDelete(detailAssignment)}
      />

      <CalendarAssignmentFormModal
        visible={showForm}
        editing={editing}
        initialDate={selectedDate}
        memberNames={memberNames}
        users={users}
        vehicules={vehicules}
        accessToken={accessToken}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={() => {
          showMsg(editing ? 'Affectation mise à jour' : 'Affectation(s) ajoutée(s)')
          void load()
        }}
      />

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 12,
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
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  monthTitle: { fontSize: 15, fontWeight: '800', color: theme.text },
  todayLink: { fontSize: 11, fontWeight: '600', color: theme.primary, marginTop: 2 },
  dayPanel: { marginTop: 14 },
  relBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  relBadgeText: { fontSize: 13, fontWeight: '800', color: theme.primaryDark },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  dayTitle: { fontSize: 17, fontWeight: '800', color: theme.text },
  daySub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    ...theme.shadow.primaryBtn,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyDay: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText: { fontSize: 14, color: theme.textMuted },
  emptyCta: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  emptyCtaText: { fontWeight: '700', color: theme.primaryDark },
  footerSpacer: { height: 88 },
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
    zIndex: 10,
    ...theme.shadow.fab,
  },
  fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.95 },
})
