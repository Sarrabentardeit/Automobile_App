import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'
import AppToast from '../components/ui/AppToast'
import { fetchDashboardCounts, fetchDashboardSummary } from '../lib/dashboardApi'
import { daysSince } from '../lib/format'
import { fetchUsers, type AppUser } from '../lib/vehiculeApi'
import { hasMenuAccess, MENU_STRUCTURE, type MenuRouteId } from '../navigation/menuConfig'
import { theme } from '../theme/appTheme'
import type { DashboardSummary } from '../types/dashboard'
import { mapRole, type Permissions } from '../types/permissions'
import { ETAT_CONFIG, type EtatVehicule } from '../types/vehicule'

type IonIcon = ComponentProps<typeof Ionicons>['name']

const ETATS: EtatVehicule[] = [
  'orange',
  'mauve',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'vert',
  'retour',
]

type QuickAction = {
  id: MenuRouteId
  label: string
  icon: IonIcon
  color: string
  bg: string
}

const QUICK_ACTION_IDS: MenuRouteId[] = [
  'vehicules',
  'calendar',
  'checklists',
  'reclamation',
  'stock',
  'clients_dettes',
  'fournisseurs',
  'clients',
]

const ACTION_STYLE: Partial<Record<MenuRouteId, { color: string; bg: string; short?: string }>> = {
  vehicules: { color: '#ea580c', bg: '#fff7ed' },
  calendar: { color: '#c2410c', bg: '#ffedd5' },
  checklists: { color: '#0d9488', bg: '#ecfdf5' },
  reclamation: { color: '#dc2626', bg: '#fef2f2' },
  stock: { color: '#2563eb', bg: '#eff6ff' },
  clients_dettes: { color: '#7c3aed', bg: '#f5f3ff', short: 'Dettes' },
  fournisseurs: { color: '#0891b2', bg: '#ecfeff' },
  clients: { color: '#4f46e5', bg: '#eef2ff' },
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function labelEtatDashboard(etat: EtatVehicule): string {
  return etat === 'rouge' ? 'À RÉSOUDRE' : ETAT_CONFIG[etat].label
}

function memberInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

type Props = {
  accessToken: string
  userId: number
  userName: string
  userRole: string
  permissions: Permissions
  onNavigate: (route: MenuRouteId) => void
  onOpenVehicule: (id: number) => void
  onOpenVehiculesEtat: (etat: EtatVehicule) => void
}

export default function DashboardScreen({
  accessToken,
  userId,
  userName,
  userRole,
  permissions,
  onNavigate,
  onOpenVehicule,
  onOpenVehiculesEtat,
}: Props) {
  const role = mapRole(userRole)
  const isOwnView = permissions.vehiculeVisibility === 'own'
  const isGlobalView = permissions.vehiculeVisibility === 'all'
  const showVehicules = permissions.vehiculeVisibility !== 'none'

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [byEtat, setByEtat] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastError, setToastError] = useState(false)

  const showMsg = (msg: string, err = false) => {
    setToastError(err)
    setToast(msg)
  }

  const load = useCallback(async () => {
    try {
      const techId = isOwnView ? userId : undefined
      const [sum, counts, userList] = await Promise.all([
        fetchDashboardSummary(accessToken, techId),
        showVehicules
          ? fetchDashboardCounts(accessToken, techId).catch(() => ({
              total: 0,
              byEtat: {} as Record<string, number>,
            }))
          : Promise.resolve({ total: 0, byEtat: {} as Record<string, number> }),
        permissions.canManageUsers
          ? fetchUsers(accessToken).catch(() => [] as AppUser[])
          : Promise.resolve([] as AppUser[]),
      ])
      setSummary(sum)
      setByEtat(counts.byEtat ?? {})
      setTotal(counts.total ?? 0)
      setUsers(userList)
    } catch (e) {
      setSummary(null)
      showMsg(e instanceof Error ? e.message : 'Erreur chargement', true)
    }
  }, [accessToken, isOwnView, userId, showVehicules, permissions.canManageUsers])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const countByEtat = (etat: EtatVehicule) => byEtat[etat] ?? 0
  const problemsCount = summary?.problemsCount ?? 0
  const validatedCount = countByEtat('vert')

  const quickActions = useMemo(() => {
    const actions: QuickAction[] = []
    for (const cat of MENU_STRUCTURE) {
      for (const item of cat.items) {
        if (!QUICK_ACTION_IDS.includes(item.id)) continue
        if (!item.implemented) continue
        if (!hasMenuAccess(permissions, role, item)) continue
        const style = ACTION_STYLE[item.id] ?? { color: theme.primary, bg: theme.primarySoft }
        actions.push({
          id: item.id,
          label: style.short ?? item.name,
          icon: item.icon,
          color: style.color,
          bg: style.bg,
        })
      }
    }
    return actions
  }, [permissions, role])

  const urgents = summary?.urgents ?? []
  const anciens = (summary?.anciens ?? []).filter((v) => v.etat_actuel !== 'rouge').slice(0, 4)
  const recentActivity = (summary?.recentActivity ?? []).slice(0, 6)
  const techniciens = users.filter((u) => u.statut === 'actif' && u.role === 'technicien')

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
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="grid" size={22} color="#fff" />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.greeting}>
                {greeting()}, {userName.split(' ')[0]}
              </Text>
              <Text style={styles.heroSub}>
                {isOwnView
                  ? `${total} véhicule${total !== 1 ? 's' : ''} assigné${total !== 1 ? 's' : ''}`
                  : 'Vue d\'ensemble du garage'}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPIs */}
            {showVehicules ? (
              <View style={styles.kpiRow}>
                <Pressable
                  style={({ pressed }) => [styles.kpi, pressed && styles.pressed]}
                  onPress={() => onNavigate('vehicules')}
                >
                  <View style={[styles.kpiIcon, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="car" size={20} color="#2563eb" />
                  </View>
                  <Text style={styles.kpiValue}>{total}</Text>
                  <Text style={styles.kpiLabel}>{isOwnView ? 'Mes véh.' : 'Total'}</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.kpi, pressed && styles.pressed]}
                  onPress={() => onOpenVehiculesEtat('rouge')}
                >
                  <View style={[styles.kpiIcon, { backgroundColor: theme.dangerSoft }]}>
                    <Ionicons name="warning" size={20} color={theme.danger} />
                  </View>
                  <Text style={[styles.kpiValue, { color: theme.danger }]}>{problemsCount}</Text>
                  <Text style={styles.kpiLabel}>À résoudre</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.kpi, pressed && styles.pressed]}
                  onPress={() => onOpenVehiculesEtat('vert')}
                >
                  <View style={[styles.kpiIcon, { backgroundColor: theme.successSoft }]}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                  </View>
                  <Text style={[styles.kpiValue, { color: theme.success }]}>{validatedCount}</Text>
                  <Text style={styles.kpiLabel}>Validés</Text>
                </Pressable>
              </View>
            ) : null}

            {/* États — scroll horizontal */}
            {showVehicules ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Par état</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.etatStrip}
                >
                  {ETATS.map((etat) => {
                    const cfg = ETAT_CONFIG[etat]
                    const count = countByEtat(etat)
                    return (
                      <Pressable
                        key={etat}
                        onPress={() => onOpenVehiculesEtat(etat)}
                        style={({ pressed }) => [styles.etatCard, pressed && styles.pressed]}
                      >
                        <View style={styles.etatCardTop}>
                          <View style={[styles.etatDot, { backgroundColor: cfg.color }]} />
                          <Text style={styles.etatLabel} numberOfLines={1}>
                            {labelEtatDashboard(etat)}
                          </Text>
                        </View>
                        <Text style={[styles.etatCount, { color: cfg.color }]}>{count}</Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>
              </View>
            ) : null}

            {/* Raccourcis */}
            {quickActions.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Accès rapide</Text>
                <View style={styles.actionGrid}>
                  {quickActions.map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => onNavigate(a.id)}
                      style={({ pressed }) => [styles.actionTile, pressed && styles.pressed]}
                    >
                      <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                        <Ionicons name={a.icon} size={22} color={a.color} />
                      </View>
                      <Text style={styles.actionLabel}>{a.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Alertes */}
            {showVehicules ? (
              <View style={styles.sectionCard}>
                <Pressable
                  style={styles.sectionHead}
                  onPress={() => onNavigate('vehicules')}
                >
                  <Text style={styles.sectionHeadTitle}>Alertes</Text>
                  <Ionicons name="warning-outline" size={18} color={theme.textMuted} />
                </Pressable>
                {urgents.length === 0 && anciens.length === 0 ? (
                  <Text style={styles.empty}>Aucune alerte — tout va bien</Text>
                ) : (
                  <>
                    {urgents.map((v) => (
                      <Pressable
                        key={`u-${v.id}`}
                        onPress={() => onOpenVehicule(v.id)}
                        style={({ pressed }) => [styles.alertRow, styles.alertUrgent, pressed && styles.pressed]}
                      >
                        <View style={styles.alertDotUrgent} />
                        <View style={styles.alertBody}>
                          <Text style={styles.alertTitle} numberOfLines={1}>
                            {v.modele} — {v.defaut}
                          </Text>
                          <Text style={styles.alertMeta}>
                            {v.immatriculation || 'Sans immat.'} · {daysSince(v.date_entree)}j
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#f87171" />
                      </Pressable>
                    ))}
                    {anciens.map((v) => (
                      <Pressable
                        key={`a-${v.id}`}
                        onPress={() => onOpenVehicule(v.id)}
                        style={({ pressed }) => [styles.alertRow, styles.alertOld, pressed && styles.pressed]}
                      >
                        <Ionicons name="time-outline" size={16} color="#ea580c" />
                        <View style={styles.alertBody}>
                          <Text style={styles.alertTitleOld} numberOfLines={1}>
                            {v.modele} — {daysSince(v.date_entree)}j
                          </Text>
                          <Text style={styles.alertMetaOld}>
                            {ETAT_CONFIG[v.etat_actuel]?.label ?? v.etat_actuel}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#fdba74" />
                      </Pressable>
                    ))}
                  </>
                )}
              </View>
            ) : null}

            {/* Activité récente */}
            {showVehicules ? (
              <View style={styles.sectionCard}>
                <Pressable
                  style={styles.sectionHead}
                  onPress={() => onNavigate('vehicules')}
                >
                  <Text style={styles.sectionHeadTitle}>Activité récente</Text>
                  <Ionicons name="pulse-outline" size={18} color={theme.textMuted} />
                </Pressable>
                {recentActivity.length === 0 ? (
                  <Text style={styles.empty}>Aucune activité récente</Text>
                ) : (
                  recentActivity.map((h) => {
                    const cfg = ETAT_CONFIG[h.etat_nouveau]
                    return (
                      <View key={h.id} style={styles.activityRow}>
                        <View style={[styles.activityDot, { backgroundColor: cfg?.color ?? theme.textMuted }]} />
                        <View style={styles.activityBody}>
                          <Text style={styles.activityText}>
                            <Text style={styles.activityUser}>{h.utilisateur_nom}</Text>
                            {' → '}
                            <Text style={{ color: cfg?.color, fontWeight: '800' }}>
                              {cfg?.label ?? h.etat_nouveau}
                            </Text>
                            {h.vehicleModel ? (
                              <Text style={styles.activityVehicle}> · {h.vehicleModel}</Text>
                            ) : null}
                          </Text>
                          {h.commentaire?.trim() ? (
                            <Text style={styles.activityComment} numberOfLines={1}>
                              {h.commentaire}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    )
                  })
                )}
              </View>
            ) : null}

            {/* Équipe */}
            {permissions.canManageUsers && isGlobalView && techniciens.length > 0 ? (
              <View style={styles.section}>
                <Pressable
                  style={styles.sectionHeadInline}
                  onPress={() => onNavigate('equipe_membres')}
                >
                  <Text style={styles.sectionTitle}>Équipe</Text>
                  <Ionicons name="people-outline" size={18} color={theme.textMuted} />
                </Pressable>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.teamStrip}
                >
                  {techniciens.map((tech) => {
                    const load = summary?.teamLoadByTechnicien?.[String(tech.id)] ?? 0
                    return (
                      <View key={tech.id} style={styles.teamCard}>
                        <View style={styles.teamAvatar}>
                          <Text style={styles.teamAvatarText}>{memberInitial(tech.nom_complet)}</Text>
                        </View>
                        <Text style={styles.teamName} numberOfLines={1}>
                          {tech.nom_complet.split(' ')[0]}
                        </Text>
                        <Text style={styles.teamLoad}>{load} véh.</Text>
                      </View>
                    )
                  })}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      <AppToast message={toast} type={toastError ? 'error' : 'success'} onDismiss={() => setToast(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  hero: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1 },
  greeting: { fontSize: 18, fontWeight: '800', color: theme.text },
  heroSub: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpi: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: theme.text },
  kpiLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, marginTop: 2, textAlign: 'center' },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  sectionHeadInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  etatStrip: { gap: 10, paddingRight: 4 },
  etatCard: {
    width: 108,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  etatCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  etatDot: { width: 8, height: 8, borderRadius: 4 },
  etatLabel: { fontSize: 9, fontWeight: '800', color: theme.textMuted, flex: 1 },
  etatCount: { fontSize: 26, fontWeight: '800' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionTile: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, fontWeight: '700', color: theme.text, flex: 1 },
  sectionCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadow.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeadTitle: { fontSize: 15, fontWeight: '800', color: theme.text },
  empty: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
  },
  alertUrgent: { backgroundColor: theme.dangerSoft },
  alertOld: { backgroundColor: theme.primarySoft },
  alertDotUrgent: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.danger },
  alertBody: { flex: 1, minWidth: 0 },
  alertTitle: { fontSize: 13, fontWeight: '700', color: '#991b1b' },
  alertTitleOld: { fontSize: 13, fontWeight: '700', color: theme.primaryDark },
  alertMeta: { fontSize: 11, color: '#b91c1c', marginTop: 2 },
  alertMetaOld: { fontSize: 11, color: theme.primary, marginTop: 2 },
  activityRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  activityBody: { flex: 1 },
  activityText: { fontSize: 13, color: theme.text, lineHeight: 18 },
  activityUser: { fontWeight: '800' },
  activityVehicle: { color: theme.textMuted },
  activityComment: { fontSize: 11, color: theme.textSubtle, marginTop: 2 },
  teamStrip: { gap: 10, paddingRight: 4 },
  teamCard: {
    width: 88,
    backgroundColor: theme.surface,
    borderRadius: theme.radius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  teamAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  teamAvatarText: { fontSize: 14, fontWeight: '800', color: theme.textSecondary },
  teamName: { fontSize: 11, fontWeight: '700', color: theme.text },
  teamLoad: { fontSize: 10, color: theme.textMuted, marginTop: 2 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  footerSpacer: { height: 16 },
})
