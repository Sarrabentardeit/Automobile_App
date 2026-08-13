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
import DashboardPeriodReport from '../components/dashboard/DashboardPeriodReport'
import DashboardSkeleton from '../components/dashboard/DashboardSkeleton'
import AppToast from '../components/ui/AppToast'
import CenteredSheetShell from '../components/ui/CenteredSheetShell'
import { fetchDashboardCounts, fetchDashboardSummary } from '../lib/dashboardApi'
import { fetchVehicules } from '../lib/api'
import { daysSince } from '../lib/format'
import { fetchUsers, type AppUser } from '../lib/vehiculeApi'
import type { MenuRouteId } from '../navigation/menuConfig'
import { theme } from '../theme/appTheme'
import type { DashboardSummary } from '../types/dashboard'
import type { Permissions } from '../types/permissions'
import { ETAT_CONFIG, type EtatVehicule, type Vehicule } from '../types/vehicule'

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

const ETATS_ACTIFS: EtatVehicule[] = [
  'orange',
  'mauve',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'retour',
]

type TeamMemberDetail = {
  id: number
  nom: string
  role: string
  total: number
  byEtat: Record<string, number>
  urgents: number
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
  permissions,
  onNavigate,
  onOpenVehicule,
  onOpenVehiculesEtat,
}: Props) {
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
  const [selectedMember, setSelectedMember] = useState<TeamMemberDetail | null>(null)
  const [memberVehicles, setMemberVehicles] = useState<Vehicule[]>([])
  const [memberVehiclesLoading, setMemberVehiclesLoading] = useState(false)
  const [reportRefreshKey, setReportRefreshKey] = useState(0)

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

  useEffect(() => {
    if (!permissions.canManageUsers || !isGlobalView) return
    const id = setInterval(() => {
      void load()
    }, 30_000)
    return () => clearInterval(id)
  }, [permissions.canManageUsers, isGlobalView, load])

  const equipeUsers = useMemo(
    () =>
      users
        .filter((u) => (u.statut ?? 'actif') === 'actif')
        .slice()
        .sort((a, b) => a.nom_complet.localeCompare(b.nom_complet, 'fr', { sensitivity: 'base' })),
    [users]
  )

  const teamRows = useMemo(() => {
    return equipeUsers
      .map((tech) => {
        const detail = summary?.teamLoadDetailByTechnicien?.[String(tech.id)]
        const total = summary?.teamLoadByTechnicien?.[String(tech.id)] ?? detail?.total ?? 0
        return {
          id: tech.id,
          nom: tech.nom_complet,
          role: tech.role,
          total,
          byEtat: detail?.byEtat ?? {},
          urgents: detail?.urgents ?? 0,
        } satisfies TeamMemberDetail
      })
      .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'fr'))
  }, [equipeUsers, summary])

  useEffect(() => {
    if (!selectedMember) return
    const fresh = teamRows.find((r) => r.id === selectedMember.id)
    if (fresh) setSelectedMember(fresh)
  }, [teamRows]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMember) {
      setMemberVehicles([])
      return
    }
    let cancelled = false
    setMemberVehiclesLoading(true)
    void fetchVehicules(accessToken, {
      technicien_id: selectedMember.id,
      exclude_etat: 'vert',
      page: 1,
      limit: 50,
    })
      .then((res) => {
        if (!cancelled) setMemberVehicles(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        if (!cancelled) setMemberVehicles([])
      })
      .finally(() => {
        if (!cancelled) setMemberVehiclesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedMember?.id, accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const countByEtat = (etat: EtatVehicule) => byEtat[etat] ?? 0
  const problemsCount = summary?.problemsCount ?? 0
  const validatedCount = countByEtat('vert')

  const urgents = summary?.urgents ?? []
  const anciens = (summary?.anciens ?? []).filter((v) => v.etat_actuel !== 'rouge').slice(0, 4)
  const recentActivity = (summary?.recentActivity ?? []).slice(0, 6)
  const maxTeamLoad = Math.max(1, ...teamRows.map((r) => r.total))

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              setReportRefreshKey((k) => k + 1)
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

            <DashboardPeriodReport
              accessToken={accessToken}
              permissions={permissions}
              onNavigate={onNavigate}
              refreshKey={reportRefreshKey}
            />

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

            {/* Équipe — tous utilisateurs, tous états sauf archivés */}
            {permissions.canManageUsers && isGlobalView && teamRows.length > 0 ? (
              <View style={styles.section}>
                <Pressable
                  style={styles.sectionHeadInline}
                  onPress={() => onNavigate('utilisateurs')}
                >
                  <View>
                    <Text style={styles.sectionTitle}>Équipe atelier</Text>
                    <Text style={styles.sectionSub}>
                      Tous les états sauf archivés (validés)
                    </Text>
                  </View>
                  <Ionicons name="people-outline" size={18} color={theme.textMuted} />
                </Pressable>
                <View style={styles.teamGrid}>
                  {teamRows.map((row) => {
                    const etatChips = ETATS_ACTIFS.filter((e) => (row.byEtat[e] ?? 0) > 0)
                    const ratio = row.total / maxTeamLoad
                    const accent =
                      row.total === 0 ? '#78716c' : row.urgents > 0 ? '#dc2626' : '#a16207'
                    return (
                      <Pressable
                        key={row.id}
                        style={[
                          styles.teamCardModern,
                          {
                            backgroundColor: '#fff',
                            borderColor:
                              row.urgents > 0 ? '#fecaca' : row.total > 0 ? '#e7e5e4' : '#f5f5f4',
                          },
                        ]}
                        onPress={() => setSelectedMember(row)}
                      >
                        <View style={styles.teamCardTop}>
                          <View
                            style={[
                              styles.teamAvatarModern,
                              {
                                backgroundColor:
                                  row.total === 0
                                    ? '#e7e5e4'
                                    : row.urgents > 0
                                      ? '#fecaca'
                                      : '#fde68a',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.teamAvatarTextModern,
                                { color: accent },
                              ]}
                            >
                              {memberInitial(row.nom)}
                            </Text>
                          </View>
                          <View style={styles.teamCardInfo}>
                            <Text style={styles.teamNameModern} numberOfLines={1}>
                              {row.nom}
                            </Text>
                            <Text style={[styles.teamStatus, { color: accent }]}>
                              {row.total === 0
                                ? 'Libre'
                                : row.urgents > 0
                                  ? 'Urgent'
                                  : 'Actif'}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color="#a8a29e" />
                        </View>
                        <View style={styles.teamCountRow}>
                          <Text style={[styles.teamCountBig, { color: accent }]}>{row.total}</Text>
                          <Text style={styles.teamCountLabel}>
                            véhicule{row.total !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <View style={styles.teamBarTrack}>
                          <View
                            style={[
                              styles.teamBarFill,
                              {
                                backgroundColor: accent,
                                width: `${Math.max(row.total === 0 ? 0 : 6, ratio * 100)}%`,
                              },
                            ]}
                          />
                        </View>
                        {etatChips.length > 0 ? (
                          <View style={styles.teamChips}>
                            {etatChips.map((etat) => (
                              <Text
                                key={etat}
                                style={[
                                  styles.teamChipGeneric,
                                  { color: ETAT_CONFIG[etat].color },
                                ]}
                              >
                                {row.byEtat[etat]} {labelEtatDashboard(etat)}
                              </Text>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.teamEmptyHint}>Aucun véhicule actif</Text>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              </View>
            ) : null}
          </>
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      <CenteredSheetShell
        visible={selectedMember != null}
        onClose={() => {
          setSelectedMember(null)
          setMemberVehicles([])
        }}
        maxWidth={440}
      >
        {selectedMember ? (
          <>
            <Text style={styles.detailTitle}>{selectedMember.nom}</Text>
            <Text style={styles.detailSub}>
              {selectedMember.total} véhicule(s) actif(s) · hors archivés
            </Text>
            <View style={styles.teamChips}>
              {ETATS_ACTIFS.filter((e) => (selectedMember.byEtat[e] ?? 0) > 0).map((etat) => (
                <Text
                  key={etat}
                  style={[styles.teamChipGeneric, { color: ETAT_CONFIG[etat].color }]}
                >
                  {selectedMember.byEtat[etat]} {labelEtatDashboard(etat)}
                </Text>
              ))}
            </View>
            <Text style={styles.detailListTitle}>Véhicules de {selectedMember.nom}</Text>
            {memberVehiclesLoading ? (
              <Text style={styles.teamEmptyHint}>Chargement des véhicules…</Text>
            ) : memberVehicles.length === 0 ? (
              <Text style={styles.teamEmptyHint}>Aucun véhicule actif trouvé.</Text>
            ) : (
              memberVehicles.map((v) => {
                const etat = v.etat_actuel as EtatVehicule
                const cfg = ETAT_CONFIG[etat]
                return (
                  <Pressable
                    key={v.id}
                    style={styles.vehDetailCard}
                    onPress={() => {
                      setSelectedMember(null)
                      setMemberVehicles([])
                      onOpenVehicule(v.id)
                    }}
                  >
                    <View style={styles.vehDetailTop}>
                      <Text style={styles.vehModel} numberOfLines={1}>
                        {v.modele || '—'}
                      </Text>
                      <Text style={[styles.vehEtat, { color: cfg?.color ?? theme.textMuted }]}>
                        {cfg ? labelEtatDashboard(etat) : v.etat_actuel}
                      </Text>
                    </View>
                    <Text style={styles.vehPlate}>{v.immatriculation}</Text>
                    <Text style={styles.vehMeta}>
                      Entrée {v.date_entree || '—'} · {daysSince(v.date_entree)} j
                    </Text>
                    {v.defaut ? (
                      <Text style={styles.vehDefaut} numberOfLines={2}>
                        {v.defaut}
                      </Text>
                    ) : null}
                  </Pressable>
                )
              })
            )}
            <Pressable
              style={styles.detailCta}
              onPress={() => {
                setSelectedMember(null)
                setMemberVehicles([])
                onNavigate('vehicules')
              }}
            >
              <Text style={styles.detailCtaText}>Voir dans Véhicules</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </Pressable>
          </>
        ) : null}
      </CenteredSheetShell>

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
  sectionSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  teamCardModern: {
    width: '47%',
    flexGrow: 1,
    minWidth: 148,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  teamCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  teamAvatarModern: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarTextModern: { fontSize: 14, fontWeight: '800', color: '#fff' },
  teamCardInfo: { flex: 1, minWidth: 0 },
  teamNameModern: { fontSize: 13, fontWeight: '800', color: theme.text },
  teamStatus: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  teamCountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  teamCountBig: { fontSize: 26, fontWeight: '900', lineHeight: 28 },
  teamCountLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '600', marginBottom: 2 },
  teamBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  teamBarFill: { height: '100%', borderRadius: 999 },
  teamChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  teamChipOrange: {
    fontSize: 9,
    fontWeight: '800',
    color: '#c2410c',
    backgroundColor: '#ffedd5',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamChipRed: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
    backgroundColor: '#fee2e2',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  teamChipGeneric: {
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: '#fafaf9',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  teamEmptyHint: { fontSize: 11, color: theme.textMuted },
  detailModal: { flex: 1, backgroundColor: theme.bg },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  detailTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  detailSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  detailListTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 2,
  },
  detailBody: { padding: 16, gap: 10, paddingBottom: 40 },
  vehDetailCard: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  vehDetailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  vehPlate: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginTop: 4 },
  vehModel: { flex: 1, fontSize: 15, fontWeight: '800', color: theme.text },
  vehEtat: { fontSize: 11, fontWeight: '800' },
  vehMeta: { fontSize: 11, color: theme.textMuted, marginTop: 4 },
  vehDefaut: { fontSize: 12, color: theme.textSecondary, marginTop: 6, lineHeight: 16 },
  detailCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 12,
  },
  detailCtaText: { fontSize: 14, fontWeight: '700', color: theme.primary },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  footerSpacer: { height: 16 },
})
