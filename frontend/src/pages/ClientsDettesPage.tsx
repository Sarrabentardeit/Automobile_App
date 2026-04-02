import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClientsDettes } from '@/contexts/ClientsDettesContext'
import { useToast } from '@/contexts/ToastContext'
import type { ClientAvecDette } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { CreditCard, Plus, ChevronRight, Banknote } from 'lucide-react'

function formatMontant(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ClientsDettesPage() {
  const { user, permissions } = useAuth()
  const { clients, loading, addClient, updateClient } = useClientsDettes()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<Omit<ClientAvecDette, 'id'>>({
    clientName: '',
    telephoneClient: '',
    designation: '',
    reste: 0,
    notes: '',
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return clients.sort((a, b) => b.reste - a.reste)
    const q = search.toLowerCase()
    return clients
      .filter(
        c =>
          c.clientName.toLowerCase().includes(q) ||
          c.telephoneClient.toLowerCase().includes(q) ||
          c.designation.toLowerCase().includes(q)
      )
      .sort((a, b) => b.reste - a.reste)
  }, [clients, search])

  const totalDettes = useMemo(() => filtered.reduce((s, c) => s + c.reste, 0), [filtered])

  const openEdit = (c: ClientAvecDette) => {
    setForm({
      clientName: c.clientName,
      telephoneClient: c.telephoneClient,
      designation: c.designation,
      reste: c.reste,
      notes: c.notes ?? '',
    })
    setEditingId(c.id)
  }

  const openNew = () => {
    setForm({
      clientName: '',
      telephoneClient: '',
      designation: '',
      reste: 0,
      notes: '',
    })
    setEditingId(null)
    setShowAdd(true)
  }

  const save = async () => {
    if (!form.clientName.trim()) return
    const payload = { ...form, notes: form.notes || undefined }
    try {
      if (editingId) {
        await updateClient(editingId, payload)
        toast.success('Client avec dette modifié avec succès')
        setEditingId(null)
      } else {
        await addClient(payload)
        toast.success('Client avec dette ajouté avec succès')
        setShowAdd(false)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  if (!user) return null

  if (!permissions?.canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <CreditCard className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès aux clients avec dettes.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500 text-white">
                <CreditCard className="w-5 h-5" />
              </span>
              Clients avec Dettes
            </h1>
            <p className="text-sm text-gray-500 mt-1">Suivi des créances clients</p>
          </div>
        </header>
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-500 font-medium">Chargement des clients avec dettes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500 text-white">
              <CreditCard className="w-5 h-5" />
            </span>
            Clients avec Dettes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des créances clients</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Ajouter
        </Button>
      </header>

      <Card padding="lg" className="mb-8 bg-gradient-to-br from-rose-50 to-orange-50 border-rose-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
            <Banknote className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-rose-700/80">Total des dettes (Reste)</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatMontant(totalDettes)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <input
          type="search"
          placeholder="Rechercher (nom, téléphone, désignation…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm"
        />

        {filtered.length === 0 ? (
          <Card padding="lg" className="text-center py-14">
            <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun client avec dette</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'Modifiez la recherche.' : 'Ajoutez un client pour suivre sa dette.'}
            </p>
            {!search && (
              <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
                Ajouter
              </Button>
            )}
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-orange-100 border-b border-orange-200">
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Nom du client</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Téléphone client</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Désignation</th>
                    <th className="px-4 py-3 text-right font-bold text-gray-900">Reste</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-900">Notes</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => openEdit(c)}
                      className="border-b border-gray-100 hover:bg-cyan-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{c.clientName}</td>
                      <td className="px-4 py-3 text-gray-700">{c.telephoneClient}</td>
                      <td className="px-4 py-3 text-gray-700">{c.designation}</td>
                      <td className="px-4 py-3 text-right font-semibold text-rose-600 tabular-nums">{formatMontant(c.reste)}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{c.notes || '—'}</td>
                      <td className="px-2 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={showAdd || editingId !== null}
        onClose={() => { setShowAdd(false); setEditingId(null) }}
        title={editingId ? 'Modifier le client' : 'Nouveau client avec dette'}
        subtitle={editingId ? undefined : 'Enregistrer une créance'}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nom du client"
            value={form.clientName}
            onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
            placeholder="Ex. ACHREF, ZIED"
          />
          <Input
            label="Téléphone client"
            value={form.telephoneClient}
            onChange={e => setForm(prev => ({ ...prev, telephoneClient: e.target.value }))}
            placeholder="Ex. tél. ou véhicule (CLA250, BERLINGO)"
          />
          <Input
            label="Désignation"
            value={form.designation}
            onChange={e => setForm(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="Ex. PIECES, MO, RESTE PIECES ET MO"
          />
          <Input
            label="Reste"
            type="number"
            min={0}
            step={0.01}
            value={form.reste || ''}
            onChange={e => setForm(prev => ({ ...prev, reste: Number(e.target.value) || 0 }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optionnel"
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.clientName.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
