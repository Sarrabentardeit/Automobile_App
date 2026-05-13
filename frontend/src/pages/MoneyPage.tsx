import { useState, useMemo, useEffect, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import type { MoneyIn, MoneyOut } from '@/types'
import { MONEY_IN_TYPES, MONEY_OUT_CATEGORIES, MONEY_PAYMENT_METHODS } from '@/types'
import { useMoney } from '@/contexts/MoneyContext'
import { useCharges } from '@/contexts/ChargesContext'
import { useToast } from '@/contexts/ToastContext'
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
  Pencil,
  Trash2,
  X,
  Search,
  FileSpreadsheet,
} from 'lucide-react'

import { apiFetch } from '@/lib/api'

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

function monthIndexFromDate(dateStr: string): number {
  const [y, m] = dateStr.split('-').map(Number)
  return y * 12 + ((m || 1) - 1)
}

type Tab = 'all' | 'in' | 'out'
type MovementView = 'liste' | 'jour'
type MovementDisplayValue = 'liste-all' | 'liste-in' | 'liste-out' | 'jour'

function movementDisplayValue(view: MovementView, t: Tab): MovementDisplayValue {
  if (view === 'jour') return 'jour'
  if (t === 'in') return 'liste-in'
  if (t === 'out') return 'liste-out'
  return 'liste-all'
}

