import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useUsers } from '@/contexts/UsersContext'
import { ETAT_CONFIG, type EtatVehicule, type Vehicule } from '@/types'
import Modal from '@/components/ui/Modal'
import DashboardMonthlyStats from '@/components/dashboard/DashboardMonthlyStats'
import DashboardInsights, {
  DashboardAlertsPanel,
  DashboardInsightsProvider,
} from '@/components/dashboard/DashboardInsights'
import DashboardTodayStrip from '@/components/dashboard/DashboardTodayStrip'
import { Users, ArrowRight, ArrowUpRight } from 'lucide-react'
import { daysSince, getActiveEquipeUsers, cn, stripVehiculeAssigneesMeta } from '@/lib/utils'
import { formatRelativeDateTime } from '@/lib/formatRelativeDate'
import { apiFetch } from '@/lib/api'

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

function isAssignedTo(
  v: {
    technicien_id: number | null
    responsable_id?: number | null
    technicien_ids?: number[]
    responsable_ids?: number[]
  },
  userId: number
) {
  return (
    v.technicien_id === userId ||
    v.responsable_id === userId ||
    (v.technicien_ids ?? []).includes(userId) ||
    (v.responsable_ids ?? []).includes(userId)
  )
}

function labelEtat(etat: EtatVehicule) {
  return etat === 'rouge' ? 'À RÉSOUDRE' : ETAT_CONFIG[etat].label
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: ReactNode
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-2xl bg-white border border-black/[0.06] overflow-hidden',
        className
      )}
    >
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-gray-900">{title}</h2>
          {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="border-t border-black/[0.04]">{children}</div>
    </section>
  )
}

function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-sm text-gray-400 text-center">{children}</p>
}

