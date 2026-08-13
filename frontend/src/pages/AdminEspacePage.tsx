import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useTransactionsFournisseurs } from '@/contexts/TransactionsFournisseursContext'
import { useReclamations } from '@/contexts/ReclamationsContext'
import { useClientsDettes } from '@/contexts/ClientsDettesContext'
import { useMoney } from '@/contexts/MoneyContext'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch } from '@/lib/api'
import Modal from '@/components/ui/Modal'
import {
  BarChart3,
  Car,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { exportPerformanceTechniciensPdf } from '@/lib/exportPerformanceTechniciensPdf'
import StockGlobalPanel from '@/components/dashboard/StockGlobalPanel'
import type { ClientAvecDette } from '@/types'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts'

type StatsTrendPoint = {
  period: string
  caFacture: number
  encaissements: number
  depenses: number
  vehiculesTraites: number
  reclamations: number
  achats: number
  paiementsFournisseurs: number
}

type TechServiceAgg = {
  service_type: string
  label: string
  count: number
  totalMinutes: number
  moyenneMinutes: number
}

type TechTempsVehicule = {
  vehiculeId: number
  immatriculation: string
  modele: string
  marque?: string
  service_type?: string
  serviceLabel?: string
  minutes: number
  lastChange: string
}

type TechTempsEnCours = {
  technicienId: number
  nom: string
  rang?: number
  vehiculesCount: number
  marquesCount?: number
  marques?: { name: string; count: number }[]
  totalMinutes: number
  moyenneMinutes: number
  moyenneHeures: number
  totalHeures: number
  byServiceType?: TechServiceAgg[]
  vehicules?: TechTempsVehicule[]
}

function formatDureeHeures(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

function isInMonth(dateStr: string, year: number, month: number) {
  const [y, m] = dateStr.split('-').map(Number)
  return y === year && m === month
}

function momDelta(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function MomBadge({ current, previous, invert }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
        <Minus className="w-3 h-3" />
        —
      </span>
    )
  }
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-sky-600">
        nouveau
      </span>
    )
  }
  const pct = momDelta(current, previous)
  if (pct == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
        <Minus className="w-3 h-3" />
        —
      </span>
    )
  }
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
        <Minus className="w-3 h-3" />
        0%
      </span>
    )
  }
  const up = pct > 0
  const good = invert ? !up : up
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums',
        good ? 'text-emerald-600' : 'text-rose-600'
      )}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? '+' : ''}
      {pct.toFixed(0)}%
    </span>
  )
}

const STATS_SECTIONS = [
  { id: 'stats-apercu', label: 'Aperçu' },
  { id: 'stats-atelier', label: 'Atelier' },
  { id: 'stats-finance', label: 'Finance' },
  { id: 'stats-equipe', label: 'Équipe' },
] as const

type StatsSectionId = (typeof STATS_SECTIONS)[number]['id']

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-600/90">{eyebrow}</p>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

