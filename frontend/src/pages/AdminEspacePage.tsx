import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useVehiculesContext } from '@/contexts/VehiculesContext'
import { useClients } from '@/contexts/ClientsContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import { useCaisse } from '@/contexts/CaisseContext'
import { useCalendar } from '@/contexts/CalendarContext'
import { useFournisseurs } from '@/contexts/FournisseursContext'
import { useTransactionsFournisseurs } from '@/contexts/TransactionsFournisseursContext'
import { useReclamations } from '@/contexts/ReclamationsContext'
import { useDemandesDevis } from '@/contexts/DemandesDevisContext'
import { useContactsImportants } from '@/contexts/ContactsImportantsContext'
import { useClientsDettes } from '@/contexts/ClientsDettesContext'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { useOutils } from '@/contexts/OutilsContext'
import { useMoney } from '@/contexts/MoneyContext'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch } from '@/lib/api'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  Shield,
  BarChart3,
  Car,
  Users,
  UserCircle,
  CalendarDays,
  Truck,
  Receipt,
  AlertCircle,
  ClipboardList,
  Phone,
  CreditCard,
  Package,
  Wrench,
  ListTodo,
  Plus,
  Trash2,
  Check,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClientAvecDette } from '@/types'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts'

const STORAGE_KEY = 'elmecano-admin-corrections'

export interface AdminCorrectionItem {
  id: number
  text: string
  done: boolean
  createdAt: string
}

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

