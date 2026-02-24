import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import type { HuileProduct, HuileType } from '@/types'
import { HUILE_TYPES } from '@/types'
import { useHuile } from '@/contexts/HuileContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Droplets, Plus, Package, AlertTriangle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_KEYS: HuileType[] = ['moteur', 'boite', 'liquide_refroidissement', 'hydraulique', 'autre']

export default function HuilePage() {
  const { user } = useAuth()
  const { products, addProduct, updateProduct } = useHuile()
  const toast = useToast()
  const [filterType, setFilterType] = useState<HuileType | 'tous'>('tous')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<Omit<HuileProduct, 'id'>>({
    designation: '',
    reference: '',
    type: 'moteur',
    quantite: 0,
    unite: 'L',
    seuilAlerte: undefined,
  })

  const filtered = useMemo(() => {
    let list = products
    if (filterType !== 'tous') list = list.filter(p => p.type === filterType)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        p =>
          p.designation.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.designation.localeCompare(b.designation))
  }, [products, filterType, search])

  const alertCount = useMemo(() => products.filter(p => p.seuilAlerte != null && p.quantite < p.seuilAlerte).length, [products])

  const openEdit = (p: HuileProduct) => {
    setForm({
      designation: p.designation,
      reference: p.reference,
      type: p.type,
      quantite: p.quantite,
      unite: p.unite,
      seuilAlerte: p.seuilAlerte,
    })
    setEditingId(p.id)
  }

  const openNew = () => {
    setForm({
      designation: '',
      reference: '',
      type: 'moteur',
      quantite: 0,
      unite: 'L',
      seuilAlerte: undefined,
    })
    setEditingId(null)
    setShowAdd(true)
  }

  const save = () => {
    if (!form.designation.trim()) return
    const payload = { ...form, seuilAlerte: form.seuilAlerte ?? undefined }
    if (editingId) {
      updateProduct(editingId, payload)
      toast.success('Produit huile modifié avec succès')
      setEditingId(null)
    } else {
      addProduct(payload)
      toast.success('Produit huile ajouté avec succès')
      setShowAdd(false)
    }
  }

  const isAlert = (p: HuileProduct) => p.seuilAlerte != null && p.quantite < p.seuilAlerte

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white">
              <Droplets className="w-5 h-5" />
            </span>
            Huile
          </h1>
          <p className="text-sm text-gray-500 mt-1">Stock huiles et liquides</p>
        </div>
        <div className="flex items-center gap-3">
          {alertCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {alertCount} alerte{alertCount > 1 ? 's' : ''}
            </span>
          )}
          <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
            Ajouter
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Rechercher (désignation, référence…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
          />
          <div className="inline-flex p-1 rounded-xl bg-gray-100 flex-wrap gap-1">
            <button
              onClick={() => setFilterType('tous')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                filterType === 'tous' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Tous
            </button>
            {TYPE_KEYS.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  filterType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {HUILE_TYPES[t].label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card padding="lg" className="text-center py-14">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun produit</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterType !== 'tous' || search ? 'Modifiez les filtres ou ajoutez un produit.' : 'Ajoutez un produit huile pour commencer.'}
            </p>
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Ajouter
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(p => (
              <Card
                key={p.id}
                padding="none"
                className={cn(
                  'overflow-hidden transition-shadow hover:shadow-md',
                  isAlert(p) && 'border-amber-200 bg-amber-50/30'
                )}
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border', HUILE_TYPES[p.type].color)}>
                        {HUILE_TYPES[p.type].label}
                      </span>
                      {isAlert(p) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-200 text-amber-900">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Stock bas
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{p.designation}</p>
                    <p className="text-sm text-gray-500">Réf. {p.reference}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 tabular-nums">{p.quantite}</p>
                      <p className="text-xs text-gray-500">{p.unite}</p>
                      {p.seuilAlerte != null && (
                        <p className="text-xs text-gray-400">Seuil {p.seuilAlerte} {p.unite}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajouter / Modifier */}
      <Modal
        open={showAdd || editingId !== null}
        onClose={() => { setShowAdd(false); setEditingId(null) }}
        title={editingId ? 'Modifier le produit' : 'Nouveau produit'}
        subtitle={editingId ? undefined : 'Huile ou liquide'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Désignation"
            value={form.designation}
            onChange={e => setForm(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="Ex. 5W30 Synthétique"
          />
          <Input
            label="Référence"
            value={form.reference}
            onChange={e => setForm(prev => ({ ...prev, reference: e.target.value }))}
            placeholder="Ex. MOT-5W30"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value as HuileType }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {TYPE_KEYS.map(t => (
                <option key={t} value={t}>{HUILE_TYPES[t].label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantité"
              type="number"
              min={0}
              value={form.quantite}
              onChange={e => setForm(prev => ({ ...prev, quantite: Number(e.target.value) || 0 }))}
            />
            <Input
              label="Unité"
              value={form.unite}
              onChange={e => setForm(prev => ({ ...prev, unite: e.target.value }))}
              placeholder="L, bidon, unité"
            />
          </div>
          <Input
            label="Seuil alerte (optionnel)"
            type="number"
            min={0}
            placeholder="Alerte si stock en dessous"
            value={form.seuilAlerte ?? ''}
            onChange={e => setForm(prev => ({ ...prev, seuilAlerte: e.target.value === '' ? undefined : Number(e.target.value) }))}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.designation.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
