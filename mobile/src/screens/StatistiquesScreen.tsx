import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import MiniBarChart, { MiniBarChartSummary } from '../components/stats/MiniBarChart'
import StatsSkeleton from '../components/stats/StatsSkeleton'
import AppToast from '../components/ui/AppToast'
import { formatMontant } from '../lib/formatMoney'
import { fetchStatsDashboard, fetchStatsTrends } from '../lib/statsApi'
import { isInStatsMonth, MOIS_FR, monthYearLabel, yearOptions } from '../lib/statsHelpers'
import { MENU_STRUCTURE, type MenuRouteId } from '../navigation/menuConfig'
import { theme } from '../theme/appTheme'
import type { GlobalStatCounts, GlobalStatItem, StatsDashboardData, StatsTrendGroupBy } from '../types/stats'

type IonIcon = ComponentProps<typeof Ionicons>['name']

const IMPLEMENTED_ROUTES = new Set<MenuRouteId>(
  MENU_STRUCTURE.flatMap((c) => c.items.filter((i) => i.implemented).map((i) => i.id))
)

const GLOBAL_ITEMS: GlobalStatItem[] = [
  { key: 'vehicules', label: 'Véhicules', icon: 'car-outline', color: '#1d4ed8', bg: '#eff6ff', route: 'vehicules' },
  { key: 'clients', label: 'Clients', icon: 'person-circle-outline', color: '#047857', bg: '#ecfdf5', route: 'clients' },
  { key: 'equipe', label: 'Membres équipe', icon: 'people-outline', color: '#6d28d9', bg: '#f5f3ff', route: 'equipe_membres' },
  { key: 'caisseJours', label: 'Jours caisse', icon: 'bar-chart-outline', color: '#b45309', bg: '#fffbeb', route: 'caisse' },
  { key: 'calendar', label: 'Calendrier', icon: 'calendar-outline', color: '#4338ca', bg: '#eef2ff', route: 'calendar' },
  { key: 'fournisseurs', label: 'Fournisseurs', icon: 'storefront-outline', color: '#c2410c', bg: '#fff7ed', route: 'fournisseurs' },
  {
    key: 'transactionsFournisseurs',
    label: 'Trans. fournisseurs',
    icon: 'receipt-outline',
    color: '#0f766e',
    bg: '#ecfdf5',
    route: 'fournisseurs_transactions',
  },
  { key: 'reclamations', label: 'Réclamations', icon: 'alert-circle-outline', color: '#dc2626', bg: '#fef2f2', route: 'reclamation' },
  { key: 'devis', label: 'Demandes devis', icon: 'clipboard-outline', color: '#ea580c', bg: '#fff7ed', route: 'devis' },
  { key: 'contacts', label: 'Contacts', icon: 'call-outline', color: '#0284c7', bg: '#f0f9ff', route: 'contacts' },
  { key: 'clientsDettes', label: 'Clients dettes', icon: 'card-outline', color: '#be123c', bg: '#fff1f2', route: 'clients_dettes' },
  { key: 'stockTotal', label: 'Stock', icon: 'cube-outline', color: '#65a30d', bg: '#ecfccb', route: 'stock' },
  { key: 'outilsAhmed', label: 'Op. Ahmed', icon: 'construct-outline', color: '#4b5563', bg: '#f3f4f6', route: 'outils_ahmed' },
]

