import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Minus,
  Package,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type KpiDelta = {
  value: number | null
  prev: number | null
  delta: number | null
  deltaPct: number | null
  betterWhenDown?: boolean
}

type SparkPoint = {
  date: string
  label: string
  entrees: number
  valides: number
}

type AlertItem = {
  id: string
  type: 'urgent' | 'ancien' | 'stock'
  severity: 'high' | 'medium' | 'low'
  title: string
  subtitle: string
  href: string
  count?: number
}

type InsightsResponse = {
  year: number
  month: number
  kpis: {
    entrees: KpiDelta
    valides: KpiDelta
    aResoudre: KpiDelta
    tempsMoyenJours: KpiDelta
  }
  sparkline: SparkPoint[]
  alerts: AlertItem[]
}

function DeltaBadge({
  delta,
  deltaPct,
  betterWhenDown,
}: {
  delta: number | null
  deltaPct: number | null
  betterWhenDown?: boolean
}) {
  if (delta == null || deltaPct == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-400">
        <Minus className="w-3 h-3" />
        —
      </span>
    )
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-gray-400">
        <Minus className="w-3 h-3" />
        0%
      </span>
    )
  }
  const up = delta > 0
  const good = betterWhenDown ? !up : up
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
        good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      )}
    >
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? '+' : ''}
      {deltaPct}%
    </span>
  )
}

