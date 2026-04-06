import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOutils } from '@/contexts/OutilsContext'
import { useToast } from '@/contexts/ToastContext'
import type { OutilAhmed } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Wrench, Plus, Search, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TND'
}

export default function OutilsAhmedPage() {
  const { user, permissions } = useAuth()
  const { outilsAhmed, loading, addOutilAhmed, updateOutilAhmed, removeOutilAhmed } = useOutils()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<OutilAhmed, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    vehicule: '',
    typeTravaux: '',
    prixGarage: 0,
    prixAhmed: 0,
  })

  const filtered = useMemo(() => {
    const list = [...outilsAhmed].sort((a, b) => b.date.localeCompare(a.date))
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      o =>
        o.vehicule.toLowerCase().includes(q) ||
        o.typeTravaux.toLowerCase().includes(q)
    )
  }, [outilsAhmed, search])

  const totalPrixAhmed = useMemo(() => filtered.reduce((s, o) => s + o.prixAhmed, 0), [filtered])

  const openNew = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      vehicule: '',
      typeTravaux: '',
      prixGarage: 0,
      prixAhmed: 0,
    })
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (o: OutilAhmed, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setForm({
      date: o.date,
      vehicule: o.vehicule,
      typeTravaux: o.typeTravaux,
      prixGarage: o.prixGarage ?? 0,
      prixAhmed: o.prixAhmed,
    })
    setEditingId(o.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.date) return
    try {
      if (editingId) {
        await updateOutilAhmed(editingId, form)
        toast.success('Entrée modifiée avec succès')
      } else {
        await addOutilAhmed(form)
        toast.success('Entrée ajoutée avec succès')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  if (!user) return null

  if (!permissions?.canViewEquipeOutils) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Wrench className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès à cette page.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
              <Wrench className="w-5 h-5" />
            </span>
            Opération Ahmed
          </h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des travaux : type d’intervention, prix garage, prix Ahmed</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Nouveau
        </Button>
      </header>

      <Card padding="lg" className={cn('mb-6 border', totalPrixAhmed >= 0 ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200')}>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', totalPrixAhmed >= 0 ? 'bg-emerald-500/20' : 'bg-amber-500/20')}>
            <Wrench className={cn('w-5 h-5', totalPrixAhmed >= 0 ? 'text-emerald-600' : 'text-amber-600')} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700/80">Solde Prix Ahmed</p>
            <p className={cn('text-xl font-bold tabular-nums', totalPrixAhmed >= 0 ? 'text-emerald-700' : 'text-amber-700')}>{formatMontant(totalPrixAhmed)}</p>
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Rechercher véhicule, type de travaux…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
          />
        </div>
      </div>

      <Card padding="none" className="overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 border-b border-emerald-100">
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Voiture</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900">Type de travaux</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Prix Garage</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-900">Prix Ahmed</th>
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Aucune donnée
                  </td>
                </tr>
              ) : (
                filtered.map(o => (
                  <tr
                    key={o.id}
                    onClick={() => openEdit(o)}
                    className="border-b border-gray-50 hover:bg-emerald-50/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-700">{formatDate(o.date)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.vehicule || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{o.typeTravaux || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{o.prixGarage != null ? formatMontant(o.prixGarage) : '—'}</td>
                    <td className={cn('px-4 py-3 text-right font-medium tabular-nums', o.prixAhmed >= 0 ? 'text-emerald-600' : 'text-rose-600')}>{formatMontant(o.prixAhmed)}</td>
                    <td className="px-2 py-3">
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setDeleteId(o.id)
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
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? 'Modifier' : 'Nouveau'} maxWidth="sm">
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <Input label="Voiture" value={form.vehicule} onChange={e => setForm(f => ({ ...f, vehicule: e.target.value }))} placeholder="Ex: CHERRY, PAIEMENT, AVANCE" />
          <Input label="Type de travaux" value={form.typeTravaux} onChange={e => setForm(f => ({ ...f, typeTravaux: e.target.value }))} placeholder="Ex: CHAINE ET SOUPAPES" />
          <Input
            label="Prix Garage (TND)"
            type="number"
            step={0.01}
            value={form.prixGarage ?? ''}
            onChange={e => setForm(f => ({ ...f, prixGarage: parseFloat(e.target.value) || 0 }))}
          />
          <Input
            label="Prix Ahmed (TND) — +revenu / -paiement"
            type="number"
            step={0.01}
            value={form.prixAhmed ?? ''}
            onChange={e => setForm(f => ({ ...f, prixAhmed: parseFloat(e.target.value) || 0 }))}
          />
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
          <Button
            variant="danger"
            onClick={async () => {
              if (deleteId !== null) {
                const ok = await removeOutilAhmed(deleteId)
                if (ok) toast.success('Entrée supprimée')
                else toast.error('Erreur lors de la suppression')
                setDeleteId(null)
              }
            }}
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
