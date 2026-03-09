import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import type { MoneyIn, MoneyOut } from '@/types'
import { MONEY_IN_TYPES, MONEY_OUT_CATEGORIES, MONEY_PAYMENT_METHODS } from '@/types'
import { useMoney } from '@/contexts/MoneyContext'
import { useCharges } from '@/contexts/ChargesContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import {
  Wallet,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  PlusCircle,
  Settings2,
  Trash2,
} from 'lucide-react'

const CUSTOM_IN_TYPES_KEY = 'money-custom-in-types'
const CUSTOM_OUT_CATEGORIES_KEY = 'money-custom-out-categories'

function loadCustomList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveCustomInTypes(types: string[]) {
  localStorage.setItem(CUSTOM_IN_TYPES_KEY, JSON.stringify(types))
}
function saveCustomOutCategories(categories: string[]) {
  localStorage.setItem(CUSTOM_OUT_CATEGORIES_KEY, JSON.stringify(categories))
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function formatAmount(n: number, decimals = 2): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

type Tab = 'all' | 'in' | 'out'

export default function MoneyPage() {
  const { permissions } = useAuth()
  const { members } = useTeamMembers()
  const [period, setPeriod] = useState({ year: 2026, month: 2 })
  const [tab, setTab] = useState<Tab>('all')
  const { ins, outs, addIn, addOut } = useMoney()
  const { charges, totalCharges } = useCharges()
  const [addingIn, setAddingIn] = useState(false)
  const [addingOut, setAddingOut] = useState(false)
  const [newIn, setNewIn] = useState<Omit<MoneyIn, 'id'>>({
    date: '',
    amount: 0,
    type: 'MECA',
    description: '',
    paymentMethod: 'ESPECE',
  })
  const [newOut, setNewOut] = useState<Omit<MoneyOut, 'id'>>({
    date: '',
    amount: 0,
    category: 'GARAGE',
    description: '',
    beneficiary: '',
  })
  const [customInTypes, setCustomInTypes] = useState<string[]>([])
  const [showAddInType, setShowAddInType] = useState(false)
  const [newInTypeLabel, setNewInTypeLabel] = useState('')
  const [customOutCategories, setCustomOutCategories] = useState<string[]>([])
  const [showAddOutCategory, setShowAddOutCategory] = useState(false)
  const [newOutCategoryLabel, setNewOutCategoryLabel] = useState('')
  const [showParamsModal, setShowParamsModal] = useState(false)

  useEffect(() => {
    setCustomInTypes(loadCustomList(CUSTOM_IN_TYPES_KEY))
    setCustomOutCategories(loadCustomList(CUSTOM_OUT_CATEGORIES_KEY))
  }, [])

  const allInTypes = useMemo(() => [...MONEY_IN_TYPES, ...customInTypes], [customInTypes])
  const allOutCategories = useMemo(() => [...MONEY_OUT_CATEGORIES, ...customOutCategories], [customOutCategories])
  const memberNames = useMemo(() => members.map(m => m.name), [members])

  const addCustomInType = () => {
    const label = newInTypeLabel.trim()
    if (!label || allInTypes.some(t => t.toLowerCase() === label.toLowerCase())) return
    const next = [...customInTypes, label]
    setCustomInTypes(next)
    saveCustomInTypes(next)
    setNewIn(prev => ({ ...prev, type: label }))
    setNewInTypeLabel('')
    setShowAddInType(false)
  }

  const addCustomOutCategory = () => {
    const label = newOutCategoryLabel.trim()
    if (!label || allOutCategories.some(c => c.toLowerCase() === label.toLowerCase())) return
    const next = [...customOutCategories, label]
    setCustomOutCategories(next)
    saveCustomOutCategories(next)
    setNewOut(prev => ({ ...prev, category: label }))
    setNewOutCategoryLabel('')
    setShowAddOutCategory(false)
  }

  const removeCustomInType = (label: string) => {
    const next = customInTypes.filter(t => t !== label)
    setCustomInTypes(next)
    saveCustomInTypes(next)
    if (newIn.type === label) setNewIn(prev => ({ ...prev, type: 'MECA' }))
  }
  const removeCustomOutCategory = (label: string) => {
    const next = customOutCategories.filter(c => c !== label)
    setCustomOutCategories(next)
    saveCustomOutCategories(next)
    if (newOut.category === label) setNewOut(prev => ({ ...prev, category: 'GARAGE' }))
  }

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">Vous n'avez pas accès à cette page.</p>
      </div>
    )
  }

  const periodTitle = `${MONTH_NAMES[period.month - 1]} ${period.year}`
  const prevPeriod = () => {
    if (period.month === 1) setPeriod({ year: period.year - 1, month: 12 })
    else setPeriod({ year: period.year, month: period.month - 1 })
  }
  const nextPeriod = () => {
    if (period.month === 12) setPeriod({ year: period.year + 1, month: 1 })
    else setPeriod({ year: period.year, month: period.month + 1 })
  }

  const filteredIns = useMemo(
    () =>
      ins
        .filter(d => {
          const [y, m] = d.date.split('-').map(Number)
          return y === period.year && m === period.month
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [ins, period]
  )
  const filteredOuts = useMemo(
    () =>
      outs
        .filter(d => {
          const [y, m] = d.date.split('-').map(Number)
          return y === period.year && m === period.month
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [outs, period]
  )

  const monthStr = `${period.year}-${period.month.toString().padStart(2, '0')}`
  type ActivityItem = { id: string; date: string; type: 'in' | 'out'; label: string; sublabel: string; amount: number; isCharge?: boolean }
  const activity = useMemo<ActivityItem[]>(() => {
    const inItems: ActivityItem[] = filteredIns.map(r => ({
      id: `in-${r.id}`,
      date: r.date,
      type: 'in',
      label: r.description || r.type,
      sublabel: `${r.type} · ${r.paymentMethod ?? 'ESPECE'}`,
      amount: r.amount,
    }))
    const outItems: ActivityItem[] = filteredOuts.map(r => ({
      id: `out-${r.id}`,
      date: r.date,
      type: 'out',
      label: r.description || r.category,
      sublabel: `${r.category}${r.beneficiary ? ` · ${r.beneficiary}` : ''}`,
      amount: r.amount,
    }))
    const chargeItems: ActivityItem[] = charges.map(c => ({
      id: `charge-${c.id}`,
      date: `${monthStr}-01`,
      type: 'out' as const,
      label: c.name,
      sublabel: 'Charge fixe mensuelle',
      amount: c.amount,
      isCharge: true,
    }))
    return [...inItems, ...outItems, ...chargeItems].sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredIns, filteredOuts, charges, monthStr])

  const totalIn = useMemo(() => roundMoney(filteredIns.reduce((s, r) => s + r.amount, 0)), [filteredIns])
  const totalOutVariable = useMemo(() => roundMoney(filteredOuts.reduce((s, r) => s + r.amount, 0)), [filteredOuts])
  const totalOut = roundMoney(totalOutVariable + totalCharges)
  const balance = roundMoney(totalIn - totalOut)
  const countIn = filteredIns.length
  const countOut = filteredOuts.length
  const countTotal = countIn + countOut
  const moyenneIn = countIn > 0 ? roundMoney(totalIn / countIn) : 0
  const moyenneOut = countOut > 0 ? roundMoney(totalOut / countOut) : 0

  type StatRow = { label: string; total: number; count: number }
  const statsByType = useMemo<StatRow[]>(() => {
    const map = new Map<string, { total: number; count: number }>()
    filteredIns.forEach(r => {
      const cur = map.get(r.type) ?? { total: 0, count: 0 }
      cur.total += r.amount
      cur.count += 1
      map.set(r.type, cur)
    })
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, total: roundMoney(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total)
  }, [filteredIns])
  const statsByCategory = useMemo<StatRow[]>(() => {
    const map = new Map<string, { total: number; count: number }>()
    filteredOuts.forEach(r => {
      const cur = map.get(r.category) ?? { total: 0, count: 0 }
      cur.total += r.amount
      cur.count += 1
      map.set(r.category, cur)
    })
    if (totalCharges > 0) {
      map.set('Charges fixes', { total: totalCharges, count: charges.length })
    }
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, total: roundMoney(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total)
  }, [filteredOuts, totalCharges, charges])


  const openAddIn = () => {
    const today = new Date().toISOString().slice(0, 10)
    setNewIn({ date: today, amount: 0, type: 'MECA', description: '', paymentMethod: 'ESPECE' })
    setAddingIn(true)
  }

  const openAddOut = () => {
    const today = new Date().toISOString().slice(0, 10)
    setNewOut({ date: today, amount: 0, category: 'GARAGE', description: '', beneficiary: '' })
    setAddingOut(true)
  }

  const saveIn = () => {
    if (!newIn.date) return
    addIn({ ...newIn, amount: roundMoney(Number(newIn.amount) || 0) })
    setAddingIn(false)
  }

  const saveOut = () => {
    if (!newOut.date) return
    addOut({ ...newOut, amount: roundMoney(Number(newOut.amount) || 0), beneficiary: newOut.beneficiary?.trim() || undefined })
    setAddingOut(false)
  }

  const filteredActivity = useMemo(() => {
    if (tab === 'in') return activity.filter(a => a.type === 'in')
    if (tab === 'out') return activity.filter(a => a.type === 'out')
    return activity
  }, [activity, tab])

  const SectionTitle = ({ children }: { children: ReactNode }) => (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</h2>
  )

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* ─── Header ───────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Money</h1>
          <p className="text-sm text-gray-500 mt-0.5">Trésorerie · {periodTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowParamsModal(true)}
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            title="Types et catégories"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={prevPeriod}
              className="p-2.5 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Mois précédent"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-800 min-w-[100px] text-center border-x border-gray-100">{periodTitle}</span>
            <button
              onClick={nextPeriod}
              className="p-2.5 text-gray-500 hover:bg-gray-50 transition-colors"
              aria-label="Mois suivant"
            >
              <ChevronDown className="w-5 h-5 -rotate-90" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 1. Résumé du mois ─────────────────────────────── */}
      <section className="mb-10">
        <SectionTitle>Résumé du mois</SectionTitle>
        <div className="space-y-4">
          <Card padding="lg" className="relative overflow-hidden bg-gray-900 text-white border-0 shadow-lg">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.12),transparent)]" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-white/60">Solde</p>
                <p className={`text-3xl sm:text-4xl font-bold tracking-tight mt-0.5 tabular-nums ${balance >= 0 ? 'text-white' : 'text-red-300'}`}>
                  {balance >= 0 ? '' : '−'}{formatAmount(Math.abs(balance))}
                </p>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div><span className="text-white/50">Entrées</span><span className="ml-1.5 font-semibold text-white">{formatAmount(totalIn)}</span><span className="text-white/50 ml-0.5">({countIn})</span></div>
                <div><span className="text-white/50">Sorties</span><span className="ml-1.5 font-semibold text-white">{formatAmount(totalOut)}</span><span className="text-white/50 ml-0.5">({countOut})</span></div>
                <div><span className="text-white/50">Moy. entrée</span><span className="ml-1.5 font-semibold text-white">{formatAmount(moyenneIn)}</span></div>
                <div><span className="text-white/50">Moy. sortie</span><span className="ml-1.5 font-semibold text-white">{formatAmount(moyenneOut)}</span></div>
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card padding="sm" className="bg-emerald-50/60 border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Entrées</p>
              <p className="text-base font-bold text-gray-900 tabular-nums mt-0.5">{formatAmount(totalIn)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{countIn} opér.</p>
            </Card>
            <Card padding="sm" className="bg-orange-50/60 border border-orange-100">
              <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider">Sorties</p>
              <p className="text-base font-bold text-gray-900 tabular-nums mt-0.5">{formatAmount(totalOut)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{countOut} opér.</p>
            </Card>
            <Card padding="sm" className="bg-gray-50 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Solde</p>
              <p className={`text-base font-bold tabular-nums mt-0.5 ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatAmount(balance)}</p>
            </Card>
            <Card padding="sm" className="bg-gray-50 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">Opérations</p>
              <p className="text-base font-bold text-gray-900 tabular-nums mt-0.5">{countTotal}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── 2. Répartition ────────────────────────────────── */}
      {(statsByType.length > 0 || statsByCategory.length > 0) && (
        <section className="mb-10">
          <SectionTitle>Répartition</SectionTitle>
          <Card padding="none" className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {statsByType.length > 0 && (
                <div className="p-4 md:p-5">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
                    Entrées par type
                  </h3>
                  <ul className="space-y-2">
                    {statsByType.map(({ label, total, count }) => (
                      <li key={label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800">{label}</span>
                        <span className="text-gray-500 tabular-nums">{count} · <span className="font-semibold text-emerald-600">{formatAmount(total)}</span></span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 font-semibold text-gray-900">
                      <span>Total</span>
                      <span className="tabular-nums text-emerald-600">{formatAmount(totalIn)}</span>
                    </li>
                  </ul>
                </div>
              )}
              {statsByCategory.length > 0 && (
                <div className="p-4 md:p-5">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-4 rounded-full bg-orange-500" />
                    Sorties par catégorie
                  </h3>
                  <ul className="space-y-2">
                    {statsByCategory.map(({ label, total, count }) => (
                      <li key={label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-800">{label}</span>
                        <span className="text-gray-500 tabular-nums">{count} · <span className="font-semibold text-orange-600">{formatAmount(total)}</span></span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 font-semibold text-gray-900">
                      <span>Total</span>
                      <span className="tabular-nums text-orange-600">{formatAmount(totalOut)}</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </section>
      )}

      {/* ─── 3. Mouvements ─────────────────────────────────── */}
      <section>
        <SectionTitle>Mouvements</SectionTitle>
        <Card padding="none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
            <div className="inline-flex p-1 rounded-lg bg-gray-100">
              {(['all', 'in', 'out'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t === 'all' ? 'Tout' : t === 'in' ? 'Entrées' : 'Sorties'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={openAddOut}>Sortie</Button>
              <Button size="sm" onClick={openAddIn} icon={<Plus className="w-4 h-4" />}>Entrée</Button>
            </div>
          </div>
          <div className="p-4 pt-0">
            {filteredActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Aucun mouvement ce mois</p>
                <p className="text-sm text-gray-400 mt-1">Ajoutez une entrée ou une sortie</p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button size="sm" variant="outline" onClick={openAddOut}>Sortie</Button>
                  <Button size="sm" onClick={openAddIn} icon={<Plus className="w-4 h-4" />}>Entrée</Button>
                </div>
              </div>
            ) : (
              <ul className="space-y-0 divide-y divide-gray-50">
                {filteredActivity.map(item => (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 py-3.5 first:pt-0 hover:bg-gray-50/80 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'in' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.type === 'in' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate text-sm">{item.label || 'Sans libellé'}</p>
                      <p className="text-xs text-gray-500 truncate">{item.sublabel}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                      <span className="text-gray-400">{formatDate(item.date)}</span>
                      <span className={`font-semibold tabular-nums w-20 text-right ${
                        item.type === 'in' ? 'text-emerald-600' : 'text-gray-700'
                      }`}>
                        {item.type === 'in' ? '+' : '−'}{formatAmount(item.amount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>

      {/* Modals */}
      <Modal open={addingIn} onClose={() => setAddingIn(false)} title="Nouvelle entrée" subtitle="Encaissement">
        <div className="space-y-4">
          <Input label="Date" type="date" value={newIn.date} onChange={e => setNewIn(prev => ({ ...prev, date: e.target.value }))} />
          <Input
            label="Montant"
            type="number"
            min={0}
            step={0.01}
            value={newIn.amount || ''}
            onChange={e => setNewIn(prev => ({ ...prev, amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            {showAddInType ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nom du type (ex. LIVRAISON)"
                  value={newInTypeLabel}
                  onChange={e => setNewInTypeLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomInType())}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={addCustomInType} disabled={!newInTypeLabel.trim()}>
                  Ajouter
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAddInType(false); setNewInTypeLabel('') }}>
                  Annuler
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={allInTypes.includes(newIn.type) ? newIn.type : ''}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '__add__') setShowAddInType(true)
                    else setNewIn(prev => ({ ...prev, type: v }))
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
                >
                  {allInTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="__add__">—— Ajouter un type ——</option>
                </select>
                {customInTypes.length > 0 && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" />
                    {customInTypes.length} type{customInTypes.length > 1 ? 's' : ''} personnalisé{customInTypes.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
          <Input label="Description" value={newIn.description} onChange={e => setNewIn(prev => ({ ...prev, description: e.target.value }))} placeholder="Ex. SEAT IBIZA, 308" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paiement</label>
            <select
              value={newIn.paymentMethod ?? 'ESPECE'}
              onChange={e => setNewIn(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
            >
              {MONEY_PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddingIn(false)} className="flex-1">Annuler</Button>
            <Button onClick={saveIn} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>

      <Modal open={addingOut} onClose={() => setAddingOut(false)} title="Nouvelle sortie" subtitle="Dépense">
        <div className="space-y-4">
          <Input label="Date" type="date" value={newOut.date} onChange={e => setNewOut(prev => ({ ...prev, date: e.target.value }))} />
          <Input
            label="Montant"
            type="number"
            min={0}
            step={0.01}
            value={newOut.amount || ''}
            onChange={e => setNewOut(prev => ({ ...prev, amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            {showAddOutCategory ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de la catégorie (ex. CARBURANT)"
                  value={newOutCategoryLabel}
                  onChange={e => setNewOutCategoryLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomOutCategory())}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={addCustomOutCategory} disabled={!newOutCategoryLabel.trim()}>
                  Ajouter
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAddOutCategory(false); setNewOutCategoryLabel('') }}>
                  Annuler
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value={allOutCategories.includes(newOut.category) ? newOut.category : ''}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '__add__') setShowAddOutCategory(true)
                    else setNewOut(prev => ({ ...prev, category: v }))
                  }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
                >
                  {allOutCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__add__">—— Ajouter une catégorie ——</option>
                </select>
                {customOutCategories.length > 0 && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" />
                    {customOutCategories.length} catégorie{customOutCategories.length > 1 ? 's' : ''} personnalisée{customOutCategories.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
          <Input label="Description" value={newOut.description} onChange={e => setNewOut(prev => ({ ...prev, description: e.target.value }))} placeholder="Ex. PILES, KATO" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire</label>
            <select
              value={newOut.beneficiary ?? ''}
              onChange={e => setNewOut(prev => ({ ...prev, beneficiary: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
            >
              <option value="">Aucun</option>
              {memberNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setAddingOut(false)} className="flex-1">Annuler</Button>
            <Button onClick={saveOut} className="flex-1">Enregistrer</Button>
          </div>
        </div>
      </Modal>

      {/* Modal Gérer types et catégories */}
      <Modal
        open={showParamsModal}
        onClose={() => { setShowParamsModal(false); setNewInTypeLabel(''); setNewOutCategoryLabel(''); }}
        title="Types et catégories"
        subtitle="Gérer les types d'entrée et catégories de sortie personnalisés"
        maxWidth="md"
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">Types d'entrée (IN)</h4>
            <p className="text-xs text-gray-500 mb-3">Types par défaut + vos types personnalisés. Les personnalisés peuvent être supprimés.</p>
            <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
              {MONEY_IN_TYPES.map(t => (
                <li key={t} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 text-sm text-gray-600">
                  {t}
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Par défaut</span>
                </li>
              ))}
              {customInTypes.map(t => (
                <li key={t} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-emerald-50 text-sm text-gray-800">
                  {t}
                  <button
                    type="button"
                    onClick={() => removeCustomInType(t)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Supprimer ce type"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                placeholder="Nouveau type (ex. LIVRAISON)"
                value={newInTypeLabel}
                onChange={e => setNewInTypeLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomInType())}
                className="flex-1"
              />
              <Button size="sm" onClick={addCustomInType} disabled={!newInTypeLabel.trim()}>Ajouter</Button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">Catégories de sortie (OUT)</h4>
            <p className="text-xs text-gray-500 mb-3">Catégories par défaut + vos catégories personnalisées.</p>
            <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
              {MONEY_OUT_CATEGORIES.map(c => (
                <li key={c} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 text-sm text-gray-600">
                  {c}
                  <span className="text-[10px] font-medium text-gray-400 uppercase">Par défaut</span>
                </li>
              ))}
              {customOutCategories.map(c => (
                <li key={c} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-orange-50 text-sm text-gray-800">
                  {c}
                  <button
                    type="button"
                    onClick={() => removeCustomOutCategory(c)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Supprimer cette catégorie"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                placeholder="Nouvelle catégorie (ex. CARBURANT)"
                value={newOutCategoryLabel}
                onChange={e => setNewOutCategoryLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomOutCategory())}
                className="flex-1"
              />
              <Button size="sm" onClick={addCustomOutCategory} disabled={!newOutCategoryLabel.trim()}>Ajouter</Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowParamsModal(false)}>Fermer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
