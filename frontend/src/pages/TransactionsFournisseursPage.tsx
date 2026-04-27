import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFournisseurs } from '@/contexts/FournisseursContext'
import { useTransactionsFournisseurs } from '@/contexts/TransactionsFournisseursContext'
import { useToast } from '@/contexts/ToastContext'
import type { TransactionFournisseur, TransactionFournisseurType } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import {
  Receipt,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Search,
  Package,
  Trash2,
  BarChart2,
  FileSpreadsheet,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts'
import { cn } from '@/lib/utils'

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND'
}

type TabType = TransactionFournisseurType | 'synthese'

const TAB_CONFIG: Record<Exclude<TabType, 'synthese'>, { label: string; icon: typeof Package; color: string }> = {
  achat: { label: 'Achats', icon: Package, color: 'amber' },
  revenue: { label: 'Revenus (IN)', icon: ArrowDownRight, color: 'emerald' },
  paiement: { label: 'Paiements (OUT)', icon: CreditCard, color: 'rose' },
}

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

const todayISO = () => new Date().toISOString().slice(0, 10)

export default function TransactionsFournisseursPage() {
  const { user, permissions } = useAuth()
  const { fournisseurs } = useFournisseurs()
  const { transactions, loading, addTransaction, updateTransaction, removeTransaction } = useTransactionsFournisseurs()
  const toast = useToast()
  const [tab, setTab] = useState<TabType>('achat')
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<TransactionFournisseur, 'id'>>({
    type: 'achat',
    date: todayISO(),
    montant: 0,
    fournisseur: '',
    vehicule: '',
    pieces: '',
    numFacture: '',
  })

  const inPeriod = useCallback(
    (dateStr: string) => {
      const [y, m] = dateStr.split('-').map(Number)
      return y === period.year && m === period.month
    },
    [period]
  )

  const periodLabel = `${MONTHS[period.month - 1]} ${period.year}`

  const filtered = useMemo(() => {
    let list = transactions.filter(t => t.type === tab && inPeriod(t.date))
    if (tab === 'synthese') return []
    if (!search.trim()) return list.sort((a, b) => b.date.localeCompare(a.date))
    const q = search.toLowerCase()
    return list
      .filter(
        t =>
          t.fournisseur.toLowerCase().includes(q) ||
          (t.vehicule && t.vehicule.toLowerCase().includes(q)) ||
          (t.pieces && t.pieces.toLowerCase().includes(q))
      )
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, tab, search, period, inPeriod])

  const totals = useMemo(() => {
    const inPeriodList = transactions.filter(t => inPeriod(t.date))
    const achat = inPeriodList.filter(t => t.type === 'achat').reduce((s, t) => s + t.montant, 0)
    const revenue = inPeriodList.filter(t => t.type === 'revenue').reduce((s, t) => s + t.montant, 0)
    const paiement = inPeriodList.filter(t => t.type === 'paiement').reduce((s, t) => s + t.montant, 0)
    return {
      achat,
      revenue,
      paiement,
      totalIn: revenue,
      totalOut: paiement,
      solde: revenue - paiement,
    }
  }, [transactions, period, inPeriod])

  const synthese = useMemo(() => {
    const inPeriodList = transactions.filter(t => inPeriod(t.date))
    const byFournisseur: Record<string, { facture: number; paye: number }> = {}

    for (const t of inPeriodList) {
      const nom = (t.fournisseur || '').trim() || '(Sans fournisseur)'
      if (!byFournisseur[nom]) byFournisseur[nom] = { facture: 0, paye: 0 }
      if (t.type === 'achat') byFournisseur[nom].facture += t.montant
      if (t.type === 'paiement') byFournisseur[nom].paye += t.montant
    }

    return Object.entries(byFournisseur)
      .map(([fournisseur, v]) => {
        const totalPaye = Math.min(v.facture, Math.max(0, v.paye))
        const reste = Math.max(0, v.facture - totalPaye)
        return {
          fournisseur,
          totalFacture: v.facture,
          totalPaye,
          reste,
        }
      })
      .filter(r => r.totalFacture > 0 || r.totalPaye > 0)
      .sort((a, b) => b.totalFacture - a.totalFacture)
  }, [transactions, inPeriod])

  const syntheseChartData = useMemo(
    () =>
      synthese.slice(0, 15).map(r => ({
        fournisseur: r.fournisseur,
        fournisseurCourt: r.fournisseur.length > 22 ? `${r.fournisseur.slice(0, 22)}...` : r.fournisseur,
        facture: Math.round(r.totalFacture * 100) / 100,
        paye: Math.round(r.totalPaye * 100) / 100,
        reste: Math.round(r.reste * 100) / 100,
      })),
    [synthese]
  )

  const openNew = () => {
    setForm({
      type: tab === 'synthese' ? 'achat' : tab,
      date: todayISO(),
      montant: 0,
      fournisseur: '',
      vehicule: '',
      pieces: '',
      numFacture: '',
    })
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (t: TransactionFournisseur, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setForm({
      type: t.type,
      date: t.date,
      montant: t.montant,
      fournisseur: t.fournisseur,
      vehicule: t.vehicule ?? '',
      pieces: t.pieces ?? '',
      numFacture: t.numFacture ?? '',
    })
    setEditingId(t.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.fournisseur.trim() || !form.date) return
    const payload = { ...form, vehicule: form.vehicule || undefined, pieces: form.pieces || undefined, numFacture: form.numFacture || undefined }
    try {
      if (editingId) {
        await updateTransaction(editingId, payload)
        toast.success('Transaction modifiée avec succès')
      } else {
        await addTransaction(payload)
        toast.success('Transaction ajoutée avec succès')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  const confirmDelete = async () => {
    if (deleteId !== null) {
      const ok = await removeTransaction(deleteId)
      if (ok) toast.success('Transaction supprimée')
      else toast.error('Erreur lors de la suppression')
      setDeleteId(null)
    }
  }

  const prevPeriod = () => {
    if (period.month === 1) setPeriod({ year: period.year - 1, month: 12 })
    else setPeriod({ year: period.year, month: period.month - 1 })
  }
  const nextPeriod = () => {
    if (period.month === 12) setPeriod({ year: period.year + 1, month: 1 })
    else setPeriod({ year: period.year, month: period.month + 1 })
  }

  if (!user) return null

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Receipt className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès aux transactions fournisseurs.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/25">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            Transactions Fournisseurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Feuille 1 : Achats, Revenus (IN), Paiements (OUT) et reste à payer fournisseurs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button onClick={prevPeriod} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Mois précédent">
              ←
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-800 min-w-[140px] text-center border-x border-gray-100">{periodLabel}</span>
            <button onClick={nextPeriod} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Mois suivant">
              →
            </button>
          </div>
          <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
            Ajouter
          </Button>
        </div>
      </header>

      {/* Cartes : Achats, Total IN (Revenus), Total OUT (Paiements), Solde */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card padding="lg" className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-700/80">Total Achats</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{formatMontant(totals.achat)}</p>
            </div>
          </div>
        </Card>
        <Card padding="lg" className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-700/80">Total IN (Revenus)</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{formatMontant(totals.totalIn)}</p>
            </div>
          </div>
        </Card>
        <Card padding="lg" className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-rose-700/80">Total OUT (Paiements)</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{formatMontant(totals.totalOut)}</p>
            </div>
          </div>
        </Card>
        <Card padding="lg" className={cn('border', totals.solde >= 0 ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200')}>
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', totals.solde >= 0 ? 'bg-teal-500/20' : 'bg-orange-500/20')}>
              <Receipt className={cn('w-5 h-5', totals.solde >= 0 ? 'text-teal-600' : 'text-orange-600')} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700/80">Solde (IN − OUT)</p>
              <p className={cn('text-xl font-bold tabular-nums', totals.solde >= 0 ? 'text-teal-700' : 'text-orange-700')}>{formatMontant(totals.solde)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="inline-flex p-1 rounded-xl bg-gray-100">
          {(['achat', 'revenue', 'paiement', 'synthese'] as const).map(t => {
            const isSynthese = t === 'synthese'
            const config = isSynthese ? null : TAB_CONFIG[t]
            const Icon = isSynthese ? BarChart2 : config!.icon
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {isSynthese ? 'Synthèse par fournisseur' : config!.label}
              </button>
            )
          })}
        </div>
        {tab !== 'synthese' && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Rechercher (fournisseur, véhicule, pièces…)"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Contenu selon onglet */}
      <Card padding="none" className="overflow-hidden border border-gray-100">
        {loading ? (
          <div className="px-4 py-12 text-center text-gray-500">Chargement des transactions...</div>
        ) : tab === 'synthese' && (
          <div className="space-y-4 p-4">
            {synthese.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">Aucune donnée pour {periodLabel}</div>
            ) : (
              <>
                <div className="rounded-xl border border-gray-100 bg-white p-3">
                  <p className="text-xs text-gray-500 mb-1">Top 15 fournisseurs (mise à jour automatique selon la période)</p>
                  <p className="text-[11px] text-gray-400 mb-2">Facturé = transactions type Achat, Payé = transactions type Paiement, Reste = Facturé - Payé</p>
                  <div className="h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={syntheseChartData} layout="vertical" margin={{ top: 8, right: 18, left: 28, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis dataKey="fournisseurCourt" type="category" tick={{ fontSize: 11 }} width={150} />
                        <Tooltip
                          formatter={(value: unknown) => {
                            const v = Array.isArray(value) ? Number(value[0]) : Number(value)
                            return formatMontant(Number.isFinite(v) ? v : 0)
                          }}
                          labelFormatter={(_, payload) => {
                            const row = payload?.[0]?.payload as { fournisseur?: string } | undefined
                            return row?.fournisseur ?? ''
                          }}
                        />
                        <Legend />
                        <Bar dataKey="facture" name="Facturé" fill="#334155" radius={[4, 4, 4, 4]} />
                        <Bar dataKey="paye" name="Payé" fill="#16a34a" radius={[4, 4, 4, 4]}>
                          <LabelList dataKey="paye" position="right" formatter={(v: unknown) => (Number(v) > 0 ? Number(v).toFixed(0) : '')} fontSize={10} fill="#065f46" />
                        </Bar>
                        <Bar dataKey="reste" name="Reste" fill="#ea580c" radius={[4, 4, 4, 4]}>
                          <LabelList dataKey="reste" position="right" formatter={(v: unknown) => (Number(v) > 0 ? Number(v).toFixed(0) : '')} fontSize={10} fill="#9a3412" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-teal-50 border-b border-teal-100">
                        <th className="px-4 py-3 text-left font-semibold text-gray-900">Fournisseur</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Total facturé</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Total payé</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-900">Reste à payer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {synthese.map(r => (
                        <tr key={r.fournisseur} className="border-b border-gray-50 hover:bg-teal-50/30">
                          <td className="px-4 py-3 font-medium text-gray-900">{r.fournisseur}</td>
                          <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{formatMontant(r.totalFacture)}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 tabular-nums">{formatMontant(r.totalPaye)}</td>
                          <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', r.reste <= 0 ? 'text-teal-600' : 'text-orange-600')}>
                            {formatMontant(r.reste)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
        {!loading && tab === 'achat' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Pièces</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Véhicule</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Fournisseur</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">N° Facture / BL</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      Aucun achat pour {periodLabel}
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} onClick={() => openEdit(t)} className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-gray-700">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-gray-900">{t.pieces || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums" style={{ color: t.montant < 0 ? '#dc2626' : undefined }}>{formatMontant(t.montant)}</td>
                      <td className="px-4 py-3 text-gray-600">{t.vehicule || '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.fournisseur}</td>
                      <td className="px-4 py-3 text-gray-500">{t.numFacture || '—'}</td>
                      <td className="px-2 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(t.id) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === 'revenue' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-50 border-b border-emerald-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Véhicule</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Fournisseur</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      Aucun revenu pour {periodLabel}
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} onClick={() => openEdit(t)} className="border-b border-gray-50 hover:bg-emerald-50/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-gray-700">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 tabular-nums">{formatMontant(t.montant)}</td>
                      <td className="px-4 py-3 text-gray-600">{t.vehicule || '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.fournisseur}</td>
                      <td className="px-2 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(t.id) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && tab === 'paiement' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-rose-50 border-b border-rose-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Fournisseur</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                      Aucun paiement pour {periodLabel}
                    </td>
                  </tr>
                ) : (
                  filtered.map(t => (
                    <tr key={t.id} onClick={() => openEdit(t)} className="border-b border-gray-50 hover:bg-rose-50/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-gray-700">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-600 tabular-nums">{formatMontant(t.montant)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{t.fournisseur}</td>
                      <td className="px-2 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteId(t.id) }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Modifier la transaction' : 'Nouvelle transaction'} subtitle={tab !== 'synthese' ? TAB_CONFIG[form.type as TransactionFournisseurType]?.label : undefined} maxWidth="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value as TransactionFournisseurType }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500">
              <option value="achat">Achat (Pièces, Montant, Véhicule, Fournisseur, N° Facture)</option>
              <option value="revenue">Revenu (IN) — Date, Montant, Véhicule, Fournisseur</option>
              <option value="paiement">Paiement (OUT) — Date, Montant, Fournisseur</option>
            </select>
          </div>
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
          <Input label="Montant (TND)" type="number" step={0.01} value={form.montant || ''} onChange={e => setForm(prev => ({ ...prev, montant: Number(e.target.value) || 0 }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <input
              list="fournisseurs-list"
              value={form.fournisseur}
              onChange={e => setForm(prev => ({ ...prev, fournisseur: e.target.value }))}
              placeholder="Sélectionnez ou tapez"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            />
            <datalist id="fournisseurs-list">
              {fournisseurs.map(f => (
                <option key={f.id} value={f.nom} />
              ))}
            </datalist>
          </div>
          {(form.type === 'achat' || form.type === 'revenue') && (
            <Input label="Véhicule" value={form.vehicule} onChange={e => setForm(prev => ({ ...prev, vehicule: e.target.value }))} placeholder="Optionnel" />
          )}
          {form.type === 'achat' && (
            <>
              <Input label="Pièces (désignation)" value={form.pieces} onChange={e => setForm(prev => ({ ...prev, pieces: e.target.value }))} placeholder="Ex. NECESSAIRE INJECTEURS" />
              <Input label="N° Facture / Bon de livraison" value={form.numFacture} onChange={e => setForm(prev => ({ ...prev, numFacture: e.target.value }))} placeholder="Optionnel" />
            </>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
            <Button onClick={save} className="flex-1" disabled={!form.fournisseur.trim() || !form.date}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Supprimer cette transaction ?" maxWidth="sm">
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Annuler</Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1">Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
