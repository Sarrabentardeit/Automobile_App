import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import { useCaisse } from '@/contexts/CaisseContext'
import { useMoney } from '@/contexts/MoneyContext'
import { useCharges } from '@/contexts/ChargesContext'
import {
  ALL_PRESENCE_STATUTS,
  PRESENCE_CONFIG,
  type TeamMoneyDayEntry,
  type TeamMemberSlots,
  type PresenceStatut,
} from '@/types'
import { cn } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import {
  Wallet,
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Download,
  Palette,
  FileSpreadsheet,
  Settings2,
  Pencil,
  Trash2,
} from 'lucide-react'

const emptySlots = (): TeamMemberSlots => ({ inHand: null, taken: null, note: '', presence: null })

function buildMembersRecord(
  partial: Partial<Record<string, Partial<TeamMemberSlots>>>,
  memberNames: string[]
): Record<string, TeamMemberSlots> {
  const members: Record<string, TeamMemberSlots> = {}
  memberNames.forEach(name => {
    const p = partial[name]
    members[name] = p
      ? { inHand: p.inHand ?? null, taken: p.taken ?? null, note: p.note ?? '', presence: p.presence ?? null }
      : emptySlots()
  })
  return members
}

function countFilledMembers(day: TeamMoneyDayEntry): number {
  return Object.values(day.members).filter(
    s =>
      s.inHand != null ||
      s.taken != null ||
      (s.note && s.note.trim() !== '') ||
      s.presence != null
  ).length
}

type MainTab = 'equipe' | 'historique' | 'resume'
type MemberSort = 'solde' | 'nom' | 'avances'