function MiniSpark({
  data,
  dataKey,
  color,
}: {
  data: SparkPoint[]
  dataKey: 'entrees' | 'valides'
  color: string
}) {
  return (
    <div className="h-10 w-full min-w-[72px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#spark-${dataKey})`}
            strokeWidth={1.8}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const MOIS_LABELS = [
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

type Props = {
  showKpis?: boolean
  showAlerts?: boolean
  className?: string
}

export default function DashboardInsights({
  showKpis = true,
  showAlerts = true,
  className,
}: Props) {
  const { getAccessToken, user, permissions } = useAuth()
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const canGoNext = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)
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
    const token = getAccessToken()
    if (!token) return
    try {
      const params: Record<string, string | number> = { year, month }
      if (permissions?.vehiculeVisibility === 'own' && user) {
        params.technicien_id = user.id
      }
      const res = await apiFetch<InsightsResponse>('/vehicules/dashboard-insights', {
        token,
        params,
      })
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, permissions?.vehiculeVisibility, user, year, month])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 45_000)
    return () => window.clearInterval(id)
  }, [load])

  const spark = data?.sparkline ?? []
  const moisLabel = `${MOIS_LABELS[month - 1]} ${year}`

  const cards = useMemo(() => {
    const k = data?.kpis
    return [
      {
        key: 'entrees',
        label: 'Entrées',
        value: k?.entrees.value,
        delta: k?.entrees.delta ?? null,
        deltaPct: k?.entrees.deltaPct ?? null,
        icon: Car,
        tone: 'bg-sky-50 text-sky-700',
        sparkKey: 'entrees' as const,
        sparkColor: '#0ea5e9',
        href: '/vehicules',
      },
      {
        key: 'valides',
        label: 'Validés',
        value: k?.valides.value,
        delta: k?.valides.delta ?? null,
        deltaPct: k?.valides.deltaPct ?? null,
        icon: CheckCircle2,
        tone: 'bg-emerald-50 text-emerald-700',
        sparkKey: 'valides' as const,
        sparkColor: '#22c55e',
        href: '/vehicules/archives',
      },
      {
        key: 'temps',
        label: 'Temps moy. atelier',
        value: k?.tempsMoyenJours.value,
        delta: k?.tempsMoyenJours.delta ?? null,
        deltaPct:
          k?.tempsMoyenJours.prev && k.tempsMoyenJours.prev > 0 && k.tempsMoyenJours.delta != null
            ? Math.round((k.tempsMoyenJours.delta / k.tempsMoyenJours.prev) * 1000) / 10
            : null,
        betterWhenDown: true,
        icon: Clock3,
        tone: 'bg-violet-50 text-violet-700',
        suffix: 'j',
        href: null as string | null,
      },
      {
        key: 'urgence',
        label: 'À résoudre',
        value: k?.aResoudre.value,
        delta: null,
        deltaPct: null,
        icon: AlertTriangle,
        tone: 'bg-rose-50 text-rose-700',
        href: '/vehicules?etat=rouge',
        live: true,
      },
    ]
  }, [data])

  const alertIcon = (type: AlertItem['type']) => {
    if (type === 'urgent') return ShieldAlert
    if (type === 'stock') return Package
    return Clock3
  }

  return (
    <div className={cn('space-y-4', className)}>
      {showKpis ? (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Indicateurs mois
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                className="h-8 w-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[7.5rem] text-center text-sm font-bold text-gray-900 tabular-nums px-1">
                {moisLabel}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={!canGoNext}
                className="h-8 w-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {cards.map(card => {
              const Icon = card.icon
              const display =
                loading && !data
                  ? '—'
                  : card.value == null
                    ? '—'
                    : `${card.value}${card.suffix ?? ''}`
              const body = (
                <>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.tone)}>
                      <Icon className="w-4 h-4" />
                    </span>
                    {'live' in card && card.live ? (
                      <span className="text-[10px] font-semibold text-gray-400">live</span>
                    ) : (
                      <DeltaBadge
                        delta={card.delta}
                        deltaPct={card.deltaPct}
                        betterWhenDown={card.betterWhenDown}
                      />
                    )}
                  </div>
                  <p className="text-2xl sm:text-[1.75rem] font-extrabold text-gray-900 tabular-nums leading-none">
                    {display}
                  </p>
                  <p className="text-[11px] text-gray-500 font-medium mt-1">{card.label}</p>
                  {card.sparkKey ? (
                    <div className="mt-2 -mb-1">
                      <MiniSpark data={spark} dataKey={card.sparkKey} color={card.sparkColor!} />
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400 mt-2">
                      {'live' in card && card.live
                        ? 'Stock actuel'
                        : data?.kpis.tempsMoyenJours.prev != null
                          ? `Mois préc. ${data.kpis.tempsMoyenJours.prev} j`
                          : 'Entrée → sortie'}
                    </p>
                  )}
                </>
              )
              return card.href ? (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => navigate(card.href!)}
                  className="text-left rounded-2xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                >
                  {body}
                </button>
              ) : (
                <div
                  key={card.key}
                  className="rounded-2xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm"
                >
                  {body}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {showAlerts ? (
        <section className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Alertes</h2>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              {data?.alerts?.length ?? 0} active{(data?.alerts?.length ?? 0) > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {loading && !data ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">…</p>
            ) : (data?.alerts.length ?? 0) === 0 ? (
              <p className="px-4 py-6 text-sm text-emerald-600 text-center font-medium">
                Aucune alerte
              </p>
            ) : (
              data!.alerts.map(a => {
                const Icon = alertIcon(a.type)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => navigate(a.href)}
                    className="w-full px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-slate-50/80 text-left transition-colors"
                  >
                    <span
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        a.severity === 'high'
                          ? 'bg-rose-50 text-rose-600'
                          : a.type === 'stock'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-orange-50 text-orange-700'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900 truncate">
                        {a.title}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">{a.subtitle}</span>
                    </span>
                    {a.count != null ? (
                      <span className="text-sm font-extrabold text-gray-900 tabular-nums">
                        {a.count}
                      </span>
                    ) : null}
                  </button>
                )
              })
            )}
          </div>
        </section>
      ) : null}
    </div>
  )
}

/** Bloc alertes seul (pour layouts dashboard en colonnes). */
export function DashboardAlertsPanel({ className }: { className?: string }) {
  return <DashboardInsights showKpis={false} showAlerts className={className} />
}
