import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/contexts/ClientsContext'
import { useToast } from '@/contexts/ToastContext'
import type { Client } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { UserCircle, Plus, Pencil, Trash2, Phone, Mail, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ClientsPage() {
  const { user } = useAuth()
  const { clients, addClient, updateClient, removeClient } = useClients()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<Omit<Client, 'id'>>({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    notes: '',
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return clients.sort((a, b) => a.nom.localeCompare(b.nom))
    const q = search.toLowerCase()
    return clients
      .filter(
        c =>
          c.nom.toLowerCase().includes(q) ||
          c.telephone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      )
      .sort((a, b) => a.nom.localeCompare(b.nom))
  }, [clients, search])

  const openEdit = (c: Client) => {
    setForm({
      nom: c.nom,
      telephone: c.telephone,
      email: c.email ?? '',
      adresse: c.adresse ?? '',
      notes: c.notes ?? '',
    })
    setEditingId(c.id)
  }

  const openNew = () => {
    setForm({ nom: '', telephone: '', email: '', adresse: '', notes: '' })
    setEditingId(null)
    setShowAdd(true)
  }

  const save = () => {
    if (!form.nom.trim() || !form.telephone.trim()) return
    const payload = { ...form, email: form.email || undefined, adresse: form.adresse || undefined, notes: form.notes || undefined }
    if (editingId) {
      updateClient(editingId, payload)
      toast.success('Client modifié avec succès')
      setEditingId(null)
    } else {
      addClient(payload)
      toast.success('Client ajouté avec succès')
      setShowAdd(false)
    }
  }

  const confirmDelete = () => {
    if (deleteId !== null) {
      removeClient(deleteId)
      toast.success('Client supprimé')
      setDeleteId(null)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/25">
              <UserCircle className="w-5 h-5" />
            </span>
            Clients
          </h1>
          <p className="text-sm text-gray-500 mt-1">Carnet d'adresses des clients</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Ajouter un client
        </Button>
      </header>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Rechercher par nom, téléphone, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-14">
          <UserCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun client</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Modifiez la recherche.' : 'Ajoutez vos clients pour les retrouver rapidement.'}
          </p>
          {!search && (
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Ajouter un client
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
                'border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group',
                'flex flex-col'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-gray-900 truncate flex-1">{c.nom}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(c) }}
                    className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
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
                href={`tel:${c.telephone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Phone className="w-4 h-4 flex-shrink-0" />
                {c.telephone}
              </a>
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 mt-1 truncate"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </a>
              )}
              {c.adresse && (
                <p className="flex items-start gap-2 text-sm text-gray-500 mt-1">
                  <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{c.adresse}</span>
                </p>
              )}
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
        title={editingId ? 'Modifier le client' : 'Nouveau client'}
        subtitle={editingId ? undefined : 'Ajouter un client au carnet'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom du client"
            value={form.nom}
            onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))}
            placeholder="Ex. M. Ben Salem"
          />
          <Input
            label="Téléphone"
            type="tel"
            value={form.telephone}
            onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))}
            placeholder="Ex. 58 118 291"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optionnel"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
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

      <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Supprimer ce client ?" maxWidth="sm">
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Annuler</Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1">Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
