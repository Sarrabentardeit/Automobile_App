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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { ETAT_CONFIG, type EtatVehicule } from '@/types'
import { cn } from '@/lib/utils'

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
  'sous_traitance',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'vert',
  'retour',
]

const ETAT_LABEL_SHORT: Record<EtatVehicule, string> = {
  orange: 'En cours',
  mauve: 'Att. pièces',
  sous_traitance: 'Sous-trait.',
  attente_client: 'Att. client',
  bleu: 'Test',
  rouge: 'À résoudre',
  remise_cle: 'Remise clé',
  vert: 'Validé',
  retour: 'Retour',
}

const ATELIER_GROUPS: {
  key: string
  label: string
  color: string
  etats: EtatVehicule[]
}[] = [
  { key: 'cours', label: 'En cours', color: '#f97316', etats: ['orange', 'bleu'] },
  {
    key: 'bloques',
    label: 'Bloqués',
    color: '#ef4444',
    etats: ['mauve', 'sous_traitance', 'attente_client', 'rouge'],
  },
  { key: 'prets', label: 'Prêts', color: '#14b8a6', etats: ['remise_cle'] },
  { key: 'retour', label: 'Retours', color: '#0f172a', etats: ['retour'] },
]

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
  const [showEtats, setShowEtats] = useState(false)
  const [showChart, setShowChart] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const sync = () => {
      setShowEtats(mq.matches)
      setShowChart(mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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
    const id = window.setInterval(() => void load(), 90_000)
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

  const atelier = useMemo(() => {
    const groups = ATELIER_GROUPS.map(g => ({
      ...g,
      value: g.etats.reduce((sum, e) => sum + (selected?.byEtat?.[e] ?? 0), 0),
    }))
    const total = groups.reduce((s, g) => s + g.value, 0)
    return { groups, total }
  }, [selected])

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
  const selectedMonthLabel =
    data?.months.find(m => m.month === month)?.label ?? String(month)

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-gray-900">Statistiques mensuelles</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedMonthLabel} {year} · synthèse atelier
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          >
            {(
              data?.months ??
              Array.from({ length: 12 }, (_, i) => ({ month: i + 1, label: String(i + 1) }))
            ).map(m => (
              <option key={m.month} value={m.month}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
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
            className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600"
            aria-label="Mois suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                key: 'entrees',
                label: 'Entrées',
                hint: 'Véhicules entrés ce mois',
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
                hint: 'Urgents en atelier',
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
                hint: 'Sorties / livrés',
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
              <div
                key={card.key}
                className="rounded-xl border border-gray-100 bg-white p-4 flex items-start gap-3"
              >
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
                    card.iconBg
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-700">{card.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.hint}</p>
                  <div className="flex items-end justify-between gap-2 mt-2">
                    <p
                      className={cn(
                        'text-3xl font-extrabold tabular-nums leading-none',
                        card.valueClass
                      )}
                    >
                      {loading && !data ? '—' : card.value}
                    </p>
                    {d ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full',
                          good == null
                            ? 'bg-gray-50 text-gray-400'
                            : good
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                        )}
                        title="Variation vs mois précédent"
                      >
                        {d.delta === 0 ? (
                          <Minus className="w-3.5 h-3.5" />
                        ) : d.delta > 0 ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {d.delta > 0 ? '+' : ''}
                        {d.pct}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">vs mois préc.</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-gray-100 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">Répartition atelier</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {loading && !data
                  ? '…'
                  : `${atelier.total} véhicule${atelier.total !== 1 ? 's' : ''} (hors validés)`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEtats(v => !v)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              {showEtats ? 'Masquer le détail' : 'Voir les états'}
              <ChevronDown className={cn('w-4 h-4 transition-transform', showEtats && 'rotate-180')} />
            </button>
          </div>

          <div className="h-3 rounded-full bg-white border border-gray-100 overflow-hidden flex">
            {atelier.total === 0 ? (
              <div className="h-full w-full bg-gray-100" />
            ) : (
              atelier.groups.map(g =>
                g.value > 0 ? (
                  <div
                    key={g.key}
                    className="h-full transition-all"
                    style={{
                      width: `${(g.value / atelier.total) * 100}%`,
                      backgroundColor: g.color,
                    }}
                    title={`${g.label}: ${g.value}`}
                  />
                ) : null
              )
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {atelier.groups.map(g => (
              <div
                key={g.key}
                className="rounded-lg bg-white border border-gray-100 px-3 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-xs font-medium text-gray-600">{g.label}</span>
                </div>
                <p className="text-xl font-extrabold tabular-nums text-gray-900 mt-1">
                  {loading && !data ? '—' : g.value}
                </p>
              </div>
            ))}
          </div>

          {showEtats ? (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2">
              {ETATS.map(etat => {
                const cfg = ETAT_CONFIG[etat]
                const n = loading && !data ? null : count(etat)
                return (
                  <button
                    key={etat}
                    type="button"
                    title={cfg.description}
                    onClick={() =>
                      navigate(`/vehicules?etat=${etat}&periode=mois_choisi&mois=${moisKey}`)
                    }
                    className={cn(
                      'rounded-xl p-2.5 text-left border transition-all',
                      'bg-white hover:shadow-md active:scale-[0.98]',
                      'border-gray-100 hover:border-gray-200'
                    )}
                  >
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <span
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span className="text-[11px] font-semibold text-gray-600 leading-snug">
                        {ETAT_LABEL_SHORT[etat]}
                      </span>
                    </div>
                    <p
                      className="text-xl font-extrabold tabular-nums leading-none"
                      style={{ color: cfg.color }}
                    >
                      {n === null ? '—' : n}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-gray-100 bg-slate-50/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowChart(v => !v)}
            className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-slate-100/60"
          >
            <div>
              <p className="text-sm font-bold text-gray-800">Entrées / Validés · {year}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {showChart ? 'Cliquez une barre pour changer de mois' : 'Afficher le graphique'}
              </p>
            </div>
            <ChevronDown
              className={cn('w-5 h-5 text-gray-500 transition-transform', showChart && 'rotate-180')}
            />
          </button>
          {showChart ? (
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="h-[220px] sm:h-[280px]">
                {loading && !data ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    Chargement…
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={4} barCategoryGap="18%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#4b5563', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(15,23,42,0.05)' }}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          fontSize: 13,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
                        iconType="circle"
                        iconSize={10}
                      />
                      <Bar
                        dataKey="Entrées"
                        fill="#0ea5e9"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={36}
                        onClick={(_, index) => {
                          if (typeof index === 'number') setMonth(index + 1)
                        }}
                      />
                      <Bar
                        dataKey="Validés"
                        fill="#22c55e"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={36}
                        onClick={(_, index) => {
                          if (typeof index === 'number') setMonth(index + 1)
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