function loadCorrections(): AdminCorrectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCorrections(items: AdminCorrectionItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export default function AdminEspacePage() {
  const navigate = useNavigate()
  const { user, permissions, getAccessToken } = useAuth()
  const toast = useToast()
  const { vehicules, stats: vehiculeStats, fetchStats } = useVehiculesContext()
  const { clients, stats: clientStats } = useClients()
  const { members } = useTeamMembers()
  const { days: caisseDays } = useCaisse()
  const { assignments } = useCalendar()
  const { fournisseurs } = useFournisseurs()
  const { transactions } = useTransactionsFournisseurs()
  const { reclamations } = useReclamations()
  const { demandes } = useDemandesDevis()
  const { contacts } = useContactsImportants()
  const { clients: clientsDettes } = useClientsDettes()
  const { mouvements, produits } = useStockGeneral()
  const { outilsMohamed, outilsAhmed } = useOutils()
  const { ins: moneyIns, outs: moneyOuts } = useMoney()

  const now = new Date()
  const [statsMonth, setStatsMonth] = useState(now.getMonth() + 1)
  const [statsYear, setStatsYear] = useState(now.getFullYear())
  const [trendGroupBy, setTrendGroupBy] = useState<'month' | 'quarter'>('month')
  const [trendData, setTrendData] = useState<StatsTrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(false)
  const [corrections, setCorrections] = useState<AdminCorrectionItem[]>(loadCorrections)
  const [newCorrectionText, setNewCorrectionText] = useState('')

  useEffect(() => {
    saveCorrections(corrections)
  }, [corrections])

  const addCorrection = useCallback(() => {
    const text = newCorrectionText.trim()
    if (!text) return
    setCorrections(prev => [
      ...prev,
      { id: Math.max(0, ...prev.map(x => x.id)) + 1, text, done: false, createdAt: new Date().toISOString() },
    ])
    setNewCorrectionText('')
    toast.success('Point ajouté à la liste')
  }, [newCorrectionText, toast])

  const toggleCorrection = useCallback((id: number) => {
    setCorrections(prev => prev.map(x => (x.id === id ? { ...x, done: !x.done } : x)))
  }, [])

  const removeCorrection = useCallback((id: number) => {
    setCorrections(prev => prev.filter(x => x.id !== id))
    toast.success('Point supprimé')
  }, [toast])

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

  useEffect(() => {
    fetchStats(statsMonth, statsYear)
  }, [statsMonth, statsYear, fetchStats])

  useEffect(() => {
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
          params: { year: statsYear, groupBy: trendGroupBy },
        })
        setTrendData(Array.isArray(res.data) ? res.data : [])
      } catch {
        setTrendData([])
      } finally {
        setTrendLoading(false)
      }
    })()
  }, [getAccessToken, statsYear, trendGroupBy])

  const stats = [
    { label: 'Véhicules', value: vehiculeStats?.total ?? (vehicules ?? []).length, icon: Car, href: '/vehicules', color: 'bg-blue-50 text-blue-700' },
    { label: 'Clients', value: clientStats?.total ?? (clients ?? []).length, icon: UserCircle, href: '/clients', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Membres équipe', value: (members ?? []).length, icon: Users, href: '/equipe/membres', color: 'bg-violet-50 text-violet-700' },
    { label: 'Jours caisse', value: (caisseDays ?? []).length, icon: BarChart3, href: '/caisse', color: 'bg-amber-50 text-amber-700' },
    { label: 'Affectations calendrier', value: (assignments ?? []).length, icon: CalendarDays, href: '/calendar', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Fournisseurs', value: (fournisseurs ?? []).length, icon: Truck, href: '/fournisseurs', color: 'bg-orange-50 text-orange-700' },
    { label: 'Transactions fournisseurs', value: (transactions ?? []).length, icon: Receipt, href: '/fournisseurs/transactions', color: 'bg-teal-50 text-teal-700' },
    { label: 'Réclamations', value: (reclamations ?? []).length, icon: AlertCircle, href: '/reclamation', color: 'bg-red-50 text-red-700' },
    { label: 'Demandes devis', value: (demandes ?? []).length, icon: ClipboardList, href: '/devis', color: 'bg-cyan-50 text-cyan-700' },
    { label: 'Contacts importants', value: (contacts ?? []).length, icon: Phone, href: '/contacts-importants', color: 'bg-sky-50 text-sky-700' },
    { label: 'Clients avec dettes', value: (clientsDettes ?? []).length, icon: CreditCard, href: '/clients/dettes', color: 'bg-rose-50 text-rose-700' },
    { label: 'Mouvements stock', value: (mouvements ?? []).length + (produits ?? []).length, icon: Package, href: '/stock-general', color: 'bg-lime-50 text-lime-700' },
    { label: 'Outils Mohamed / Ahmed', value: (outilsMohamed ?? []).length + (outilsAhmed ?? []).length, icon: Wrench, href: '/outils/mohamed', color: 'bg-gray-100 text-gray-700' },
  ]

  const doneCount = corrections.filter(c => c.done).length

  // Stats avancées : filtrer par mois/année
  const isInStatsMonth = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number)
    return y === statsYear && m === statsMonth
  }

  const insThisMonth = (moneyIns ?? []).filter(m => isInStatsMonth(m.date))
  const outsThisMonth = (moneyOuts ?? []).filter(m => isInStatsMonth(m.date))
  const transThisMonth = (transactions ?? []).filter(t => isInStatsMonth(t.date))

  const totalRevenusMois = insThisMonth.reduce((s, m) => s + (m.amount ?? 0), 0)
  const totalDepensesMois = outsThisMonth.reduce((s, m) => s + (m.amount ?? 0), 0)
  const soldeMois = totalRevenusMois - totalDepensesMois

  const achatsFournisseursMois = transThisMonth.filter(t => t.type === 'achat').reduce((s, t) => s + (t.montant ?? 0), 0)
  const revenusFournisseursMois = transThisMonth.filter(t => t.type === 'revenue').reduce((s, t) => s + (t.montant ?? 0), 0)
  const paiementsFournisseursMois = transThisMonth.filter(t => t.type === 'paiement').reduce((s, t) => s + (t.montant ?? 0), 0)

  const totalDettesClients = (clientsDettes ?? []).reduce((s: number, c: ClientAvecDette) => s + (c.reste ?? 0), 0)
  const topDettes = [...(clientsDettes ?? [])].sort((a, b) => (b.reste ?? 0) - (a.reste ?? 0)).slice(0, 5)

  const vehiculesTerminesCeMois = vehiculeStats?.terminesCeMois ?? 0
  const vehiculesEnCours = vehiculeStats?.enCours ?? (vehicules ?? []).filter(v => v.etat_actuel !== 'vert').length

  const moisLabel = `${String(statsMonth).padStart(2, '0')}/${statsYear}`
  const moisOptions = Array.from({ length: 12 }, (_, i) => i + 1)
  const anneeOptions = Array.from({ length: 5 }, (_, i) => statsYear - 2 + i)

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-white" />
          </div>
          Espace Admin
        </h1>
        <p className="text-gray-500 mt-1.5">
          Vue d’ensemble et points à corriger ou améliorer à long terme.
        </p>
      </div>

      {/* Stats — tout voir */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Statistiques globales
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Toutes les données de l’application en un coup d’œil</p>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {stats.map(({ label, value, icon: Icon, href, color }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(href)}
              className="flex items-center sm:items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors group text-left w-full"
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
                <p className="text-[11px] sm:text-xs text-gray-500 leading-snug break-words whitespace-normal">
                  {label}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 ml-auto" />
            </button>
          ))}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50/80 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                Courbes statistiques ({statsYear})
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Évolution CA / encaissements, véhicules, réclamations et fournisseurs.</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={trendGroupBy}
                onChange={e => setTrendGroupBy(e.target.value as 'month' | 'quarter')}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white"
              >
                <option value="month">Par mois</option>
                <option value="quarter">Par trimestre</option>
              </select>
              <select
                value={statsYear}
                onChange={e => setStatsYear(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white"
              >
                {anneeOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-sm font-semibold text-gray-800 mb-2">CA facturé vs Encaissements vs Dépenses</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: unknown) => `${Number(value ?? 0).toFixed(2)} DT`} />
                  <Legend />
                  <Line type="monotone" dataKey="caFacture" name="CA facturé" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="encaissements" name="Encaissements" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <p className="text-sm font-semibold text-gray-800 mb-2">Véhicules traités et réclamations</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="vehiculesTraites" name="Véhicules traités" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="reclamations" name="Réclamations" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-3 xl:col-span-2">
            <p className="text-sm font-semibold text-gray-800 mb-2">Achats et paiements fournisseurs</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: unknown) => `${Number(value ?? 0).toFixed(2)} DT`} />
                  <Legend />
                  <Line type="monotone" dataKey="achats" name="Achats fournisseurs" stroke="#0ea5e9" strokeWidth={2} dot={false} />
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
            <p className="text-xs text-gray-500 mt-2">
              Données réelles backend (PostgreSQL): factures, achats, véhicules traités et réclamations.
            </p>
          </div>
        </div>
        {trendLoading && (
          <div className="px-4 pb-4">
            <p className="text-xs text-gray-500">Chargement des courbes réelles...</p>
          </div>
        )}
      </Card>

      {/* Statistiques avancées — revenus, dépenses, consommation, dettes */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/80 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Statistiques avancées
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Revenus, dépenses, consommation et dettes par mois</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statsMonth}
                onChange={e => setStatsMonth(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white"
              >
                {moisOptions.map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('fr-FR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={statsYear}
                onChange={e => setStatsYear(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 bg-white"
              >
                {anneeOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-6">
          {/* Revenus / Dépenses / Solde */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Trésorerie — {moisLabel}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 mb-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Encaissements</span>
                </div>
                <p className="text-2xl font-bold text-emerald-800 tabular-nums">{totalRevenusMois.toFixed(2)} DT</p>
                <p className="text-xs text-emerald-600 mt-0.5">{insThisMonth.length} entrée(s) ce mois</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                <div className="flex items-center gap-2 text-red-700 mb-1">
                  <ArrowDownRight className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Dépenses</span>
                </div>
                <p className="text-2xl font-bold text-red-800 tabular-nums">{totalDepensesMois.toFixed(2)} DT</p>
                <p className="text-xs text-red-600 mt-0.5">{outsThisMonth.length} sortie(s) ce mois</p>
              </div>
              <div className={cn(
                'rounded-xl border p-4',
                soldeMois >= 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'
              )}>
                <div className="flex items-center gap-2 text-gray-700 mb-1">
                  <Wallet className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase">Solde du mois</span>
                </div>
                <p className={cn('text-2xl font-bold tabular-nums', soldeMois >= 0 ? 'text-emerald-800' : 'text-amber-800')}>
                  {soldeMois.toFixed(2)} DT
                </p>
              </div>
            </div>
          </div>

          {/* Fournisseurs + Véhicules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Fournisseurs — {moisLabel}</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Achats (consommation)</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{achatsFournisseursMois.toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Revenus fournisseurs</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{revenusFournisseursMois.toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">Paiements fournisseurs</span>
                  <span className="font-semibold text-red-700 tabular-nums">{paiementsFournisseursMois.toFixed(2)} DT</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Véhicules</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Terminés ce mois ({moisLabel})</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{vehiculesTerminesCeMois}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">En cours (non livrés)</span>
                  <span className="font-semibold text-orange-700 tabular-nums">{vehiculesEnCours}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dettes clients — à recouvrer */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Dettes clients (à recouvrer)</h3>
            <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-2xl font-bold text-rose-800 tabular-nums">{totalDettesClients.toFixed(2)} DT</p>
                  <p className="text-xs text-rose-600">Total restant dû par les clients</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/clients/dettes')}
                  className="text-sm font-medium text-rose-700 hover:text-rose-800 underline"
                >
                  Voir la liste →
                </button>
              </div>
              {topDettes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-rose-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Top 5 — plus gros restes à recouvrer</p>
                  <ul className="space-y-1.5">
                    {topDettes.map((c, i) => (
                      <li key={c.id} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 truncate max-w-[180px]">{c.clientName || c.telephoneClient || `Client #${c.id}`}</span>
                        <span className="font-semibold text-rose-800 tabular-nums">{c.reste?.toFixed(2) ?? 0} DT</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

     
    </div>
  )
}
