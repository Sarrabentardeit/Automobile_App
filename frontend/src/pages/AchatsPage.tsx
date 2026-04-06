import { useState, useMemo, useEffect, useCallback, type ChangeEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAchats } from '@/contexts/AchatsContext'
import { useFournisseurs } from '@/contexts/FournisseursContext'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { useMoney } from '@/contexts/MoneyContext'
import { useToast } from '@/contexts/ToastContext'
import type { FactureFournisseur, LigneAchat, FactureFournisseurStatut, FournisseurTopItem, FournisseurFiche } from '@/types'
import { FACTURE_FOURNISSEUR_STATUT_CONFIG, MODE_PAIEMENT_OPTIONS } from '@/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Truck,
  CheckCircle,
  Copy,
  AlertCircle,
  TrendingUp,
  Users,
  X,
  ExternalLink,
  Import,
  Printer,
  FileDown,
} from 'lucide-react'
import { computeFactureAchatTotals, formatMontantEnLettres, printFactureAchat, exportFactureAchatPdf } from '@/lib/factureUtils'
import { cn } from '@/lib/utils'
import { prixUnitaireAchatTTC } from '@/lib/stockUtils'

export default function AchatsPage() {
  const { permissions } = useAuth()
  const { factures, loading, addFacture, updateFacture, removeFacture, getNextNumero } = useAchats()
  const { fournisseurs, fetchTopFournisseurs, fetchFournisseurFiche } = useFournisseurs()
  const { produits, refetch: refetchStock } = useStockGeneral()
  const { addOut } = useMoney()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<'semaine' | 'mois' | 'annee'>('mois')
  const [filtreStatut, setFiltreStatut] = useState<FactureFournisseurStatut | 'tous'>('tous')
  const [showModal, setShowModal] = useState(false)
  const [panelFournisseur, setPanelFournisseur] = useState<{ nom: string; fournisseurId: number | null } | null>(null)
  const [panelFiche, setPanelFiche] = useState<FournisseurFiche | null>(null)
  const [panelFicheLoading, setPanelFicheLoading] = useState(false)
  const [panelDetail, setPanelDetail] = useState<FactureFournisseur | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<FactureFournisseur, 'id' | 'createdAt'>>({
    numero: '',
    date: new Date().toISOString().slice(0, 10),
    fournisseurId: null,
    fournisseurNom: '',
    numeroFactureFournisseur: '',
    modePaiement: '',
    commentaire: '',
    timbre: 1,
    statut: 'brouillon',
    lignes: [],
    paye: false,
  })

  const ttcFacture = useCallback((lignes: LigneAchat[], timbre?: number) => {
    return computeFactureAchatTotals(lignes, timbre ?? 1).totalTTC
  }, [])

  const formTotals = useMemo(() => computeFactureAchatTotals(form.lignes, form.timbre ?? 1), [form.lignes, form.timbre])

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const monthStart = new Date(year, month, 1).toISOString().slice(0, 10)
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10)
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekStart = weekAgo.toISOString().slice(0, 10)
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const inPeriod = useCallback((d: string) => {
    const today = now.toISOString().slice(0, 10)
    if (period === 'semaine') return d >= weekStart && d <= today
    if (period === 'mois') return d >= monthStart && d <= monthEnd
    return d >= yearStart && d <= yearEnd
  }, [period, weekStart, monthStart, monthEnd, yearStart, yearEnd, now])

  const filtered = useMemo(() => {
    let list = [...factures].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    list = list.filter(f => inPeriod(f.date))
    if (filtreStatut !== 'tous') {
      list = list.filter(f => f.statut === filtreStatut)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f => f.numero.toLowerCase().includes(q) || f.fournisseurNom.toLowerCase().includes(q))
    }
    return list
  }, [factures, search, filtreStatut, inPeriod])

  const stats = useMemo(() => {
    const totalDuMois = factures
      .filter(f => f.date >= monthStart && f.date <= monthEnd)
      .reduce((s, f) => s + ttcFacture(f.lignes, f.timbre), 0)
    const enAttente = factures.filter(f => !f.paye).reduce((s, f) => s + ttcFacture(f.lignes, f.timbre), 0)
    const countEnAttente = factures.filter(f => !f.paye).length
    return { totalDuMois, enAttente, countEnAttente }
  }, [factures, monthStart, monthEnd, ttcFacture])

  const totalParPeriode = useMemo(() => {
    return factures.filter(f => inPeriod(f.date)).reduce((s, f) => s + ttcFacture(f.lignes, f.timbre), 0)
  }, [factures, inPeriod, ttcFacture])

  const [topFournisseurs, setTopFournisseurs] = useState<FournisseurTopItem[]>([])
  useEffect(() => {
    fetchTopFournisseurs(5).then(setTopFournisseurs)
  }, [fetchTopFournisseurs])

  useEffect(() => {
    if (!panelFournisseur) {
      setPanelFiche(null)
      setPanelFicheLoading(false)
      return
    }
    if (panelFournisseur.fournisseurId) {
      setPanelFicheLoading(true)
      setPanelFiche(null)
      fetchFournisseurFiche(panelFournisseur.fournisseurId)
        .then(f => {
          setPanelFiche(f ?? null)
        })
        .finally(() => setPanelFicheLoading(false))
    } else {
      setPanelFiche(null)
      setPanelFicheLoading(false)
    }
  }, [panelFournisseur, fetchFournisseurFiche])

  const openNew = async () => {
    const numero = await getNextNumero()
    setForm({
      numero,
      date: new Date().toISOString().slice(0, 10),
      fournisseurId: null,
      fournisseurNom: '',
      numeroFactureFournisseur: '',
      modePaiement: '',
      commentaire: '',
      timbre: 1,
      statut: 'brouillon',
      lignes: [],
      paye: false,
    })
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (f: FactureFournisseur) => {
    setForm({
      numero: f.numero,
      date: f.date,
      fournisseurId: f.fournisseurId,
      fournisseurNom: f.fournisseurNom,
      numeroFactureFournisseur: f.numeroFactureFournisseur ?? '',
      modePaiement: f.modePaiement ?? '',
      commentaire: f.commentaire ?? '',
      timbre: f.timbre ?? 1,
      statut: f.statut,
      lignes: f.lignes.length ? f.lignes : [],
      paye: f.paye,
    })
    setEditingId(f.id)
    setShowModal(true)
  }

  const openDuplicate = async (f: FactureFournisseur) => {
    const numero = await getNextNumero()
    setForm({
      numero,
      date: new Date().toISOString().slice(0, 10),
      fournisseurId: f.fournisseurId,
      fournisseurNom: f.fournisseurNom,
      numeroFactureFournisseur: f.numeroFactureFournisseur ?? '',
      modePaiement: f.modePaiement ?? '',
      commentaire: f.commentaire ?? '',
      timbre: f.timbre ?? 1,
      statut: 'brouillon',
      lignes: f.lignes.length ? f.lignes.map(l => ({ ...l })) : [],
      paye: false,
    })
    setEditingId(null)
    setShowModal(true)
  }

  const modePaiementLabel = (v: string) => (MODE_PAIEMENT_OPTIONS.find(o => o.value === v)?.label ?? v) || '—'

  const addLigne = (productId: number) => {
    const p = produits.find(x => x.id === productId)
    if (!p) return
    const qteStock = p.quantite ?? 0
    const ttcUnit = prixUnitaireAchatTTC(p)
    const prixUnitaire = ttcUnit > 0 ? Math.round((ttcUnit / 1.19) * 10000) / 10000 : 0
    setForm(prev => ({
      ...prev,
      lignes: [...prev.lignes, { productId: p.id, designation: p.nom, quantite: 1, prixUnitaire }],
    }))
  }

  const setLigne = (index: number, patch: Partial<LigneAchat>) => {
    setForm(prev => ({
      ...prev,
      lignes: prev.lignes.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }))
  }

  const removeLigne = (index: number) => {
    setForm(prev => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== index) }))
  }

  const saveAchat = async (validerEtEntrerStock?: boolean) => {
    if (!form.fournisseurNom.trim()) {
      toast.error('Indiquez le fournisseur')
      return
    }
    const lignesValides = form.lignes.filter(l => l.quantite > 0)
    if (lignesValides.length === 0) {
      toast.error('Ajoutez au moins une ligne produit')
      return
    }

    const newStatut: FactureFournisseurStatut = validerEtEntrerStock ? 'validee' : form.statut
    const payload: Omit<FactureFournisseur, 'id' | 'createdAt'> = {
      ...form,
      lignes: lignesValides,
      statut: newStatut,
      paye: validerEtEntrerStock ? form.paye : form.paye,
      timbre: form.timbre ?? 1,
    }

    const prev = editingId ? factures.find(f => f.id === editingId) : null
    const doitIncrementerStock = (newStatut === 'validee' || newStatut === 'payee') && (!prev || prev.statut === 'brouillon')

    if (doitIncrementerStock) {
      const totalAchat = computeFactureAchatTotals(lignesValides, form.timbre ?? 1).totalTTC
      addOut({
        date: payload.date,
        amount: totalAchat,
        category: 'FOURNISSEUR',
        description: `Facture achat ${payload.numero} — ${payload.fournisseurNom}`,
      })
    }

    try {
      if (editingId) {
        await updateFacture(editingId, payload)
        toast.success(validerEtEntrerStock ? 'Facture validée — stock mis à jour' : 'Facture enregistrée')
      } else {
        await addFacture(payload)
        toast.success(validerEtEntrerStock ? 'Facture créée et validée — stock mis à jour' : 'Facture créée')
      }
      if (doitIncrementerStock) refetchStock()
      setShowModal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  const handleExportPdfAchat = async (f: FactureFournisseur) => {
    try {
      await exportFactureAchatPdf({ ...f, timbre: f.timbre ?? 1 })
      toast.success('Facture exportée en PDF')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  const marquerPayee = async (f: FactureFournisseur) => {
    if (f.statut === 'brouillon') {
      const totalAchat = computeFactureAchatTotals(f.lignes, f.timbre ?? 1).totalTTC
      addOut({
        date: f.date,
        amount: totalAchat,
        category: 'FOURNISSEUR',
        description: `Facture achat ${f.numero} — ${f.fournisseurNom}`,
      })
    }
    try {
      await updateFacture(f.id, { statut: 'payee', paye: true })
      if (f.statut === 'brouillon') refetchStock()
      toast.success('Facture marquée payée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n&apos;avez pas accès à la facturation achat.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-medium">Chargement des factures fournisseurs…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 px-2 sm:px-4 md:px-6 pb-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shrink-0">
            <Import className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">Facturation achat</h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">Factures fournisseurs — la validation enregistre l&apos;entrée en stock</p>
          </div>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />} size="sm" className="w-full sm:w-auto shrink-0">
          Nouvelle facture fournisseur
        </Button>
      </div>

      {/* Stats : Total du mois + En attente de paiement */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
        <Card padding="sm" className="bg-gradient-to-br from-orange-50 to-white border-orange-100 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide truncate">Total du mois</p>
              <p className="text-sm sm:text-lg font-bold text-gray-900 tabular-nums truncate">{stats.totalDuMois.toFixed(2)} DT</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" className={cn('border py-2.5 sm:py-3', stats.enAttente > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50/50 border-gray-100')}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0', stats.enAttente > 0 ? 'bg-amber-200' : 'bg-gray-200')}>
              <AlertCircle className={cn('w-4 h-4 sm:w-5 sm:h-5', stats.enAttente > 0 ? 'text-amber-700' : 'text-gray-500')} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide truncate">En attente</p>
              <p className={cn('text-sm sm:text-lg font-bold tabular-nums truncate', stats.enAttente > 0 ? 'text-amber-800' : 'text-gray-700')}>
                {stats.enAttente.toFixed(2)} DT
              </p>
              {stats.countEnAttente > 0 && (
                <p className="text-[10px] sm:text-xs text-gray-500">{stats.countEnAttente} fact.</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Badge alerte Factures à payer */}
      {stats.enAttente > 0 && (
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-amber-100 border border-amber-300 text-amber-900">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <p className="text-xs sm:text-sm font-semibold flex-1 min-w-0 truncate">
            Factures à payer : <strong>{stats.enAttente.toFixed(2)} DT</strong> ({stats.countEnAttente} fact.)
          </p>
        </div>
      )}

      {/* Résumé par période + Top fournisseurs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <Card padding="sm" className="py-3 sm:py-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3">Résumé par période</h3>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            {(['semaine', 'mois', 'annee'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                  period === p
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {p === 'semaine' ? 'Semaine' : p === 'mois' ? 'Mois' : 'Année'}
              </button>
            ))}
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{totalParPeriode.toFixed(2)} DT</p>
        </Card>
        <Card padding="sm" className="py-3 sm:py-4">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            Top fournisseurs
          </h3>
          {topFournisseurs.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune facture enregistrée</p>
          ) : (
            <ul className="space-y-2">
              {topFournisseurs.map((f, i) => (
                <li key={f.fournisseurId} className="flex items-center justify-between text-xs sm:text-sm gap-2 min-w-0">
                  <span className="font-medium text-gray-700 truncate min-w-0">
                    {i + 1}. {f.nom}
                  </span>
                  <span className="tabular-nums font-semibold text-gray-900 shrink-0">{f.total.toFixed(2)} DT</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="sm" className="py-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par n° ou fournisseur..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Filtre par statut */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {(['tous', 'brouillon', 'validee', 'payee'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFiltreStatut(s)}
            className={cn(
              'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
              filtreStatut === s
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {s === 'tous' ? 'Tous' : FACTURE_FOURNISSEUR_STATUT_CONFIG[s].label}
          </button>
        ))}
      </div>

      <Card padding="none" className="overflow-hidden shadow-sm border border-gray-100 rounded-xl sm:rounded-2xl">
        {filtered.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Truck className="w-7 h-7 sm:w-8 sm:h-8 text-orange-500" />
            </div>
            <p className="font-semibold text-gray-700 text-sm sm:text-base">Aucune facture fournisseur</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Créez une facture pour enregistrer l&apos;achat et l&apos;entrée en stock.</p>
            <Button className="mt-3 sm:mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />} size="sm">
              Nouvelle facture fournisseur
            </Button>
          </div>
        ) : (
          <>
          {/* Vue cartes - Mobile & Tablette */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((f, i) => (
              <div
                key={f.id}
                onClick={() => setPanelDetail(f)}
                className={cn(
                  'p-3 sm:p-4 cursor-pointer active:bg-orange-50/70 transition-colors',
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{f.numero}</p>
                    <p className="text-xs text-gray-500">{formatDate(f.date)}</p>
                  </div>
                  <span className="tabular-nums font-bold text-gray-900 shrink-0">{ttcFacture(f.lignes, f.timbre).toFixed(2)} DT</span>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setPanelFournisseur({ nom: f.fournisseurNom, fournisseurId: f.fournisseurId }) }}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium truncate block w-full text-left"
                >
                  {f.fournisseurNom}
                </button>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border', FACTURE_FOURNISSEUR_STATUT_CONFIG[f.statut].badge)}>
                    {FACTURE_FOURNISSEUR_STATUT_CONFIG[f.statut].label}
                  </span>
                  {f.paye ? (
                    <span className="text-emerald-600 text-xs font-medium flex items-center gap-0.5"><CheckCircle className="w-3.5 h-3.5" /> Payé</span>
                  ) : (
                    <span className="text-amber-600 text-xs font-medium">Non payé</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 flex-wrap" onClick={e => e.stopPropagation()}>
                  <button type="button" onClick={() => printFactureAchat({ ...f, timbre: f.timbre ?? 1 })} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Imprimer"><Printer className="w-4 h-4" /></button>
                  <button type="button" onClick={() => void handleExportPdfAchat(f)} className="p-1.5 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600" title="PDF"><FileDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-gray-400 hover:bg-orange-50 hover:text-orange-600" title="Modifier"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => openDuplicate(f)} className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Dupliquer"><Copy className="w-4 h-4" /></button>
                  {f.statut !== 'payee' && <button type="button" onClick={() => marquerPayee(f)} className="p-1.5 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600" title="Marquer payée"><CheckCircle className="w-4 h-4" /></button>}
                  <button type="button" onClick={() => setDeleteId(f.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>

          {/* Vue tableau - Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">N°</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">N° fact. fourn.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Mode paiement</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total TTC</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Payé</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr
                    key={f.id}
                    onClick={() => setPanelDetail(f)}
                    className={cn(
                      'border-b border-gray-50 cursor-pointer',
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                      'hover:bg-orange-50/50'
                    )}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{f.numero}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(f.date)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setPanelFournisseur({ nom: f.fournisseurNom, fournisseurId: f.fournisseurId }) }}
                        className="text-orange-600 hover:text-orange-700 font-medium hover:underline flex items-center gap-1"
                      >
                        {f.fournisseurNom}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{f.numeroFactureFournisseur || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{modePaiementLabel(f.modePaiement ?? '')}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{ttcFacture(f.lignes, f.timbre).toFixed(2)} DT</td>
                    <td className="px-4 py-2">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border', FACTURE_FOURNISSEUR_STATUT_CONFIG[f.statut].badge)}>
                        {FACTURE_FOURNISSEUR_STATUT_CONFIG[f.statut].label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {f.paye ? (
                        <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Oui</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Non payé</span>
                      )}
                    </td>
                    <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 flex-wrap">
                        <button type="button" onClick={() => printFactureAchat({ ...f, timbre: f.timbre ?? 1 })} className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Imprimer"><Printer className="w-4 h-4" /></button>
                        <button type="button" onClick={() => void handleExportPdfAchat(f)} className="p-2 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600" title="Exporter PDF"><FileDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => openEdit(f)} className="p-2 rounded-lg text-gray-400 hover:bg-orange-50 hover:text-orange-600" title="Modifier"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => openDuplicate(f)} className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="Dupliquer"><Copy className="w-4 h-4" /></button>
                        {f.statut !== 'payee' && <button type="button" onClick={() => marquerPayee(f)} className="p-2 rounded-lg text-gray-400 hover:bg-emerald-50 hover:text-emerald-600" title="Marquer payée"><CheckCircle className="w-4 h-4" /></button>}
                        <button type="button" onClick={() => setDeleteId(f.id)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      {/* Modal créer / modifier facture fournisseur */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? `Facture ${form.numero}` : 'Nouvelle facture fournisseur'}
        subtitle={form.numero}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
              <select
                value={form.fournisseurId ?? ''}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null
                  const f = fournisseurs.find(x => x.id === id)
                  setForm(prev => ({ ...prev, fournisseurId: id, fournisseurNom: f?.nom ?? '' }))
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm"
              >
                <option value="">— Choisir —</option>
                {fournisseurs.map(f => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
              {!form.fournisseurId && (
                <input
                  type="text"
                  placeholder="Ou saisir le nom"
                  value={form.fournisseurNom}
                  onChange={e => setForm(prev => ({ ...prev, fournisseurNom: e.target.value }))}
                  className="mt-1.5 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              )}
            </div>
            <Input label="Date" type="date" value={form.date} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="N° facture fournisseur"
              value={form.numeroFactureFournisseur ?? ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, numeroFactureFournisseur: e.target.value }))}
              placeholder="Ex. FAC-2026-001"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
              <select
                value={form.modePaiement ?? ''}
                onChange={e => setForm(prev => ({ ...prev, modePaiement: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm"
              >
                <option value="">— Choisir —</option>
                {MODE_PAIEMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Lignes (produits) — P.U. HT</h3>
              <select
                value=""
                onChange={e => {
                  const id = Number(e.target.value)
                  if (id) addLigne(id)
                  e.target.value = ''
                }}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs sm:text-sm bg-white w-full sm:w-auto min-w-0"
              >
                <option value="">+ Ajouter un produit</option>
                {produits.map(p => (
                  <option key={p.id} value={p.id}>{p.nom} (stock: {p.quantite})</option>
                ))}
              </select>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-x-auto -mx-1">
              <table className="w-full text-xs sm:text-sm min-w-[360px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Produit</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-20">Qté</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">P.U. HT</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Total HT</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {form.lignes.map((l, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2">{l.designation}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.quantite}
                          onChange={e => setLigne(i, { quantite: Number(e.target.value) || 0 })}
                          className="w-14 sm:w-16 min-w-0 px-1.5 sm:px-2 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.prixUnitaire}
                          onChange={e => setLigne(i, { prixUnitaire: Number(e.target.value) || 0 })}
                          className="w-16 sm:w-20 min-w-0 px-1.5 sm:px-2 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.quantite > 0 ? Math.round(l.quantite * l.prixUnitaire * 100) / 100 : 0}
                          onChange={e => {
                            const total = Number(e.target.value) || 0
                            setLigne(i, { prixUnitaire: l.quantite > 0 ? total / l.quantite : 0 })
                          }}
                          className="w-20 min-w-0 px-1.5 sm:px-2 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm text-right"
                          title="Total HT de la ligne"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => removeLigne(i)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total HT</span>
                <span className="font-semibold tabular-nums">{formTotals.totalHT.toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">TVA 19%</span>
                <span className="font-semibold tabular-nums">{formTotals.tva19.toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dépenses</span>
                <span className="font-semibold tabular-nums">{formTotals.depenses.toFixed(2)} DT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Timbre</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.timbre}
                  onChange={e => setForm(prev => ({ ...prev, timbre: Number(e.target.value) || 0 }))}
                  className="w-20 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                />
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                <span>Total TTC</span>
                <span className="tabular-nums">{formTotals.totalTTC.toFixed(2)} DT</span>
              </div>
              <p className="text-xs text-gray-500 italic pt-1">{formatMontantEnLettres(formTotals.totalTTC)}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire / Pièces jointes (réf)</label>
            <textarea
              value={form.commentaire ?? ''}
              onChange={e => setForm(prev => ({ ...prev, commentaire: e.target.value }))}
              placeholder="Notes, référence pièce jointe..."
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.paye} onChange={e => setForm(prev => ({ ...prev, paye: e.target.checked }))} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Facture payée</span>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 w-full sm:w-auto">Annuler</Button>
            {(editingId ? factures.find(f => f.id === editingId)?.statut === 'brouillon' : true) && (
              <Button onClick={() => saveAchat(true)} className="flex-1 w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
                Valider et entrer en stock
              </Button>
            )}
            <Button onClick={() => saveAchat(false)} className="flex-1 w-full sm:w-auto">Enregistrer (brouillon)</Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Supprimer la facture" subtitle={deleteId != null ? factures.find(f => f.id === deleteId)?.numero : ''} maxWidth="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Cette action est irréversible. Le stock ne sera pas modifié (suppression uniquement de l'enregistrement).</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Annuler</Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (deleteId == null) return
                const ok = await removeFacture(deleteId)
                if (ok) {
                  toast.success('Facture supprimée')
                  setDeleteId(null)
                } else {
                  toast.error('Erreur lors de la suppression')
                }
              }}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            >
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Panneau latéral : Fiche fournisseur */}
      {panelFournisseur && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelFournisseur(null)} />
          <div className="relative w-full sm:max-w-sm md:max-w-md bg-white shadow-2xl flex flex-col slide-in-from-right max-h-[100dvh] sm:max-h-[90vh] sm:rounded-l-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate pr-2">Fiche fournisseur</h3>
              <button onClick={() => setPanelFournisseur(null)} className="p-2 hover:bg-gray-100 rounded-lg shrink-0 touch-manipulation"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4 flex-1 min-h-0">
              {panelFournisseur.fournisseurId ? (
                panelFicheLoading ? (
                  <p className="text-sm text-gray-500">Chargement…</p>
                ) : panelFiche ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">{panelFiche.fournisseur.nom}</h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        {panelFiche.fournisseur.telephone && <p>📞 {panelFiche.fournisseur.telephone}</p>}
                        {panelFiche.fournisseur.email && <p>✉️ {panelFiche.fournisseur.email}</p>}
                        {panelFiche.fournisseur.adresse && <p>📍 {panelFiche.fournisseur.adresse}</p>}
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm font-semibold text-gray-700">Total cumulé</p>
                      <p className="text-xl font-bold text-orange-600 tabular-nums">{panelFiche.totalCumule.toFixed(2)} DT</p>
                    </div>
                    {panelFiche.dernierAchat && (
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-700">Dernière facture</p>
                        <p className="text-sm text-gray-600">{panelFiche.dernierAchat.numero} — {formatDate(panelFiche.dernierAchat.date)} — {panelFiche.dernierAchat.total.toFixed(2)} DT</p>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Historique ({panelFiche.countAchats} factures)</p>
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {panelFiche.historique.slice(0, 20).map(a => (
                          <li key={a.id} className="flex justify-between text-sm">
                            <span>{a.numero} — {formatDate(a.date)}</span>
                            <span className="font-medium tabular-nums">{a.total.toFixed(2)} DT</span>
                          </li>
                        ))}
                        {panelFiche.countAchats > 20 && <li className="text-xs text-gray-500">… et {panelFiche.countAchats - 20} autres</li>}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Fournisseur introuvable</p>
                )
              ) : (
                (() => {
                  const fournisseur = fournisseurs.find(f => f.nom.toLowerCase() === panelFournisseur.nom.toLowerCase())
                  const achatsFournisseur = factures.filter(a => a.fournisseurNom.trim().toLowerCase() === panelFournisseur.nom.trim().toLowerCase())
                  const totalCumule = achatsFournisseur.reduce((s, a) => s + ttcFacture(a.lignes, a.timbre), 0)
                  const dernierAchat = achatsFournisseur.sort((a, b) => b.date.localeCompare(a.date))[0]
                  return (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{panelFournisseur.nom}</h4>
                        {fournisseur && (
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            {fournisseur.telephone && <p>📞 {fournisseur.telephone}</p>}
                            {fournisseur.email && <p>✉️ {fournisseur.email}</p>}
                            {fournisseur.adresse && <p>📍 {fournisseur.adresse}</p>}
                          </div>
                        )}
                      </div>
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-700">Total cumulé</p>
                        <p className="text-xl font-bold text-orange-600 tabular-nums">{totalCumule.toFixed(2)} DT</p>
                      </div>
                      {dernierAchat && (
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-sm font-semibold text-gray-700">Dernière facture</p>
                          <p className="text-sm text-gray-600">{dernierAchat.numero} — {formatDate(dernierAchat.date)} — {ttcFacture(dernierAchat.lignes, dernierAchat.timbre).toFixed(2)} DT</p>
                        </div>
                      )}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Historique ({achatsFournisseur.length} factures)</p>
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                          {achatsFournisseur.slice(0, 20).map(a => (
                            <li key={a.id} className="flex justify-between text-sm">
                              <span>{a.numero} — {formatDate(a.date)}</span>
                              <span className="font-medium tabular-nums">{ttcFacture(a.lignes, a.timbre).toFixed(2)} DT</span>
                            </li>
                          ))}
                          {achatsFournisseur.length > 20 && <li className="text-xs text-gray-500">… et {achatsFournisseur.length - 20} autres</li>}
                        </ul>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Panneau latéral : détail facture fournisseur */}
      {panelDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelDetail(null)} />
          <div className="relative w-full sm:max-w-sm md:max-w-md bg-white shadow-2xl flex flex-col slide-in-from-right max-h-[100dvh] sm:max-h-[90vh] sm:rounded-l-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate pr-2">Facture {panelDetail.numero}</h3>
              <button onClick={() => setPanelDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg shrink-0 touch-manipulation"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4 flex-1 min-h-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <p><span className="text-gray-500">Date :</span> {formatDate(panelDetail.date)}</p>
                <p><span className="text-gray-500">Fournisseur :</span> {panelDetail.fournisseurNom}</p>
                {panelDetail.numeroFactureFournisseur && <p><span className="text-gray-500">N° fact. fourn. :</span> {panelDetail.numeroFactureFournisseur}</p>}
                {panelDetail.modePaiement && <p><span className="text-gray-500">Mode paiement :</span> {modePaiementLabel(panelDetail.modePaiement)}</p>}
                <p><span className="text-gray-500">Statut :</span> <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', FACTURE_FOURNISSEUR_STATUT_CONFIG[panelDetail.statut].badge)}>{FACTURE_FOURNISSEUR_STATUT_CONFIG[panelDetail.statut].label}</span></p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Lignes produits</h4>
                <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs sm:text-sm min-w-[240px]">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-medium text-gray-600">Produit</th>
                      <th className="text-right py-2 font-medium text-gray-600">Qté</th>
                      <th className="text-right py-2 font-medium text-gray-600">P.U. HT</th>
                      <th className="text-right py-2 font-medium text-gray-600">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panelDetail.lignes.map((l, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2">{l.designation}</td>
                        <td className="py-2 text-right tabular-nums">{l.quantite}</td>
                        <td className="py-2 text-right tabular-nums">{l.prixUnitaire.toFixed(2)} DT</td>
                        <td className="py-2 text-right font-medium tabular-nums">{(l.quantite * l.prixUnitaire).toFixed(2)} DT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="mt-3 space-y-1 text-sm border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-gray-600"><span>Total HT</span><span className="tabular-nums font-medium">{computeFactureAchatTotals(panelDetail.lignes, panelDetail.timbre ?? 1).totalHT.toFixed(2)} DT</span></div>
                  <div className="flex justify-between text-gray-600"><span>TVA 19 %</span><span className="tabular-nums font-medium">{computeFactureAchatTotals(panelDetail.lignes, panelDetail.timbre ?? 1).tva19.toFixed(2)} DT</span></div>
                  <div className="flex justify-between text-gray-600"><span>Timbre</span><span className="tabular-nums font-medium">{(panelDetail.timbre ?? 1).toFixed(2)} DT</span></div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1"><span>Total TTC</span><span className="tabular-nums">{ttcFacture(panelDetail.lignes, panelDetail.timbre).toFixed(2)} DT</span></div>
                  <p className="text-xs text-gray-500 italic">{formatMontantEnLettres(ttcFacture(panelDetail.lignes, panelDetail.timbre))}</p>
                </div>
              </div>
              {panelDetail.commentaire && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Commentaire</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{panelDetail.commentaire}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printFactureAchat({ ...panelDetail, timbre: panelDetail.timbre ?? 1 })}
                  icon={<Printer className="w-4 h-4" />}
                >
                  Imprimer
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleExportPdfAchat(panelDetail)} icon={<FileDown className="w-4 h-4" />}>
                  PDF
                </Button>
                <Button size="sm" onClick={() => { openEdit(panelDetail); setPanelDetail(null) }} icon={<Pencil className="w-4 h-4" />}>
                  Modifier
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
