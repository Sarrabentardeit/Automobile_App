import { useState, useMemo, type ChangeEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAchats } from '@/contexts/AchatsContext'
import { useFournisseurs } from '@/contexts/FournisseursContext'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { useMoney } from '@/contexts/MoneyContext'
import { useToast } from '@/contexts/ToastContext'
import type { FactureFournisseur, LigneAchat, FactureFournisseurStatut } from '@/types'
import { FACTURE_FOURNISSEUR_STATUT_CONFIG } from '@/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Package, Plus, Search, Pencil, Trash2, Truck, CheckCircle, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AchatsPage() {
  const { permissions } = useAuth()
  const { factures, addFacture, updateFacture, removeFacture, getNextNumero } = useAchats()
  const { fournisseurs } = useFournisseurs()
  const { produits, incrementerStock } = useStockGeneral()
  const { addOut } = useMoney()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<FactureFournisseur, 'id' | 'createdAt'>>({
    numero: '',
    date: new Date().toISOString().slice(0, 10),
    fournisseurId: null,
    fournisseurNom: '',
    statut: 'brouillon',
    lignes: [],
    paye: false,
  })

  const filtered = useMemo(() => {
    let list = factures.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f => f.numero.toLowerCase().includes(q) || f.fournisseurNom.toLowerCase().includes(q))
    }
    return list
  }, [factures, search])

  const totalLignes = (lignes: LigneAchat[]) => lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)

  const openNew = () => {
    setForm({
      numero: getNextNumero(),
      date: new Date().toISOString().slice(0, 10),
      fournisseurId: null,
      fournisseurNom: '',
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
      statut: f.statut,
      lignes: f.lignes.length ? f.lignes : [],
      paye: f.paye,
    })
    setEditingId(f.id)
    setShowModal(true)
  }

  const openDuplicate = (f: FactureFournisseur) => {
    setForm({
      numero: getNextNumero(),
      date: new Date().toISOString().slice(0, 10),
      fournisseurId: f.fournisseurId,
      fournisseurNom: f.fournisseurNom,
      statut: 'brouillon',
      lignes: f.lignes.length ? f.lignes.map(l => ({ ...l })) : [],
      paye: false,
    })
    setEditingId(null)
    setShowModal(true)
  }

  const addLigne = (productId: number) => {
    const p = produits.find(x => x.id === productId)
    if (!p) return
    setForm(prev => ({
      ...prev,
      lignes: [...prev.lignes, { productId: p.id, designation: p.nom, quantite: 1, prixUnitaire: p.valeurAchatTTC }],
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

  const saveAchat = (validerEtEntrerStock?: boolean) => {
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
    }

    const prev = editingId ? factures.find(f => f.id === editingId) : null
    const doitIncrementerStock = (newStatut === 'validee' || newStatut === 'payee') && (!prev || prev.statut === 'brouillon')

    if (doitIncrementerStock) {
      for (const l of lignesValides) incrementerStock(l.productId, l.quantite, { origine: 'achat', reference: payload.numero })
    }
    if (doitIncrementerStock) {
      const totalAchat = totalLignes(lignesValides)
      addOut({
        date: payload.date,
        amount: totalAchat,
        category: 'FOURNISSEUR',
        description: `Achat ${payload.numero} — ${payload.fournisseurNom}`,
      })
    }

    if (editingId) {
      updateFacture(editingId, payload)
      toast.success(validerEtEntrerStock ? 'Achat validé — stock mis à jour' : 'Achat enregistré')
    } else {
      addFacture(payload)
      toast.success(validerEtEntrerStock ? 'Achat créé et validé — stock mis à jour' : 'Achat créé')
    }
    setShowModal(false)
  }

  const marquerPayee = (f: FactureFournisseur) => {
    if (f.statut === 'brouillon') {
      for (const l of f.lignes) incrementerStock(l.productId, l.quantite, { origine: 'achat', reference: f.numero })
      const totalAchat = totalLignes(f.lignes)
      addOut({
        date: f.date,
        amount: totalAchat,
        category: 'FOURNISSEUR',
        description: `Achat ${f.numero} — ${f.fournisseurNom}`,
      })
    }
    updateFacture(f.id, { statut: 'payee', paye: true })
    toast.success('Facture marquée payée')
  }

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès aux achats.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 px-3 sm:px-4 pb-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500 shrink-0" />
            Achats (entrée stock)
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Factures fournisseur — validation = entrée en stock</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />} size="sm" className="w-full sm:w-auto shrink-0">
          Nouvel achat
        </Button>
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

      <Card padding="none" className="overflow-hidden shadow-sm border border-gray-100 rounded-2xl">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-orange-500" />
            </div>
            <p className="font-semibold text-gray-700">Aucun achat</p>
            <p className="text-sm text-gray-500 mt-1">Créez un achat pour enregistrer une entrée en stock.</p>
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Nouvel achat
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">N°</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fournisseur</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Payé</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr
                    key={f.id}
                    className={cn(
                      'border-b border-gray-50',
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                      'hover:bg-orange-50/50'
                    )}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{f.numero}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(f.date)}</td>
                    <td className="px-4 py-3 text-gray-800">{f.fournisseurNom}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{totalLignes(f.lignes).toFixed(2)} DT</td>
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
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
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
        )}
      </Card>

      {/* Modal créer / modifier achat */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? `Achat ${form.numero}` : 'Nouvel achat'}
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">Lignes (produits)</h3>
              <select
                value=""
                onChange={e => {
                  const id = Number(e.target.value)
                  if (id) addLigne(id)
                  e.target.value = ''
                }}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm bg-white"
              >
                <option value="">+ Ajouter un produit</option>
                {produits.map(p => (
                  <option key={p.id} value={p.id}>{p.nom} (stock: {p.quantite})</option>
                ))}
              </select>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Produit</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-20">Qté</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Prix unit.</th>
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
                          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={l.prixUnitaire}
                          onChange={e => setLigne(i, { prixUnitaire: Number(e.target.value) || 0 })}
                          className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-right"
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
            <p className="text-xs text-gray-500 mt-1.5">Total : <strong>{totalLignes(form.lignes).toFixed(2)} DT</strong></p>
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
      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Supprimer l'achat" subtitle={deleteId != null ? factures.find(f => f.id === deleteId)?.numero : ''} maxWidth="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Cette action est irréversible. Le stock ne sera pas modifié (suppression uniquement de l'enregistrement).</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Annuler</Button>
            <Button variant="outline" onClick={() => { if (deleteId != null) { removeFacture(deleteId); toast.success('Achat supprimé'); setDeleteId(null) } }} className="flex-1 text-red-600 border-red-200 hover:bg-red-50">Supprimer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