export default function DashboardPage() {
  const { user, permissions, getAccessToken } = useAuth()
  const { vehicules, dashboardSummary, fetchDashboardSummary, fetchStats } = useVehiculesContext()
  const { users } = useUsers()
  const navigate = useNavigate()
  const [selectedMember, setSelectedMember] = useState<TeamMemberDetail | null>(null)
  const [memberVehicles, setMemberVehicles] = useState<Vehicule[]>([])
  const [memberVehiclesLoading, setMemberVehiclesLoading] = useState(false)

  const isGlobalView = permissions?.vehiculeVisibility === 'all'
  const myVehicules = useMemo(() => {
    if (!user || !permissions) return []
    if (permissions.vehiculeVisibility === 'all') return vehicules
    if (permissions.vehiculeVisibility === 'own') {
      return vehicules.filter(v => isAssignedTo(v, user.id))
    }
    return []
  }, [user, permissions, vehicules])

  const equipeUsers = useMemo(() => getActiveEquipeUsers(users ?? []), [users])

  const teamRows = useMemo(() => {
    return equipeUsers
      .map(tech => {
        const detail = dashboardSummary?.teamLoadDetailByTechnicien?.[String(tech.id)]
        const activeVehicules = myVehicules.filter(
          v => v.etat_actuel !== 'vert' && isAssignedTo(v, tech.id)
        )
        const total = isGlobalView
          ? (dashboardSummary?.teamLoadByTechnicien?.[String(tech.id)] ?? detail?.total ?? 0)
          : activeVehicules.length
        const byEtat = isGlobalView
          ? (detail?.byEtat ?? {})
          : activeVehicules.reduce<Record<string, number>>((acc, v) => {
              acc[v.etat_actuel] = (acc[v.etat_actuel] ?? 0) + 1
              return acc
            }, {})
        const urgentsCount = isGlobalView
          ? (detail?.urgents ?? 0)
          : activeVehicules.filter(v => v.etat_actuel === 'rouge').length
        return {
          id: tech.id,
          nom: tech.nom_complet,
          role: tech.role,
          total,
          byEtat,
          urgents: urgentsCount,
        } satisfies TeamMemberDetail
      })
      .sort((a, b) => b.total - a.total || a.nom.localeCompare(b.nom, 'fr'))
  }, [equipeUsers, dashboardSummary, isGlobalView, myVehicules])

  useEffect(() => {
    void fetchDashboardSummary({ force: true })
    void fetchStats(undefined, undefined, { force: true })
    const id = window.setInterval(() => {
      void fetchDashboardSummary({ force: true })
      void fetchStats(undefined, undefined, { force: true })
    }, 90_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void fetchDashboardSummary({ force: true })
        void fetchStats(undefined, undefined, { force: true })
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchDashboardSummary, fetchStats])

  useEffect(() => {
    if (!selectedMember) return
    const fresh = teamRows.find(r => r.id === selectedMember.id)
    if (fresh) setSelectedMember(fresh)
  }, [teamRows]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedMember) {
      setMemberVehicles([])
      return
    }
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    setMemberVehiclesLoading(true)
    void (async () => {
      try {
        const res = await apiFetch<{ data: Vehicule[] }>('/vehicules', {
          token,
          params: {
            technicien_id: selectedMember.id,
            exclude_etat: 'vert',
            page: 1,
            limit: 50,
          },
        })
        if (!cancelled) setMemberVehicles(Array.isArray(res.data) ? res.data : [])
      } catch {
        if (!cancelled) {
          setMemberVehicles(
            myVehicules.filter(v => v.etat_actuel !== 'vert' && isAssignedTo(v, selectedMember.id))
          )
        }
      } finally {
        if (!cancelled) setMemberVehiclesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedMember?.id, getAccessToken, myVehicules]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !permissions) return null

  const urgents = isGlobalView
    ? (dashboardSummary?.urgents ?? [])
    : myVehicules.filter(v => v.etat_actuel === 'rouge')
  const anciens = isGlobalView
    ? (dashboardSummary?.anciens ?? [])
    : myVehicules.filter(v => daysSince(v.date_entree) > 7 && v.etat_actuel !== 'vert')

  const recentActivity = (dashboardSummary?.recentActivity ?? []).slice(0, 8)
  const maxLoad = Math.max(1, ...teamRows.map(r => r.total))

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
    <DashboardInsightsProvider>
      <div className="mx-auto w-full max-w-[1280px] space-y-8 pb-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-1">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em] mb-1.5">
              Vue d’ensemble
            </p>
            <h1 className="text-[28px] sm:text-[32px] font-semibold text-gray-950 tracking-tight leading-none">
              {permissions.vehiculeVisibility === 'own' ? 'Mes véhicules' : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-2 capitalize">
              {todayLabel}
              <span className="text-gray-300 mx-2">·</span>
              <span className="normal-case">{user.nom_complet}</span>
            </p>
          </div>
          {permissions.canManageUsers ? (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-sm font-medium text-gray-600 hover:text-gray-950 px-3.5 py-2 rounded-full border border-black/[0.08] bg-white hover:bg-gray-50 transition-colors"
            >
              Statistiques globales
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </header>

        {/* KPIs */}
        <DashboardInsights showAlerts={false} />

        {/* Priorités */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em] mb-3 px-0.5">
            Priorités
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            <Panel
              title={
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Urgents
                </span>
              }
              subtitle={`${urgents.length} à traiter`}
              action={
                <button
                  type="button"
                  onClick={() => navigate('/vehicules?etat=rouge')}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                >
                  Voir tout <ArrowRight className="w-3 h-3" />
                </button>
              }
            >
              <div className="max-h-60 overflow-y-auto divide-y divide-black/[0.04]">
                {urgents.length === 0 ? (
                  <EmptyRow>Rien d’urgent</EmptyRow>
                ) : (
                  urgents.slice(0, 5).map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => navigate(`/vehicules/${v.id}`)}
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50/80 text-left transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{v.modele}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{v.immatriculation}</p>
                      </div>
                      <span className="text-xs font-medium text-rose-600 tabular-nums">
                        {daysSince(v.date_entree)}j
                      </span>
                    </button>
                  ))
                )}
              </div>
            </Panel>

            <Panel
              title={
                <span className="inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Anciens
                </span>
              }
              subtitle={`${anciens.length} depuis plus de 7 jours`}
            >
              <div className="max-h-60 overflow-y-auto divide-y divide-black/[0.04]">
                {anciens.length === 0 ? (
                  <EmptyRow>Aucun ancien</EmptyRow>
                ) : (
                  anciens.slice(0, 5).map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => navigate(`/vehicules/${v.id}`)}
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50/80 text-left transition-colors"
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ETAT_CONFIG[v.etat_actuel].color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{v.modele}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {v.immatriculation} · {labelEtat(v.etat_actuel)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-amber-600 tabular-nums">
                        {daysSince(v.date_entree)}j
                      </span>
                    </button>
                  ))
                )}
              </div>
            </Panel>

            <div className="lg:col-span-2 xl:col-span-1">
              <DashboardAlertsPanel />
            </div>
          </div>
        </div>

        {/* Aujourd’hui */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em] mb-3 px-0.5">
            Opérationnel
          </p>
          <DashboardTodayStrip />
        </div>

        {/* Analyse */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em] mb-3 px-0.5">
            Analyse
          </p>
          <DashboardMonthlyStats />
        </div>

        {/* Suivi */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-[0.08em] mb-3 px-0.5">
            Suivi
          </p>
          <div
            className={cn(
              'grid grid-cols-1 gap-4 items-start',
              permissions.canManageUsers && 'xl:grid-cols-[0.9fr_1.1fr]'
            )}
          >
            <Panel
              title="Activité récente"
              subtitle="Changements d’état"
            >
              <div className="max-h-72 overflow-y-auto divide-y divide-black/[0.04]">
                {recentActivity.length === 0 ? (
                  <EmptyRow>Aucune activité</EmptyRow>
                ) : (
                  recentActivity.map((h, i) => {
                    const etat = (h.etat_nouveau as EtatVehicule) || 'orange'
                    const cfg = ETAT_CONFIG[etat]
                    return (
                      <button
                        key={`${h.id}-${i}`}
                        type="button"
                        onClick={() => navigate(`/vehicules/${h.vehicule_id}`)}
                        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/80 text-left transition-colors group"
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg?.color ?? '#94a3b8' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {h.vehicleModel || `Véhicule #${h.vehicule_id}`}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs text-gray-500">{labelEtat(etat)}</span>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">
                              {formatRelativeDateTime(h.date_changement)}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                      </button>
                    )
                  })
                )}
              </div>
            </Panel>

            {permissions.canManageUsers ? (
              <Panel
                title={
                  <span className="inline-flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    Équipe atelier
                  </span>
                }
                subtitle="Charge hors archivés"
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/utilisateurs')}
                    className="text-xs font-medium text-gray-500 hover:text-gray-900 inline-flex items-center gap-1"
                  >
                    Gérer <ArrowRight className="w-3 h-3" />
                  </button>
                }
              >
                <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {teamRows.map(row => {
                    const loadRatio = row.total / maxLoad
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setSelectedMember(row)}
                        className={cn(
                          'text-left rounded-xl border p-3.5 transition-colors hover:bg-gray-50/90',
                          row.urgents > 0 ? 'border-rose-200/80' : 'border-black/[0.06]'
                        )}
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                              row.urgents > 0
                                ? 'bg-rose-50 text-rose-700'
                                : row.total > 0
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'bg-gray-100 text-gray-500'
                            )}
                          >
                            {row.nom.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{row.nom}</p>
                            <p className="text-[11px] text-gray-400 capitalize">{row.role}</p>
                          </div>
                          <span
                            className={cn(
                              'text-[10px] font-medium px-2 py-0.5 rounded-full',
                              row.total === 0
                                ? 'bg-gray-100 text-gray-500'
                                : row.urgents > 0
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            )}
                          >
                            {row.total === 0 ? 'Libre' : row.urgents > 0 ? 'Urgent' : 'Actif'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-semibold text-gray-950 tabular-nums tracking-tight">
                            {row.total}
                          </span>
                          <span className="text-xs text-gray-400">véh.</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              row.urgents > 0
                                ? 'bg-rose-400'
                                : row.total > 0
                                  ? 'bg-orange-400'
                                  : 'bg-gray-200'
                            )}
                            style={{
                              width: `${Math.max(row.total === 0 ? 0 : 8, loadRatio * 100)}%`,
                            }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </Panel>
            ) : null}
          </div>
        </div>

        <Modal
          open={selectedMember != null}
          onClose={closeMember}
          title={selectedMember?.nom ?? 'Membre'}
          subtitle={
            selectedMember
              ? `${selectedMember.total} véhicule(s) actif(s) · hors archivés`
              : undefined
          }
          maxWidth="lg"
        >
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {ETATS_ACTIFS.map(etat => {
                  const n = selectedMember.byEtat[etat] ?? 0
                  if (n <= 0) return null
                  return (
                    <span
                      key={etat}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        color: ETAT_CONFIG[etat].color,
                        borderColor: `${ETAT_CONFIG[etat].color}33`,
                        backgroundColor: `${ETAT_CONFIG[etat].color}10`,
                      }}
                    >
                      {n} {labelEtat(etat)}
                    </span>
                  )
                })}
              </div>

              {memberVehiclesLoading ? (
                <p className="text-sm text-gray-500 py-8 text-center">Chargement…</p>
              ) : memberVehicles.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Aucun véhicule actif</p>
              ) : (
                <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {memberVehicles.map(v => {
                    const etat = v.etat_actuel as EtatVehicule
                    const cfg = ETAT_CONFIG[etat]
                    const defaut = stripVehiculeAssigneesMeta(v.defaut || v.notes || '').trim()
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            closeMember()
                            navigate(`/vehicules/${v.id}`)
                          }}
                          className="w-full text-left rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                              style={{ backgroundColor: cfg?.color ?? '#a8a29e' }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {v.modele || '—'}
                                </p>
                                <span className="text-[10px] font-medium text-gray-500">
                                  {cfg ? labelEtat(etat) : v.etat_actuel}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{v.immatriculation}</p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                Entrée {v.date_entree || '—'} · {daysSince(v.date_entree)} j
                              </p>
                              {defaut ? (
                                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{defaut}</p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="flex justify-end pt-2 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedMember.id
                    closeMember()
                    navigate(`/vehicules?technicien=${id}`)
                  }}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700"
                >
                  Voir dans Véhicules →
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </DashboardInsightsProvider>
  )
}