export default function CaissePage() {
  const { permissions } = useAuth()
  const { members } = useTeamMembers()
  const { days, setDays } = useCaisse()
  const { ins, outs, addOut, updateOut, removeOut } = useMoney()
  const { charges, totalCharges, addCharge, updateCharge, removeCharge } = useCharges()
  const [period, setPeriod] = useState({ year: 2026, month: 2 })
  const [editingDay, setEditingDay] = useState<TeamMoneyDayEntry | null>(null)
  const [editingCell, setEditingCell] = useState<{ day: TeamMoneyDayEntry; memberName: string } | null>(null)
  const [editingCellSlot, setEditingCellSlot] = useState<TeamMemberSlots | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [mainTab, setMainTab] = useState<MainTab>('equipe')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [memberSort, setMemberSort] = useState<MemberSort>('solde')
  const [searchQuery, setSearchQuery] = useState('')
  const [showChargesModal, setShowChargesModal] = useState(false)
  const [editingCharge, setEditingCharge] = useState<{ id: number; name: string; amount: number } | null>(null)
  const [newChargeName, setNewChargeName] = useState('')
  const [newChargeAmount, setNewChargeAmount] = useState('')

  const memberNames = useMemo(() => members.map(m => m.name), [members])

  const openAddDay = () => {
    const date = `${period.year}-${period.month.toString().padStart(2, '0')}-01`
    setEditingDay({ id: -1, date, members: buildMembersRecord({}, memberNames) })
    setEditingCell(null)
  }

  const openCellEdit = (day: TeamMoneyDayEntry, memberName: string) => {
    setEditingCell({ day, memberName })
    setEditingCellSlot(day.members[memberName] ?? emptySlots())
    setEditingDay(null)
  }

  const openFullDayEdit = (day: TeamMoneyDayEntry) => {
    setEditingDay(day)
    setEditingCell(null)
  }

  const syncTakenToMoneyOut = (dayId: number, date: string, memberName: string, taken: number) => {
    const ref = `caisse:${dayId}:${memberName}`
    const existing = outs.find(o => o.sourceRef === ref)
    if (taken > 0) {
      const payload = {
        date,
        amount: taken,
        category: 'AUTRE',
        description: `Avance ${memberName}`,
        beneficiary: memberName,
        sourceRef: ref,
      }
      if (existing) updateOut(existing.id, { amount: taken })
      else addOut(payload)
    } else if (existing) removeOut(existing.id)
  }

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Wallet className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès à la caisse.</p>
      </div>
    )
  }

  const periodLabel = `${period.month.toString().padStart(2, '0')}/${period.year}`
  const prevPeriod = () => {
    if (period.month === 1) setPeriod({ year: period.year - 1, month: 12 })
    else setPeriod({ year: period.year, month: period.month - 1 })
  }
  const nextPeriod = () => {
    if (period.month === 12) setPeriod({ year: period.year + 1, month: 1 })
    else setPeriod({ year: period.year, month: period.month + 1 })
  }

  const filteredDays = useMemo(() => {
    return days
      .filter(d => {
        const [y, m] = d.date.split('-').map(Number)
        return y === period.year && m === period.month
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [days, period])

  const memberTotals = useMemo(() => {
    const totals: Record<string, { inHand: number; taken: number; balance: number; moisPresent: number }> = {}
    memberNames.forEach(name => {
      totals[name] = { inHand: 0, taken: 0, balance: 0, moisPresent: 0 }
    })
    filteredDays.forEach(day => {
      memberNames.forEach(name => {
        const slot = day.members[name] ?? emptySlots()
        const ih = slot.inHand ?? 0
        const tk = slot.taken ?? 0
        totals[name].inHand += ih
        totals[name].taken += tk
        totals[name].balance += ih - tk
        if (slot.presence != null) totals[name].moisPresent += ih
      })
    })
    return totals
  }, [filteredDays, memberNames])

  const globalTotals = useMemo(() => {
    let totalInHand = 0
    let totalTaken = 0
    memberNames.forEach(name => {
      totalInHand += memberTotals[name].inHand
      totalTaken += memberTotals[name].taken
    })
    return { totalInHand, totalTaken, balance: totalInHand - totalTaken }
  }, [memberTotals, memberNames])

  const monthStr = useMemo(() => `${period.year}-${period.month.toString().padStart(2, '0')}`, [period])
  const monthIns = useMemo(() => ins.filter(i => i.date.startsWith(monthStr)).sort((a, b) => b.date.localeCompare(a.date)), [ins, monthStr])
  const monthOuts = useMemo(() => outs.filter(o => o.date.startsWith(monthStr)).sort((a, b) => b.date.localeCompare(a.date)), [outs, monthStr])

  const moneyKpis = useMemo(() => {
    const ca = monthIns.reduce((s, i) => s + i.amount, 0)
    const depenses = monthOuts.reduce((s, o) => s + o.amount, 0)
    const cashFlow = ca - depenses - totalCharges
    return { ca, depenses, cashFlow }
  }, [monthIns, monthOuts, totalCharges])

  const sortedMemberNames = useMemo(() => {
    const withData = memberNames.filter(n => memberTotals[n].inHand !== 0 || memberTotals[n].taken !== 0)
    if (memberSort === 'nom') return [...withData].sort((a, b) => a.localeCompare(b))
    if (memberSort === 'avances') return [...withData].sort((a, b) => memberTotals[b].taken - memberTotals[a].taken)
    return [...withData].sort((a, b) => memberTotals[b].balance - memberTotals[a].balance)
  }, [memberNames, memberTotals, memberSort])

  const transactions = useMemo(() => {
    const tx: { date: string; member: string; presence: PresenceStatut | null; inHand: number; taken: number; note: string }[] = []
    filteredDays.forEach(day => {
      memberNames.forEach(name => {
        const slot = day.members[name] ?? emptySlots()
        const hasData = slot.inHand != null || slot.taken != null || (slot.note && slot.note.trim() !== '') || slot.presence != null
        if (!hasData) return
        tx.push({
          date: day.date,
          member: name,
          presence: slot.presence,
          inHand: slot.inHand ?? 0,
          taken: slot.taken ?? 0,
          note: slot.note || '—',
        })
      })
    })
    return tx.sort((a, b) => b.date.localeCompare(a.date))
  }, [filteredDays, memberNames])

  const filteredTransactions = useMemo(() => {
    let list = transactions
    if (selectedMember) list = list.filter(t => t.member === selectedMember)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        t =>
          t.member.toLowerCase().includes(q) ||
          t.note.toLowerCase().includes(q) ||
          String(t.inHand).includes(q) ||
          String(t.taken).includes(q)
      )
    }
    return list
  }, [transactions, selectedMember, searchQuery])

  const handleSaveDay = () => {
    if (!editingDay) return
    const existingSameDate = days.find(d => d.date === editingDay.date)
    let savedDay: TeamMoneyDayEntry

    if (editingDay.id === -1 && existingSameDate) {
      const mergedMembers: Record<string, TeamMemberSlots> = {}
      memberNames.forEach(name => {
        const oldSlot = existingSameDate.members[name] ?? emptySlots()
        const newSlot = editingDay.members[name] ?? emptySlots()
        mergedMembers[name] = {
          inHand: newSlot.inHand != null ? newSlot.inHand : oldSlot.inHand,
          taken: newSlot.taken != null ? newSlot.taken : oldSlot.taken,
          note:
            newSlot.note && newSlot.note.trim() !== ''
              ? newSlot.note
              : oldSlot.note,
          presence: newSlot.presence != null ? newSlot.presence : oldSlot.presence,
        }
      })
      savedDay = { ...existingSameDate, members: mergedMembers }
      setDays(prev => prev.map(d => (d.id === existingSameDate.id ? savedDay : d)))
    } else if (editingDay.id === -1) {
      savedDay = { ...editingDay, id: Math.max(0, ...days.map(d => d.id)) + 1 }
      setDays(prev => [...prev, savedDay])
    } else {
      savedDay = editingDay
      setDays(prev => prev.map(d => (d.id === editingDay.id ? savedDay : d)))
    }
    memberNames.forEach(name => {
      const taken = (savedDay.members[name]?.taken ?? 0) || 0
      syncTakenToMoneyOut(savedDay.id, savedDay.date, name, taken)
    })
    setEditingDay(null)
  }

  const handleSaveCell = () => {
    if (!editingCell || !editingCellSlot) return
    const { day, memberName } = editingCell
    const slot: TeamMemberSlots = editingCellSlot!
    const updatedDay: TeamMoneyDayEntry = {
      ...day,
      members: { ...day.members, [memberName]: slot },
    }
    setDays(prev => prev.map(d => (d.id === day.id ? updatedDay : d)))
    const taken = slot.taken ?? 0
    syncTakenToMoneyOut(day.id, day.date, memberName, taken)
    setEditingCell(null)
  }

  const updateEditingMember = (
    memberName: string,
    field: keyof TeamMemberSlots,
    value: number | string | PresenceStatut | null
  ) => {
    if (!editingDay) return
    const slot = editingDay.members[memberName] ?? emptySlots()
    const next = {
      ...slot,
      [field]:
        field === 'note'
          ? (value as string)
          : field === 'presence'
            ? (value as PresenceStatut | null)
            : (value as number | null),
    }
    setEditingDay({
      ...editingDay,
      members: { ...editingDay.members, [memberName]: next },
    })
  }

  const openChargesModal = () => {
    setEditingCharge(null)
    setNewChargeName('')
    setNewChargeAmount('')
    setShowChargesModal(true)
  }

  const handleSaveCharge = () => {
    const name = newChargeName.trim()
    const amount = parseFloat(newChargeAmount)
    if (!name || isNaN(amount) || amount < 0) return
    if (editingCharge) {
      updateCharge(editingCharge.id, { name, amount })
      setEditingCharge(null)
      setShowChargesModal(false)
    } else {
      addCharge({ name, amount })
      setNewChargeName('')
      setNewChargeAmount('')
    }
  }

  const handleExport = () => {
    const headers = ['Date', 'Membre', 'Présence', 'En main', 'Pris', 'Note']
    const rows = filteredTransactions.map(t => [
      formatDate(t.date),
      t.member,
      t.presence ? PRESENCE_CONFIG[t.presence].label : '—',
      t.inHand,
      t.taken,
      t.note,
    ])
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `caisse-${periodLabel}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const avatarColors: [string, string][] = [
    ['#d1fae5', '#047857'],
    ['#dbeafe', '#1d4ed8'],
    ['#ede9fe', '#6d28d9'],
    ['#fef3c7', '#b45309'],
    ['#fce7f3', '#be185d'],
    ['#cffafe', '#0e7490'],
    ['#ffedd5', '#c2410c'],
    ['#e0e7ff', '#4338ca'],
  ]

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 pb-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600 shrink-0" />
            <span className="truncate">Team Money Track</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">Suivi quotidien par membre</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button onClick={prevPeriod} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Mois précédent">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="font-semibold text-gray-800 min-w-[88px] text-center text-sm px-2">{periodLabel}</span>
            <button onClick={nextPeriod} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Mois suivant">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
            {(['equipe', 'historique', 'resume'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setMainTab(tab)}
                className={cn(
                  'px-3 py-2 text-xs sm:text-sm font-medium transition-colors',
                  mainTab === tab ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {tab === 'equipe' ? 'Vue Équipe' : tab === 'historique' ? 'Historique' : 'Résumé'}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} icon={<Download className="w-4 h-4" />}>
            Exporter
          </Button>
          <Button size="sm" onClick={openAddDay} icon={<Plus className="w-4 h-4" />}>
            Nouveau jour
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card padding="sm" className="border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chiffre d'affaires</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 tabular-nums">{moneyKpis.ca.toLocaleString('fr-FR')} DT</p>
          <p className="text-xs text-gray-500 mt-0.5">Entrées Money ce mois</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dépenses</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-red-700 tabular-nums">
            {(moneyKpis.depenses + totalCharges).toLocaleString('fr-FR')} DT
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Sorties + charges</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cash Flow</span>
          </div>
          <p className={cn('text-xl sm:text-2xl font-bold tabular-nums', moneyKpis.cashFlow >= 0 ? 'text-blue-700' : 'text-red-600')}>
            {moneyKpis.cashFlow.toLocaleString('fr-FR')} DT
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Solde net</p>
        </Card>
        <Card padding="sm" className="border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avances Équipe</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 tabular-nums">
            {globalTotals.totalTaken.toLocaleString('fr-FR')} DT
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{sortedMemberNames.length} membres</p>
        </Card>
      </div>

      {/* Main content */}
      {mainTab === 'equipe' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-500">Vue :</span>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium transition-colors',
                  viewMode === 'table' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <List className="w-4 h-4" />
                Tableau
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium transition-colors',
                  viewMode === 'cards' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                Par jour
              </button>
            </div>
          </div>

          {viewMode === 'table' && (
            <Card padding="none" className="overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
              <div className="px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Suivi argent équipe
                </h2>
                <p className="text-xs text-gray-500 mt-1">Cliquez sur la date pour modifier le jour, ou sur une cellule membre pour modifier ce membre</p>
              </div>
              {filteredDays.length === 0 ? (
                <div className="text-center py-12 text-gray-500 px-4">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">Aucun jour ce mois</p>
                  <Button className="mt-4" size="sm" onClick={openAddDay} icon={<Plus className="w-4 h-4" />}>
                    Nouveau jour
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left px-3 sm:px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase sticky left-0 z-20 min-w-[90px] bg-gray-50 border-b border-gray-200">
                          Date
                        </th>
                        {memberNames.map(name => (
                          <th
                            key={name}
                            className="text-left px-2 sm:px-3 py-3 text-[10px] font-semibold text-gray-600 bg-gray-50 border-b border-l border-gray-100 min-w-[70px]"
                          >
                            <span className="truncate block max-w-[70px]" title={name}>{name}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDays.map((day, rowIndex) => (
                        <tr
                          key={day.id}
                          className={cn(
                            'border-b border-gray-50 transition-colors',
                            rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          )}
                        >
                          <td
                            onClick={() => openFullDayEdit(day)}
                            className="px-3 sm:px-4 py-2.5 font-medium text-gray-900 sticky left-0 z-10 bg-inherit border-r border-gray-100 text-xs sm:text-sm cursor-pointer hover:bg-emerald-50/70"
                          >
                            {formatDate(day.date)}
                          </td>
                          {memberNames.map(memberName => {
                            const slot = day.members[memberName] ?? emptySlots()
                            const hasData =
                              slot.inHand != null ||
                              slot.taken != null ||
                              (slot.note && slot.note.trim() !== '') ||
                              slot.presence != null
                            return (
                              <td
                                key={memberName}
                                onClick={() => openCellEdit(day, memberName)}
                                className="px-2 sm:px-3 py-2 border-l border-gray-50 align-top min-w-[60px] cursor-pointer hover:bg-emerald-50/70"
                              >
                                {!hasData ? (
                                  <span className="text-gray-200 text-xs">—</span>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex gap-2 flex-wrap">
                                      {slot.inHand != null && (
                                        <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold text-xs">
                                          {slot.inHand}
                                        </span>
                                      )}
                                      {slot.taken != null && (
                                        <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold text-xs">
                                          {slot.taken}
                                        </span>
                                      )}
                                    </div>
                                    {slot.presence && (
                                      <span
                                        className="inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                                        style={{ backgroundColor: PRESENCE_CONFIG[slot.presence].color }}
                                      >
                                        {PRESENCE_CONFIG[slot.presence].label}
                                      </span>
                                    )}
                                    {slot.note && (
                                      <p className="text-[10px] text-gray-500 truncate max-w-[80px]" title={slot.note}>
                                        {slot.note}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                    {filteredDays.length > 0 && (
                      <tfoot>
                        <tr className="bg-emerald-50/80 border-t-2 border-emerald-200">
                          <td className="px-3 sm:px-4 py-2.5 font-semibold text-gray-800 sticky left-0 z-10 bg-emerald-50/95 border-r border-emerald-100 text-sm">
                            Total
                          </td>
                          {memberNames.map(memberName => {
                            const t = memberTotals[memberName]
                            const hasAny = t.inHand !== 0 || t.taken !== 0
                            return (
                              <td key={memberName} className="px-2 sm:px-3 py-2 border-l border-emerald-100 align-top">
                                {!hasAny ? (
                                  <span className="text-gray-300 text-xs">—</span>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex gap-2">
                                      {t.inHand !== 0 && (
                                        <span className="font-bold text-xs text-emerald-800">{t.inHand}</span>
                                      )}
                                      {t.taken !== 0 && (
                                        <span className="font-bold text-xs text-amber-800">{t.taken}</span>
                                      )}
                                    </div>
                                    <span className={cn('font-bold text-xs', t.balance >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                      Solde: {t.balance}
                                    </span>
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </Card>
          )}

          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredDays.length === 0 ? (
                <Card padding="lg">
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Aucun jour enregistré</p>
                    <Button className="mt-4" size="sm" onClick={openAddDay} icon={<Plus className="w-4 h-4" />}>
                      Nouveau jour
                    </Button>
                  </div>
                </Card>
              ) : (
                filteredDays.map(day => {
                  const filled = countFilledMembers(day)
                  return (
                    <button
                      key={day.id}
                      onClick={() => openFullDayEdit(day)}
                      className="text-left bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all"
                    >
                      <p className="font-semibold text-gray-900">{formatDate(day.date)}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {filled === 0 ? 'Non renseigné' : `${filled} membre${filled > 1 ? 's' : ''} renseigné${filled > 1 ? 's' : ''}`}
                      </p>
                      <span className="inline-block mt-2 text-xs font-medium text-emerald-600">Modifier →</span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </>
      )}

      {mainTab === 'historique' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <Card padding="none" className="overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par membre, montant, note..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedMember(null)}
                className={cn(!selectedMember && 'ring-2 ring-emerald-500')}
              >
                Tout afficher
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Membre</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Présence</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">En main</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Pris</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Aucune transaction ce mois
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t, i) => (
                      <tr
                        key={`${t.date}-${t.member}-${i}`}
                        onClick={() => {
                          const day = filteredDays.find(d => d.date === t.date)
                          if (day) openCellEdit(day, t.member)
                        }}
                        className="border-b border-gray-50 hover:bg-emerald-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 text-gray-600 text-xs">{formatDate(t.date)}</td>
                        <td className="px-4 py-2.5 font-medium">{t.member}</td>
                        <td className="px-4 py-2.5">
                          {t.presence ? (
                            <span
                              className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: PRESENCE_CONFIG[t.presence].color }}
                            >
                              {PRESENCE_CONFIG[t.presence].label}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-emerald-700">{t.inHand}</td>
                        <td className="px-4 py-2.5 font-semibold text-amber-700">{t.taken}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs italic max-w-[120px] truncate" title={t.note}>
                          {t.note}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-4">
            <Card padding="sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">Charges mensuelles</h3>
                </div>
                <button
                  onClick={openChargesModal}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition-colors"
                  title="Ajouter, modifier ou supprimer des charges"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Gérer</span>
                </button>
              </div>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {charges.map(c => (
                  <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{c.name}</span>
                    <span className="text-sm font-semibold text-red-600">{c.amount.toLocaleString('fr-FR')} DT</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
                <span className="font-bold text-red-700">{totalCharges.toLocaleString('fr-FR')} DT</span>
              </div>
            </Card>

            <Card padding="sm">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Code Présence</h3>
              </div>
              <div className="space-y-1.5">
                {ALL_PRESENCE_STATUTS.map(statut => (
                  <div key={statut} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: PRESENCE_CONFIG[statut].color }}
                    />
                    <span className="text-xs text-gray-600">{PRESENCE_CONFIG[statut].label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {mainTab === 'resume' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Soldes Équipe</h2>
              <select
                value={memberSort}
                onChange={e => setMemberSort(e.target.value as MemberSort)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="solde">Solde ↑</option>
                <option value="nom">Nom A-Z</option>
                <option value="avances">Avances ↓</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {sortedMemberNames.map((name, i) => {
                const t = memberTotals[name]
                const isSelected = selectedMember === name
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedMember(isSelected ? null : name)}
                    className={cn(
                      'text-left rounded-xl border p-4 transition-all',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200'
                        : 'border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md'
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm mb-2"
                      style={{
                        backgroundColor: avatarColors[i % avatarColors.length][0],
                        color: avatarColors[i % avatarColors.length][1],
                      }}
                    >
                      {getInitials(name)}
                    </div>
                    <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="text-emerald-700 font-medium">En main: {t.inHand}</span>
                      <span className="text-amber-700 font-medium">Pris: {t.taken}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Solde</span>
                      <span className={cn('font-bold', t.balance >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                        {t.balance >= 0 ? '+' : ''}{t.balance} DT
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            {sortedMemberNames.length === 0 && (
              <Card padding="lg">
                <p className="text-center text-gray-500">Aucun membre avec des données ce mois</p>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card padding="sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">Charges mensuelles</h3>
                </div>
                <button
                  onClick={openChargesModal}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-emerald-600 transition-colors"
                  title="Ajouter, modifier ou supprimer des charges"
                >
                  <Settings2 className="w-4 h-4" />
                  <span>Gérer</span>
                </button>
              </div>
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {charges.map(c => (
                  <div key={c.id} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-700">{c.name}</span>
                    <span className="text-sm font-semibold text-red-600">{c.amount.toLocaleString('fr-FR')} DT</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-3 mt-2 border-t-2 border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase">Total</span>
                <span className="font-bold text-red-700">{totalCharges.toLocaleString('fr-FR')} DT</span>
              </div>
            </Card>

            <Card padding="sm">
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Code Présence</h3>
              </div>
              <div className="space-y-1.5">
                {ALL_PRESENCE_STATUTS.map(statut => (
                  <div key={statut} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: PRESENCE_CONFIG[statut].color }}
                    />
                    <span className="text-xs text-gray-600">{PRESENCE_CONFIG[statut].label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={editingDay !== null}
        onClose={() => setEditingDay(null)}
        title={editingDay ? `Caisse — ${formatDate(editingDay.date)}` : ''}
        subtitle={editingDay?.id === -1 ? 'Choisir la date puis renseigner les membres' : 'Modifier les montants et notes'}
        maxWidth="lg"
      >
        {editingDay && (
          <div className="space-y-4">
            {editingDay.id === -1 && (
              <Input
                label="Date du jour"
                type="date"
                value={editingDay.date}
                onChange={e => setEditingDay({ ...editingDay, date: e.target.value })}
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {memberNames.length === 0 ? (
                <p className="text-gray-500 text-sm col-span-full py-4">
                  Aucun membre dans l'équipe. Ajoutez des membres dans Équipe → Membres équipe.
                </p>
              ) : (
                memberNames.map(memberName => {
                  const slot = editingDay.members[memberName] ?? emptySlots()
                  return (
                    <div key={memberName} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <p className="font-semibold text-gray-800 text-sm flex items-center gap-1.5 mb-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {memberName}
                      </p>
                      <div className="mb-2">
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Présence</label>
                        <select
                          value={slot.presence ?? ''}
                          onChange={e =>
                            updateEditingMember(
                              memberName,
                              'presence',
                              e.target.value === '' ? null : (e.target.value as PresenceStatut)
                            )
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                        >
                          <option value="">— Choisir —</option>
                          {ALL_PRESENCE_STATUTS.map(statut => (
                            <option key={statut} value={statut}>
                              {PRESENCE_CONFIG[statut].label}
                            </option>
                          ))}
                        </select>
                        {slot.presence && (
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold text-white"
                            style={{ backgroundColor: PRESENCE_CONFIG[slot.presence].color }}
                          >
                            {PRESENCE_CONFIG[slot.presence].label}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">En main</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="0"
                            value={slot.inHand ?? ''}
                            onChange={e =>
                              updateEditingMember(memberName, 'inHand', e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Pris</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="0"
                            value={slot.taken ?? ''}
                            onChange={e =>
                              updateEditingMember(memberName, 'taken', e.target.value === '' ? null : Number(e.target.value))
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Note</label>
                        <input
                          type="text"
                          className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Optionnel"
                          value={slot.note}
                          onChange={e => updateEditingMember(memberName, 'note', e.target.value)}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setEditingDay(null)} className="flex-1">
                Annuler
              </Button>
              <Button type="button" onClick={handleSaveDay} className="flex-1">
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal mono-membre (cellule) */}
      <Modal
        open={editingCell !== null}
        onClose={() => {
          setEditingCell(null)
          setEditingCellSlot(null)
        }}
        title={editingCell ? `Caisse — ${editingCell.memberName} — ${formatDate(editingCell.day.date)}` : ''}
        subtitle="Modifier ce membre"
        maxWidth="sm"
      >
        {editingCell && editingCellSlot && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="mb-3">
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Présence</label>
                <select
                  value={editingCellSlot.presence ?? ''}
                  onChange={e =>
                    setEditingCellSlot({
                      ...editingCellSlot,
                      presence: e.target.value === '' ? null : (e.target.value as PresenceStatut),
                    })
                  }
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">— Choisir —</option>
                  {ALL_PRESENCE_STATUTS.map(statut => (
                    <option key={statut} value={statut}>
                      {PRESENCE_CONFIG[statut].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">En main</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="0"
                    value={editingCellSlot.inHand ?? ''}
                    onChange={e =>
                      setEditingCellSlot({
                        ...editingCellSlot,
                        inHand: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Pris</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="0"
                    value={editingCellSlot.taken ?? ''}
                    onChange={e =>
                      setEditingCellSlot({
                        ...editingCellSlot,
                        taken: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Note</label>
                <input
                  type="text"
                  className="w-full mt-0.5 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Optionnel"
                  value={editingCellSlot.note}
                  onChange={e => setEditingCellSlot({ ...editingCellSlot, note: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingCell(null)
                  setEditingCellSlot(null)
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="button" onClick={handleSaveCell} className="flex-1">
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Gestion des charges */}
      <Modal
        open={showChargesModal}
        onClose={() => {
          setShowChargesModal(false)
          setEditingCharge(null)
        }}
        title="Gérer les charges mensuelles"
        subtitle="Ajoutez, modifiez ou supprimez les charges fixes du mois"
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
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveCharge}
              disabled={!newChargeName.trim() || isNaN(parseFloat(newChargeAmount))}
              icon={!editingCharge ? <Plus className="w-4 h-4" /> : undefined}
            >
              {editingCharge ? 'Modifier' : 'Ajouter'}
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
                  className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                    <span className="text-sm font-semibold text-red-600 shrink-0">{c.amount.toLocaleString('fr-FR')} DT</span>
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
                        if (confirm(`Supprimer « ${c.name} » ?`)) removeCharge(c.id)
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
              <span className="font-bold text-red-700">{totalCharges.toLocaleString('fr-FR')} DT</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
