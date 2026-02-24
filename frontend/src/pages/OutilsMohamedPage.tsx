import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOutils } from '@/contexts/OutilsContext'
import { useToast } from '@/contexts/ToastContext'
import type { OutilMohamed } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Wrench, Plus, Search, Trash2 } from 'lucide-react'

const TAUX_MOHAMED = 0.11

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND'
}

export default function OutilsMohamedPage() {
  const { user } = useAuth()
  const { outilsMohamed, addOutilMohamed, updateOutilMohamed, removeOutilMohamed } = useOutils()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<OutilMohamed, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    vehicule: '',
    outillage: '',
    prixGarage: 0,
    prixMohamed: 0,
  })

  const filtered = useMemo(() => {
    const list = [...outilsMohamed].sort((a, b) => b.date.localeCompare(a.date))
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(m => m.vehicule.toLowerCase().includes(q) || m.outillage.toLowerCase().includes(q))
  }, [outilsMohamed, search])

  const totalPrixMohamed = useMemo(() => outilsMohamed.reduce((s, o) => s + (o.prixMohamed ?? o.prixGarage * TAUX_MOHAMED), 0), [outilsMohamed])

  const openNew = () => {
    setForm({ date: new Date().toISOString().slice(0, 10), vehicule: '', outillage: '', prixGarage: 0, prixMohamed: 0 })
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (o: OutilMohamed, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setForm({ date: o.date, vehicule: o.vehicule, outillage: o.outillage, prixGarage: o.prixGarage, prixMohamed: o.prixMohamed ?? o.prixGarage * TAUX_MOHAMED })
    setEditingId(o.id)
    setShowForm(true)
  }

  const save = () => {
    if (!form.outillage.trim() || !form.date) return
    const prixMohamed = form.prixMohamed ?? form.prixGarage * TAUX_MOHAMED
    if (editingId) {
      updateOutilMohamed(editingId, { ...form, prixMohamed })
      toast.success('Mouvement modifié avec succès')
    } else {
      addOutilMohamed({ ...form, prixMohamed })
      toast.success('Mouvement ajouté avec succès')
    }
    setShowForm(false)
  }

  const recalcPrix = () => setForm(f => ({ ...f, prixMohamed: f.prixGarage * TAUX_MOHAMED }))

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-600 text-white shadow-lg shadow-slate-600/25">
              <Wrench className="w-5 h-5" />
            </span>
            Outils Mohamed
          </h1>
          <p className="text-sm text-gray-500 mt-1">Feuille MOHAMED OUTILS : Outillage et part Mohamed (11%)</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>Nouveau</Button>
      </header>

      <Card padding="lg" className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-500/20 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700/80">Total Prix Mohamed (11%)</p>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{formatMontant(totalPrixMohamed)}</p>
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="search" placeholder="Rechercher véhicule, outillage…" value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm" />
        </div>
      </div>

      <Card padding="none" className="overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Voiture</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Outillage</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Prix Garage</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Prix Mohamed (11%)</th>
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">Aucune donnée</td></tr>
              ) : (
                filtered.map(o => (
                  <tr key={o.id} onClick={() => openEdit(o)} className="border-b border-gray-50 hover:bg-slate-50/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-gray-700">{formatDate(o.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.vehicule || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{o.outillage}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatMontant(o.prixGarage)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-700">{formatMontant(o.prixMohamed ?? o.prixGarage * TAUX_MOHAMED)}</td>
                    <td className="px-2 py-3">
                      <button onClick={e => { e.stopPropagation(); setDeleteId(o.id) }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Modifier' : 'Nouveau'} maxWidth="sm">
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Voiture" value={form.vehicule} onChange={e => setForm(f => ({ ...f, vehicule: e.target.value }))} placeholder="Ex: SEAT" />
          <Input label="Outillage" value={form.outillage} onChange={e => setForm(f => ({ ...f, outillage: e.target.value }))} placeholder="Ex: ARRACHE ROTULES" />
          <Input label="Prix Garage (TND)" type="number" min={0} step={0.01} value={form.prixGarage || ''} onChange={e => setForm(f => ({ ...f, prixGarage: parseFloat(e.target.value) || 0 }))} />
          <Input label="Prix Mohamed (11%)" type="number" min={0} step={0.01} value={(form.prixMohamed ?? form.prixGarage * TAUX_MOHAMED) || ''} onChange={e => setForm(f => ({ ...f, prixMohamed: parseFloat(e.target.value) || 0 }))} />
          <Button variant="outline" size="sm" onClick={recalcPrix}>Recalculer 11%</Button>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </div>
      </Modal>

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Supprimer" maxWidth="sm">
        <p className="text-gray-600 text-sm">Êtes-vous sûr de vouloir supprimer cette entrée ?</p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Annuler</Button>
          <Button variant="danger" onClick={() => { if (deleteId !== null) { removeOutilMohamed(deleteId); toast.success('Entrée supprimée'); setDeleteId(null) } }}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
