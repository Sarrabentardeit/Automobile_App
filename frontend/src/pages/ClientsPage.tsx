import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/contexts/ClientsContext'
import { useToast } from '@/contexts/ToastContext'
import type { CarteVip, CarteVipAcces, Client } from '@/types'
import { apiFetch } from '@/lib/api'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { UserCircle, Plus, Pencil, Trash2, Phone, Mail, MapPin, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 400
const PAGE_SIZE = 12
type CarteFiltre = 'tous' | 'standard' | 'advanced' | 'expiree'

function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function carteEtat(carte: CarteVip | null | undefined): 'none' | 'standard' | 'advanced' | 'avenir' | 'expiree' {
  if (!carte?.numero) return 'none'
  const today = todayIso()
  if (carte.fin < today) return 'expiree'
  if (carte.debut > today) return 'avenir'
  return carte.acces
}

function formatFr(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

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
  const { user, getAccessToken } = useAuth()
  const { clients, loading, total, page, limit, fetchClients, addClient, updateClient, removeClient } = useClients()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [carteFiltre, setCarteFiltre] = useState<CarteFiltre>('tous')
  const [carteOn, setCarteOn] = useState(false)
  const [carte, setCarte] = useState<CarteVip>({ numero: '', debut: todayIso(), fin: '', acces: 'standard' })
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
      fetchClients({
        q: search.trim() || undefined,
        page: p,
        limit: PAGE_SIZE,
        carte: carteFiltre === 'tous' ? undefined : carteFiltre,
      })
    },
    [search, carteFiltre, fetchClients]
  )

  useEffect(() => {
    loadPage(currentPage)
  }, [search, currentPage, carteFiltre])

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
    setCarteOn(Boolean(c.carteVip))
    setCarte(c.carteVip ?? { numero: '', debut: todayIso(), fin: '', acces: 'standard' })
    setEditingId(c.id)
  }

  const openNew = () => {
    setForm({ nom: '', telephone: '', email: '', adresse: '', notes: '', matriculeFiscale: '' })
    setFormError(null)
    setCarteOn(false)
    setCarte({ numero: '', debut: todayIso(), fin: '', acces: 'standard' })
    setEditingId(null)
    setShowAdd(true)
  }

  const enableCarte = async () => {
    setCarteOn(true)
    if (carte.numero) return
    const token = getAccessToken()
    if (!token) return
    try {
      const res = await apiFetch<{ numero: string }>('/clients/next-carte', { token })
      setCarte(prev => ({ ...prev, numero: prev.numero || res.numero }))
    } catch {
      /* le numéro sera attribué à l'enregistrement */
    }
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
    if (carteOn && (!carte.debut || !carte.fin)) {
      setFormError('Les dates de la carte VIP sont requises.')
      return
    }
    if (carteOn && carte.fin < carte.debut) {
      setFormError('La date de fin doit être après la date de début.')
      return
    }
    const payload = {
      ...form,
      email: form.email?.trim() || undefined,
      adresse: form.adresse?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      matriculeFiscale: form.matriculeFiscale?.trim() || undefined,
      carteVip: carteOn
        ? { numero: carte.numero.trim(), debut: carte.debut, fin: carte.fin, acces: carte.acces }
        : null,
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

      <div className="mb-4">
        <input
          type="search"
          placeholder="Rechercher par nom, téléphone, email, n° de carte…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {([
          ['tous', 'Tous'],
          ['standard', 'Standard'],
          ['advanced', 'Advanced'],
          ['expiree', 'Expirées'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setCarteFiltre(id); setCurrentPage(1) }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold',
              carteFiltre === id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <ClientsSkeleton />
      ) : clients.length === 0 ? (
        <Card padding="lg" className="text-center py-14">
          <UserCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun client</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || carteFiltre !== 'tous' ? 'Modifiez la recherche ou le filtre.' : 'Ajoutez vos clients pour les retrouver rapidement.'}
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
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{c.nom}</h3>
                    <CarteBadge carte={c.carteVip} />
                  </div>
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
            <div className="mt-6 flex items-center justify-between gap-3 pr-24">
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
        maxWidth="md"
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
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-950">Carte VIP</p>
                <p className="text-xs text-gray-500">Accès et validité du client</p>
              </div>
              <button
                type="button"
                onClick={() => (carteOn ? setCarteOn(false) : void enableCarte())}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition',
                  carteOn ? 'bg-gray-950' : 'bg-gray-200'
                )}
                aria-pressed={carteOn}
              >
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition', carteOn ? 'left-5' : 'left-0.5')} />
              </button>
            </div>
            {carteOn ? (
              <div className="space-y-4 p-4">
                <CartePreview nom={form.nom || 'Nom du client'} carte={carte} />
                <Input
                  label="N° de carte"
                  value={carte.numero}
                  onChange={e => setCarte(prev => ({ ...prev, numero: e.target.value }))}
                  placeholder="VIP-0001"
                />
                <div>
                  <p className="mb-1.5 text-sm font-medium text-gray-700">Accès</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['standard', 'advanced'] as CarteVipAcces[]).map(acces => (
                      <button
                        key={acces}
                        type="button"
                        onClick={() => setCarte(prev => ({ ...prev, acces }))}
                        className={cn(
                          'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                          carte.acces === acces
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        {acces === 'advanced' ? 'Advanced' : 'Standard'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Début" type="date" value={carte.debut} onChange={e => setCarte(prev => ({ ...prev, debut: e.target.value }))} />
                  <Input label="Fin" type="date" value={carte.fin} onChange={e => setCarte(prev => ({ ...prev, fin: e.target.value }))} />
                </div>
              </div>
            ) : null}
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

function CarteBadge({ carte }: { carte?: CarteVip | null }) {
  const etat = carteEtat(carte)
  if (etat === 'none' || !carte) return null
  const label = etat === 'expiree' ? 'VIP expirée' : etat === 'avenir' ? 'VIP à venir' : etat === 'advanced' ? 'VIP Advanced' : 'VIP Standard'
  const tone =
    etat === 'expiree'
      ? 'bg-gray-100 text-gray-500 ring-gray-200'
      : etat === 'advanced'
        ? 'bg-amber-50 text-amber-800 ring-amber-200'
        : etat === 'avenir'
          ? 'bg-sky-50 text-sky-800 ring-sky-200'
          : 'bg-gray-950 text-white ring-gray-950'
  return <span className={cn('mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', tone)}>{label}</span>
}

function CartePreview({ nom, carte }: { nom: string; carte: CarteVip }) {
  const advanced = carte.acces === 'advanced'
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.06]">
      <div className="relative px-5 pb-5 pt-4">
        <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-orange-100" />
        <div className="relative flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold tracking-[0.2em] text-orange-600">EL MECANO</p>
          <span className={cn(
            'rounded-md px-2 py-1 text-[11px] font-bold',
            advanced ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
          )}>
            {advanced ? 'ADVANCED' : 'STANDARD'}
          </span>
        </div>
        <p className="relative mt-6 text-[11px] font-medium uppercase tracking-wide text-gray-400">Titulaire</p>
        <p className="relative text-[22px] font-semibold leading-tight tracking-tight text-gray-950">{nom}</p>
        <p className="relative mt-3 inline-flex rounded-lg bg-gray-50 px-2.5 py-1 font-mono text-sm tracking-[0.16em] text-gray-700 ring-1 ring-gray-200">
          {carte.numero || 'VIP-····'}
        </p>
      </div>
      <div className="grid grid-cols-2 border-t border-gray-100 bg-gray-50">
        <div className="px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Valable du</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatFr(carte.debut)}</p>
        </div>
        <div className="border-l border-gray-200 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Jusqu'au</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{carte.fin ? formatFr(carte.fin) : '—'}</p>
        </div>
      </div>
    </div>
  )
}
