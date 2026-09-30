import { useState, useMemo, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFacturation } from '@/contexts/FacturationContext'
import { useClients } from '@/contexts/ClientsContext'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { useMoney } from '@/contexts/MoneyContext'
import { useToast } from '@/contexts/ToastContext'
import type { Facture, LigneFacture, FactureStatut, ModePaiement } from '@/types'
import type { ProduitStock } from '@/types'
import { FACTURE_STATUT_CONFIG, MODE_PAIEMENT_OPTIONS } from '@/types'
import { computeFactureTotals, formatMontantEnLettres, printFacture, exportFacturePdf } from '@/lib/factureUtils'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  Receipt,
  Printer,
  FileDown,
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  LayoutGrid,
  List,
  MoreHorizontal,
  Send,
  Banknote,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { prixUnitaireAchatTTC } from '@/lib/stockUtils'

type FormLigne = LigneFacture

const emptyLigneMainOeuvre = (): FormLigne => ({
  type: 'main_oeuvre',
  designation: '',
  qte: 1,
  mtHT: 0,
})
const emptyLignePieces = (): FormLigne => ({ type: 'pieces', designation: '', qte: 1, mtHT: 0 })
const emptyLigneAutreProduit = (): FormLigne => ({ type: 'autre_produit', designation: '', qte: 1, mtHT: 0 })
const emptyLigneDivers = (): FormLigne => ({ type: 'divers', designation: '', qte: 1, mtHT: 0 })
const emptyLigneDepense = (): FormLigne => ({ type: 'depense', designation: '', montant: 0 })
function ligneFromProduit(p: ProduitStock): FormLigne {
  if (p.prixVente != null && p.prixVente > 0) {
    return { type: 'produit', productId: p.id, designation: p.nom, qte: 1, prixUnitaireHT: p.prixVente }
  }
  const unitTTC = prixUnitaireAchatTTC(p)
  return {
    type: 'produit',
    productId: p.id,
    designation: p.nom,
    qte: 1,
    prixUnitaireHT: unitTTC > 0 ? unitTTC / 1.19 : 0,
  }
}

