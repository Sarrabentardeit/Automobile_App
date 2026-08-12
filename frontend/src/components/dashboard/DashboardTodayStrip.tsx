import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  AlertCircle,
  CreditCard,
  ClipboardList,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch } from '@/lib/api'
import { cn } from '@/lib/utils'

type Period = 'day' | 'week' | 'month'

type TodayResponse = {
  period: Period
  date: string
  start: string
  end: string
  year: number
  month: number
  items: {
    rdv: { count: number }
    reclamations: { count: number }
    dettes: { count: number; total: number }
    devis: { count: number }
    clients: { count: number }
  }
}

const TABS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Aujourd’hui' },
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Par mois' },
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

function formatRangeLabel(period: Period, data: TodayResponse | null, month: number, year: number) {
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

export default function DashboardTodayStrip() {
  const { getAccessToken, permissions } = useAuth()
  const navigate = useNavigate()
  const now = useMemo(() => new Date(), [])
  const [period, setPeriod] = useState<Period>('day')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<TodayResponse | null>(null)

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
    const token = getAccessToken()
    if (!token) return
    try {
      const params: Record<string, string | number> = { period }
      if (period === 'month') {
        params.year = year
        params.month = month
      }
      const res = await apiFetch<TodayResponse>('/vehicules/dashboard-today', { token, params })
      setData(res)
    } catch {
      setData(null)
    }
  }, [getAccessToken, period, year, month])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(id)
  }, [load])

  const hintRdv =
    period === 'day' ? 'aujourd’hui' : period === 'week' ? 'cette semaine' : 'ce mois'
  const hintSav = period === 'day' ? 'ouverts' : 'ouverts · période'
  const hintDevis = period === 'day' ? 'en attente' : 'en attente · période'
  const hintClients =
    period === 'day' ? 'nouveaux' : period === 'week' ? 'nouveaux · semaine' : 'nouveaux · mois'

  const tiles = useMemo(() => {
    const i = data?.items
    const list = [
      {
        key: 'rdv',
        label: 'RDV',
        value: i?.rdv.count ?? null,
        hint: hintRdv,
        icon: CalendarDays,
        href: '/calendar',
        accent: 'text-indigo-600 bg-indigo-50',
        show: true,
        alert: (i?.rdv.count ?? 0) > 0,
      },
      {
        key: 'reclamations',
        label: 'SAV',
        value: i?.reclamations.count ?? null,
        hint: hintSav,
        icon: AlertCircle,
        href: '/reclamation',
        accent: 'text-rose-600 bg-rose-50',
        show: true,
        alert: (i?.reclamations.count ?? 0) > 0,
      },
      {
        key: 'dettes',
        label: 'Dettes',
        value: i?.dettes.count ?? null,
        hint: i?.dettes.total ? `${formatDt(i.dettes.total)} DT` : 'clients',
        icon: CreditCard,
        href: '/clients/dettes',
        accent: 'text-amber-700 bg-amber-50',
        show: Boolean(permissions?.canViewFinance),
        alert: (i?.dettes.count ?? 0) > 0,
      },
      {
        key: 'devis',
        label: 'Devis',
        value: i?.devis.count ?? null,
        hint: hintDevis,
        icon: ClipboardList,
        href: '/devis',
        accent: 'text-cyan-700 bg-cyan-50',
        show: Boolean(permissions?.canViewFinance),
        alert: (i?.devis.count ?? 0) > 0,
      },
      {
        key: 'clients',
        label: 'Clients',
        value: i?.clients.count ?? null,
        hint: hintClients,
        icon: Users,
        href: '/clients',
        accent: 'text-emerald-700 bg-emerald-50',
        show: true,
        alert: (i?.clients.count ?? 0) > 0,
      },
    ]
    return list.filter(t => t.show)
  }, [data, permissions?.canViewFinance, hintRdv, hintSav, hintDevis, hintClients])

  const cols =
    tiles.length <= 3
      ? 'grid-cols-3'
      : tiles.length === 4
        ? 'grid-cols-2 sm:grid-cols-4'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-3 sm:px-4 py-2.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white border border-gray-200/80 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={cn(
                'h-7 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-colors',
                period === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 justify-end">
          {period === 'month' ? (
            <>
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                disabled={!canGoPrev}
                className="h-7 w-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-30"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] sm:text-xs font-bold text-gray-800 min-w-[6.5rem] text-center tabular-nums">
                {formatRangeLabel(period, data, month, year)}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={!canGoNext}
                className="h-7 w-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600 disabled:opacity-30"
                aria-label="Mois suivant"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <span className="text-[10px] sm:text-[11px] text-slate-400 tabular-nums font-medium">
              {formatRangeLabel(period, data, month, year)}
            </span>
          )}
        </div>
      </div>

      <div className={cn('grid divide-x divide-y sm:divide-y-0 divide-gray-100', cols)}>
        {tiles.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate(t.href)}
              className="px-3.5 py-3 sm:py-3.5 text-left hover:bg-slate-50/90 transition-colors focus:outline-none focus:bg-slate-50"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    t.accent
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-lg sm:text-xl font-extrabold text-gray-900 tabular-nums leading-none">
                      {t.value == null ? '—' : t.value}
                    </p>
                    {t.alert ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{t.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{t.hint}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
