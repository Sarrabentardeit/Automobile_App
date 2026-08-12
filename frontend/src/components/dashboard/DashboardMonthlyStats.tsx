import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  Car,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Minus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { ETAT_CONFIG, type EtatVehicule } from '@/types'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'

type MonthlyBucket = {
  month: number
  label: string
  labelShort: string
  entrees: number
  valides: number
  aResoudre: number
  byEtat: Record<string, number>
}

type MonthlyResponse = {
  year: number
  generatedAt: string
  months: MonthlyBucket[]
}

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

function labelEtat(etat: EtatVehicule) {
  return etat === 'rouge' ? 'À RÉSOUDRE' : ETAT_CONFIG[etat].label
}

function padMonth(m: number) {
  return String(m).padStart(2, '0')
}

export default function DashboardMonthlyStats() {
  const { getAccessToken, user, permissions } = useAuth()
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<MonthlyResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const years = useMemo(() => {
    const y = now.getFullYear()
    return [y, y - 1, y - 2]
  }, [now])

  const load = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const ownOnly = permissions?.vehiculeVisibility === 'own'
      const params: Record<string, string | number> = { year }
      if (ownOnly && user) params.technicien_id = user.id
      const res = await apiFetch<MonthlyResponse>('/vehicules/dashboard-monthly', {
        token,
        params,
      })
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, year, permissions?.vehiculeVisibility, user])

  useEffect(() => {
    setLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => void load(), 45_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  const selected = useMemo(() => {
    if (!data) return null
    return data.months.find(m => m.month === month) ?? null
  }, [data, month])

  const previous = useMemo(() => {
    if (!data) return null
    if (month > 1) return data.months.find(m => m.month === month - 1) ?? null
    return null
  }, [data, month])

  const mom = (cur: number, prev: number | null | undefined) => {
    if (prev == null) return null
    const delta = cur - prev
    const pct = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round((delta / prev) * 100)
    return { delta, pct }
  }

  const chartData = useMemo(
    () =>
      (data?.months ?? []).map(m => ({
        name: m.labelShort,
        Entrées: m.entrees,
        Validés: m.valides,
      })),
    [data]
  )

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
    if (y < now.getFullYear() - 2) return
    setYear(y)
    setMonth(m)
  }

  const moisKey = `${year}-${padMonth(month)}`
  const count = (etat: EtatVehicule) => selected?.byEtat?.[etat] ?? 0

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-sm sm:text-base font-bold text-gray-900">Statistiques mensuelles</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-8 w-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          >
            {(data?.months ?? Array.from({ length: 12 }, (_, i) => ({ month: i + 1, label: String(i + 1) }))).map(
              m => (
                <option key={m.month} value={m.month}>
                  {m.label}
                </option>
              )
            )}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-8 px-2.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          >
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="h-8 w-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex gap-2.5 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-4 lg:grid-cols-8 sm:overflow-visible -mx-1 px-1 sm:mx-0 sm:px-0">
          {ETATS.map(etat => {
            const cfg = ETAT_CONFIG[etat]
            const n = loading && !data ? null : count(etat)
            return (
              <button
                key={etat}
                type="button"
                onClick={() =>
                  navigate(`/vehicules?etat=${etat}&periode=mois_choisi&mois=${moisKey}`)
                }
                className={cn(
                  'rounded-xl p-3 text-left border transition-all min-w-[104px] flex-shrink-0 sm:min-w-0',
                  'bg-white hover:shadow-md active:scale-[0.98]',
                  'border-gray-100 hover:border-gray-200'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate">
                    {labelEtat(etat)}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold tabular-nums" style={{ color: cfg.color }}>
                  {n === null ? '—' : n}
                </p>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(
            [
              {
                key: 'entrees',
                label: 'Entrées',
                value: selected?.entrees ?? 0,
                mom: mom(selected?.entrees ?? 0, previous?.entrees),
                icon: Car,
                iconBg: 'bg-sky-50 text-sky-600',
                valueClass: 'text-gray-900',
                goodUp: true,
              },
              {
                key: 'aresoudre',
                label: 'À résoudre',
                value: selected?.aResoudre ?? 0,
                mom: mom(selected?.aResoudre ?? 0, previous?.aResoudre),
                icon: AlertTriangle,
                iconBg: 'bg-red-50 text-red-500',
                valueClass: 'text-red-600',
                goodUp: false,
              },
              {
                key: 'valides',
                label: 'Validés',
                value: selected?.valides ?? 0,
                mom: mom(selected?.valides ?? 0, previous?.valides),
                icon: CheckCircle,
                iconBg: 'bg-emerald-50 text-emerald-600',
                valueClass: 'text-emerald-600',
                goodUp: true,
              },
            ] as const
          ).map(card => {
            const Icon = card.icon
            const d = card.mom
            const good =
              d == null || d.delta === 0 ? null : card.goodUp ? d.delta > 0 : d.delta < 0
            return (
              <Card key={card.key} padding="sm" className="!shadow-none border border-gray-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={cn(
                      'w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      card.iconBg
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn('text-lg sm:text-2xl font-bold tabular-nums', card.valueClass)}>
                        {loading && !data ? '—' : card.value}
                      </p>
                      {d ? (
                        <span
                          className={cn(
                            'inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                            good == null
                              ? 'bg-gray-50 text-gray-400'
                              : good
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                          )}
                        >
                          {d.delta === 0 ? (
                            <Minus className="w-3 h-3" />
                          ) : d.delta > 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {d.delta > 0 ? '+' : ''}
                          {d.pct}%
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{card.label}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div className="rounded-xl border border-gray-100 bg-slate-50/50 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">Entrées / Validés · {year}</p>
          </div>
          <div className="h-[200px] sm:h-[220px]">
            {loading && !data ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={2} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(15,23,42,0.04)' }}
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      fontSize: 12,
                      boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="Entrées"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                    onClick={(_, index) => {
                      if (typeof index === 'number') setMonth(index + 1)
                    }}
                  />
                  <Bar
                    dataKey="Validés"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                    onClick={(_, index) => {
                      if (typeof index === 'number') setMonth(index + 1)
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