type Props = {
  accessToken: string
  canManageUsers: boolean
  drawerOpen?: boolean
  onNavigate: (route: MenuRouteId) => void
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string
  value: string
  sub?: string
  tone: 'green' | 'red' | 'teal' | 'amber' | 'neutral'
  icon: IonIcon
}) {
  const tones = {
    green: { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', icon: '#059669' },
    red: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: '#dc2626' },
    teal: { bg: '#f0fdfa', border: '#99f6e4', text: '#0f766e', icon: '#0d9488' },
    amber: { bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: '#d97706' },
    neutral: { bg: theme.bg, border: theme.border, text: theme.text, icon: theme.textMuted },
  }[tone]

  return (
    <View style={[styles.kpiCard, { backgroundColor: tones.bg, borderColor: tones.border }]}>
      <View style={styles.kpiTop}>
        <Ionicons name={icon} size={16} color={tones.icon} />
        <Text style={[styles.kpiLabel, { color: tones.text }]}>{label}</Text>
      </View>
      <Text style={[styles.kpiValue, { color: tones.text }]}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  )
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
  headerRight,
}: {
  title: string
  subtitle?: string
  icon: IonIcon
  children: ReactNode
  headerRight?: React.ReactNode
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name={icon} size={20} color={theme.primary} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

export default function StatistiquesScreen({
  accessToken,
  canManageUsers,
  drawerOpen = false,
  onNavigate,
}: Props) {
  const now = new Date()
  const [statsMonth, setStatsMonth] = useState(now.getMonth() + 1)
  const [statsYear, setStatsYear] = useState(now.getFullYear())
  const [trendGroupBy, setTrendGroupBy] = useState<StatsTrendGroupBy>('month')
  const [dashboard, setDashboard] = useState<StatsDashboardData | null>(null)
  const [trendData, setTrendData] = useState<Awaited<ReturnType<typeof fetchStatsTrends>>>([])
  const [loading, setLoading] = useState(true)
  const [trendLoading, setTrendLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    const data = await fetchStatsDashboard(accessToken, statsMonth, statsYear)
    setDashboard(data)
  }, [accessToken, statsMonth, statsYear])

  const loadTrends = useCallback(async () => {
    setTrendLoading(true)
    try {
      const data = await fetchStatsTrends(accessToken, { year: statsYear, groupBy: trendGroupBy })
      setTrendData(data)
    } catch {
      setTrendData([])
    } finally {
      setTrendLoading(false)
    }
  }, [accessToken, statsYear, trendGroupBy])

  useEffect(() => {
    if (!canManageUsers) return
    setLoading(true)
    void Promise.all([loadDashboard(), loadTrends()]).finally(() => setLoading(false))
  }, [canManageUsers, loadDashboard, loadTrends])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([loadDashboard(), loadTrends()])
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setRefreshing(false)
    }
  }, [loadDashboard, loadTrends])

  const trendWithBilan = useMemo(
    () =>
      trendData.map((p) => ({
        ...p,
        bilan: (p.encaissements ?? 0) - (p.achats ?? 0),
      })),
    [trendData]
  )

  const advanced = useMemo(() => {
    if (!dashboard) return null
    const { moneyIns, moneyOuts, transactions, clientsDettes, vehiculeStats } = dashboard
    const ins = moneyIns.filter((m) => isInStatsMonth(m.date, statsYear, statsMonth))
    const outs = moneyOuts.filter((m) => isInStatsMonth(m.date, statsYear, statsMonth))
    const trans = transactions.filter((t) => isInStatsMonth(t.date, statsYear, statsMonth))

    const totalRevenus = ins.reduce((s, m) => s + (m.amount ?? 0), 0)
    const totalDepenses = outs.reduce((s, m) => s + (m.amount ?? 0), 0)
    const solde = totalRevenus - totalDepenses
    const achats = trans.filter((t) => t.type === 'achat').reduce((s, t) => s + (t.montant ?? 0), 0)
    const revenusF = trans.filter((t) => t.type === 'revenue').reduce((s, t) => s + (t.montant ?? 0), 0)
    const paiements = trans.filter((t) => t.type === 'paiement').reduce((s, t) => s + (t.montant ?? 0), 0)
    const bilan = totalRevenus - achats
    const totalDettes = clientsDettes.reduce((s, c) => s + (c.reste ?? 0), 0)
    const topDettes = [...clientsDettes].sort((a, b) => (b.reste ?? 0) - (a.reste ?? 0)).slice(0, 5)

    return {
      totalRevenus,
      totalDepenses,
      solde,
      achats,
      revenusF,
      paiements,
      bilan,
      totalDettes,
      topDettes,
      insCount: ins.length,
      outsCount: outs.length,
      termines: vehiculeStats.terminesCeMois,
      enCours: vehiculeStats.enCours,
    }
  }, [dashboard, statsMonth, statsYear])

  const years = yearOptions(statsYear)
  const moisLabel = monthYearLabel(statsMonth, statsYear)
  const fmt = (n: number) => `${formatMontant(n)} DT`

  if (!canManageUsers) {
    return (
      <View style={styles.denied}>
        <View style={styles.deniedRing}>
          <Ionicons name="lock-closed-outline" size={36} color={theme.primary} />
        </View>
        <Text style={styles.deniedTitle}>Accès refusé</Text>
        <Text style={styles.deniedSub}>Seuls les administrateurs peuvent consulter les statistiques.</Text>
      </View>
    )
  }

  if (loading && !dashboard) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <StatsSkeleton />
        </ScrollView>
      </View>
    )
  }

  const counts = dashboard?.counts ?? ({} as GlobalStatCounts)

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={theme.primary} />
        }
      >
        <LinearGradient colors={['#1e1b4b', '#312e81']} style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={26} color="#fff" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Statistiques</Text>
            <Text style={styles.heroSub}>Vue d&apos;ensemble EL MECANO</Text>
          </View>
        </LinearGradient>

        <SectionCard
          title="Statistiques globales"
          subtitle="Toutes les données en un coup d'œil"
          icon="grid-outline"
        >
          <View style={styles.globalGrid}>
            {GLOBAL_ITEMS.map((item) => {
              const value = counts[item.key] ?? 0
              const canNav = item.route && IMPLEMENTED_ROUTES.has(item.route)
              return (
                <Pressable
                  key={item.key}
                  onPress={() => {
                    if (canNav && item.route) onNavigate(item.route)
                  }}
                  style={({ pressed }) => [
                    styles.globalCell,
                    pressed && canNav && styles.globalCellPressed,
                  ]}
                  disabled={!canNav}
                >
                  <View style={[styles.globalIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as IonIcon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.globalValue}>{value}</Text>
                  <Text style={styles.globalLabel} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {canNav ? (
                    <Ionicons name="chevron-forward" size={14} color={theme.textSubtle} style={styles.globalChevron} />
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        </SectionCard>

        <SectionCard
          title={`Courbes ${statsYear}`}
          subtitle="Évolution CA, encaissements, véhicules et fournisseurs"
          icon="trending-up-outline"
          headerRight={
            <View style={styles.pickerRow}>
              <Pressable
                onPress={() => setTrendGroupBy((g) => (g === 'month' ? 'quarter' : 'month'))}
                style={styles.pickerChip}
              >
                <Text style={styles.pickerChipText}>{trendGroupBy === 'month' ? 'Mois' : 'Trim.'}</Text>
              </Pressable>
            </View>
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => setStatsYear(y)}
                style={[styles.yearChip, statsYear === y && styles.yearChipOn]}
              >
                <Text style={[styles.yearChipText, statsYear === y && styles.yearChipTextOn]}>{y}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {trendLoading ? (
            <Text style={styles.loadingHint}>Chargement des courbes…</Text>
          ) : null}

          <Text style={styles.chartTitle}>CA facturé · Encaissements · Dépenses · Bilan</Text>
          <MiniBarChartSummary
            data={trendWithBilan}
            formatValue={fmt}
            series={[
              { key: 'caFacture', label: 'CA facturé', color: '#4f46e5' },
              { key: 'encaissements', label: 'Encaissements', color: '#10b981' },
              { key: 'depenses', label: 'Dépenses', color: '#ef4444' },
              { key: 'bilan', label: 'Bilan', color: '#0f766e' },
            ]}
          />
          <MiniBarChart
            data={trendWithBilan}
            formatValue={fmt}
            series={[
              { key: 'caFacture', label: 'CA facturé', color: '#4f46e5' },
              { key: 'encaissements', label: 'Encaissements', color: '#10b981' },
              { key: 'depenses', label: 'Dépenses', color: '#ef4444' },
              { key: 'bilan', label: 'Bilan', color: '#0f766e' },
            ]}
          />

          <Text style={[styles.chartTitle, styles.chartTitleSpaced]}>Véhicules traités · Réclamations</Text>
          <MiniBarChart
            data={trendData}
            series={[
              { key: 'vehiculesTraites', label: 'Véhicules', color: '#3b82f6' },
              { key: 'reclamations', label: 'Réclamations', color: '#f97316' },
            ]}
          />

          <Text style={[styles.chartTitle, styles.chartTitleSpaced]}>Achats · Paiements fournisseurs</Text>
          <MiniBarChart
            data={trendData}
            formatValue={fmt}
            series={[
              { key: 'achats', label: 'Achats', color: '#0ea5e9' },
              { key: 'paiementsFournisseurs', label: 'Paiements', color: '#f59e0b' },
            ]}
          />
          <Text style={styles.chartFoot}>Données PostgreSQL : factures, achats, véhicules, réclamations.</Text>
        </SectionCard>

        <SectionCard
          title="Statistiques avancées"
          subtitle={`Revenus, dépenses et dettes — ${moisLabel}`}
          icon="analytics-outline"
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthRow}>
            {MOIS_FR.map((label, idx) => {
              const m = idx + 1
              const active = statsMonth === m
              return (
                <Pressable
                  key={label}
                  onPress={() => setStatsMonth(m)}
                  style={[styles.monthChip, active && styles.monthChipOn]}
                >
                  <Text style={[styles.monthChipText, active && styles.monthChipTextOn]}>
                    {label.slice(0, 3)}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>

          {advanced ? (
            <>
              <Text style={styles.blockLabel}>Trésorerie</Text>
              <View style={styles.kpiGrid}>
                <KpiCard
                  label="Encaissements"
                  value={fmt(advanced.totalRevenus)}
                  sub={`${advanced.insCount} entrée(s)`}
                  tone="green"
                  icon="arrow-up-outline"
                />
                <KpiCard
                  label="Dépenses"
                  value={fmt(advanced.totalDepenses)}
                  sub={`${advanced.outsCount} sortie(s)`}
                  tone="red"
                  icon="arrow-down-outline"
                />
                <KpiCard
                  label="Bilan ventes - achats"
                  value={fmt(advanced.bilan)}
                  tone={advanced.bilan >= 0 ? 'teal' : 'amber'}
                  icon="bar-chart-outline"
                />
                <KpiCard
                  label="Solde du mois"
                  value={fmt(advanced.solde)}
                  tone={advanced.solde >= 0 ? 'green' : 'amber'}
                  icon="wallet-outline"
                />
              </View>

              <Text style={styles.blockLabel}>Fournisseurs</Text>
              <View style={styles.detailList}>
                <DetailRow label="Achats (consommation)" value={fmt(advanced.achats)} />
                <DetailRow label="Revenus fournisseurs" value={fmt(advanced.revenusF)} valueColor="#047857" />
                <DetailRow label="Paiements fournisseurs" value={fmt(advanced.paiements)} valueColor="#dc2626" />
              </View>

              <Text style={styles.blockLabel}>Véhicules</Text>
              <View style={styles.detailList}>
                <DetailRow label={`Terminés (${moisLabel})`} value={String(advanced.termines)} valueColor="#047857" />
                <DetailRow label="En cours (non livrés)" value={String(advanced.enCours)} valueColor="#ea580c" />
              </View>

              <Text style={styles.blockLabel}>Dettes clients</Text>
              <View style={styles.detteBlock}>
                <Text style={styles.detteTotal}>{fmt(advanced.totalDettes)}</Text>
                <Text style={styles.detteSub}>Total restant dû</Text>
                {advanced.topDettes.length > 0 ? (
                  <View style={styles.topDettes}>
                    <Text style={styles.topDettesTitle}>Top 5 restes à recouvrer</Text>
                    {advanced.topDettes.map((c) => (
                      <View key={c.id} style={styles.detteRow}>
                        <Text style={styles.detteName} numberOfLines={1}>
                          {c.clientName || c.telephoneClient || `Client #${c.id}`}
                        </Text>
                        <Text style={styles.detteAmount}>{fmt(c.reste ?? 0)}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {IMPLEMENTED_ROUTES.has('clients_dettes') ? (
                  <Pressable style={styles.detteCta} onPress={() => onNavigate('clients_dettes')}>
                    <Text style={styles.detteCtaText}>Voir la liste des dettes</Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}
        </SectionCard>

        <View style={styles.footerSpacer} />
      </ScrollView>

      <AppToast message={toast} type="error" onDismiss={() => setToast(null)} />
    </View>
  )
}

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: theme.radius.lg,
    ...theme.shadow.sm,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  sectionCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    backgroundColor: theme.surfaceMuted,
  },
  sectionHeaderText: { flex: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
  sectionSub: { fontSize: 12, color: theme.textMuted, marginTop: 4, marginLeft: 28 },
  sectionBody: { padding: 14 },
  globalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  globalCell: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    minHeight: 96,
  },
  globalCellPressed: { opacity: 0.92, borderColor: theme.primary },
  globalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  globalValue: { fontSize: 22, fontWeight: '800', color: theme.text },
  globalLabel: { fontSize: 11, fontWeight: '600', color: theme.textMuted, marginTop: 2, lineHeight: 15 },
  globalChevron: { position: 'absolute', top: 10, right: 8 },
  pickerRow: { flexDirection: 'row', gap: 6 },
  pickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  pickerChipText: { fontSize: 12, fontWeight: '700', color: theme.primaryDark },
  yearRow: { gap: 8, marginBottom: 12 },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  yearChipOn: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  yearChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  yearChipTextOn: { color: theme.primaryDark, fontWeight: '800' },
  monthRow: { gap: 6, marginBottom: 14 },
  monthChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  monthChipOn: { backgroundColor: theme.primarySoft, borderColor: theme.primary },
  monthChipText: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  monthChipTextOn: { color: theme.primaryDark, fontWeight: '800' },
  loadingHint: { fontSize: 12, color: theme.textMuted, marginBottom: 8 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: theme.text, marginBottom: 8 },
  chartTitleSpaced: { marginTop: 16 },
  chartFoot: { fontSize: 11, color: theme.textSubtle, marginTop: 8, lineHeight: 16 },
  blockLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
    marginTop: 4,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kpiLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  kpiValue: { fontSize: 17, fontWeight: '800' },
  kpiSub: { fontSize: 11, color: theme.textMuted, marginTop: 4 },
  detailList: {
    backgroundColor: theme.bg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.borderLight,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    gap: 12,
  },
  detailLabel: { flex: 1, fontSize: 13, color: theme.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '800', color: theme.text },
  detteBlock: {
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  detteTotal: { fontSize: 24, fontWeight: '800', color: '#be123c' },
  detteSub: { fontSize: 12, color: '#e11d48', marginTop: 2 },
  topDettes: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#fecdd3' },
  topDettesTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, marginBottom: 8 },
  detteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
  },
  detteName: { flex: 1, fontSize: 13, color: theme.text },
  detteAmount: { fontSize: 13, fontWeight: '800', color: '#be123c' },
  detteCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 10,
  },
  detteCtaText: { fontSize: 14, fontWeight: '700', color: theme.primary },
  footerSpacer: { height: 8 },
})
