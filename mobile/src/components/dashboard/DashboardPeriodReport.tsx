import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { fetchDashboardToday } from '../../lib/dashboardApi'
import type { MenuRouteId } from '../../navigation/menuConfig'
import { theme } from '../../theme/appTheme'
import type { DashboardTodayPeriod, DashboardTodayResponse } from '../../types/dashboard'
import type { Permissions } from '../../types/permissions'

type IonIcon = ComponentProps<typeof Ionicons>['name']

const TABS: { id: DashboardTodayPeriod; label: string }[] = [
  { id: 'day', label: 'Aujourd’hui' },
  { id: 'week', label: 'Semaine' },
  { id: 'month', label: 'Mois' },
]

const MOIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

function formatDt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(Math.round(n * 100) / 100)
}

function formatRangeLabel(
  period: DashboardTodayPeriod,
  data: DashboardTodayResponse | null,
  month: number,
  year: number
) {
  if (!data) return '—'
  if (period === 'day') {
    return new Date(`${data.date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }
  if (period === 'week') {
    const a = new Date(`${data.start}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
    const b = new Date(`${data.end}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
    return `${a} → ${b}`
  }
  return `${MOIS[month - 1]} ${year}`
}

type Props = {
  accessToken: string
  permissions: Permissions
  onNavigate: (route: MenuRouteId) => void
  /** Incrémenté par le parent (pull-to-refresh) pour forcer un reload */
  refreshKey?: number
}

export default function DashboardPeriodReport({
  accessToken,
  permissions,
  onNavigate,
  refreshKey = 0,
}: Props) {
  const now = useMemo(() => new Date(), [])
  const [period, setPeriod] = useState<DashboardTodayPeriod>('day')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<DashboardTodayResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const canGoNext =
    year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
  const canGoPrev = year > now.getFullYear() - 2 || (year === now.getFullYear() - 2 && month > 1)

  const shiftMonth = (delta: number) => {
    let m = month + delta
    let y = year
    if (m < 1) {
      m = 12
      y -= 1
    } else if (m > 12) {
      m = 1
      y += 1
    }
    if (y > now.getFullYear()) return
    if (y === now.getFullYear() && m > now.getMonth() + 1) return
    if (y < now.getFullYear() - 2) return
    setYear(y)
    setMonth(m)
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchDashboardToday(accessToken, {
        period,
        year: period === 'month' ? year : undefined,
        month: period === 'month' ? month : undefined,
      })
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, period, year, month])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    const id = setInterval(() => void load(), 60_000)
    return () => clearInterval(id)
  }, [load])

  const hintRdv =
    period === 'day' ? "aujourd'hui" : period === 'week' ? 'cette semaine' : 'ce mois'
  const hintSav = period === 'day' ? 'ouverts' : 'ouverts · période'
  const hintDevis = period === 'day' ? 'en attente' : 'en attente · période'
  const hintClients =
    period === 'day' ? 'nouveaux' : period === 'week' ? 'nouveaux · semaine' : 'nouveaux · mois'

  const tiles = useMemo(() => {
    const i = data?.items
    const list: {
      key: string
      label: string
      value: number | null
      hint: string
      icon: IonIcon
      route: MenuRouteId
      color: string
      bg: string
      show: boolean
      alert: boolean
    }[] = [
      {
        key: 'rdv',
        label: 'RDV',
        value: i?.rdv.count ?? null,
        hint: hintRdv,
        icon: 'calendar-outline',
        route: 'calendar',
        color: '#4f46e5',
        bg: '#eef2ff',
        show: true,
        alert: (i?.rdv.count ?? 0) > 0,
      },
      {
        key: 'reclamations',
        label: 'SAV',
        value: i?.reclamations.count ?? null,
        hint: hintSav,
        icon: 'alert-circle-outline',
        route: 'reclamation',
        color: '#e11d48',
        bg: '#fff1f2',
        show: true,
        alert: (i?.reclamations.count ?? 0) > 0,
      },
      {
        key: 'dettes',
        label: 'Dettes',
        value: i?.dettes.count ?? null,
        hint: i?.dettes.total ? `${formatDt(i.dettes.total)} DT` : 'clients',
        icon: 'card-outline',
        route: 'clients_dettes',
        color: '#b45309',
        bg: '#fffbeb',
        show: Boolean(permissions.canViewFinance),
        alert: (i?.dettes.count ?? 0) > 0,
      },
      {
        key: 'devis',
        label: 'Devis',
        value: i?.devis.count ?? null,
        hint: hintDevis,
        icon: 'document-text-outline',
        route: 'devis',
        color: '#0e7490',
        bg: '#ecfeff',
        show: Boolean(permissions.canViewFinance),
        alert: (i?.devis.count ?? 0) > 0,
      },
      {
        key: 'clients',
        label: 'Clients',
        value: i?.clients.count ?? null,
        hint: hintClients,
        icon: 'people-outline',
        route: 'clients',
        color: '#047857',
        bg: '#ecfdf5',
        show: true,
        alert: (i?.clients.count ?? 0) > 0,
      },
    ]
    return list.filter((t) => t.show)
  }, [data, permissions.canViewFinance, hintRdv, hintSav, hintDevis, hintClients])

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const active = period === tab.id
            return (
              <Pressable
                key={tab.id}
                onPress={() => setPeriod(tab.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            )
          })}
        </View>
        <View style={styles.rangeRow}>
          {period === 'month' ? (
            <>
              <Pressable
                onPress={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={14} color={theme.textSubtle} />
              </Pressable>
              <Text style={styles.rangeLabel}>{formatRangeLabel(period, data, month, year)}</Text>
              <Pressable
                onPress={() => shiftMonth(1)}
                disabled={!canGoNext}
                style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={14} color={theme.textSubtle} />
              </Pressable>
            </>
          ) : (
            <Text style={styles.rangeHint}>{formatRangeLabel(period, data, month, year)}</Text>
          )}
          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.spinner} />
          ) : null}
        </View>
      </View>

      <View style={styles.grid}>
        {tiles.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => onNavigate(t.route)}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
          >
            <View style={[styles.tileIcon, { backgroundColor: t.bg }]}>
              <Ionicons name={t.icon} size={15} color={t.color} />
            </View>
            <View style={styles.tileBody}>
              <View style={styles.tileValueRow}>
                <Text style={styles.tileValue}>{t.value == null ? '—' : t.value}</Text>
                {t.alert ? <View style={styles.alertDot} /> : null}
              </View>
              <Text style={styles.tileLabel}>{t.label}</Text>
              <Text style={styles.tileHint} numberOfLines={1}>
                {t.hint}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  head: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    gap: 10,
  },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    padding: 3,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: { fontSize: 12, fontWeight: '500', color: theme.textMuted },
  tabTextActive: { color: '#030712', fontWeight: '600' },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    minHeight: 28,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
    minWidth: 100,
    textAlign: 'center',
  },
  rangeHint: { fontSize: 12, fontWeight: '500', color: theme.textSubtle },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  spinner: { marginLeft: 4 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '50%',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBody: { flex: 1, minWidth: 0 },
  tileValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileValue: { fontSize: 22, fontWeight: '700', color: '#030712', letterSpacing: -0.3 },
  alertDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  tileLabel: { fontSize: 12, fontWeight: '500', color: theme.textSecondary, marginTop: 4 },
  tileHint: { fontSize: 10, color: theme.textSubtle, marginTop: 1 },
  pressed: { opacity: 0.85 },
})
