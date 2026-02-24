import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { useToast } from '@/contexts/ToastContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import { useFournisseurs } from '@/contexts/FournisseursContext'
import type { MouvementProduit, ProduitStock, MouvementProduitNeufUtilise, MouvementProduitStatut } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Package, Plus, Search, Trash2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND'
}

type TabType = 'mouvements' | 'recap'

const NEUF_LABELS: Record<MouvementProduitNeufUtilise, string> = { neuf: 'Neuf', occasion: 'Utilisé' }
const STATUT_LABELS: Record<MouvementProduitStatut, string> = { fini: 'Fini', en_cours: 'En cours' }

export default function StockGeneralPage() {
  const { user } = useAuth()
  const { members } = useTeamMembers()
  const { fournisseurs } = useFournisseurs()
  const {
    mouvements,
    produits,
    addMouvement,
    updateMouvement,
    removeMouvement,
    addProduit,
    updateProduit,
    removeProduit,
  } = useStockGeneral()
  const toast = useToast()
  const [tab, setTab] = useState<TabType>('mouvements')
  const [search, setSearch] = useState('')
  const [showFormMouvement, setShowFormMouvement] = useState(false)
  const [showFormProduit, setShowFormProduit] = useState(false)
  const [editingMouvementId, setEditingMouvementId] = useState<number | null>(null)
  const [editingProduitId, setEditingProduitId] = useState<number | null>(null)
  const [deleteMouvementId, setDeleteMouvementId] = useState<number | null>(null)
  const [deleteProduitId, setDeleteProduitId] = useState<number | null>(null)
  const [formMouvement, setFormMouvement] = useState<Omit<MouvementProduit, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    produit: '',
    vehicule: '',
    technicien: '',
    neufUtilise: 'neuf',
    statut: 'fini',
    prix: 0,
    fournisseur: '',
  })
  const [formProduit, setFormProduit] = useState<Omit<ProduitStock, 'id'>>({
    nom: '',
    quantite: 0,
    valeurAchatTTC: 0,
  })

  const techniciens = useMemo(() => members.map(m => m.name).filter(Boolean), [members])
  const fournisseurNoms = useMemo(() => fournisseurs.map(f => f.nom), [fournisseurs])

  const filteredMouvements = useMemo(() => {
    const list = [...mouvements].sort((a, b) => b.date.localeCompare(a.date))
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      m =>
        m.produit.toLowerCase().includes(q) ||
        m.vehicule.toLowerCase().includes(q) ||
        m.technicien.toLowerCase().includes(q) ||
        m.fournisseur.toLowerCase().includes(q)
    )
  }, [mouvements, search])

  const totalValeurStock = useMemo(() => produits.reduce((s, p) => s + p.valeurAchatTTC, 0), [produits])

  const openNewMouvement = () => {
    setFormMouvement({
      date: new Date().toISOString().slice(0, 10),
      produit: '',
      vehicule: '',
      technicien: techniciens[0] ?? '',
      neufUtilise: 'neuf',
      statut: 'fini',
      prix: 0,
      fournisseur: fournisseurNoms[0] ?? '',
    })
    setEditingMouvementId(null)
    setShowFormMouvement(true)
  }

  const openEditMouvement = (m: MouvementProduit, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setFormMouvement({
      date: m.date,
      produit: m.produit,
      vehicule: m.vehicule,
      technicien: m.technicien,
      neufUtilise: m.neufUtilise,
      statut: m.statut,
      prix: m.prix,
      fournisseur: m.fournisseur,
    })
    setEditingMouvementId(m.id)
    setShowFormMouvement(true)
  }

  const saveMouvement = () => {
    if (!formMouvement.produit.trim() || !formMouvement.date) return
    if (editingMouvementId) {
      updateMouvement(editingMouvementId, formMouvement)
      toast.success('Mouvement modifié avec succès')
    } else {
      addMouvement(formMouvement)
      toast.success('Mouvement ajouté avec succès')
    }
    setShowFormMouvement(false)
  }

  const openNewProduit = () => {
    setFormProduit({ nom: '', quantite: 0, valeurAchatTTC: 0 })
    setEditingProduitId(null)
    setShowFormProduit(true)
  }

  const openEditProduit = (p: ProduitStock, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setFormProduit({ nom: p.nom, quantite: p.quantite, valeurAchatTTC: p.valeurAchatTTC })
    setEditingProduitId(p.id)
    setShowFormProduit(true)
  }

  const saveProduit = () => {
    if (!formProduit.nom.trim()) return
    if (editingProduitId) {
      updateProduit(editingProduitId, formProduit)
      toast.success('Produit modifié avec succès')
    } else {
      addProduit(formProduit)
      toast.success('Produit ajouté avec succès')
    }
    setShowFormProduit(false)
  }

  const confirmDeleteMouvement = () => {
    if (deleteMouvementId !== null) {
      removeMouvement(deleteMouvementId)
      toast.success('Mouvement supprimé')
      setDeleteMouvementId(null)
    }
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
    <div className="max-w-6xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
              <Package className="w-5 h-5" />
            </span>
            Stock Général
          </h1>
          <p className="text-sm text-gray-500 mt-1">Feuille Produits : Mouvements et récapitulatif du stock</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 'mouvements' && (
            <Button onClick={openNewMouvement} icon={<Plus className="w-4 h-4" />}>
              Nouveau mouvement
            </Button>
          )}
          {tab === 'recap' && (
            <Button onClick={openNewProduit} icon={<Plus className="w-4 h-4" />}>
              Nouveau produit
            </Button>
          )}
        </div>
      </header>

      <Card padding="lg" className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-700/80">Valeur totale du stock</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{formatMontant(totalValeurStock)}</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="inline-flex p-1 rounded-xl bg-gray-100">
          <button
            onClick={() => setTab('mouvements')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'mouvements' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Package className="w-4 h-4" />
            Mouvements
          </button>
          <button
            onClick={() => setTab('recap')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === 'recap' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Layers className="w-4 h-4" />
            Récap Stock
          </button>
        </div>
        {tab === 'mouvements' && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Rechercher produit, véhicule, technicien, fournisseur…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <Card padding="none" className="overflow-hidden border border-gray-100">
        {tab === 'mouvements' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Produit</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Voiture / Immat</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Technicien</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Neuf / Utilisé</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Prix</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Fournisseur</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {filteredMouvements.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      Aucun mouvement
                    </td>
                  </tr>
                ) : (
                  filteredMouvements.map(m => (
                    <tr
                      key={m.id}
                      onClick={() => openEditMouvement(m)}
                      className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-700">{formatDate(m.date)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{m.produit}</td>
                      <td className="px-4 py-3 text-gray-600">{m.vehicule}</td>
                      <td className="px-4 py-3 text-gray-600">{m.technicien}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', m.neufUtilise === 'neuf' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700')}>
                          {NEUF_LABELS[m.neufUtilise]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 rounded-md text-xs font-medium', m.statut === 'fini' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700')}>
                          {STATUT_LABELS[m.statut]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">{formatMontant(m.prix)}</td>
                      <td className="px-4 py-3 text-gray-600">{m.fournisseur}</td>
                      <td className="px-2 py-3">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setDeleteMouvementId(m.id)
                          }}
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
        {tab === 'recap' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 border-b border-amber-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Produits</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Qté</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Valeur achat TTC</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Valeur stock</th>
                  <th className="w-10 px-2" />
                </tr>
              </thead>
              <tbody>
                {produits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                      Aucun produit en stock
                    </td>
                  </tr>
                ) : (
                  produits.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => openEditProduit(p)}
                      className="border-b border-gray-50 hover:bg-amber-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{p.nom}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{p.quantite}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMontant(p.valeurAchatTTC)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-amber-700">{formatMontant(p.valeurAchatTTC)}</td>
                      <td className="px-2 py-3">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setDeleteProduitId(p.id)
                          }}
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

      {/* Modal Mouvement */}
      <Modal open={showFormMouvement} onClose={() => setShowFormMouvement(false)} title={editingMouvementId ? 'Modifier le mouvement' : 'Nouveau mouvement'} maxWidth="sm">
        <div className="space-y-4">
          <Input label="Date" type="date" value={formMouvement.date} onChange={e => setFormMouvement(f => ({ ...f, date: e.target.value }))} />
          <Input label="Produit" value={formMouvement.produit} onChange={e => setFormMouvement(f => ({ ...f, produit: e.target.value }))} placeholder="Ex: INJECTEUR DIESEL" />
          <Input label="Voiture / Immatriculation" value={formMouvement.vehicule} onChange={e => setFormMouvement(f => ({ ...f, vehicule: e.target.value }))} placeholder="Ex: 308" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technicien</label>
            <select
              value={formMouvement.technicien}
              onChange={e => setFormMouvement(f => ({ ...f, technicien: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {techniciens.length === 0 && <option value="">—</option>}
              {techniciens.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              {!techniciens.includes(formMouvement.technicien) && formMouvement.technicien && (
                <option value={formMouvement.technicien}>{formMouvement.technicien}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Neuf / Utilisé</label>
            <select
              value={formMouvement.neufUtilise}
              onChange={e => setFormMouvement(f => ({ ...f, neufUtilise: e.target.value as MouvementProduitNeufUtilise }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="neuf">Neuf</option>
              <option value="occasion">Utilisé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select
              value={formMouvement.statut}
              onChange={e => setFormMouvement(f => ({ ...f, statut: e.target.value as MouvementProduitStatut }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="fini">Fini</option>
              <option value="en_cours">En cours</option>
            </select>
          </div>
          <Input label="Prix (TND)" type="number" min={0} step={0.01} value={formMouvement.prix || ''} onChange={e => setFormMouvement(f => ({ ...f, prix: parseFloat(e.target.value) || 0 }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
            <select
              value={formMouvement.fournisseur}
              onChange={e => setFormMouvement(f => ({ ...f, fournisseur: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {fournisseurNoms.length === 0 && <option value="">—</option>}
              {fournisseurNoms.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
              {!fournisseurNoms.includes(formMouvement.fournisseur) && formMouvement.fournisseur && (
                <option value={formMouvement.fournisseur}>{formMouvement.fournisseur}</option>
              )}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setShowFormMouvement(false)}>Annuler</Button>
          <Button onClick={saveMouvement}>Enregistrer</Button>
        </div>
      </Modal>

      {/* Modal Produit */}
      <Modal open={showFormProduit} onClose={() => setShowFormProduit(false)} title={editingProduitId ? 'Modifier le produit' : 'Nouveau produit'} maxWidth="sm">
        <div className="space-y-4">
          <Input label="Produit" value={formProduit.nom} onChange={e => setFormProduit(f => ({ ...f, nom: e.target.value }))} placeholder="Ex: HUILE 5W30" />
          <Input label="Quantité" type="number" min={0} value={formProduit.quantite || ''} onChange={e => setFormProduit(f => ({ ...f, quantite: parseInt(e.target.value, 10) || 0 }))} />
          <Input label="Valeur achat TTC (TND)" type="number" min={0} step={0.01} value={formProduit.valeurAchatTTC || ''} onChange={e => setFormProduit(f => ({ ...f, valeurAchatTTC: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setShowFormProduit(false)}>Annuler</Button>
          <Button onClick={saveProduit}>Enregistrer</Button>
        </div>
      </Modal>

      {/* Modal confirmation suppression Mouvement */}
      <Modal open={deleteMouvementId !== null} onClose={() => setDeleteMouvementId(null)} title="Supprimer le mouvement" maxWidth="sm">
        <p className="text-gray-600 text-sm">Êtes-vous sûr de vouloir supprimer ce mouvement ?</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setDeleteMouvementId(null)}>Annuler</Button>
          <Button variant="danger" onClick={confirmDeleteMouvement}>Supprimer</Button>
        </div>
      </Modal>

      {/* Modal confirmation suppression Produit */}
      <Modal open={deleteProduitId !== null} onClose={() => setDeleteProduitId(null)} title="Supprimer le produit" maxWidth="sm">
        <p className="text-gray-600 text-sm">Êtes-vous sûr de vouloir supprimer ce produit du stock ?</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setDeleteProduitId(null)}>Annuler</Button>
          <Button variant="danger" onClick={confirmDeleteProduit}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
