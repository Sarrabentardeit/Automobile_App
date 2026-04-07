import { useState, useMemo, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { useFacturation } from '@/contexts/FacturationContext'
import { useAchats } from '@/contexts/AchatsContext'
import { useToast } from '@/contexts/ToastContext'
import type { ProduitStock } from '@/types'
import { PRODUIT_CATEGORIES_PRESET, isLegacyHuilesLiquidesCombinedLabel } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Package, Plus, Search, Trash2, Layers, ShoppingCart, Pencil, AlertTriangle, ArrowUpDown, ArrowDown, ArrowUp, History, TrendingUp, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { prixUnitaireStockAffiche } from '@/lib/stockUtils'
import { computeFactureAchatTotals, computeFactureTotals } from '@/lib/factureUtils'

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND'
}

const PAGE_SIZE_STOCK = 30

export default function StockGeneralPage() {
  const navigate = useNavigate()
  const { user, permissions } = useAuth()
  const { produits, mouvementsStock, loading, updateProduit, removeProduit, refetch } = useStockGeneral()
  const { factures: facturesVente } = useFacturation()
  const { factures: facturesAchat } = useAchats()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filterCategorie, setFilterCategorie] = useState<string>('')
  const [sortQte, setSortQte] = useState<'none' | 'asc' | 'desc'>('none')
  const [pageStock, setPageStock] = useState(1)
  const SEUIL_STOCK_FAIBLE = 3
  const [showFormProduit, setShowFormProduit] = useState(false)
  const [editingProduitId, setEditingProduitId] = useState<number | null>(null)
  const [deleteProduitId, setDeleteProduitId] = useState<number | null>(null)
  const [formProduit, setFormProduit] = useState<Omit<ProduitStock, 'id'>>({
    nom: '',
    quantite: 0,
    valeurAchatTTC: 0,
    categorie: '',
    reference: '',
    unite: 'unité',
  })
  // Mémorise le dernier prix unitaire pour recalculer la valeur totale quand la qté repasse de 0 à > 0
  const lastUnitPriceRef = useRef<number>(0)

  const categoriesFromData = useMemo(() => {
    const set = new Set<string>()
    for (const p of produits) if (p.categorie?.trim()) set.add(p.categorie!.trim())
    return [...set].sort()
  }, [produits])

  /** Même logique que la page Produits : préréglages d’abord, puis hors préset (tri FR), sans « Huiles & liquides ». */
  const filterSelectCategories = useMemo(() => {
    const merged = new Set<string>([...PRODUIT_CATEGORIES_PRESET, ...categoriesFromData])
    const filtered = [...merged].filter(c => !isLegacyHuilesLiquidesCombinedLabel(c))
    const presetSet = new Set<string>([...PRODUIT_CATEGORIES_PRESET])
    const presetInOrder = [...PRODUIT_CATEGORIES_PRESET].filter(p => filtered.includes(p))
    const extras = filtered
      .filter(c => !presetSet.has(c))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    return [...presetInOrder, ...extras]
  }, [categoriesFromData])

  useEffect(() => {
    if (!filterCategorie) return
    if (isLegacyHuilesLiquidesCombinedLabel(filterCategorie)) {
      setFilterCategorie('')
      return
    }
    if (!filterSelectCategories.includes(filterCategorie)) {
      setFilterCategorie('')
    }
  }, [filterCategorie, filterSelectCategories])

  useEffect(() => {
    refetch()
  }, [refetch])

  const filteredProduits = useMemo(() => {
    let list = produits
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        p =>
          p.nom.toLowerCase().includes(q) ||
          (p.categorie ?? '').toLowerCase().includes(q) ||
          (p.reference ?? '').toLowerCase().includes(q)
      )
    }
    if (filterCategorie) list = list.filter(p => (p.categorie ?? '') === filterCategorie)
    if (sortQte === 'asc') list = [...list].sort((a, b) => (a.quantite ?? 0) - (b.quantite ?? 0))
    else if (sortQte === 'desc') list = [...list].sort((a, b) => (b.quantite ?? 0) - (a.quantite ?? 0))
    return list
  }, [produits, search, filterCategorie, sortQte])

  const totalFilteredCount = filteredProduits.length
  const totalPagesStock =
    totalFilteredCount === 0 ? 0 : Math.ceil(totalFilteredCount / PAGE_SIZE_STOCK)

  useEffect(() => {
    setPageStock(1)
  }, [search, filterCategorie, sortQte])

  useEffect(() => {
    if (totalPagesStock > 0 && pageStock > totalPagesStock) setPageStock(totalPagesStock)
  }, [totalPagesStock, pageStock])

  const paginatedProduits = useMemo(() => {
    const start = (pageStock - 1) * PAGE_SIZE_STOCK
    return filteredProduits.slice(start, start + PAGE_SIZE_STOCK)
  }, [filteredProduits, pageStock])

  const rangeLabelStock = useMemo(() => {
    if (totalFilteredCount === 0) return null
    const from = (pageStock - 1) * PAGE_SIZE_STOCK + 1
    const to = Math.min(pageStock * PAGE_SIZE_STOCK, totalFilteredCount)
    return { from, to }
  }, [totalFilteredCount, pageStock])

  const totalAchatGlobal = useMemo(
    () =>
      (facturesAchat ?? []).reduce(
        (sum, f) => sum + computeFactureAchatTotals(f.lignes, f.timbre ?? 1).totalTTC,
        0
      ),
    [facturesAchat]
  )

  const totalVenduGlobal = useMemo(
    () =>
      (facturesVente ?? []).reduce((sum, f) => {
        if (f.statut === 'annulee') return sum
        return sum + computeFactureTotals(f.lignes, f.timbre ?? 1).totalTTC
      }, 0),
    [facturesVente]
  )

  const expectedRevenus = useMemo(
    () =>
      produits.reduce((sum, p) => {
        const qte = p.quantite ?? 0
        const pv = p.prixVente ?? 0
        if (qte <= 0 || pv <= 0) return sum
        return sum + qte * pv
      }, 0),
    [produits]
  )

  const derniersMouvements = useMemo(() => [...(mouvementsStock ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 15), [mouvementsStock])

  const now = new Date()
  const ceMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const aCommander = useMemo(() =>
    produits.filter(p => (p.quantite ?? 0) > 0 && (p.quantite ?? 0) <= SEUIL_STOCK_FAIBLE).sort((a, b) => (a.quantite ?? 0) - (b.quantite ?? 0)),
  [produits, SEUIL_STOCK_FAIBLE])

  const stockEpuise = useMemo(() => produits.filter(p => (p.quantite ?? 0) === 0), [produits])

  const stockEpuiseSig = useMemo(
    () => stockEpuise.map(p => p.id).sort((a, b) => a - b).join(','),
    [stockEpuise]
  )
  const aCommanderSig = useMemo(
    () => aCommander.map(p => p.id).sort((a, b) => a - b).join(','),
    [aCommander]
  )

  const [dismissAlertEpuise, setDismissAlertEpuise] = useState(false)
  const [dismissAlertACommander, setDismissAlertACommander] = useState(false)

  useEffect(() => {
    setDismissAlertEpuise(false)
  }, [stockEpuiseSig])

  useEffect(() => {
    setDismissAlertACommander(false)
  }, [aCommanderSig])

  const produitsPlusVendus = useMemo(() => {
    const map = new Map<number, { nom: string; qte: number }>()
    for (const f of facturesVente ?? []) {
      if (f.statut === 'annulee') continue
      const [y, m] = f.date.split('-')
      if (`${y}-${m}` !== ceMois) continue
      for (const l of f.lignes) {
        if (l.type !== 'produit') continue
        const cur = map.get(l.productId)
        const nom = l.designation
        if (cur) map.set(l.productId, { nom, qte: cur.qte + l.qte })
        else map.set(l.productId, { nom, qte: l.qte })
      }
    }
    return [...map.entries()].map(([id, v]) => ({ productId: id, ...v })).sort((a, b) => b.qte - a.qte).slice(0, 5)
  }, [facturesVente, ceMois])

  const openEditProduit = (p: ProduitStock, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const produit = produits.find(pr => pr.id === p.id) ?? p
    const qte = produit.quantite ?? 0
    const val = typeof produit.valeurAchatTTC === 'number' ? produit.valeurAchatTTC : 0
    if (qte > 0 && val > 0) lastUnitPriceRef.current = val / qte
    else lastUnitPriceRef.current = 0
    setFormProduit({
      nom: produit.nom,
      quantite: qte,
      valeurAchatTTC: val,
      categorie: produit.categorie ?? '',
      reference: produit.reference ?? '',
      unite: produit.unite ?? 'unité',
      seuilAlerte: produit.seuilAlerte,
      prixVente: produit.prixVente,
      fluideType: produit.fluideType,
    })
    setEditingProduitId(produit.id)
    setShowFormProduit(true)
  }

  const saveProduit = async () => {
    if (!formProduit.nom.trim() || !editingProduitId) return
    try {
      await updateProduit(editingProduitId, formProduit)
      toast.success('Produit modifié')
      setShowFormProduit(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const confirmDeleteProduit = async () => {
    if (deleteProduitId !== null) {
      try {
        await removeProduit(deleteProduitId)
        toast.success('Produit supprimé')
        setDeleteProduitId(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur')
      }
    }
  }

  if (!user) return null

  if (!permissions?.canViewInventory) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès au stock général.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-10 px-3 sm:px-4 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500 font-medium">Chargement du stock...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-10 px-3 sm:px-4">
      {/* En-tête simple */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white">
              <Package className="w-5 h-5" />
            </span>
            Stock Général
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Catalogue et quantités en stock</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/facturation-achat">
            <Button variant="outline" size="sm" icon={<ShoppingCart className="w-4 h-4" />}>
              Facturation achat
            </Button>
          </Link>
          <Button
            onClick={() => navigate('/produits', { state: { openNewProduct: true } })}
            size="sm"
            icon={<Plus className="w-4 h-4" />}
          >
            Nouveau produit
          </Button>
        </div>
      </header>

      {/* Alerte Stock épuisé */}
      {stockEpuise.length > 0 && !dismissAlertEpuise && (
        <Card padding="sm" className="relative mb-4 border-red-200 bg-red-50">
          <button
            type="button"
            onClick={() => setDismissAlertEpuise(true)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-lg text-red-700/70 hover:bg-red-100 hover:text-red-900 transition-colors"
            aria-label="Fermer cette alerte"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-red-800">Stock épuisé ({stockEpuise.length})</h3>
              <p className="text-sm text-red-700/90 mt-0.5">Produits en rupture — à réapprovisionner en priorité</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {stockEpuise.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openEditProduit(p)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-red-200 text-sm font-medium text-red-800 hover:bg-red-100 transition-colors"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {p.nom}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Alerte À commander */}
      {aCommander.length > 0 && !dismissAlertACommander && (
        <Card padding="sm" className="relative mb-4 border-amber-200 bg-amber-50">
          <button
            type="button"
            onClick={() => setDismissAlertACommander(true)}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-lg text-amber-800/70 hover:bg-amber-100 hover:text-amber-950 transition-colors"
            aria-label="Fermer cette alerte"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-amber-800">À commander ({aCommander.length})</h3>
              <p className="text-sm text-amber-700/90 mt-0.5">Produits en stock faible — à réapprovisionner</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {aCommander.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => openEditProduit(p)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {p.nom} <span className="text-amber-600 tabular-nums">({p.quantite})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* KPI financiers globaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Card padding="sm" className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700/80">Valeur achat total</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{formatMontant(totalAchatGlobal)}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-700/80">Valeur vendu total</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{formatMontant(totalVenduGlobal)}</p>
            </div>
          </div>
        </Card>
        <Card padding="sm" className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-700/80">Expected revenus</p>
              <p className="text-lg font-bold text-gray-900 tabular-nums">{formatMontant(expectedRevenus)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recherche + Catégorie + Tri */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
            />
          </div>
          {filterSelectCategories.length > 0 && (
            <select
              value={filterCategorie}
              onChange={e => setFilterCategorie(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white max-w-[200px]"
            >
              <option value="">Toutes catégories</option>
              {filterSelectCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Tri qté :</span>
          <button
            type="button"
            onClick={() => setSortQte(s => (s === 'none' ? 'asc' : s === 'asc' ? 'desc' : 'none'))}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50"
          >
            {sortQte === 'none' && <ArrowUpDown className="w-3.5 h-3.5" />}
            {sortQte === 'asc' && <ArrowUp className="w-3.5 h-3.5" />}
            {sortQte === 'desc' && <ArrowDown className="w-3.5 h-3.5" />}
            {sortQte === 'none' ? 'Aucun' : sortQte === 'asc' ? 'Croissant' : 'Décroissant'}
          </button>
        </div>
      </div>

      {/* Tableau produits */}
      <Card padding="none" className="overflow-hidden border border-gray-100 rounded-2xl">
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Produit</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24 hidden sm:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 w-28">Quantité</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 w-28">Prix unit.</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 w-32">Valeur stock</th>
                  <th className="w-24 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredProduits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                      {produits.length === 0 ? 'Aucun produit. Cliquez sur « Nouveau produit » ou enregistrez un achat.' : 'Aucun résultat.'}
                    </td>
                  </tr>
                ) : (
                  paginatedProduits.map(p => {
                    const qte = p.quantite ?? 0
                    const isEpuise = qte === 0
                    const isFaible = qte > 0 && qte <= SEUIL_STOCK_FAIBLE
                    return (
                    <tr
                      key={p.id}
                      onClick={() => openEditProduit(p)}
                      className={cn(
                        'border-b border-gray-50 cursor-pointer transition-colors',
                        isEpuise ? 'bg-red-50/80 hover:bg-red-100/80 border-l-4 border-l-red-500' : 'hover:bg-amber-50/30'
                      )}
                    >
                      <td className={cn('px-4 py-3 font-medium', isEpuise ? 'text-red-900' : 'text-gray-900')}>{p.nom}</td>
                      <td className={cn('px-4 py-3 text-xs hidden sm:table-cell', isEpuise ? 'text-red-700/80' : 'text-gray-500')}>{p.categorie || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'tabular-nums inline-flex items-center gap-1',
                          isEpuise ? 'text-red-600 font-bold' : isFaible ? 'text-amber-600 font-semibold' : 'text-gray-700'
                        )}>
                          {isEpuise && <AlertCircle className="w-4 h-4 shrink-0" />}
                          {isFaible && !isEpuise && <AlertTriangle className="w-4 h-4 shrink-0" />}
                          {p.quantite}
                        </span>
                      </td>
                      <td
                        className={cn(
                          'px-4 py-3 text-right font-medium tabular-nums',
                          isEpuise && (p.dernierPrixUnitaireTTC ?? 0) <= 0 ? 'text-red-600' : 'text-amber-700'
                        )}
                        title="Coût unitaire TTC (mémorisé si stock à zéro)"
                      >
                        {formatMontant(prixUnitaireStockAffiche(p))}
                      </td>
                      <td className={cn('px-4 py-3 text-right font-medium tabular-nums', isEpuise ? 'text-gray-500' : 'text-amber-700')}>
                        {formatMontant(p.valeurAchatTTC)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-0.5">
                          <button onClick={e => openEditProduit(p, e)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-amber-600" title="Modifier"><Pencil className="w-4 h-4" /></button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteProduitId(p.id) }}
                            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        {totalFilteredCount > 0 && rangeLabelStock && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/80">
            <p className="text-xs text-gray-600">
              Affichage{' '}
              <span className="font-medium tabular-nums">
                {rangeLabelStock.from}–{rangeLabelStock.to}
              </span>{' '}
              sur{' '}
              <span className="font-medium tabular-nums">{totalFilteredCount}</span> produit
              {totalFilteredCount > 1 ? 's' : ''}
              {totalPagesStock > 1 && (
                <span className="text-gray-500">
                  {' '}
                  · page {pageStock} / {totalPagesStock}
                </span>
              )}
            </p>
            {totalPagesStock > 1 && (
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setPageStock(p => Math.max(1, p - 1))}
                  disabled={pageStock <= 1}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    pageStock <= 1
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-amber-50 hover:border-amber-200'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </button>
                <button
                  type="button"
                  onClick={() => setPageStock(p => Math.min(totalPagesStock, p + 1))}
                  disabled={pageStock >= totalPagesStock}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    pageStock >= totalPagesStock
                      ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-amber-50 hover:border-amber-200'
                  )}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Historique des mouvements */}
      {derniersMouvements.length > 0 && (
        <Card padding="sm" className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-amber-600" />
            Dernières entrées / sorties
          </h3>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left py-2 px-2">Date</th>
                  <th className="text-left py-2 px-2">Produit</th>
                  <th className="text-right py-2 px-2">Qté</th>
                  <th className="text-left py-2 px-2">Origine</th>
                  <th className="text-left py-2 px-2">Réf.</th>
                </tr>
              </thead>
              <tbody>
                {derniersMouvements.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 px-2 text-gray-600">{formatDate(m.date)}</td>
                    <td className="py-2 px-2 font-medium">{m.produitNom}</td>
                    <td className={cn('py-2 px-2 text-right tabular-nums font-medium', m.type === 'entree' ? 'text-emerald-600' : 'text-red-600')}>
                      {m.type === 'entree' ? '+' : '-'}{m.quantite}
                    </td>
                    <td className="py-2 px-2">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', m.origine === 'achat' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700')}>
                        {m.origine === 'achat' ? 'Achat' : 'Facture'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-500 truncate max-w-[80px]">{m.reference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Produits les plus vendus ce mois */}
      {produitsPlusVendus.length > 0 && (
        <Card padding="sm" className="mt-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Produits les plus vendus ce mois
          </h3>
          <ul className="space-y-2">
            {produitsPlusVendus.map((p, i) => (
              <li key={p.productId} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{i + 1}. {p.nom}</span>
                <span className="font-semibold tabular-nums text-emerald-700">{p.qte} vendu{p.qte > 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Modal Produit */}
      <Modal open={showFormProduit} onClose={() => setShowFormProduit(false)} title="Modifier le produit" maxWidth="sm">
        <div className="space-y-4">
          <Input label="Nom du produit" value={formProduit.nom} onChange={e => setFormProduit(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: HUILE 5W30" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <input
              type="text"
              value={formProduit.categorie ?? ''}
              onChange={e => setFormProduit(f => ({ ...f, categorie: e.target.value }))}
              placeholder="Ex: Huiles, Pièces, Consommables"
              list="categories-list"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
            />
            <datalist id="categories-list">
              {[...PRODUIT_CATEGORIES_PRESET].map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantité"
              type="number"
              min={0}
              value={formProduit.quantite ?? ''}
              onChange={e => {
                const newQty = parseInt(e.target.value, 10) || 0
                setFormProduit(prev => {
                  const oldVal = typeof prev.valeurAchatTTC === 'number' ? prev.valeurAchatTTC : 0
                  const oldQty = prev.quantite ?? 0
                  if (newQty === 0) {
                    if (oldQty > 0 && oldVal > 0) lastUnitPriceRef.current = oldVal / oldQty
                    return { ...prev, quantite: 0, valeurAchatTTC: 0 }
                  }
                  let unitPrice: number
                  if (oldQty > 0 && oldVal > 0) {
                    unitPrice = oldVal / oldQty
                    lastUnitPriceRef.current = unitPrice
                  } else {
                    unitPrice = lastUnitPriceRef.current
                  }
                  const newTotal = unitPrice > 0 ? Math.round(unitPrice * newQty * 100) / 100 : 0
                  return { ...prev, quantite: newQty, valeurAchatTTC: newTotal }
                })
              }}
            />
            <Input label="Valeur totale (TND)" type="number" min={0} step={0.01} value={formProduit.valeurAchatTTC ?? ''} onChange={e => setFormProduit(f => ({ ...f, valeurAchatTTC: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setShowFormProduit(false)}>Annuler</Button>
          <Button onClick={saveProduit}>Enregistrer</Button>
        </div>
      </Modal>

      {/* Modal confirmation suppression produit */}
      <Modal open={deleteProduitId !== null} onClose={() => setDeleteProduitId(null)} title="Supprimer le produit" maxWidth="sm">
        <p className="text-gray-600 text-sm">Supprimer ce produit du catalogue ?</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setDeleteProduitId(null)}>Annuler</Button>
          <Button variant="outline" onClick={confirmDeleteProduit} className="text-red-600 border-red-200 hover:bg-red-50">Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
