import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFournisseurs } from '@/contexts/FournisseursContext'
import { useToast } from '@/contexts/ToastContext'
import type { Fournisseur } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Truck, Plus, Pencil, Trash2, Phone, Mail, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FournisseursPage() {
  const { user } = useAuth()
  const { fournisseurs, loading, addFournisseur, updateFournisseur, removeFournisseur } = useFournisseurs()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<Fournisseur, 'id'>>({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    contact: '',
    notes: '',
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return fournisseurs.sort((a, b) => a.nom.localeCompare(b.nom))
    const q = search.toLowerCase()
    return fournisseurs
      .filter(
        f =>
          f.nom.toLowerCase().includes(q) ||
          f.telephone.includes(q) ||
          (f.email && f.email.toLowerCase().includes(q)) ||
          (f.contact && f.contact.toLowerCase().includes(q))
      )
      .sort((a, b) => a.nom.localeCompare(b.nom))
  }, [fournisseurs, search])

  const openEdit = (f: Fournisseur) => {
    setForm({
      nom: f.nom,
      telephone: f.telephone,
      email: f.email ?? '',
      adresse: f.adresse ?? '',
      contact: f.contact ?? '',
      notes: f.notes ?? '',
    })
    setEditingId(f.id)
  }

  const openNew = () => {
    setForm({ nom: '', telephone: '', email: '', adresse: '', contact: '', notes: '' })
    setEditingId(null)
    setShowAdd(true)
  }

  const save = async () => {
    if (!form.nom.trim() || !form.telephone.trim()) return
    const payload = { ...form, email: form.email || undefined, adresse: form.adresse || undefined, contact: form.contact || undefined, notes: form.notes || undefined }
    try {
      if (editingId) {
        await updateFournisseur(editingId, payload)
        toast.success('Fournisseur modifié avec succès')
        setEditingId(null)
      } else {
        await addFournisseur(payload)
        toast.success('Fournisseur ajouté avec succès')
        setShowAdd(false)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  const confirmDelete = async () => {
    if (deleteId !== null) {
      const ok = await removeFournisseur(deleteId)
      if (ok) {
        toast.success('Fournisseur supprimé')
        setDeleteId(null)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-12 flex items-center justify-center py-16">
        <p className="text-gray-500 font-medium">Chargement des fournisseurs...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/25">
              <Truck className="w-5 h-5" />
            </span>
            Fournisseurs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestion des fournisseurs : pièces, huiles, équipements…</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Ajouter un fournisseur
        </Button>
      </header>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Rechercher par nom, téléphone, email, contact…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-14">
          <Truck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun fournisseur</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Modifiez la recherche.' : 'Ajoutez vos fournisseurs pour les retrouver rapidement.'}
          </p>
          {!search && (
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Ajouter un fournisseur
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(f => (
            <Card
              key={f.id}
              padding="lg"
              className={cn(
                'border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all group',
                'flex flex-col'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-gray-900 truncate flex-1">{f.nom}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(f) }}
                    className="p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteId(f.id) }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <a
                href={`tel:${f.telephone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                {f.telephone}
              </a>
              {f.email && (
                <a
                  href={`mailto:${f.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 mt-1 truncate"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{f.email}</span>
                </a>
              )}
              {f.adresse && (
                <p className="flex items-start gap-2 text-sm text-gray-500 mt-1">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{f.adresse}</span>
                </p>
              )}
              {f.contact && (
                <p className="text-xs text-gray-500 mt-2">Contact : {f.contact}</p>
              )}
              {f.notes && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{f.notes}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAdd || editingId !== null}
        onClose={() => { setShowAdd(false); setEditingId(null) }}
        title={editingId ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        subtitle={editingId ? undefined : 'Enregistrer un fournisseur'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom du fournisseur"
            value={form.nom}
            onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))}
            placeholder="Ex. Auto Parts Tunis"
          />
          <Input
            label="Téléphone"
            type="tel"
            value={form.telephone}
            onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))}
            placeholder="Ex. 71 234 567"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Optionnel"
          />
          <Input
            label="Adresse"
            value={form.adresse}
            onChange={e => setForm(prev => ({ ...prev, adresse: e.target.value }))}
            placeholder="Optionnel"
          />
          <Input
            label="Personne de contact"
            value={form.contact}
            onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="Ex. M. Karim"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optionnel (ex. type de produits)"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.nom.trim() || !form.telephone.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Supprimer ce fournisseur ?"
        maxWidth="sm"
      >
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">
            Annuler
          </Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1">
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