function MonthYearFilter({
  month,
  year,
  onMonth,
  onYear,
  moisOptions,
  anneeOptions,
  showMonth = true,
}: {
  month: number
  year: number
  onMonth: (m: number) => void
  onYear: (y: number) => void
  moisOptions: number[]
  anneeOptions: number[]
  showMonth?: boolean
}) {
  const go = (delta: number) => {
    if (!showMonth) {
      onYear(year + delta)
      return
    }
    const next = shiftMonth(year, month, delta)
    onYear(next.year)
    onMonth(next.month)
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5 py-1 shadow-sm">
      <button
        type="button"
        onClick={() => go(-1)}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Période précédente"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      {showMonth ? (
        <select
          value={month}
          onChange={e => onMonth(Number(e.target.value))}
          className="px-1.5 py-1 border-0 bg-transparent text-xs font-semibold text-slate-800 capitalize focus:ring-0 max-w-[7.5rem]"
        >
          {moisOptions.map(m => (
            <option key={m} value={m}>
              {new Date(2000, m - 1, 1).toLocaleString('fr-FR', { month: 'long' })}
            </option>
          ))}
        </select>
      ) : null}
      <select
        value={year}
        onChange={e => onYear(Number(e.target.value))}
        className="px-1.5 py-1 border-0 bg-transparent text-xs font-semibold text-slate-800 focus:ring-0"
      >
        {anneeOptions.map(y => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => go(1)}
        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Période suivante"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString('fr-FR', {
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminEspacePage() {
  const navigate = useNavigate()
  const { user, permissions, getAccessToken } = useAuth()
  const toast = useToast()
  const { stats: vehiculeStats, fetchStats } = useVehiculesContext()
  const { transactions } = useTransactionsFournisseurs()
  const { reclamations } = useReclamations()
  const { clients: clientsDettes } = useClientsDettes()
  const { ins: moneyIns, outs: moneyOuts } = useMoney()

  const now = new Date()
  const defaultMonth = now.getMonth() + 1
  const defaultYear = now.getFullYear()
  const [apercuMonth, setApercuMonth] = useState(defaultMonth)
  const [apercuYear, setApercuYear] = useState(defaultYear)
  const [apercuTerminesPrev, setApercuTerminesPrev] = useState(0)
  const [atelierMonth, setAtelierMonth] = useState(defaultMonth)
  const [atelierYear, setAtelierYear] = useState(defaultYear)
  const [atelierTermines, setAtelierTermines] = useState(0)
  const [atelierTerminesPrev, setAtelierTerminesPrev] = useState(0)
  const [financeMonth, setFinanceMonth] = useState(defaultMonth)
  const [financeYear, setFinanceYear] = useState(defaultYear)
  const [equipeMonth, setEquipeMonth] = useState(defaultMonth)
  const [equipeYear, setEquipeYear] = useState(defaultYear)
  const [trendGroupBy, setTrendGroupBy] = useState<'month' | 'quarter'>('month')
  const [trendData, setTrendData] = useState<StatsTrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [techTemps, setTechTemps] = useState<TechTempsEnCours[]>([])
  const [techTempsLoading, setTechTempsLoading] = useState(false)
  const [techTempsExporting, setTechTempsExporting] = useState(false)
  const [techTempsUpdatedAt, setTechTempsUpdatedAt] = useState<Date | null>(null)
  const [selectedTechTemps, setSelectedTechTemps] = useState<TechTempsEnCours | null>(null)
  const [activeSection, setActiveSection] = useState<StatsSectionId>('stats-apercu')
  const pageRef = useRef<HTMLDivElement>(null)
  const moisOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  const anneeOptions = Array.from({ length: 5 }, (_, i) => defaultYear - 2 + i)

  const scrollToSection = useCallback((id: StatsSectionId) => {
    const el = document.getElementById(id)
    if (!el) return
    setActiveSection(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    if (!permissions?.canManageUsers) return
    const nodes = STATS_SECTIONS.map(s => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => n != null
    )
    if (nodes.length === 0) return

    let root: Element | null = pageRef.current?.closest('main') ?? null
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const top = visible[0]?.target
        if (top?.id && STATS_SECTIONS.some(s => s.id === top.id)) {
          setActiveSection(top.id as StatsSectionId)
        }
      },
      {
        root,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.1, 0.25, 0.5],
      }
    )
    nodes.forEach(n => observer.observe(n))
    return () => observer.disconnect()
  }, [permissions?.canManageUsers])

  useEffect(() => {
    if (!permissions?.canManageUsers) return
    fetchStats(apercuMonth, apercuYear)
    const token = getAccessToken()
    if (!token) {
      setApercuTerminesPrev(0)
      return
    }
    const prevApercu = shiftMonth(apercuYear, apercuMonth, -1)
    void (async () => {
      try {
        const prev = await apiFetch<{ terminesCeMois: number }>('/vehicules/stats', {
          token,
          params: { month: prevApercu.month, year: prevApercu.year },
        })
        setApercuTerminesPrev(prev.terminesCeMois ?? 0)
      } catch {
        setApercuTerminesPrev(0)
      }
    })()
  }, [apercuMonth, apercuYear, fetchStats, getAccessToken, permissions?.canManageUsers])

  useEffect(() => {
    if (!permissions?.canManageUsers) {
      setAtelierTermines(0)
      setAtelierTerminesPrev(0)
      return
    }
    const token = getAccessToken()
    if (!token) {
      setAtelierTermines(0)
      setAtelierTerminesPrev(0)
      return
    }
    const prevAtelier = shiftMonth(atelierYear, atelierMonth, -1)
    void (async () => {
      try {
        const [cur, prev] = await Promise.all([
          apiFetch<{ terminesCeMois: number }>('/vehicules/stats', {
            token,
            params: { month: atelierMonth, year: atelierYear },
          }),
          apiFetch<{ terminesCeMois: number }>('/vehicules/stats', {
            token,
            params: { month: prevAtelier.month, year: prevAtelier.year },
          }),
        ])
        setAtelierTermines(cur.terminesCeMois ?? 0)
        setAtelierTerminesPrev(prev.terminesCeMois ?? 0)
      } catch {
        setAtelierTermines(0)
        setAtelierTerminesPrev(0)
      }
    })()
  }, [getAccessToken, atelierMonth, atelierYear, permissions?.canManageUsers])

  useEffect(() => {
    if (!permissions?.canManageUsers) {
      setTrendData([])
      return
    }
    const token = getAccessToken()
    if (!token) {
      setTrendData([])
      return
    }
    void (async () => {
      setTrendLoading(true)
      try {
        const res = await apiFetch<{ data: StatsTrendPoint[] }>('/stats/trends', {
          token,
          params: { year: financeYear, groupBy: trendGroupBy },
        })
        setTrendData(Array.isArray(res.data) ? res.data : [])
      } catch {
        setTrendData([])
      } finally {
        setTrendLoading(false)
      }
    })()
  }, [getAccessToken, financeYear, trendGroupBy, permissions?.canManageUsers])

  const loadTechTemps = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!permissions?.canManageUsers) {
        setTechTemps([])
        return
      }
      const token = getAccessToken()
      if (!token) {
        setTechTemps([])
        return
      }
      if (!opts?.silent) setTechTempsLoading(true)
      try {
        const res = await apiFetch<{ data: TechTempsEnCours[] }>('/stats/performance-techniciens', {
          token,
          params: { year: equipeYear, month: equipeMonth },
        })
        setTechTemps(Array.isArray(res.data) ? res.data : [])
        setTechTempsUpdatedAt(new Date())
      } catch {
        setTechTemps([])
      } finally {
        if (!opts?.silent) setTechTempsLoading(false)
      }
    },
    [getAccessToken, equipeYear, equipeMonth, permissions?.canManageUsers]
  )

  useEffect(() => {
    void loadTechTemps()
  }, [loadTechTemps])

  useEffect(() => {
    if (!permissions?.canManageUsers) return
    const id = window.setInterval(() => {
      void loadTechTemps({ silent: true })
    }, 120_000)
    return () => window.clearInterval(id)
  }, [loadTechTemps, permissions?.canManageUsers])

  useEffect(() => {
    if (!selectedTechTemps) return
    const fresh = techTemps.find(t => t.technicienId === selectedTechTemps.technicienId)
    setSelectedTechTemps(fresh ?? null)
  }, [techTemps]) // eslint-disable-line react-hooks/exhaustive-deps -- sync open modal only when list refreshes

  const techTempsInsights = useMemo(() => {
    if (techTemps.length === 0) return null
    const byVolume = [...techTemps].sort((a, b) => b.vehiculesCount - a.vehiculesCount)
    const withAvg = techTemps.filter(t => t.moyenneMinutes > 0)
    const plusLent = [...withAvg].sort((a, b) => b.moyenneMinutes - a.moyenneMinutes)[0] ?? byVolume[0]
    const totalVeh = techTemps.reduce((s, r) => s + r.vehiculesCount, 0)
    const totalMin = techTemps.reduce((s, r) => s + r.totalMinutes, 0)
    const vehWithTime = techTemps.reduce(
      (s, r) => s + (r.vehicules?.filter(v => v.minutes > 0).length ?? (r.moyenneMinutes > 0 ? r.vehiculesCount : 0)),
      0
    )
    const moyenneEquipe = vehWithTime > 0 ? Math.round(totalMin / vehWithTime) : 0
    return { topVolume: byVolume[0], plusLent, totalVeh, moyenneEquipe, nbTechs: techTemps.length }
  }, [techTemps])

  const trendDataWithBilan = useMemo(
    () => trendData.map(point => ({ ...point, bilan: (point.encaissements ?? 0) - (point.achats ?? 0) })),
    [trendData]
  )

  const apercuPrev = shiftMonth(apercuYear, apercuMonth, -1)
  const financePrev = shiftMonth(financeYear, financeMonth, -1)

  const moneyApercu = useMemo(() => {
    const curIns = (moneyIns ?? []).filter(m => isInMonth(m.date, apercuYear, apercuMonth))
    const curOuts = (moneyOuts ?? []).filter(m => isInMonth(m.date, apercuYear, apercuMonth))
    const prevIns = (moneyIns ?? []).filter(m => isInMonth(m.date, apercuPrev.year, apercuPrev.month))
    const prevOuts = (moneyOuts ?? []).filter(m => isInMonth(m.date, apercuPrev.year, apercuPrev.month))
    const encaissements = curIns.reduce((s, m) => s + (m.amount ?? 0), 0)
    const depenses = curOuts.reduce((s, m) => s + (m.amount ?? 0), 0)
    const encaissementsPrev = prevIns.reduce((s, m) => s + (m.amount ?? 0), 0)
    const depensesPrev = prevOuts.reduce((s, m) => s + (m.amount ?? 0), 0)
    return {
      encaissements,
      depenses,
      solde: encaissements - depenses,
      encaissementsPrev,
      depensesPrev,
      soldePrev: encaissementsPrev - depensesPrev,
      insCount: curIns.length,
      outsCount: curOuts.length,
    }
  }, [moneyIns, moneyOuts, apercuYear, apercuMonth, apercuPrev.year, apercuPrev.month])

  const moneyFinance = useMemo(() => {
    const curIns = (moneyIns ?? []).filter(m => isInMonth(m.date, financeYear, financeMonth))
    const curOuts = (moneyOuts ?? []).filter(m => isInMonth(m.date, financeYear, financeMonth))
    const prevIns = (moneyIns ?? []).filter(m => isInMonth(m.date, financePrev.year, financePrev.month))
    const prevOuts = (moneyOuts ?? []).filter(m => isInMonth(m.date, financePrev.year, financePrev.month))
    const encaissements = curIns.reduce((s, m) => s + (m.amount ?? 0), 0)
    const depenses = curOuts.reduce((s, m) => s + (m.amount ?? 0), 0)
    const encaissementsPrev = prevIns.reduce((s, m) => s + (m.amount ?? 0), 0)
    const depensesPrev = prevOuts.reduce((s, m) => s + (m.amount ?? 0), 0)
    return {
      encaissements,
      depenses,
      solde: encaissements - depenses,
      encaissementsPrev,
      depensesPrev,
      soldePrev: encaissementsPrev - depensesPrev,
    }
  }, [moneyIns, moneyOuts, financeYear, financeMonth, financePrev.year, financePrev.month])

  const transFinance = useMemo(() => {
    const cur = (transactions ?? []).filter(t => isInMonth(t.date, financeYear, financeMonth))
    const achats = cur.filter(t => t.type === 'achat').reduce((s, t) => s + (t.montant ?? 0), 0)
    const revenus = cur.filter(t => t.type === 'revenue').reduce((s, t) => s + (t.montant ?? 0), 0)
    const paiements = cur.filter(t => t.type === 'paiement').reduce((s, t) => s + (t.montant ?? 0), 0)
    return { achats, revenus, paiements, bilan: moneyFinance.encaissements - achats }
  }, [transactions, financeYear, financeMonth, moneyFinance.encaissements])

  const reclamationsApercu = useMemo(() => {
    const cur = (reclamations ?? []).filter(r => isInMonth(r.date, apercuYear, apercuMonth)).length
    const prevCount = (reclamations ?? []).filter(r => isInMonth(r.date, apercuPrev.year, apercuPrev.month)).length
    const open = (reclamations ?? []).filter(r => r.statut === 'ouverte' || r.statut === 'en_cours').length
    return { cur, prevCount, open }
  }, [reclamations, apercuYear, apercuMonth, apercuPrev.year, apercuPrev.month])

  const apercuTrendPoint = trendGroupBy === 'month' && financeYear === apercuYear ? trendData[apercuMonth - 1] : null

  const vehiculesTerminesApercu = vehiculeStats?.terminesCeMois ?? apercuTrendPoint?.vehiculesTraites ?? 0
  const vehiculesTerminesApercuPrev = apercuTerminesPrev
  const vehiculesEnCours = vehiculeStats?.enCours ?? 0
  const aResoudre = vehiculeStats?.byEtat?.rouge ?? 0
  const totalDettesClients = (clientsDettes ?? []).reduce((s: number, c: ClientAvecDette) => s + (c.reste ?? 0), 0)
  const topDettes = [...(clientsDettes ?? [])].sort((a, b) => (b.reste ?? 0) - (a.reste ?? 0)).slice(0, 5)

  const apercuLabel = monthLabel(apercuYear, apercuMonth)
  const atelierLabel = monthLabel(atelierYear, atelierMonth)
  const financeLabel = monthLabel(financeYear, financeMonth)
  const equipeLabel = monthLabel(equipeYear, equipeMonth)
  const updatedLabel = techTempsUpdatedAt
    ? techTempsUpdatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  if (!user || !permissions) return null

  if (!permissions.canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Espace réservé</h2>
        <p className="text-gray-500 mt-1 text-center max-w-sm">
          Seuls les comptes administrateurs peuvent accéder à cette page.
        </p>
      </div>
    )
  }

  const kpis = [
    {
      key: 'encaissements',
      label: 'Encaissements',
      value: `${moneyApercu.encaissements.toFixed(0)} DT`,
      current: moneyApercu.encaissements,
      previous: moneyApercu.encaissementsPrev,
      icon: ArrowUpRight,
      tone: 'emerald' as const,
      href: '/money',
      hint: `${moneyApercu.insCount} entrée(s)`,
    },
    {
      key: 'solde',
      label: 'Solde du mois',
      value: `${moneyApercu.solde.toFixed(0)} DT`,
      current: moneyApercu.solde,
      previous: moneyApercu.soldePrev,
      icon: Wallet,
      tone: moneyApercu.solde >= 0 ? ('emerald' as const) : ('amber' as const),
      href: '/money',
      hint: 'Encaissements − dépenses',
    },
    {
      key: 'dettes',
      label: 'Dettes clients',
      value: `${totalDettesClients.toFixed(0)} DT`,
      current: totalDettesClients,
      previous: null as number | null,
      icon: CreditCard,
      tone: 'rose' as const,
      href: '/clients/dettes',
      hint: `${(clientsDettes ?? []).length} client(s)`,
      live: true,
    },
    {
      key: 'traites',
      label: 'Véhicules traités',
      value: String(vehiculesTerminesApercu),
      current: vehiculesTerminesApercu,
      previous: vehiculesTerminesApercuPrev,
      icon: Car,
      tone: 'sky' as const,
      href: '/vehicules',
      hint: 'Sorties du mois',
    },
    {
      key: 'resoudre',
      label: 'À résoudre',
      value: String(aResoudre),
      current: aResoudre,
      previous: null as number | null,
      icon: AlertTriangle,
      tone: 'red' as const,
      href: '/vehicules?etat=rouge',
      hint: 'Stock live',
      live: true,
      invert: true,
    },
    {
      key: 'reclamations',
      label: 'Réclamations',
      value: String(reclamationsApercu.cur),
      current: reclamationsApercu.cur,
      previous: reclamationsApercu.prevCount,
      icon: AlertTriangle,
      tone: 'orange' as const,
      href: '/reclamation',
      hint: `${reclamationsApercu.open} ouverte(s)`,
      invert: true,
    },
  ]

  const toneStyles = {
    emerald: 'from-emerald-500/10 via-white to-white border-emerald-100',
    amber: 'from-amber-500/10 via-white to-white border-amber-100',
    rose: 'from-rose-500/10 via-white to-white border-rose-100',
    sky: 'from-sky-500/10 via-white to-white border-sky-100',
    red: 'from-red-500/10 via-white to-white border-red-100',
    orange: 'from-orange-500/10 via-white to-white border-orange-100',
  }
  const iconTone = {
    emerald: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-500 text-white',
    sky: 'bg-sky-500 text-white',
    red: 'bg-red-500 text-white',
    orange: 'bg-orange-500 text-white',
  }

  return (
    <div ref={pageRef} className="relative space-y-8 sm:space-y-10 pb-8">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.12),_transparent_55%)]" />

      {/* Header */}
      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600">Analyse</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Statistiques</h1>
        <p className="text-slate-500 text-sm mt-1 max-w-xl">
          Vue décisionnelle du garage — chaque section a son propre filtre de période.
        </p>
      </div>

      {/* Ancres sticky */}
      <nav
        aria-label="Sections statistiques"
        className="sticky top-0 z-20 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-2 bg-gray-50/90 backdrop-blur-md border-b border-slate-200/70"
      >
        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-sm">
          {STATS_SECTIONS.map(section => {
            const active = activeSection === section.id
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'flex-1 min-w-[5.5rem] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all',
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                {section.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* KPIs MoM */}
      <section id="stats-apercu" className="relative scroll-mt-20">
        <SectionHeader
          eyebrow="Aperçu"
          title={`Indicateurs — ${apercuLabel}`}
          subtitle="Comparaison vs mois précédent · clic pour ouvrir le module"
          action={
            <MonthYearFilter
              month={apercuMonth}
              year={apercuYear}
              onMonth={setApercuMonth}
              onYear={setApercuYear}
              moisOptions={moisOptions}
              anneeOptions={anneeOptions}
            />
          }
        />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {kpis.map(kpi => {
            const Icon = kpi.icon
            return (
              <button
                key={kpi.key}
                type="button"
                onClick={() => navigate(kpi.href)}
                className={cn(
                  'group text-left rounded-2xl border bg-gradient-to-br p-4 sm:p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all',
                  toneStyles[kpi.tone]
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shadow-sm', iconTone[kpi.tone])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {kpi.live || kpi.previous === null ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Live</span>
                  ) : (
                    <MomBadge current={kpi.current} previous={kpi.previous} invert={kpi.invert} />
                  )}
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                <p className="text-2xl sm:text-[1.75rem] font-extrabold text-slate-900 tabular-nums mt-1 tracking-tight">
                  {kpi.value}
                </p>
                <p className="text-xs text-slate-500 mt-1.5 group-hover:text-slate-700 transition-colors">{kpi.hint}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Atelier */}
      <section id="stats-atelier" className="scroll-mt-20">
        <SectionHeader
          eyebrow="Atelier"
          title="Stock global"
          subtitle={`Stock live · terminés filtrés sur ${atelierLabel}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                Live
              </span>
              <MonthYearFilter
                month={atelierMonth}
                year={atelierYear}
                onMonth={setAtelierMonth}
                onYear={setAtelierYear}
                moisOptions={moisOptions}
                anneeOptions={anneeOptions}
              />
            </div>
          }
        />
        <StockGlobalPanel title="Stock atelier" />
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">En cours (non livrés)</p>
              <span className="text-[9px] font-bold uppercase text-sky-600">Live</span>
            </div>
            <p className="text-xl font-extrabold text-orange-600 tabular-nums mt-1">{vehiculesEnCours}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Terminés ce mois</p>
              <span className="text-[9px] font-bold uppercase text-orange-600">Mois</span>
            </div>
            <p className="text-xl font-extrabold text-emerald-600 tabular-nums mt-1">{atelierTermines}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 col-span-2 sm:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">vs mois préc.</p>
            <div className="mt-1">
              <MomBadge current={atelierTermines} previous={atelierTerminesPrev} />
            </div>
          </div>
        </div>
      </section>

      {/* Finance */}
      <section id="stats-finance" className="scroll-mt-20">
        <SectionHeader
          eyebrow="Finance"
          title="Tendances & trésorerie"
          subtitle={`Courbes ${financeYear} · détail ${financeLabel}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <MonthYearFilter
                month={financeMonth}
                year={financeYear}
                onMonth={setFinanceMonth}
                onYear={setFinanceYear}
                moisOptions={moisOptions}
                anneeOptions={anneeOptions}
              />
              <select
                value={trendGroupBy}
                onChange={e => setTrendGroupBy(e.target.value as 'month' | 'quarter')}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white shadow-sm"
              >
                <option value="month">Par mois</option>
                <option value="quarter">Par trimestre</option>
              </select>
            </div>
          }
        />

        <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 sm:p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">CA · Encaissements · Dépenses</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendDataWithBilan}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: unknown) => `${Number(value ?? 0).toFixed(2)} DT`} />
                    <Legend />
                    <Line type="monotone" dataKey="caFacture" name="CA facturé" stroke="#0f172a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="encaissements" name="Encaissements" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="bilan" name="Bilan (Ventes − Achats)" stroke="#0f766e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 sm:p-4">
              <p className="text-sm font-semibold text-slate-800 mb-2">Véhicules traités & réclamations</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="vehiculesTraites" name="Véhicules traités" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="reclamations" name="Réclamations" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 sm:p-4 xl:col-span-2">
              <p className="text-sm font-semibold text-slate-800 mb-2">Achats & paiements fournisseurs</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: unknown) => `${Number(value ?? 0).toFixed(2)} DT`} />
                    <Legend />
                    <Line type="monotone" dataKey="achats" name="Achats fournisseurs" stroke="#0284c7" strokeWidth={2} dot={false} />
                    <Line
                      type="monotone"
                      dataKey="paiementsFournisseurs"
                      name="Paiements fournisseurs"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {trendLoading && <p className="text-xs text-slate-500 mt-2">Chargement des courbes…</p>}
            </div>
          </div>

          <div className="border-t border-slate-100 p-4 sm:p-5 space-y-5 bg-gradient-to-b from-white to-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Trésorerie — {financeLabel}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-emerald-700">Encaissements</span>
                    <MomBadge current={moneyFinance.encaissements} previous={moneyFinance.encaissementsPrev} />
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-800 tabular-nums">
                    {moneyFinance.encaissements.toFixed(2)} DT
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-rose-700">Dépenses</span>
                    <MomBadge current={moneyFinance.depenses} previous={moneyFinance.depensesPrev} invert />
                  </div>
                  <p className="text-2xl font-extrabold text-rose-800 tabular-nums">
                    {moneyFinance.depenses.toFixed(2)} DT
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-2xl border p-4',
                    transFinance.bilan >= 0 ? 'border-teal-200 bg-teal-50/40' : 'border-orange-200 bg-orange-50/40'
                  )}
                >
                  <div className="flex items-center gap-2 text-slate-700 mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">Bilan ventes − achats</span>
                  </div>
                  <p
                    className={cn(
                      'text-2xl font-extrabold tabular-nums',
                      transFinance.bilan >= 0 ? 'text-teal-800' : 'text-orange-800'
                    )}
                  >
                    {transFinance.bilan.toFixed(2)} DT
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-2xl border p-4',
                    moneyFinance.solde >= 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-slate-700">Solde</span>
                    <MomBadge current={moneyFinance.solde} previous={moneyFinance.soldePrev} />
                  </div>
                  <p
                    className={cn(
                      'text-2xl font-extrabold tabular-nums',
                      moneyFinance.solde >= 0 ? 'text-emerald-800' : 'text-amber-800'
                    )}
                  >
                    {moneyFinance.solde.toFixed(2)} DT
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Fournisseurs — {financeLabel}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Achats</span>
                    <span className="font-semibold text-slate-900 tabular-nums">{transFinance.achats.toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Revenus fournisseurs</span>
                    <span className="font-semibold text-emerald-700 tabular-nums">{transFinance.revenus.toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600">Paiements</span>
                    <span className="font-semibold text-rose-700 tabular-nums">{transFinance.paiements.toFixed(2)} DT</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-rose-900">Dettes clients</h3>
                    <p className="text-2xl font-extrabold text-rose-800 tabular-nums mt-1">
                      {totalDettesClients.toFixed(2)} DT
                    </p>
                    <p className="text-xs text-rose-600 mt-0.5">Total restant dû</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/clients/dettes')}
                    className="text-sm font-semibold text-rose-700 hover:text-rose-900"
                  >
                    Voir la liste →
                  </button>
                </div>
                {topDettes.length > 0 && (
                  <ul className="mt-4 pt-3 border-t border-rose-100 space-y-1.5">
                    {topDettes.map(c => (
                      <li key={c.id} className="flex justify-between items-center text-sm gap-2">
                        <span className="text-slate-700 truncate">
                          {c.clientName || c.telephoneClient || `Client #${c.id}`}
                        </span>
                        <span className="font-semibold text-rose-800 tabular-nums flex-shrink-0">
                          {c.reste?.toFixed(2) ?? 0} DT
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Équipe */}
      <section id="stats-equipe" className="scroll-mt-20">
        <SectionHeader
          eyebrow="Équipe"
          title="Performance techniciens"
          subtitle={`Période ${equipeLabel} · archives + atelier · clic sur un nom pour le détail`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <MonthYearFilter
                month={equipeMonth}
                year={equipeYear}
                onMonth={setEquipeMonth}
                onYear={setEquipeYear}
                moisOptions={moisOptions}
                anneeOptions={anneeOptions}
              />
              <button
                type="button"
                onClick={() => void loadTechTemps()}
                disabled={techTempsLoading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', techTempsLoading && 'animate-spin')} />
                Actualiser
              </button>
              <button
                type="button"
                onClick={() => {
                  if (techTemps.length === 0) {
                    toast.error('Aucune donnée à exporter pour ce mois')
                    return
                  }
                  setTechTempsExporting(true)
                  void exportPerformanceTechniciensPdf({
                    year: equipeYear,
                    month: equipeMonth,
                    techniciens: techTemps,
                  })
                    .then(() => toast.success('Rapport PDF téléchargé'))
                    .catch(() => toast.error('Échec de l’export PDF'))
                    .finally(() => setTechTempsExporting(false))
                }}
                disabled={techTempsExporting || techTempsLoading || techTemps.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-orange-200 text-sm font-semibold text-orange-800 bg-orange-50 hover:bg-orange-100 disabled:opacity-50"
              >
                <FileDown className={cn('w-3.5 h-3.5', techTempsExporting && 'animate-pulse')} />
                {techTempsExporting ? 'Export…' : 'Exporter PDF'}
              </button>
            </div>
          }
        />

        {updatedLabel && (
          <p className="text-[11px] text-slate-400 mb-3">Sync auto · dernière mise à jour {updatedLabel}</p>
        )}

        {techTempsInsights && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Plus de volume</p>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{techTempsInsights.topVolume.nom}</p>
              <p className="text-xs text-sky-800 tabular-nums">{techTempsInsights.topVolume.vehiculesCount} véhicules</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">Temps moy. plus long</p>
              <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{techTempsInsights.plusLent.nom}</p>
              <p className="text-xs text-orange-800 tabular-nums">
                {formatDureeHeures(techTempsInsights.plusLent.moyenneMinutes)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Équipe</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {techTempsInsights.nbTechs} tech · {techTempsInsights.totalVeh} véh.
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                Moy. {formatDureeHeures(techTempsInsights.moyenneEquipe)} / véhicule
              </p>
            </div>
          </div>
        )}

        {techTempsLoading && techTemps.length === 0 ? (
          <p className="text-xs text-slate-500">Chargement…</p>
        ) : techTemps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-500">
            Aucune donnée pour {equipeLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-3 py-3 font-semibold">Rang</th>
                  <th className="px-3 py-3 font-semibold">Technicien</th>
                  <th className="px-3 py-3 font-semibold text-right">Véhicules</th>
                  <th className="px-3 py-3 font-semibold text-right">Marques</th>
                  <th className="px-3 py-3 font-semibold text-right">Temps moy.</th>
                  <th className="px-3 py-3 font-semibold">Par service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {techTemps.map(row => (
                  <tr
                    key={row.technicienId}
                    className="hover:bg-orange-50/50 cursor-pointer transition-colors align-top"
                    onClick={() => setSelectedTechTemps(row)}
                  >
                    <td className="px-3 py-3 tabular-nums font-bold text-slate-700">{row.rang ?? '—'}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="font-semibold text-orange-700 hover:text-orange-900 hover:underline text-left"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedTechTemps(row)
                        }}
                      >
                        {row.nom}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">
                      {row.vehiculesCount}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-700">{row.marquesCount ?? '—'}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-800 tabular-nums">
                        {row.moyenneMinutes > 0 ? formatDureeHeures(row.moyenneMinutes) : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {(row.byServiceType?.length ?? 0) === 0 ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {row.byServiceType!.map(s => (
                            <span
                              key={s.service_type}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
                              title={`Moy. ${formatDureeHeures(s.moyenneMinutes)}`}
                            >
                              <span className="font-semibold">{s.count}</span> {s.label}
                              {s.moyenneMinutes > 0 && (
                                <span className="text-orange-700 tabular-nums">
                                  · {formatDureeHeures(s.moyenneMinutes)}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={selectedTechTemps != null}
        onClose={() => setSelectedTechTemps(null)}
        title={selectedTechTemps?.nom ?? 'Détail technicien'}
        subtitle={`Performance — ${equipeLabel} · ${selectedTechTemps?.vehiculesCount ?? 0} véhicule(s)`}
        maxWidth="lg"
      >
        {selectedTechTemps && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Véhicules</p>
                <p className="text-lg font-bold tabular-nums">{selectedTechTemps.vehiculesCount}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500 font-semibold">Marques</p>
                <p className="text-lg font-bold tabular-nums">{selectedTechTemps.marquesCount ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-500 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Total
                </p>
                <p className="text-lg font-bold tabular-nums">{formatDureeHeures(selectedTechTemps.totalMinutes)}</p>
              </div>
              <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2">
                <p className="text-[10px] uppercase text-orange-700 font-semibold">Moy. / véhicule</p>
                <p className="text-lg font-bold text-orange-800 tabular-nums">
                  {selectedTechTemps.moyenneMinutes > 0
                    ? formatDureeHeures(selectedTechTemps.moyenneMinutes)
                    : '—'}
                </p>
              </div>
            </div>

            {(selectedTechTemps.byServiceType?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Par type de service</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Service</th>
                        <th className="px-3 py-2 font-semibold text-right">Nb véhicules</th>
                        <th className="px-3 py-2 font-semibold text-right">Temps moyen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedTechTemps.byServiceType!.map(s => (
                        <tr key={s.service_type}>
                          <td className="px-3 py-2 font-medium">{s.label}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{s.count}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-orange-800 font-semibold">
                            {s.moyenneMinutes > 0 ? formatDureeHeures(s.moyenneMinutes) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(selectedTechTemps.vehicules?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">Aucun détail véhicule disponible.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Immatriculation</th>
                      <th className="px-3 py-2 font-semibold">Modèle</th>
                      <th className="px-3 py-2 font-semibold">Service</th>
                      <th className="px-3 py-2 font-semibold text-right">Temps EN COURS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTechTemps.vehicules!.map(v => (
                      <tr key={v.vehiculeId} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTechTemps(null)
                              navigate(`/vehicules/${v.vehiculeId}`)
                            }}
                            className="font-medium text-orange-700 hover:text-orange-900 hover:underline text-left"
                          >
                            {v.immatriculation}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{v.modele}</td>
                        <td className="px-3 py-2 text-slate-600">{v.serviceLabel ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-orange-800">
                          {v.minutes > 0 ? formatDureeHeures(v.minutes) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
