import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useContactsImportants } from '@/contexts/ContactsImportantsContext'
import { useToast } from '@/contexts/ToastContext'
import type { ContactImportant } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Phone, Plus, Pencil, Trash2, PhoneCall } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = ['Fournisseur', 'Assurance', 'Dépannage', 'Prestataire', 'Client', 'Autre']

export default function ContactsImportantsPage() {
  const { user } = useAuth()
  const { contacts, loading, addContact, updateContact, removeContact } = useContactsImportants()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<ContactImportant, 'id'>>({
    nom: '',
    numero: '',
    categorie: '',
    notes: '',
  })

  const filtered = useMemo(() => {
    let list = contacts
    if (filterCat) list = list.filter(c => (c.categorie ?? '').toLowerCase() === filterCat.toLowerCase())
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        c =>
          c.nom.toLowerCase().includes(q) ||
          c.numero.includes(q) ||
          (c.categorie && c.categorie.toLowerCase().includes(q))
      )
    }
    return list.sort((a, b) => a.nom.localeCompare(b.nom))
  }, [contacts, search, filterCat])

  const openEdit = (c: ContactImportant) => {
    setForm({
      nom: c.nom,
      numero: c.numero,
      categorie: c.categorie ?? '',
      notes: c.notes ?? '',
    })
    setEditingId(c.id)
  }

  const openNew = () => {
    setForm({ nom: '', numero: '', categorie: '', notes: '' })
    setEditingId(null)
    setShowAdd(true)
  }

  const save = async () => {
    if (!form.nom.trim() || !form.numero.trim()) return
    const payload = { ...form, categorie: form.categorie || undefined, notes: form.notes || undefined }
    try {
      if (editingId) {
        await updateContact(editingId, payload)
        toast.success('Contact modifié avec succès')
        setEditingId(null)
      } else {
        await addContact(payload)
        toast.success('Contact ajouté avec succès')
        setShowAdd(false)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  const confirmDelete = async () => {
    if (deleteId !== null) {
      const ok = await removeContact(deleteId)
      if (ok) {
        toast.success('Contact supprimé')
        setDeleteId(null)
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-12 flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-medium">Chargement des contacts...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/25">
              <Phone className="w-5 h-5" />
            </span>
            Contacts importants
          </h1>
          <p className="text-sm text-gray-500 mt-1">Numéros utiles : fournisseurs, dépannage, assurance…</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Ajouter un contact
        </Button>
      </header>

      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Rechercher par nom, numéro ou catégorie…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm"
          />
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 sm:w-[180px]"
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-14">
          <Phone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun contact</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || filterCat ? 'Modifiez les filtres.' : 'Ajoutez des numéros importants pour les retrouver ici.'}
          </p>
          {!search && !filterCat && (
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Ajouter un contact
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <Card
              key={c.id}
              padding="lg"
              className={cn(
                'border border-gray-100 hover:border-rose-200 hover:shadow-md transition-all group',
                'flex flex-col'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{c.nom}</h3>
                  {c.categorie && (
                    <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                      {c.categorie}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(c) }}
                    className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteId(c.id) }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <a
                href={`tel:${c.numero.replace(/\s/g, '')}`}
                className={cn(
                  'inline-flex items-center gap-2 mt-auto pt-3 text-rose-600 font-medium text-sm',
                  'hover:text-rose-700 hover:underline'
                )}
              >
                <PhoneCall className="w-4 h-4 flex-shrink-0" />
                {c.numero}
              </a>
              {c.notes && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{c.notes}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={showAdd || editingId !== null}
        onClose={() => { setShowAdd(false); setEditingId(null) }}
        title={editingId ? 'Modifier le contact' : 'Nouveau contact'}
        subtitle={editingId ? undefined : 'Ajouter un numéro important'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={form.nom}
            onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))}
            placeholder="Ex. Dépannage 24h"
          />
          <Input
            label="Numéro"
            type="tel"
            value={form.numero}
            onChange={e => setForm(prev => ({ ...prev, numero: e.target.value }))}
            placeholder="Ex. 71 123 456"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={form.categorie}
              onChange={e => setForm(prev => ({ ...prev, categorie: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm"
            >
              <option value="">—</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optionnel"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none text-sm"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.nom.trim() || !form.numero.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Supprimer ce contact ?"
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
