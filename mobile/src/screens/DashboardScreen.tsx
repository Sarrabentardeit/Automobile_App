import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { daysSince, formatRelativeDateTime } from '../lib/format'
import { fetchUsers, type AppUser } from '../lib/vehiculeApi'
import type { MenuRouteId } from '../navigation/menuConfig'
import { theme } from '../theme/appTheme'
import type { DashboardSummary } from '../types/dashboard'
import type { Permissions } from '../types/permissions'
import { ETAT_CONFIG, type EtatVehicule, type Vehicule } from '../types/vehicule'

const ETATS: EtatVehicule[] = [
  'orange',
  'mauve',
  'sous_traitance',
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
  'sous_traitance',
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

function labelEtatDashboard(etat: EtatVehicule): string {
  return etat === 'rouge' ? 'À RÉSOUDRE' : ETAT_CONFIG[etat].label
}

function memberInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: ReactNode
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <View style={styles.panelHeadText}>
          {typeof title === 'string' ? <Text style={styles.panelTitle}>{title}</Text> : title}
          {subtitle ? <Text style={styles.panelSubtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  )
}

function EmptyRow({ children }: { children: string }) {
  return <Text style={styles.empty}>{children}</Text>
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
        const loadTotal = summary?.teamLoadByTechnicien?.[String(tech.id)] ?? detail?.total ?? 0
        return {
          id: tech.id,
          nom: tech.nom_complet,
          role: tech.role,
          total: loadTotal,
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
  const anciens = (summary?.anciens ?? []).filter((v) => v.etat_actuel !== 'rouge')
  const recentActivity = (summary?.recentActivity ?? []).slice(0, 8)
  const maxTeamLoad = Math.max(1, ...teamRows.map((r) => r.total))

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const closeMember = () => {
    setSelectedMember(null)
    setMemberVehicles([])
  }

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>Vue d’ensemble</Text>
            <Text style={styles.title}>{isOwnView ? 'Mes véhicules' : 'Dashboard'}</Text>
            <Text style={styles.headerMeta}>
              <Text style={styles.headerMetaCap}>{todayLabel}</Text>
              <Text style={styles.headerDot}> · </Text>
              {userName}
            </Text>
          </View>
          {permissions.canManageUsers ? (
            <Pressable
              style={({ pressed }) => [styles.statsChip, pressed && styles.pressed]}
              onPress={() => onNavigate('admin')}
            >
              <Text style={styles.statsChipText}>Stats</Text>
              <Ionicons name="open-outline" size={14} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* KPIs */}
            {showVehicules ? (
              <View style={styles.kpiPanel}>
                <Pressable
                  style={({ pressed }) => [styles.kpiCell, pressed && styles.pressed]}
                  onPress={() => onNavigate('vehicules')}
                >
                  <Text style={styles.kpiValue}>{total}</Text>
                  <Text style={styles.kpiLabel}>{isOwnView ? 'Mes véh.' : 'Total'}</Text>
                </Pressable>
                <View style={styles.kpiDivider} />
                <Pressable
                  style={({ pressed }) => [styles.kpiCell, pressed && styles.pressed]}
                  onPress={() => onOpenVehiculesEtat('rouge')}
                >
                  <Text style={[styles.kpiValue, { color: theme.danger }]}>{problemsCount}</Text>
                  <Text style={styles.kpiLabel}>À résoudre</Text>
                </Pressable>
                <View style={styles.kpiDivider} />
                <Pressable
                  style={({ pressed }) => [styles.kpiCell, pressed && styles.pressed]}
                  onPress={() => onOpenVehiculesEtat('vert')}
                >
                  <Text style={[styles.kpiValue, { color: theme.success }]}>{validatedCount}</Text>
                  <Text style={styles.kpiLabel}>Validés</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Priorités */}
            {showVehicules ? (
              <View style={styles.block}>
                <SectionLabel>Priorités</SectionLabel>

                <Panel
                  title={
                    <View style={styles.panelTitleRow}>
                      <View style={[styles.dot, { backgroundColor: '#f43f5e' }]} />
                      <Text style={styles.panelTitle}>Urgents</Text>
                    </View>
                  }
                  subtitle={`${urgents.length} à traiter`}
                  action={
                    <Pressable onPress={() => onOpenVehiculesEtat('rouge')} hitSlop={8}>
                      <Text style={styles.linkAction}>Voir tout</Text>
                    </Pressable>
                  }
                >
                  {urgents.length === 0 ? (
                    <EmptyRow>Rien d’urgent</EmptyRow>
                  ) : (
                    urgents.slice(0, 5).map((v) => (
                      <Pressable
                        key={`u-${v.id}`}
                        onPress={() => onOpenVehicule(v.id)}
                        style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                      >
                        <View style={styles.listBody}>
                          <Text style={styles.listTitle} numberOfLines={1}>
                            {v.modele}
                          </Text>
                          <Text style={styles.listMeta}>{v.immatriculation || 'Sans immat.'}</Text>
                        </View>
                        <Text style={styles.listBadgeRose}>{daysSince(v.date_entree)}j</Text>
                      </Pressable>
                    ))
                  )}
                </Panel>

                <Panel
                  title={
                    <View style={styles.panelTitleRow}>
                      <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
                      <Text style={styles.panelTitle}>Anciens</Text>
                    </View>
                  }
                  subtitle={`${anciens.length} depuis plus de 7 jours`}
                >
                  {anciens.length === 0 ? (
                    <EmptyRow>Aucun ancien</EmptyRow>
                  ) : (
                    anciens.slice(0, 5).map((v) => (
                      <Pressable
                        key={`a-${v.id}`}
                        onPress={() => onOpenVehicule(v.id)}
                        style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                      >
                        <View
                          style={[
                            styles.etatMiniDot,
                            { backgroundColor: ETAT_CONFIG[v.etat_actuel]?.color ?? '#a8a29e' },
                          ]}
                        />
                        <View style={styles.listBody}>
                          <Text style={styles.listTitle} numberOfLines={1}>
                            {v.modele}
                          </Text>
                          <Text style={styles.listMeta}>
                            {v.immatriculation} · {labelEtatDashboard(v.etat_actuel)}
                          </Text>
                        </View>
                        <Text style={styles.listBadgeAmber}>{daysSince(v.date_entree)}j</Text>
                      </Pressable>
                    ))
                  )}
                </Panel>
              </View>
            ) : null}

            {/* Opérationnel */}
            <View style={styles.block}>
              <SectionLabel>Opérationnel</SectionLabel>
              <DashboardPeriodReport
                accessToken={accessToken}
                permissions={permissions}
                onNavigate={onNavigate}
                refreshKey={reportRefreshKey}
              />

              {showVehicules ? (
                <View style={styles.etatCard}>
                  <Text style={styles.etatCardTitle}>Par état</Text>
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
                          style={({ pressed }) => [styles.etatChip, pressed && styles.pressed]}
                        >
                          <View style={styles.etatChipTop}>
                            <View style={[styles.etatMiniDot, { backgroundColor: cfg.color }]} />
                            <Text style={styles.etatChipLabel} numberOfLines={1}>
                              {labelEtatDashboard(etat)}
                            </Text>
                          </View>
                          <Text style={[styles.etatChipCount, { color: cfg.color }]}>{count}</Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            {/* Analyse */}
            {permissions.canManageUsers ? (
              <View style={styles.block}>
                <SectionLabel>Analyse</SectionLabel>
                <Pressable
                  style={({ pressed }) => [styles.analyseCard, pressed && styles.pressed]}
                  onPress={() => onNavigate('admin')}
                >
                  <View style={styles.analyseIcon}>
                    <Ionicons name="bar-chart-outline" size={18} color={theme.primaryDark} />
                  </View>
                  <View style={styles.analyseBody}>
                    <Text style={styles.analyseTitle}>Statistiques mensuelles</Text>
                    <Text style={styles.analyseSub}>Entrées, validés, répartition atelier</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
                </Pressable>
              </View>
            ) : null}

            {/* Suivi */}
            {showVehicules ? (
              <View style={styles.block}>
                <SectionLabel>Suivi</SectionLabel>

                <Panel title="Activité récente" subtitle="Changements d’état">
                  {recentActivity.length === 0 ? (
                    <EmptyRow>Aucune activité</EmptyRow>
                  ) : (
                    recentActivity.map((h, i) => {
                      const etat = (h.etat_nouveau as EtatVehicule) || 'orange'
                      const cfg = ETAT_CONFIG[etat]
                      return (
                        <Pressable
                          key={`${h.id}-${i}`}
                          onPress={() => onOpenVehicule(h.vehicule_id)}
                          style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
                        >
                          <View
                            style={[
                              styles.etatMiniDot,
                              { backgroundColor: cfg?.color ?? theme.textMuted },
                            ]}
                          />
                          <View style={styles.listBody}>
                            <Text style={styles.listTitle} numberOfLines={1}>
                              {h.vehicleModel || `Véhicule #${h.vehicule_id}`}
                            </Text>
                            <Text style={styles.listMeta}>
                              {labelEtatDashboard(etat)} ·{' '}
                              {formatRelativeDateTime(h.date_changement)}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={theme.textSubtle} />
                        </Pressable>
                      )
                    })
                  )}
                </Panel>

                {permissions.canManageUsers && isGlobalView && teamRows.length > 0 ? (
                  <Panel
                    title={
                      <View style={styles.panelTitleRow}>
                        <Ionicons name="people-outline" size={15} color={theme.textSubtle} />
                        <Text style={styles.panelTitle}>Équipe atelier</Text>
                      </View>
                    }
                    subtitle="Charge hors archivés"
                    action={
                      <Pressable onPress={() => onNavigate('utilisateurs')} hitSlop={8}>
                        <Text style={styles.linkMuted}>Gérer</Text>
                      </Pressable>
                    }
                  >
                    <View style={styles.teamGrid}>
                      {teamRows.map((row) => {
                        const ratio = row.total / maxTeamLoad
                        const accent =
                          row.total === 0 ? '#78716c' : row.urgents > 0 ? '#dc2626' : '#ea580c'
                        return (
                          <Pressable
                            key={row.id}
                            style={[
                              styles.teamCard,
                              {
                                borderColor:
                                  row.urgents > 0
                                    ? '#fecaca'
                                    : 'rgba(0,0,0,0.06)',
                              },
                            ]}
                            onPress={() => setSelectedMember(row)}
                          >
                            <View style={styles.teamCardTop}>
                              <View
                                style={[
                                  styles.teamAvatar,
                                  {
                                    backgroundColor:
                                      row.total === 0
                                        ? '#f3f4f6'
                                        : row.urgents > 0
                                          ? '#fff1f2'
                                          : '#fff7ed',
                                  },
                                ]}
                              >
                                <Text style={[styles.teamAvatarText, { color: accent }]}>
                                  {memberInitial(row.nom)}
                                </Text>
                              </View>
                              <View style={styles.teamCardInfo}>
                                <Text style={styles.teamName} numberOfLines={1}>
                                  {row.nom}
                                </Text>
                                <Text style={styles.teamRole}>{row.role}</Text>
                              </View>
                              <View
                                style={[
                                  styles.teamBadge,
                                  {
                                    backgroundColor:
                                      row.total === 0
                                        ? '#f3f4f6'
                                        : row.urgents > 0
                                          ? '#fff1f2'
                                          : '#ecfdf5',
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.teamBadgeText,
                                    {
                                      color:
                                        row.total === 0
                                          ? theme.textMuted
                                          : row.urgents > 0
                                            ? '#be123c'
                                            : '#047857',
                                    },
                                  ]}
                                >
                                  {row.total === 0 ? 'Libre' : row.urgents > 0 ? 'Urgent' : 'Actif'}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.teamCountRow}>
                              <Text style={styles.teamCount}>{row.total}</Text>
                              <Text style={styles.teamCountLabel}>véh.</Text>
                            </View>
                            <View style={styles.teamBarTrack}>
                              <View
                                style={[
                                  styles.teamBarFill,
                                  {
                                    backgroundColor: accent,
                                    width: `${Math.max(row.total === 0 ? 0 : 8, ratio * 100)}%`,
                                  },
                                ]}
                              />
                            </View>
                          </Pressable>
                        )
                      })}
                    </View>
                  </Panel>
                ) : null}
              </View>
            ) : null}
          </>
        )}
        <View style={styles.footerSpacer} />
      </ScrollView>

      <CenteredSheetShell visible={selectedMember != null} onClose={closeMember} maxWidth={440}>
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
                  style={[styles.teamChip, { color: ETAT_CONFIG[etat].color }]}
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
                      closeMember()
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
                closeMember()
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
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
    paddingTop: 4,
  },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#030712',
    letterSpacing: -0.4,
  },
  headerMeta: { fontSize: 13, color: theme.textMuted, marginTop: 6 },
  headerMetaCap: { textTransform: 'capitalize' },
  headerDot: { color: '#d1d5db' },
  statsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  statsChipText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  block: { marginBottom: 20, gap: 10 },
  kpiPanel: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  kpiCell: { flex: 1, paddingVertical: 16, paddingHorizontal: 8, alignItems: 'center' },
  kpiDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.06)' },
  kpiValue: { fontSize: 26, fontWeight: '700', color: '#030712', letterSpacing: -0.3 },
  kpiLabel: { fontSize: 11, fontWeight: '500', color: theme.textMuted, marginTop: 4 },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  panelHeadText: { flex: 1, minWidth: 0 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  panelSubtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  panelBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.04)' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  linkAction: { fontSize: 12, fontWeight: '600', color: theme.primaryDark },
  linkMuted: { fontSize: 12, fontWeight: '600', color: theme.textMuted },
  empty: {
    fontSize: 13,
    color: theme.textSubtle,
    textAlign: 'center',
    paddingVertical: 28,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  listBody: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  listMeta: { fontSize: 12, color: theme.textSubtle, marginTop: 2 },
  listBadgeRose: { fontSize: 12, fontWeight: '600', color: '#e11d48' },
  listBadgeAmber: { fontSize: 12, fontWeight: '600', color: '#d97706' },
  etatMiniDot: { width: 8, height: 8, borderRadius: 4 },
  etatCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingTop: 14,
    paddingBottom: 12,
  },
  etatCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  etatStrip: { gap: 8, paddingHorizontal: 16 },
  etatChip: {
    width: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#fafafa',
    padding: 10,
  },
  etatChipTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  etatChipLabel: { fontSize: 9, fontWeight: '600', color: theme.textMuted, flex: 1 },
  etatChipCount: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  analyseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  analyseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyseBody: { flex: 1, minWidth: 0 },
  analyseTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  analyseSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12 },
  teamCard: {
    width: '47%',
    flexGrow: 1,
    minWidth: 148,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    backgroundColor: '#fff',
  },
  teamCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  teamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarText: { fontSize: 13, fontWeight: '700' },
  teamCardInfo: { flex: 1, minWidth: 0 },
  teamName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  teamRole: { fontSize: 10, color: theme.textSubtle, marginTop: 1, textTransform: 'capitalize' },
  teamBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  teamBadgeText: { fontSize: 10, fontWeight: '600' },
  teamCountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 8 },
  teamCount: { fontSize: 24, fontWeight: '700', color: '#030712', lineHeight: 26 },
  teamCountLabel: { fontSize: 11, color: theme.textMuted, marginBottom: 2 },
  teamBarTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  teamBarFill: { height: '100%', borderRadius: 999 },
  teamChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  teamChip: {
    fontSize: 9,
    fontWeight: '700',
    backgroundColor: '#fafaf9',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  teamEmptyHint: { fontSize: 12, color: theme.textMuted, textAlign: 'center', paddingVertical: 12 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
  detailSub: { fontSize: 12, color: theme.textMuted, marginTop: 2, marginBottom: 10 },
  detailListTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  vehDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 12,
    marginBottom: 8,
  },
  vehDetailTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  vehPlate: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginTop: 4 },
  vehModel: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.text },
  vehEtat: { fontSize: 11, fontWeight: '700' },
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
  detailCtaText: { fontSize: 14, fontWeight: '600', color: theme.primary },
  pressed: { opacity: 0.88 },
  footerSpacer: { height: 12 },
})
