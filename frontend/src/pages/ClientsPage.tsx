import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/contexts/ClientsContext'
import { useToast } from '@/contexts/ToastContext'
import type { Client } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { UserCircle, Plus, Pencil, Trash2, Phone, Mail, MapPin, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 400
const PAGE_SIZE = 12

function ClientsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} padding="lg" className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
        </Card>
      ))}
    </div>
  )
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export default function ClientsPage() {
  const { user } = useAuth()
  const { clients, loading, total, page, limit, fetchClients, addClient, updateClient, removeClient } = useClients()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [form, setForm] = useState<Omit<Client, 'id'>>({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    notes: '',
    matriculeFiscale: '',
  })
  const [formError, setFormError] = useState< string | null>(null)
  const [saving, setSaving] = useState(false)

  // Debounce search → fetch with q
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setCurrentPage(1)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  const loadPage = useCallback(
    (p: number) => {
      setCurrentPage(p)
      fetchClients({ q: search.trim() || undefined, page: p, limit: PAGE_SIZE })
    },
    [search, fetchClients]
  )

  useEffect(() => {
    loadPage(currentPage)
  }, [search, currentPage])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPagination = total > PAGE_SIZE

  const openEdit = (c: Client) => {
    setForm({
      nom: c.nom,
      telephone: c.telephone,
      email: c.email ?? '',
      adresse: c.adresse ?? '',
      notes: c.notes ?? '',
      matriculeFiscale: c.matriculeFiscale ?? '',
    })
    setFormError(null)
    setEditingId(c.id)
  }

  const openNew = () => {
    setForm({ nom: '', telephone: '', email: '', adresse: '', notes: '', matriculeFiscale: '' })
    setFormError(null)
    setEditingId(null)
    setShowAdd(true)
  }

  const save = async () => {
    setFormError(null)
    if (!form.nom.trim()) {
      setFormError('Le nom est requis.')
      return
    }
    if (!form.telephone.trim()) {
      setFormError('Le téléphone est requis.')
      return
    }
    if (form.email && !isValidEmail(form.email)) {
      setFormError('Adresse email invalide.')
      return
    }
    const payload = {
      ...form,
      email: form.email?.trim() || undefined,
      adresse: form.adresse?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      matriculeFiscale: form.matriculeFiscale?.trim() || undefined,
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateClient(editingId, payload)
        toast.success('Client modifié avec succès')
        setEditingId(null)
      } else {
        await addClient(payload)
        toast.success('Client ajouté avec succès')
        setShowAdd(false)
      }
      loadPage(currentPage)
    } catch (e) {
      toast.error((e as Error).message ?? 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteClient) return
    try {
      const ok = await removeClient(deleteClient.id)
      if (ok) {
        toast.success('Client supprimé')
        setDeleteClient(null)
        loadPage(currentPage)
      } else {
        toast.error('Impossible de supprimer')
      }
    } catch (e) {
      toast.error((e as Error).message ?? 'Erreur')
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
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      {loading ? (
        <ClientsSkeleton />
      ) : clients.length === 0 ? (
        <Card padding="lg" className="text-center py-14">
          <UserCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun client</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Modifiez la recherche ou ajoutez un client.' : 'Ajoutez vos clients pour les retrouver rapidement.'}
          </p>
          <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
            Ajouter un client
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map(c => (
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
                      onClick={e => { e.stopPropagation(); setDeleteClient(c) }}
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
                {c.matriculeFiscale && (
                  <p className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>MF: {c.matriculeFiscale}</span>
                  </p>
                )}
                {c.notes && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{c.notes}</p>
                )}
              </Card>
            ))}
          </div>

          {hasPagination && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {total} client{total !== 1 ? 's' : ''} · page {page} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={showAdd || editingId !== null}
        onClose={() => { setShowAdd(false); setEditingId(null); setFormError(null) }}
        title={editingId ? 'Modifier le client' : 'Nouveau client'}
        subtitle={editingId ? undefined : 'Ajouter un client au carnet'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
          )}
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
            label="Matricule fiscal"
            value={form.matriculeFiscale}
            onChange={e => setForm(prev => ({ ...prev, matriculeFiscale: e.target.value }))}
            placeholder="Optionnel (facturation)"
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
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null); setFormError(null) }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.nom.trim() || !form.telephone.trim() || saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteClient !== null}
        onClose={() => setDeleteClient(null)}
        title="Supprimer ce client ?"
        subtitle={deleteClient ? `« ${deleteClient.nom} » sera définitivement supprimé.` : undefined}
        maxWidth="sm"
      >
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => setDeleteClient(null)} className="flex-1">Annuler</Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1">Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
