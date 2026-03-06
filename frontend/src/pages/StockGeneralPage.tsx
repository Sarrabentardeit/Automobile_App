import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { useFacturation } from '@/contexts/FacturationContext'
import { useToast } from '@/contexts/ToastContext'
import type { ProduitStock } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Package, Plus, Search, Trash2, Layers, ShoppingCart, Pencil, AlertTriangle, ArrowUpDown, ArrowDown, ArrowUp, History, TrendingUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND'
}

export default function StockGeneralPage() {
  const { user } = useAuth()
  const { produits, mouvementsStock, addProduit, updateProduit, removeProduit } = useStockGeneral()
  const { factures } = useFacturation()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [sortQte, setSortQte] = useState<'none' | 'asc' | 'desc'>('none')
  const SEUIL_STOCK_FAIBLE = 3
  const [showFormProduit, setShowFormProduit] = useState(false)
  const [editingProduitId, setEditingProduitId] = useState<number | null>(null)
  const [deleteProduitId, setDeleteProduitId] = useState<number | null>(null)
  const [formProduit, setFormProduit] = useState<Omit<ProduitStock, 'id'>>({
    nom: '',
    quantite: 0,
    valeurAchatTTC: 0,
  })
  // Mémorise le dernier prix unitaire pour recalculer la valeur totale quand la qté repasse de 0 à > 0
  const lastUnitPriceRef = useRef<number>(0)

  const filteredProduits = useMemo(() => {
    let list = produits
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.nom.toLowerCase().includes(q))
    }
    if (sortQte === 'asc') list = [...list].sort((a, b) => (a.quantite ?? 0) - (b.quantite ?? 0))
    else if (sortQte === 'desc') list = [...list].sort((a, b) => (b.quantite ?? 0) - (a.quantite ?? 0))
    return list
  }, [produits, search, sortQte])

  const totalValeurStock = useMemo(() => produits.reduce((s, p) => s + p.valeurAchatTTC, 0), [produits])

  const derniersMouvements = useMemo(() => [...(mouvementsStock ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 15), [mouvementsStock])

  const now = new Date()
  const ceMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const produitsPlusVendus = useMemo(() => {
    const map = new Map<number, { nom: string; qte: number }>()
    for (const f of factures ?? []) {
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
  }, [factures, ceMois])

  const openNewProduit = () => {
    lastUnitPriceRef.current = 0
    setFormProduit({ nom: '', quantite: 0, valeurAchatTTC: 0 })
    setEditingProduitId(null)
    setShowFormProduit(true)
  }

  const openEditProduit = (p: ProduitStock, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const produit = produits.find(pr => pr.id === p.id) ?? p
    const qte = produit.quantite ?? 0
    const val = typeof produit.valeurAchatTTC === 'number' ? produit.valeurAchatTTC : 0
    if (qte > 0 && val > 0) lastUnitPriceRef.current = val / qte
    else lastUnitPriceRef.current = 0
    setFormProduit({ nom: produit.nom, quantite: qte, valeurAchatTTC: val })
    setEditingProduitId(produit.id)
    setShowFormProduit(true)
  }

  const saveProduit = () => {
    if (!formProduit.nom.trim()) return
    if (editingProduitId) {
      updateProduit(editingProduitId, formProduit)
      toast.success('Produit modifié')
    } else {
      addProduit(formProduit)
      toast.success('Produit ajouté')
    }
    setShowFormProduit(false)
  }

  const confirmDeleteProduit = () => {
    if (deleteProduitId !== null) {
      removeProduit(deleteProduitId)
      toast.success('Produit supprimé')
      setDeleteProduitId(null)
    }
  }

  if (!user) return null

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
          <Link to="/achats">
            <Button variant="outline" size="sm" icon={<ShoppingCart className="w-4 h-4" />}>
              Entrée stock (Achats)
            </Button>
          </Link>
          <Button onClick={openNewProduit} size="sm" icon={<Plus className="w-4 h-4" />}>
            Nouveau produit
          </Button>
        </div>
      </header>

      {/* Valeur totale — compact */}
      <Card padding="sm" className="mb-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700/80">Valeur totale du stock</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 tabular-nums">{formatMontant(totalValeurStock)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 hidden sm:block">Entrées : Achats · Sorties : Facturation</p>
        </div>
      </Card>

      {/* Recherche + Tri */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
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
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 w-28">Quantité</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700 w-32">Valeur totale</th>
                  <th className="w-24 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredProduits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                      {produits.length === 0 ? 'Aucun produit. Cliquez sur « Nouveau produit » ou enregistrez un achat.' : 'Aucun résultat.'}
                    </td>
                  </tr>
                ) : (
                  filteredProduits.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => openEditProduit(p)}
                      className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{p.nom}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'tabular-nums inline-flex items-center gap-1',
                          (p.quantite ?? 0) <= SEUIL_STOCK_FAIBLE && (p.quantite ?? 0) > 0
                            ? 'text-amber-600 font-semibold'
                            : 'text-gray-700'
                        )}>
                          {(p.quantite ?? 0) <= SEUIL_STOCK_FAIBLE && (p.quantite ?? 0) > 0 && <AlertTriangle className="w-4 h-4 shrink-0" />}
                          {p.quantite}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-amber-700">{formatMontant(p.valeurAchatTTC)}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
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
      <Modal open={showFormProduit} onClose={() => setShowFormProduit(false)} title={editingProduitId ? 'Modifier le produit' : 'Nouveau produit'} maxWidth="sm">
        <div className="space-y-4">
          <Input label="Nom du produit" value={formProduit.nom} onChange={e => setFormProduit(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: HUILE 5W30" />
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