export default function MoneyPage() {
  const { permissions, getAccessToken } = useAuth()
  const { members } = useTeamMembers()
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [tab, setTab] = useState<Tab>('all')
  const [movementView, setMovementView] = useState<MovementView>('liste')
  const [movementSearch, setMovementSearch] = useState('')
  const [movementPage, setMovementPage] = useState(1)
  /** Panneau latéral : détail des sources pour un jour (synthèse par jour) */
  const [dayPanelDate, setDayPanelDate] = useState<string | null>(null)
  const { ins, outs, loading, addIn, updateIn, removeIn, addOut, updateOut, removeOut } = useMoney()
  const toast = useToast()
  const { charges, totalCharges, addCharge, updateCharge, removeCharge, loading: chargesLoading } = useCharges()
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
  const [savingIn, setSavingIn] = useState(false)
  const [savingOut, setSavingOut] = useState(false)
  const [editingInId, setEditingInId] = useState<number | null>(null)
  const [editingOutId, setEditingOutId] = useState<number | null>(null)
  const [editIn, setEditIn] = useState<Omit<MoneyIn, 'id'>>({
    date: '',
    amount: 0,
    type: 'MECA',
    description: '',
    paymentMethod: 'ESPECE',
  })
  const [editOut, setEditOut] = useState<Omit<MoneyOut, 'id'>>({
    date: '',
    amount: 0,
    category: 'GARAGE',
    description: '',
    beneficiary: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [showChargesModal, setShowChargesModal] = useState(false)
  const [editingCharge, setEditingCharge] = useState<{ id: number; name: string; amount: number } | null>(null)
  const [newChargeName, setNewChargeName] = useState('')
  const [newChargeAmount, setNewChargeAmount] = useState('')
  const [savingCharge, setSavingCharge] = useState(false)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setCustomInTypes([])
      setCustomOutCategories([])
      return
    }
    void (async () => {
      try {
        const [inTypesRes, outCatsRes] = await Promise.all([
          apiFetch<{ value: unknown }>('/settings/money_custom_in_types', { token }),
          apiFetch<{ value: unknown }>('/settings/money_custom_out_categories', { token }),
        ])
        setCustomInTypes(Array.isArray(inTypesRes.value) ? inTypesRes.value.filter((x): x is string => typeof x === 'string') : [])
        setCustomOutCategories(Array.isArray(outCatsRes.value) ? outCatsRes.value.filter((x): x is string => typeof x === 'string') : [])
      } catch {
        setCustomInTypes([])
        setCustomOutCategories([])
      }
    })()
  }, [getAccessToken])

  useEffect(() => {
    setDayPanelDate(null)
  }, [period.year, period.month])

  useEffect(() => {
    if (movementView !== 'jour') setDayPanelDate(null)
  }, [movementView])

  const persistCustomInTypes = async (types: string[]) => {
    const token = getAccessToken()
    if (!token) return
    await apiFetch('/settings/money_custom_in_types', {
      method: 'PUT',
      token,
      body: JSON.stringify({ value: types }),
    })
  }

  const persistCustomOutCategories = async (categories: string[]) => {
    const token = getAccessToken()
    if (!token) return
    await apiFetch('/settings/money_custom_out_categories', {
      method: 'PUT',
      token,
      body: JSON.stringify({ value: categories }),
    })
  }

  const allInTypes = useMemo(() => [...MONEY_IN_TYPES, ...customInTypes], [customInTypes])
  const allOutCategories = useMemo(() => [...MONEY_OUT_CATEGORIES, ...customOutCategories], [customOutCategories])
  const memberNames = useMemo(() => members.map(m => m.name), [members])

  const addCustomInType = async () => {
    const label = newInTypeLabel.trim()
    if (!label || allInTypes.some(t => t.toLowerCase() === label.toLowerCase())) return
    const next = [...customInTypes, label]
    setCustomInTypes(next)
    await persistCustomInTypes(next).catch(() => {})
    setNewIn(prev => ({ ...prev, type: label }))
    setNewInTypeLabel('')
    setShowAddInType(false)
  }

  const addCustomOutCategory = async () => {
    const label = newOutCategoryLabel.trim()
    if (!label || allOutCategories.some(c => c.toLowerCase() === label.toLowerCase())) return
    const next = [...customOutCategories, label]
    setCustomOutCategories(next)
    await persistCustomOutCategories(next).catch(() => {})
    setNewOut(prev => ({ ...prev, category: label }))
    setNewOutCategoryLabel('')
    setShowAddOutCategory(false)
  }

  const removeCustomInType = async (label: string) => {
    const next = customInTypes.filter(t => t !== label)
    setCustomInTypes(next)
    await persistCustomInTypes(next).catch(() => {})
    if (newIn.type === label) setNewIn(prev => ({ ...prev, type: 'MECA' }))
  }
  const removeCustomOutCategory = async (label: string) => {
    const next = customOutCategories.filter(c => c !== label)
    setCustomOutCategories(next)
    await persistCustomOutCategories(next).catch(() => {})
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

  type ActivityItem = { id: string; date: string; type: 'in' | 'out'; label: string; sublabel: string; amount: number }
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
    return [...inItems, ...outItems].sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredIns, filteredOuts])

  const totalIn = useMemo(() => roundMoney(filteredIns.reduce((s, r) => s + r.amount, 0)), [filteredIns])
  const totalOutVariable = useMemo(() => roundMoney(filteredOuts.reduce((s, r) => s + r.amount, 0)), [filteredOuts])
  /** Sorties affichées : uniquement les MoneyOut réels (les charges mensuelles ne sont pas des débits). */
  const totalOut = totalOutVariable
  const selectedMonthIndex = period.year * 12 + (period.month - 1)
  const openingBalance = useMemo(() => {
    const prevIn = ins
      .filter(i => monthIndexFromDate(i.date) < selectedMonthIndex)
      .reduce((s, i) => s + i.amount, 0)
    const prevOut = outs
      .filter(o => monthIndexFromDate(o.date) < selectedMonthIndex)
      .reduce((s, o) => s + o.amount, 0)
    return roundMoney(prevIn - prevOut)
  }, [ins, outs, selectedMonthIndex])
  const balance = roundMoney(openingBalance + totalIn - totalOut)
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
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, total: roundMoney(v.total), count: v.count }))
      .sort((a, b) => b.total - a.total)
  }, [filteredOuts])


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

  const saveIn = async () => {
    if (!newIn.date) return
    setSavingIn(true)
    try {
      await addIn({ ...newIn, amount: roundMoney(Number(newIn.amount) || 0) })
      setAddingIn(false)
      toast.success('Entrée enregistrée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSavingIn(false)
    }
  }

  const saveOut = async () => {
    if (!newOut.date) return
    setSavingOut(true)
    try {
      await addOut({ ...newOut, amount: roundMoney(Number(newOut.amount) || 0), beneficiary: newOut.beneficiary?.trim() || undefined })
      setAddingOut(false)
      toast.success('Sortie enregistrée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSavingOut(false)
    }
  }

  const openEditActivity = (item: ActivityItem) => {
    const id = Number(item.id.split('-')[1] ?? '')
    if (Number.isNaN(id)) return
    if (item.type === 'in') {
      const row = ins.find(x => x.id === id)
      if (!row) return
      setEditIn({
        date: row.date,
        amount: row.amount,
        type: row.type,
        description: row.description,
        paymentMethod: row.paymentMethod ?? 'ESPECE',
      })
      setEditingInId(id)
    } else {
      const row = outs.find(x => x.id === id)
      if (!row) return
      setEditOut({
        date: row.date,
        amount: row.amount,
        category: row.category,
        description: row.description,
        beneficiary: row.beneficiary ?? '',
      })
      setEditingOutId(id)
    }
  }

  const saveEditIn = async () => {
    if (editingInId == null || !editIn.date) return
    setSavingEdit(true)
    try {
      await updateIn(editingInId, { ...editIn, amount: roundMoney(Number(editIn.amount) || 0) })
      setEditingInId(null)
      toast.success('Entrée modifiée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification')
    } finally {
      setSavingEdit(false)
    }
  }

  const saveEditOut = async () => {
    if (editingOutId == null || !editOut.date) return
    setSavingEdit(true)
    try {
      await updateOut(editingOutId, {
        ...editOut,
        amount: roundMoney(Number(editOut.amount) || 0),
        beneficiary: editOut.beneficiary?.trim() || undefined,
      })
      setEditingOutId(null)
      toast.success('Sortie modifiée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification')
    } finally {
      setSavingEdit(false)
    }
  }

  const deleteActivity = async (item: ActivityItem) => {
    const id = Number(item.id.split('-')[1] ?? '')
    if (Number.isNaN(id)) return
    const ok = window.confirm('Supprimer ce mouvement ?')
    if (!ok) return
    const deleted = item.type === 'in' ? await removeIn(id) : await removeOut(id)
    if (deleted) toast.success('Mouvement supprimé')
    else toast.error('Erreur lors de la suppression')
  }

  const openChargesModal = () => {
    setEditingCharge(null)
    setNewChargeName('')
    setNewChargeAmount('')
    setShowChargesModal(true)
  }

  const handleSaveCharge = async () => {
    const name = newChargeName.trim()
    const amount = parseFloat(newChargeAmount)
    if (!name || Number.isNaN(amount) || amount < 0) return
    setSavingCharge(true)
    try {
      if (editingCharge) {
        await updateCharge(editingCharge.id, { name, amount })
        setEditingCharge(null)
        setShowChargesModal(false)
        toast.success('Enregistré')
      } else {
        await addCharge({ name, amount })
        setNewChargeName('')
        setNewChargeAmount('')
        toast.success('Ajouté')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setSavingCharge(false)
    }
  }

  const filteredActivity = useMemo(() => {
    if (tab === 'in') return activity.filter(a => a.type === 'in')
    if (tab === 'out') return activity.filter(a => a.type === 'out')
    return activity
  }, [activity, tab])

  const searchedActivity = useMemo(() => {
    const q = movementSearch.trim().toLowerCase()
    if (!q) return filteredActivity
    return filteredActivity.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.sublabel.toLowerCase().includes(q) ||
      formatDate(item.date).toLowerCase().includes(q),
    )
  }, [filteredActivity, movementSearch])

  const MOVEMENTS_PER_PAGE = 30
  const totalMovementPages = Math.max(1, Math.ceil(searchedActivity.length / MOVEMENTS_PER_PAGE))
  const paginatedActivity = useMemo(() => {
    const start = (movementPage - 1) * MOVEMENTS_PER_PAGE
    return searchedActivity.slice(start, start + MOVEMENTS_PER_PAGE)
  }, [searchedActivity, movementPage])

  useEffect(() => {
    setMovementPage(1)
  }, [movementSearch, movementView, tab, period.year, period.month])

  useEffect(() => {
    if (movementPage > totalMovementPages) setMovementPage(totalMovementPages)
  }, [movementPage, totalMovementPages])

  const dailySummary = useMemo(() => {
    const byDay = new Map<string, { in: number; out: number }>()
    const bump = (date: string, field: 'in' | 'out', amount: number) => {
      const cur = byDay.get(date) ?? { in: 0, out: 0 }
      cur[field] += amount
      byDay.set(date, cur)
    }
    filteredIns.forEach(r => bump(r.date, 'in', r.amount))
    filteredOuts.forEach(r => bump(r.date, 'out', r.amount))
    return Array.from(byDay.entries())
      .map(([date, v]) => ({
        date,
        totalIn: roundMoney(v.in),
        totalOut: roundMoney(v.out),
        net: roundMoney(v.in - v.out),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredIns, filteredOuts])

  type DayMoneyLine = { key: string; title: string; detail: string; amount: number }
  const dailyDetailedSummary = useMemo(() => {
    return dailySummary.map(row => {
      const d = row.date
      const ins = filteredIns.filter(r => r.date === d)
      const outs = filteredOuts.filter(r => r.date === d)
      const linesIn: DayMoneyLine[] = ins.map(r => ({
        key: `in-${r.id}`,
        title: (r.description && r.description.trim()) ? r.description.trim() : r.type,
        detail: `${r.type} · ${r.paymentMethod ?? 'ESPECE'}`,
        amount: r.amount,
      }))
      const linesOut: DayMoneyLine[] = outs.map(r => ({
        key: `out-${r.id}`,
        title: (r.description && r.description.trim()) ? r.description.trim() : r.category,
        detail: [r.category, r.beneficiary?.trim()].filter(Boolean).join(' · '),
        amount: r.amount,
      }))
      return { ...row, linesIn, linesOut }
    })
  }, [dailySummary, filteredIns, filteredOuts])

  const dayPanelDetail = useMemo(() => {
    if (!dayPanelDate) return null
    return dailyDetailedSummary.find(r => r.date === dayPanelDate) ?? null
  }, [dayPanelDate, dailyDetailedSummary])

  const SectionTitle = ({ children }: { children: ReactNode }) => (
    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</h2>
  )

  return (
    <div className="max-w-6xl mx-auto pb-20 px-3 sm:px-4">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
        <div className="min-w-0 space-y-10">
      {/* ─── 1. Résumé du mois ─────────────────────────────── */}
      <section>
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
                <div><span className="text-white/50">Ouverture</span><span className="ml-1.5 font-semibold text-white">{formatAmount(openingBalance)}</span></div>
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
        <section>
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
      <section className="pb-2">
        <SectionTitle>Mouvements</SectionTitle>
        <Card padding="none">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <label htmlFor="money-mouvements-affichage" className="text-xs text-gray-500 shrink-0">
                Affichage
              </label>
              <select
                id="money-mouvements-affichage"
                value={movementDisplayValue(movementView, tab)}
                onChange={e => {
                  const v = e.target.value as MovementDisplayValue
                  if (v === 'jour') {
                    setMovementView('jour')
                    return
                  }
                  setMovementView('liste')
                  setTab(v === 'liste-in' ? 'in' : v === 'liste-out' ? 'out' : 'all')
                }}
                className="min-w-0 flex-1 max-w-[min(100%,20rem)] text-sm text-gray-900 font-medium border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm outline-none transition-colors hover:border-gray-300 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 cursor-pointer"
              >
                <option value="liste-all">Liste détaillée — tout</option>
                <option value="liste-in">Liste détaillée — entrées</option>
                <option value="liste-out">Liste détaillée — sorties</option>
                <option value="jour">Synthèse par jour</option>
              </select>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              <Button size="sm" variant="outline" onClick={openAddOut}>Sortie</Button>
              <Button size="sm" onClick={openAddIn} icon={<Plus className="w-4 h-4" />}>Entrée</Button>
            </div>
          </div>
          <div className="p-4 pt-0">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500 font-medium">Chargement des mouvements...</p>
              </div>
            ) : movementView === 'jour' ? (
              dailySummary.length === 0 ? (
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
                <div className="space-y-3">
                  <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full text-sm min-w-[320px]">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-100">
                          <th className="pb-2 pr-3 font-semibold">Jour</th>
                          <th className="pb-2 pr-3 font-semibold text-right tabular-nums">Entrées</th>
                          <th className="pb-2 pr-3 font-semibold text-right tabular-nums">Sorties</th>
                          <th className="pb-2 font-semibold text-right tabular-nums">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySummary.map(row => (
                          <tr
                            key={row.date}
                            role="button"
                            tabIndex={0}
                            onClick={() => setDayPanelDate(row.date)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setDayPanelDate(row.date)
                              }
                            }}
                            className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-orange-50/60 transition-colors"
                            title="Voir le détail des mouvements"
                          >
                            <td className="py-2.5 pr-3 text-gray-900 whitespace-nowrap">{formatDate(row.date)}</td>
                            <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600 font-medium">
                              {row.totalIn > 0 ? formatAmount(row.totalIn) : '—'}
                            </td>
                            <td className="py-2.5 pr-3 text-right tabular-nums text-orange-600 font-medium">
                              {row.totalOut > 0 ? formatAmount(row.totalOut) : '—'}
                            </td>
                            <td className={`py-2.5 text-right tabular-nums font-semibold ${row.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {row.net >= 0 ? '+' : '−'}{formatAmount(Math.abs(row.net))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : searchedActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-gray-400" />
                </div>
                {movementSearch.trim() ? (
                  <>
                    <p className="text-gray-500 font-medium">Aucun résultat</p>
                    <p className="text-sm text-gray-400 mt-1">Essayez un autre mot-clé</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-500 font-medium">Aucun mouvement ce mois</p>
                    <p className="text-sm text-gray-400 mt-1">Ajoutez une entrée ou une sortie</p>
                    <div className="flex justify-center gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={openAddOut}>Sortie</Button>
                      <Button size="sm" onClick={openAddIn} icon={<Plus className="w-4 h-4" />}>Entrée</Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={movementSearch}
                    onChange={(e) => setMovementSearch(e.target.value)}
                    placeholder="Rechercher dans les mouvements..."
                    className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>
                <ul className="space-y-0 divide-y divide-gray-50">
                  {paginatedActivity.map(item => (
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
                      <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                        <span className="text-gray-400">{formatDate(item.date)}</span>
                        <span className={`font-semibold tabular-nums w-20 text-right ${
                          item.type === 'in' ? 'text-emerald-600' : 'text-gray-700'
                        }`}>
                          {item.type === 'in' ? '+' : '−'}{formatAmount(item.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditActivity(item)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                              title="Modifier"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteActivity(item)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {totalMovementPages > 1 && (
                  <div className="flex items-center justify-between gap-2 mt-3 px-1">
                    <p className="text-xs text-gray-500">
                      Page {movementPage} / {totalMovementPages} · {searchedActivity.length} mouvement(s)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMovementPage(p => Math.max(1, p - 1))}
                        disabled={movementPage <= 1}
                      >
                        Précédent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setMovementPage(p => Math.min(totalMovementPages, p + 1))}
                        disabled={movementPage >= totalMovementPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </section>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start w-full max-w-md mx-auto lg:mx-0 lg:max-w-none">
          <Card padding="sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-gray-900 truncate">Charges mensuelles</h3>
              </div>
              <button
                type="button"
                onClick={openChargesModal}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition-colors shrink-0"
                title="Gérer les charges"
              >
                <Settings2 className="w-4 h-4" />
                <span>Gérer</span>
              </button>
            </div>
            {chargesLoading ? (
              <p className="text-sm text-gray-400 py-2">Chargement…</p>
            ) : (
              <div className="space-y-1 max-h-[220px] overflow-y-auto">
                {charges.map(c => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-gray-700 truncate pr-2">{c.name}</span>
                    <span className="text-sm font-semibold text-red-600 shrink-0 tabular-nums">
                      {c.amount.toLocaleString('fr-FR')} DT
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
              <span className="font-bold text-red-700 tabular-nums">
                {totalCharges.toLocaleString('fr-FR')} DT
              </span>
            </div>
          </Card>
        </aside>
      </div>

      {/* Panneau latéral : détail jour (synthèse par jour) */}
      {dayPanelDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDayPanelDate(null)}
            aria-hidden
          />
          <div className="relative w-full sm:max-w-md bg-white shadow-2xl flex flex-col slide-in-from-right max-h-[100dvh] sm:max-h-[90vh] sm:rounded-l-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-3 sm:p-4 border-b border-gray-100 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Détail du jour</h3>
                <p className="text-sm text-gray-500 mt-0.5">{formatDate(dayPanelDetail.date)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDayPanelDate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg shrink-0 touch-manipulation"
                aria-label="Fermer"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4 flex-1 min-h-0 space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-xs text-gray-500 font-medium">Entrées</p>
                  <p className="text-lg font-bold text-emerald-600 tabular-nums mt-0.5">
                    {dayPanelDetail.totalIn > 0 ? formatAmount(dayPanelDetail.totalIn) : '—'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-xs text-gray-500 font-medium">Sorties</p>
                  <p className="text-lg font-bold text-orange-600 tabular-nums mt-0.5">
                    {dayPanelDetail.totalOut > 0 ? formatAmount(dayPanelDetail.totalOut) : '—'}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs text-gray-500 font-medium">Net</p>
                  <p className={`text-lg font-bold tabular-nums mt-0.5 ${dayPanelDetail.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {dayPanelDetail.net >= 0 ? '+' : '−'}{formatAmount(Math.abs(dayPanelDetail.net))}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Sources entrées</p>
                {dayPanelDetail.linesIn.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucune entrée ce jour.</p>
                ) : (
                  <ul className="space-y-3">
                    {dayPanelDetail.linesIn.map(line => (
                      <li key={line.key} className="flex justify-between gap-3 text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        <span className="min-w-0 text-gray-800">
                          <span className="font-medium block">{line.title}</span>
                          <span className="text-gray-500 text-xs">{line.detail}</span>
                        </span>
                        <span className="tabular-nums text-emerald-600 font-semibold shrink-0">+{formatAmount(line.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Sources sorties</p>
                {dayPanelDetail.linesOut.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucune sortie ce jour.</p>
                ) : (
                  <ul className="space-y-3">
                    {dayPanelDetail.linesOut.map(line => (
                      <li key={line.key} className="flex justify-between gap-3 text-sm border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                        <span className="min-w-0 text-gray-800">
                          <span className="font-medium block">{line.title}</span>
                          <span className="text-gray-500 text-xs">{line.detail}</span>
                        </span>
                        <span className="tabular-nums text-orange-600 font-semibold shrink-0">−{formatAmount(line.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            <Button onClick={saveIn} className="flex-1" disabled={savingIn}>
              {savingIn ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editingInId !== null} onClose={() => setEditingInId(null)} title="Modifier entrée" subtitle="Encaissement">
        <div className="space-y-4">
          <Input label="Date" type="date" value={editIn.date} onChange={e => setEditIn(prev => ({ ...prev, date: e.target.value }))} />
          <Input
            label="Montant"
            type="number"
            min={0}
            step={0.01}
            value={editIn.amount || ''}
            onChange={e => setEditIn(prev => ({ ...prev, amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
          />
          <Input label="Type" value={editIn.type} onChange={e => setEditIn(prev => ({ ...prev, type: e.target.value }))} />
          <Input label="Description" value={editIn.description} onChange={e => setEditIn(prev => ({ ...prev, description: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paiement</label>
            <select
              value={editIn.paymentMethod ?? 'ESPECE'}
              onChange={e => setEditIn(prev => ({ ...prev, paymentMethod: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white"
            >
              {MONEY_PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditingInId(null)} className="flex-1">Annuler</Button>
            <Button onClick={saveEditIn} className="flex-1" disabled={savingEdit}>
              {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editingOutId !== null} onClose={() => setEditingOutId(null)} title="Modifier sortie" subtitle="Dépense">
        <div className="space-y-4">
          <Input label="Date" type="date" value={editOut.date} onChange={e => setEditOut(prev => ({ ...prev, date: e.target.value }))} />
          <Input
            label="Montant"
            type="number"
            min={0}
            step={0.01}
            value={editOut.amount || ''}
            onChange={e => setEditOut(prev => ({ ...prev, amount: e.target.value === '' ? 0 : Number(e.target.value) }))}
          />
          <Input label="Catégorie" value={editOut.category} onChange={e => setEditOut(prev => ({ ...prev, category: e.target.value }))} />
          <Input label="Description" value={editOut.description} onChange={e => setEditOut(prev => ({ ...prev, description: e.target.value }))} />
          <Input label="Bénéficiaire" value={editOut.beneficiary ?? ''} onChange={e => setEditOut(prev => ({ ...prev, beneficiary: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditingOutId(null)} className="flex-1">Annuler</Button>
            <Button onClick={saveEditOut} className="flex-1" disabled={savingEdit}>
              {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
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
            <Button onClick={saveOut} className="flex-1" disabled={savingOut}>
              {savingOut ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
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

      <Modal
        open={showChargesModal}
        onClose={() => {
          setShowChargesModal(false)
          setEditingCharge(null)
        }}
        title="Gérer les charges mensuelles"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="Nom de la charge"
                placeholder="Ex: Loyer Garage"
                value={newChargeName}
                onChange={e => setNewChargeName(e.target.value)}
              />
            </div>
            <div className="w-28">
              <Input
                label="Montant (DT)"
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                value={newChargeAmount}
                onChange={e => setNewChargeAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => void handleSaveCharge()}
              disabled={savingCharge || !newChargeName.trim() || Number.isNaN(parseFloat(newChargeAmount))}
              icon={!editingCharge ? <Plus className="w-4 h-4" /> : undefined}
            >
              {savingCharge ? '…' : editingCharge ? 'Enregistrer' : 'Ajouter'}
            </Button>
            {editingCharge && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingCharge(null)
                  setNewChargeName('')
                  setNewChargeAmount('')
                }}
              >
                Annuler
              </Button>
            )}
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Charges actuelles</p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {charges.map(c => (
                <div
                  key={c.id}
                  className="flex justify-between items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                    <span className="text-sm font-semibold text-red-600 shrink-0 tabular-nums">
                      {c.amount.toLocaleString('fr-FR')} DT
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCharge(c)
                        setNewChargeName(c.name)
                        setNewChargeAmount(String(c.amount))
                      }}
                      className="p-1.5 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`Supprimer « ${c.name} » ?`)) return
                        void (async () => {
                          try {
                            await removeCharge(c.id)
                            toast.success('Supprimé')
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Erreur à la suppression')
                          }
                        })()
                      }}
                      className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
              <span className="text-sm font-semibold text-gray-600">Total</span>
              <span className="font-bold text-red-700 tabular-nums">{totalCharges.toLocaleString('fr-FR')} DT</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