export default function FacturationPage() {
  const { user, permissions } = useAuth()
  const { factures, fetchFactures, addFacture, updateFacture, removeFacture, addPaiementFacture, getNextNumero } = useFacturation()
  const { clients } = useClients()
  const { produits, decrementerStock, incrementerStock } = useStockGeneral()
  const { refetchMoney } = useMoney()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<FactureStatut | 'a_encaisser' | ''>('')
  const [filterMonth, setFilterMonth] = useState<number | ''>('')
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [annulerId, setAnnulerId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [openActionsId, setOpenActionsId] = useState<number | null>(null)
  const [pendingValidation, setPendingValidation] = useState<{ facture: Facture; newStatut: FactureStatut } | null>(null)
  const [payerFacture, setPayerFacture] = useState<Facture | null>(null)
  const [payerForm, setPayerForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    montant: 0,
    mode: '' as ModePaiement | '',
    note: '',
  })
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    void fetchFactures({
      q: debouncedSearch || undefined,
      statut: filterStatut && filterStatut !== 'a_encaisser' ? filterStatut : undefined,
      month: filterMonth === '' ? undefined : filterMonth,
      year: filterYear || undefined,
    })
  }, [fetchFactures, debouncedSearch, filterStatut, filterMonth, filterYear])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setOpenActionsId(null)
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  const [form, setForm] = useState({
    numero: '',
    date: new Date().toISOString().slice(0, 10),
    statut: 'brouillon' as FactureStatut,
    clientId: null as number | null,
    clientNom: '',
    clientTelephone: '',
    clientAdresse: '',
    clientMatriculeFiscale: '',
    lignes: [] as FormLigne[],
    timbre: 1,
  })

  const totals = useMemo(() => computeFactureTotals(form.lignes, form.timbre), [form.lignes, form.timbre])

  const round2 = (n: number) => Math.round(n * 100) / 100
  const factureResteTTC = (f: Facture) => {
    const t = computeFactureTotals(f.lignes, f.timbre)
    const paye = f.montantPaye ?? 0
    return Math.max(0, round2(t.totalTTC - paye))
  }

  const filteredFactures = useMemo(() => {
    let list = factures
    if (filterStatut === 'a_encaisser') {
      list = list.filter(f => {
        if (f.statut !== 'envoyee' && f.statut !== 'partiellement_payee') return false
        return factureResteTTC(f) > 0.01
      })
    }
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
  }, [factures, filterStatut])

  const FACTURES_PER_PAGE = 30
  const totalPages = Math.max(1, Math.ceil(filteredFactures.length / FACTURES_PER_PAGE))
  const paginatedFactures = useMemo(() => {
    const start = (currentPage - 1) * FACTURES_PER_PAGE
    return filteredFactures.slice(start, start + FACTURES_PER_PAGE)
  }, [filteredFactures, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterStatut, filterMonth, filterYear, viewMode])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const statsFiltered = useMemo(() => {
    const list = filteredFactures
    const totalCA = list.filter(f => f.statut !== 'annulee').reduce((s, f) => s + computeFactureTotals(f.lignes, f.timbre).totalTTC, 0)
    const payees = list.filter(f => f.statut === 'payee').length
    const partielles = list.filter(f => f.statut === 'partiellement_payee').length
    const brouillons = list.filter(f => f.statut === 'brouillon').length
    const annulees = list.filter(f => f.statut === 'annulee').length
    return { count: list.length, totalCA, payees, partielles, brouillons, annulees }
  }, [filteredFactures])

  const openNew = () => {
    setForm({
      numero: getNextNumero(),
      date: new Date().toISOString().slice(0, 10),
      statut: 'brouillon',
      clientId: null,
      clientNom: '',
      clientTelephone: '',
      clientAdresse: '',
      clientMatriculeFiscale: '',
      lignes: [emptyLigneMainOeuvre()],
      timbre: 1,
    })
    setEditingId(null)
    setShowModal(true)
  }

  const openEdit = (f: Facture) => {
    setForm({
      numero: f.numero,
      date: f.date,
      statut: f.statut,
      clientId: f.clientId ?? null,
      clientNom: f.clientNom,
      clientTelephone: f.clientTelephone,
      clientAdresse: f.clientAdresse ?? '',
      clientMatriculeFiscale: f.clientMatriculeFiscale ?? '',
      lignes: f.lignes.length ? f.lignes : [emptyLigneMainOeuvre()],
      timbre: f.timbre,
    })
    setEditingId(f.id)
    setShowModal(true)
  }

  const openDuplicate = (f: Facture) => {
    setForm({
      numero: getNextNumero(),
      date: new Date().toISOString().slice(0, 10),
      statut: 'brouillon',
      clientId: f.clientId ?? null,
      clientNom: f.clientNom,
      clientTelephone: f.clientTelephone,
      clientAdresse: f.clientAdresse ?? '',
      clientMatriculeFiscale: f.clientMatriculeFiscale ?? '',
      lignes: f.lignes.length ? f.lignes.map(l => ({ ...l })) : [emptyLigneMainOeuvre()],
      timbre: f.timbre,
    })
    setEditingId(null)
    setShowModal(true)
  }

  const selectClient = (client: { id: number; nom: string; telephone: string; adresse?: string }) => {
    setForm(prev => ({
      ...prev,
      clientId: client.id,
      clientNom: client.nom,
      clientTelephone: client.telephone,
      clientAdresse: client.adresse ?? '',
    }))
  }

  const setLigne = (index: number, patch: { designation?: string; qte?: number; mtHT?: number; montant?: number; prixUnitaireHT?: number }) => {
    setForm(prev => ({
      ...prev,
      lignes: prev.lignes.map((l, i) => {
        if (i !== index) return l
        if (l.type === 'main_oeuvre' || l.type === 'pieces' || l.type === 'autre_produit' || l.type === 'divers') {
          return {
            type: l.type,
            designation: patch.designation ?? l.designation,
            qte: patch.qte ?? l.qte,
            mtHT: patch.mtHT ?? l.mtHT,
          }
        }
        if (l.type === 'produit') {
          return { type: 'produit' as const, productId: l.productId, designation: patch.designation ?? l.designation, qte: patch.qte ?? l.qte, prixUnitaireHT: patch.prixUnitaireHT ?? l.prixUnitaireHT }
        }
        return { type: 'depense' as const, designation: patch.designation ?? l.designation, montant: patch.montant ?? l.montant }
      }),
    }))
  }

  const addLigne = (type: 'main_oeuvre' | 'pieces' | 'autre_produit' | 'divers' | 'depense' | 'produit', product?: ProduitStock) => {
    if (type === 'produit' && product) {
      setForm(prev => ({ ...prev, lignes: [...prev.lignes, ligneFromProduit(product)] }))
      return
    }
    setForm(prev => ({
      ...prev,
      lignes: [
        ...prev.lignes,
        type === 'main_oeuvre'
          ? emptyLigneMainOeuvre()
          : type === 'pieces'
            ? emptyLignePieces()
            : type === 'autre_produit'
              ? emptyLigneAutreProduit()
            : type === 'divers'
              ? emptyLigneDivers()
              : emptyLigneDepense(),
      ],
    }))
  }

  const removeLigne = (index: number) => {
    setForm(prev => ({ ...prev, lignes: prev.lignes.filter((_, i) => i !== index) }))
  }

  const saveFacture = async () => {
    if (!form.clientNom.trim()) {
      toast.error('Indiquez le client')
      return
    }
    const lignesPayload: LigneFacture[] = form.lignes.map((l): LigneFacture => {
      if (l.type === 'main_oeuvre' || l.type === 'pieces' || l.type === 'autre_produit' || l.type === 'divers') {
        return { type: l.type, designation: l.designation, qte: l.qte, mtHT: l.mtHT }
      }
      if (l.type === 'depense') {
        return { type: 'depense', designation: l.designation, montant: l.montant }
      }
      return { type: 'produit', productId: l.productId, designation: l.designation, qte: l.qte, prixUnitaireHT: l.prixUnitaireHT }
    })

    const payload = {
      numero: form.numero,
      date: form.date,
      statut: form.statut,
      clientId: form.clientId ?? undefined,
      clientNom: form.clientNom.trim(),
      clientTelephone: form.clientTelephone.trim(),
      clientAdresse: form.clientAdresse.trim() || undefined,
      clientMatriculeFiscale: form.clientMatriculeFiscale.trim() || undefined,
      lignes: lignesPayload.filter(l => {
        if (l.type === 'main_oeuvre' || l.type === 'pieces' || l.type === 'autre_produit' || l.type === 'divers') return l.designation.trim() || l.mtHT !== 0
        if (l.type === 'depense') return l.designation.trim() || l.montant !== 0
        if (l.type === 'produit') return l.qte > 0
        return false
      }),
      timbre: form.timbre,
    }
    if (payload.lignes.length === 0) payload.lignes = [emptyLigneMainOeuvre()]

    const prevFacture = editingId ? factures.find(f => f.id === editingId) : null
    const devientValidee = payload.statut === 'envoyee' || payload.statut === 'payee'
    const etaitValidee =
      prevFacture &&
      (prevFacture.statut === 'envoyee' || prevFacture.statut === 'partiellement_payee' || prevFacture.statut === 'payee')
    const devientAnnulee = payload.statut === 'annulee'

    if (devientValidee && (!prevFacture || prevFacture.statut === 'brouillon')) {
      const lignesProduit = payload.lignes.filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
      for (const l of lignesProduit) {
        const ok = await decrementerStock(l.productId, l.qte, { origine: 'facture', reference: payload.numero })
        if (!ok) {
          const nom = produits.find(p => p.id === l.productId)?.nom ?? 'Produit'
          toast.error(`Stock insuffisant pour "${nom}" (demandé: ${l.qte})`)
          return
        }
      }
    }
    if (editingId && devientAnnulee && etaitValidee) {
      const lignesProduit = prevFacture!.lignes.filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
      for (const l of lignesProduit) await incrementerStock(l.productId, l.qte)
    }

    try {
      if (editingId) {
        await updateFacture(editingId, payload)
        toast.success('Facture mise à jour')
      } else {
        await addFacture(payload)
        toast.success('Facture créée')
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement de la facture')
    }
  }

  const confirmDelete = async () => {
    if (deleteId !== null) {
      const ok = await removeFacture(deleteId)
      if (ok) {
        toast.success('Facture supprimée')
        setDeleteId(null)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  const handleExportPdf = async (f: Facture) => {
    try {
      await exportFacturePdf(f)
      toast.success('Facture exportée en PDF')
    } catch (err) {
      console.error('Export PDF:', err)
      toast.error('Erreur lors de l\'export PDF')
    }
  }

  const confirmAnnuler = async () => {
    if (annulerId === null) return
    const f = factures.find(x => x.id === annulerId)
    if (f && (f.statut === 'envoyee' || f.statut === 'partiellement_payee' || f.statut === 'payee')) {
      const lignesProduit = f.lignes.filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
      for (const l of lignesProduit) await incrementerStock(l.productId, l.qte)
    }
    try {
      await updateFacture(annulerId, { statut: 'annulee' })
      toast.success('Facture annulée')
      setAnnulerId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l’annulation')
    }
  }

  const openPaiementPartiel = (f: Facture) => {
    setOpenActionsId(null)
    const reste = factureResteTTC(f)
    setPayerForm({
      date: new Date().toISOString().slice(0, 10),
      montant: round2(reste),
      mode: 'especes',
      note: '',
    })
    setPayerFacture(f)
  }

  const submitPaiementPartiel = async () => {
    if (!payerFacture) return
    const max = factureResteTTC(payerFacture)
    const mont = round2(payerForm.montant)
    if (mont < 0.01 || mont > max + 0.01) {
      toast.error('Montant invalide')
      return
    }
    try {
      await addPaiementFacture(payerFacture.id, {
        date: payerForm.date,
        montant: Math.min(mont, max),
        mode: payerForm.mode || undefined,
        note: payerForm.note.trim() || undefined,
      })
      await refetchMoney()
      toast.success('Paiement enregistré')
      setPayerFacture(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement du paiement')
    }
  }

  const runWorkflowAction = (f: Facture, newStatut: FactureStatut) => {
    setOpenActionsId(null)
    if (newStatut === 'annulee') {
      setAnnulerId(f.id)
      return
    }
    // Passage à Validée ou Payée depuis Brouillon → afficher récap si lignes produit, sinon exécuter
    if ((newStatut === 'envoyee' || newStatut === 'payee') && f.statut === 'brouillon') {
      const lignesProduit = f.lignes.filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
      if (lignesProduit.length > 0) {
        setPendingValidation({ facture: f, newStatut })
        return
      }
    }
    void executeWorkflowAction(f, newStatut)
  }

  const executeWorkflowAction = async (f: Facture, newStatut: FactureStatut) => {
    setPendingValidation(null)
    if (newStatut === 'annulee') {
      setAnnulerId(f.id)
      return
    }
    // Passage à Validée ou Payée depuis Brouillon → décrémenter le stock + sync MoneyIn
    if ((newStatut === 'envoyee' || newStatut === 'payee') && f.statut === 'brouillon') {
      const lignesProduit = f.lignes.filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
      for (const l of lignesProduit) {
        const ok = await decrementerStock(l.productId, l.qte, { origine: 'facture', reference: f.numero })
        if (!ok) {
          const nom = produits.find(p => p.id === l.productId)?.nom ?? 'Produit'
          toast.error(`Stock insuffisant pour "${nom}" (demandé: ${l.qte})`)
          return
        }
      }
    }
    // Réouverture (remise en brouillon) depuis facture validée → réintégrer le stock
    if (
      newStatut === 'brouillon' &&
      (f.statut === 'envoyee' || f.statut === 'partiellement_payee' || f.statut === 'payee')
    ) {
      const lignesProduit = f.lignes.filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
      for (const l of lignesProduit) await incrementerStock(l.productId, l.qte)
    }
    try {
      await updateFacture(f.id, { statut: newStatut })
      await refetchMoney()
      toast.success(`Facture ${FACTURE_STATUT_CONFIG[newStatut].label.toLowerCase()}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de statut')
    }
  }

  if (!user) return null

  const canAccess = permissions?.canViewFinance ?? true

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n&apos;avez pas accès à la facturation vente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-3 sm:px-4 pb-6 max-w-full overflow-x-hidden">
      {/* Header + Stats + Bouton — responsive */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">Facturation vente</h1>
              <p className="text-gray-500 text-xs truncate">Créez et gérez vos factures</p>
            </div>
          </div>
          <Button onClick={openNew} icon={<Plus className="w-4 h-4" />} size="sm" className="w-full sm:w-auto shrink-0">
            Nouvelle facture
          </Button>
        </div>
        {/* Stats — scroll horizontal sur mobile si besoin */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:overflow-visible sm:pb-0 sm:mx-0">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 shrink-0">
            <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-gray-900 tabular-nums">{statsFiltered.count}</span>
            <span className="text-xs text-gray-500">factures</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-gray-900 tabular-nums">{statsFiltered.totalCA.toFixed(0)}</span>
            <span className="text-xs text-gray-500">DT</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-gray-900 tabular-nums">{statsFiltered.payees}</span>
            <span className="text-xs text-gray-500">payées</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 shrink-0">
            <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold text-gray-900 tabular-nums">{statsFiltered.partielles}</span>
            <span className="text-xs text-gray-500">partielles</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 shrink-0">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold text-gray-900 tabular-nums">{statsFiltered.brouillons}</span>
            <span className="text-xs text-gray-500">brouillons</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-red-50 border border-red-100 shrink-0">
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-bold text-gray-900 tabular-nums">{statsFiltered.annulees}</span>
            <span className="text-xs text-gray-500">annulées</span>
          </div>
        </div>
      </div>

      {/* Filtres — responsive */}
      <Card padding="sm" className="py-2.5 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 w-full min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par n° facture, client, téléphone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
              />
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
              <select
                value={filterStatut}
                onChange={e => setFilterStatut(e.target.value as FactureStatut | 'a_encaisser' | '')}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white font-medium"
              >
                <option value="">Tous les statuts</option>
                <option value="a_encaisser">À encaisser</option>
                {(Object.keys(FACTURE_STATUT_CONFIG) as FactureStatut[]).sort((a, b) => FACTURE_STATUT_CONFIG[a].order - FACTURE_STATUT_CONFIG[b].order).map(s => (
                  <option key={s} value={s}>{FACTURE_STATUT_CONFIG[s].label}</option>
                ))}
              </select>
              <select
                value={filterMonth === '' ? '' : filterMonth}
                onChange={e => setFilterMonth(e.target.value === '' ? '' : Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white font-medium"
              >
                <option value="">Tous les mois</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('fr-FR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={2020}
                max={2030}
                value={filterYear}
                onChange={e => setFilterYear(Number(e.target.value) || filterYear)}
                className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium"
              />
              <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2.5 transition-colors',
                    viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                  )}
                  title="Vue liste"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2.5 transition-colors',
                    viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                  )}
                  title="Vue grille"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
          </div>
        </div>
      </Card>

      {/* Liste ou Grille des factures */}
      <Card padding="none" className="overflow-hidden shadow-sm border-gray-100">
        {filteredFactures.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <Receipt className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700">Aucune facture</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {factures.length === 0 ? 'Créez votre première facture pour commencer' : 'Aucun résultat pour ces filtres'}
            </p>
            {factures.length === 0 && (
              <Button className="mt-6" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
                Nouvelle facture
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-3 sm:p-4 grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {paginatedFactures.map((f, i) => {
              const t = computeFactureTotals(f.lignes, f.timbre)
              const paye = f.montantPaye ?? 0
              const reste = factureResteTTC(f)
              const isAnnulee = f.statut === 'annulee'
              return (
                <div
                  key={f.id}
                  className={cn(
                    'rounded-2xl border border-gray-100 p-4 bg-white hover:shadow-lg hover:border-emerald-200 transition-all duration-200',
                    isAnnulee && 'opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{f.numero}</p>
                      <p className="text-xs text-gray-500">{formatDate(f.date)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                          FACTURE_STATUT_CONFIG[f.statut].badge
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', FACTURE_STATUT_CONFIG[f.statut].dot)} />
                        {FACTURE_STATUT_CONFIG[f.statut].label}
                      </span>
                      <div className="relative" ref={openActionsId === f.id ? actionsRef : undefined}>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setOpenActionsId(openActionsId === f.id ? null : f.id) }}
                          className="p-2 sm:p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                          title="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openActionsId === f.id && (
                          <div className="absolute right-0 top-full mt-1 py-1 w-48 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                            {f.statut === 'brouillon' && (
                              <>
                                <button type="button" onClick={() => runWorkflowAction(f, 'envoyee')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                                  <Send className="w-4 h-4" /> Valider
                                </button>
                                <button type="button" onClick={() => runWorkflowAction(f, 'annulee')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">
                                  <XCircle className="w-4 h-4" /> Annuler
                                </button>
                              </>
                            )}
                            {(f.statut === 'envoyee' || f.statut === 'partiellement_payee') && (
                              <>
                                <button type="button" onClick={() => openPaiementPartiel(f)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700">
                                  <Banknote className="w-4 h-4" /> Encaisser
                                </button>
                                <button type="button" onClick={() => runWorkflowAction(f, 'payee')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-800">
                                  <CheckCircle className="w-4 h-4" /> Marquer payée (solde)
                                </button>
                                <button type="button" onClick={() => runWorkflowAction(f, 'annulee')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">
                                  <XCircle className="w-4 h-4" /> Annuler
                                </button>
                              </>
                            )}
                            {f.statut === 'annulee' && (
                              <button type="button" onClick={() => runWorkflowAction(f, 'brouillon')} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-slate-50">
                                <RotateCcw className="w-4 h-4" /> Réouvrir
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="font-medium text-gray-800 truncate">{f.clientNom}</p>
                  <p className="text-xs text-gray-500 mb-2">{f.clientTelephone}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600 tabular-nums mb-2">
                    <span>Payé {paye.toFixed(2)}</span>
                    <span className="text-amber-800 font-medium">Reste {reste.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-lg font-bold text-emerald-700 tabular-nums">{t.totalTTC.toFixed(2)} DT</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => printFacture(f)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Imprimer"><Printer className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleExportPdf(f)} className="p-2 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600" title="Exporter en PDF"><FileDown className="w-4 h-4" /></button>
                      <button type="button" onClick={() => openEdit(f)} className="p-2 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600" title="Modifier"><Pencil className="w-4 h-4" /></button>
                          <button type="button" onClick={() => openDuplicate(f)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Dupliquer"><Copy className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setDeleteId(f.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-sm min-w-[780px] sm:min-w-0">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-50/80 border-b border-gray-200">
                  <th className="text-left px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">N° Facture</th>
                  <th className="text-left px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="text-left px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="text-right px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total TTC</th>
                  <th className="text-right px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Payé</th>
                  <th className="text-right px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Reste</th>
                  <th className="text-left px-3 sm:px-4 py-3 sm:py-3.5 text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="w-28 sm:w-32 px-3 sm:px-4 py-3 sm:py-3.5" />
                </tr>
              </thead>
              <tbody>
                {paginatedFactures.map((f, i) => {
                  const t = computeFactureTotals(f.lignes, f.timbre)
                  const paye = f.montantPaye ?? 0
                  const reste = factureResteTTC(f)
                  const isAnnulee = f.statut === 'annulee'
                  return (
                    <tr
                      key={f.id}
                      className={cn(
                        'border-b border-gray-50 transition-colors',
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                        'hover:bg-emerald-50/50',
                        isAnnulee && 'opacity-60'
                      )}
                    >
                      <td className="px-3 sm:px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{f.numero}</td>
                      <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(f.date)}</td>
                      <td className="px-3 sm:px-4 py-3 min-w-0">
                        <p className="font-medium text-gray-800 truncate max-w-[120px] sm:max-w-none">{f.clientNom}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[120px] sm:max-w-none">{f.clientTelephone}</p>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                        {t.totalTTC.toFixed(2)} DT
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right tabular-nums text-gray-700 whitespace-nowrap hidden sm:table-cell">
                        {paye.toFixed(2)} DT
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right tabular-nums text-amber-800 font-medium whitespace-nowrap hidden sm:table-cell">
                        {reste.toFixed(2)} DT
                      </td>
                      <td className="px-3 sm:px-4 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] sm:text-xs font-semibold border shrink-0',
                              FACTURE_STATUT_CONFIG[f.statut].badge
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', FACTURE_STATUT_CONFIG[f.statut].dot)} />
                            {FACTURE_STATUT_CONFIG[f.statut].label}
                          </span>
                          <div className="relative shrink-0" ref={openActionsId === f.id ? actionsRef : undefined}>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setOpenActionsId(openActionsId === f.id ? null : f.id) }}
                              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:p-1.5 flex items-center justify-center"
                              title="Changer le statut"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openActionsId === f.id && (
                              <div className="absolute right-0 sm:left-0 top-full mt-1 py-1 w-52 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                                <p className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">Workflow</p>
                                {f.statut === 'brouillon' && (
                                  <>
                                    <button type="button" onClick={() => runWorkflowAction(f, 'envoyee')} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">
                                      <Send className="w-4 h-4 text-blue-500" /> Valider la facture
                                    </button>
                                    <button type="button" onClick={() => runWorkflowAction(f, 'annulee')} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">
                                      <XCircle className="w-4 h-4 text-red-500" /> Annuler
                                    </button>
                                  </>
                                )}
                                {(f.statut === 'envoyee' || f.statut === 'partiellement_payee') && (
                                  <>
                                    <button type="button" onClick={() => openPaiementPartiel(f)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700">
                                      <Banknote className="w-4 h-4 text-emerald-500" /> Encaisser
                                    </button>
                                    <button type="button" onClick={() => runWorkflowAction(f, 'payee')} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-800">
                                      <CheckCircle className="w-4 h-4 text-emerald-600" /> Marquer payée (solde)
                                    </button>
                                    <button type="button" onClick={() => runWorkflowAction(f, 'annulee')} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700">
                                      <XCircle className="w-4 h-4 text-red-500" /> Annuler
                                    </button>
                                  </>
                                )}
                                {f.statut === 'annulee' && (
                                  <button type="button" onClick={() => runWorkflowAction(f, 'brouillon')} className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-slate-50">
                                    <RotateCcw className="w-4 h-4 text-slate-500" /> Réouvrir (remettre en brouillon)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <button type="button" onClick={() => printFacture(f)} className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center" title="Imprimer"><Printer className="w-4 h-4" /></button>
                          <button type="button" onClick={() => handleExportPdf(f)} className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center" title="Exporter en PDF"><FileDown className="w-4 h-4" /></button>
                          <button type="button" onClick={() => openEdit(f)} className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center" title="Modifier"><Pencil className="w-4 h-4" /></button>
                          <button type="button" onClick={() => openDuplicate(f)} className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center" title="Dupliquer"><Copy className="w-4 h-4" /></button>
                          <button type="button" onClick={() => setDeleteId(f.id)} className="p-2.5 sm:p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {filteredFactures.length > FACTURES_PER_PAGE && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-gray-500">
            Page {currentPage} / {totalPages} · {filteredFactures.length} facture(s)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Modal Créer / Modifier facture */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? `Modifier la facture ${form.numero}` : 'Nouvelle facture'}
        subtitle={form.numero}
        maxWidth="xl"
      >
        <div className="space-y-6">
          {/* Client — responsive */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select
                value={form.clientId ?? ''}
                onChange={e => {
                  const id = e.target.value ? Number(e.target.value) : null
                  const c = (clients ?? []).find(x => x.id === id)
                  if (c) selectClient(c)
                  else setForm(prev => ({ ...prev, clientId: null }))
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="">— Saisir manuellement —</option>
                {(clients ?? []).map(c => (
                  <option key={c.id} value={c.id}>{c.nom} — {c.telephone}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 min-w-0">
              <Input label="N° Facture" value={form.numero} onChange={e => setForm(prev => ({ ...prev, numero: e.target.value }))} />
              <Input label="Date" type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <Input label="Nom client" value={form.clientNom} onChange={e => setForm(prev => ({ ...prev, clientNom: e.target.value }))} placeholder="Facturé à" />
            <Input label="Téléphone" value={form.clientTelephone} onChange={e => setForm(prev => ({ ...prev, clientTelephone: e.target.value }))} />
            <Input label="Adresse" value={form.clientAdresse} onChange={e => setForm(prev => ({ ...prev, clientAdresse: e.target.value }))} placeholder="Optionnel" className="sm:col-span-2" />
            <Input label="Matricule fiscale" value={form.clientMatriculeFiscale} onChange={e => setForm(prev => ({ ...prev, clientMatriculeFiscale: e.target.value }))} placeholder="Optionnel" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={form.statut}
                onChange={e => setForm(prev => ({ ...prev, statut: e.target.value as FactureStatut }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {form.statut === 'partiellement_payee' && (
                  <option value="partiellement_payee" disabled>
                    {FACTURE_STATUT_CONFIG.partiellement_payee.label} (géré par encaissements)
                  </option>
                )}
                {(Object.keys(FACTURE_STATUT_CONFIG) as FactureStatut[]).filter(s => s !== 'annulee' && s !== 'partiellement_payee').map(s => (
                  <option key={s} value={s}>{FACTURE_STATUT_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lignes — scroll horizontal sur petit écran */}
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Lignes de facture</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => addLigne('main_oeuvre')}>
                  + Main d'œuvre
                </Button>
                <Button size="sm" variant="outline" onClick={() => addLigne('pieces')}>
                  + Pièce
                </Button>
                <Button size="sm" variant="outline" onClick={() => addLigne('autre_produit')}>
                  + Produit hors stock
                </Button>
                <Button size="sm" variant="outline" onClick={() => addLigne('divers')}>
                  + Divers
                </Button>
                <Button size="sm" variant="outline" onClick={() => addLigne('depense')}>
                  + Dépense
                </Button>
                <div className="flex items-center gap-1.5">
                  <select
                    value=""
                    onChange={e => {
                      const id = Number(e.target.value)
                      if (!id) return
                      const p = produits.find(x => x.id === id)
                      if (p) addLigne('produit', p)
                      e.target.value = ''
                    }}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm bg-white"
                  >
                    <option value="">+ Produit (stock)</option>
                    {produits.map(p => (
                      <option key={p.id} value={p.id}>{p.nom} (stock: {p.quantite})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-x-auto overflow-y-visible">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Désignation</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Qté</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">MT HT / Montant</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {form.lignes.map((l, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-500">
                        {l.type === 'main_oeuvre'
                          ? 'Main d\'œuvre'
                          : l.type === 'pieces'
                            ? 'Pièce'
                            : l.type === 'autre_produit'
                              ? 'Autre produit'
                            : l.type === 'divers'
                              ? 'Divers'
                              : l.type === 'depense'
                            ? 'Dépense'
                            : 'Produit'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={l.designation}
                          onChange={e => setLigne(i, { designation: e.target.value })}
                          placeholder="Désignation"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {l.type === 'depense' ? '—' : (
                          <input
                            type="number"
                            min={0}
                            step={l.type === 'produit' ? 0.01 : 1}
                            value={l.type === 'produit' ? l.qte : l.qte}
                            onChange={e => setLigne(i, { qte: Number(e.target.value) || 0 })}
                            className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(l.type === 'main_oeuvre' || l.type === 'pieces' || l.type === 'autre_produit' || l.type === 'divers') && (
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={l.mtHT}
                            onChange={e => setLigne(i, { mtHT: Number(e.target.value) || 0 })}
                            className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right"
                          />
                        )}
                        {l.type === 'depense' && (
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={l.montant}
                            onChange={e => setLigne(i, { montant: Number(e.target.value) || 0 })}
                            className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right"
                          />
                        )}
                        {l.type === 'produit' && (
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={l.qte > 0 ? (l.qte * l.prixUnitaireHT) : l.prixUnitaireHT}
                            onChange={e => {
                              const newTotal = Number(e.target.value) || 0
                              const newPrixUnitaire = l.qte > 0 ? newTotal / l.qte : newTotal
                              setLigne(i, { prixUnitaireHT: Math.round(newPrixUnitaire * 100) / 100 })
                            }}
                            className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right"
                            title="Total de la ligne (Qté × prix unitaire)"
                          />
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <button type="button" onClick={() => removeLigne(i)} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totaux */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total HT</span>
              <span className="font-semibold tabular-nums">{totals.totalHT.toFixed(2)} DT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">TVA 19%</span>
              <span className="font-semibold tabular-nums">{totals.tva19.toFixed(2)} DT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Dépenses</span>
              <span className="font-semibold tabular-nums">{totals.depenses.toFixed(2)} DT</span>
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
              <span className="tabular-nums">{totals.totalTTC.toFixed(2)} DT</span>
            </div>
            <p className="text-xs text-gray-500 italic pt-1">{formatMontantEnLettres(totals.totalTTC)}</p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={saveFacture} className="flex-1 w-full sm:w-auto">
              {editingId ? 'Enregistrer' : 'Créer la facture'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={payerFacture !== null}
        onClose={() => setPayerFacture(null)}
        title="Encaissement"
        subtitle={payerFacture ? `${payerFacture.numero} — reste ${factureResteTTC(payerFacture).toFixed(2)} DT` : ''}
        maxWidth="sm"
      >
        {payerFacture && (
          <div className="space-y-4">
            <Input
              label="Date"
              type="date"
              value={payerForm.date}
              onChange={e => setPayerForm(p => ({ ...p, date: e.target.value }))}
            />
            <Input
              label="Montant (DT)"
              type="number"
              min={0.01}
              step={0.01}
              value={payerForm.montant || ''}
              onChange={e => setPayerForm(p => ({ ...p, montant: Number(e.target.value) || 0 }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
              <select
                value={payerForm.mode}
                onChange={e => setPayerForm(p => ({ ...p, mode: e.target.value as ModePaiement }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm"
              >
                {MODE_PAIEMENT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Note (optionnel)"
              value={payerForm.note}
              onChange={e => setPayerForm(p => ({ ...p, note: e.target.value }))}
            />
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setPayerFacture(null)}>
                Fermer
              </Button>
              <Button className="flex-1" onClick={() => void submitPaiementPartiel()}>
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirmation suppression */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Supprimer la facture"
        subtitle={deleteId != null ? factures.find(f => f.id === deleteId)?.numero : ''}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Cette action est irréversible. Confirmer la suppression ?</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
              Annuler
            </Button>
            <Button variant="outline" onClick={confirmDelete} className="flex-1 text-red-600 border-red-200 hover:bg-red-50">
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmation annulation */}
      <Modal
        open={annulerId !== null}
        onClose={() => setAnnulerId(null)}
        title="Annuler la facture"
        subtitle={annulerId != null ? factures.find(f => f.id === annulerId)?.numero : ''}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            La facture passera au statut « Annulée ». Elle restera visible mais ne sera plus comptabilisée. Confirmer ?
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setAnnulerId(null)} className="flex-1">
              Retour
            </Button>
            <Button onClick={confirmAnnuler} className="flex-1">
              Confirmer l'annulation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal récap avant validation (Envoyée/Payée) */}
      <Modal
        open={pendingValidation !== null}
        onClose={() => setPendingValidation(null)}
        title="Récapitulatif avant validation"
        subtitle={pendingValidation?.facture.numero}
        maxWidth="sm"
      >
        {pendingValidation && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Les produits suivants seront retirés du stock :
            </p>
            <ul className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {pendingValidation.facture.lignes
                .filter((l): l is LigneFacture & { type: 'produit' } => l.type === 'produit')
                .map((l, i) => (
                  <li key={i} className="flex justify-between items-center px-4 py-3 bg-gray-50/50">
                    <span className="font-medium text-gray-800">{l.designation}</span>
                    <span className="tabular-nums text-amber-700 font-semibold">{l.qte} × {l.prixUnitaireHT.toFixed(2)} DT</span>
                  </li>
                ))}
            </ul>
            <p className="text-xs text-gray-500">
              Statut : {FACTURE_STATUT_CONFIG[pendingValidation.newStatut].label}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPendingValidation(null)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={() => executeWorkflowAction(pendingValidation.facture, pendingValidation.newStatut)} className="flex-1">
                Confirmer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
