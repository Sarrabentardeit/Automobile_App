import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import type { Reclamation, ReclamationStatut } from '@/types'
import { RECLAMATION_STATUTS, RECLAMATION_STATUT_LABELS } from '@/types'
import { useReclamations } from '@/contexts/ReclamationsContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { AlertCircle, Plus, User, Car, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUT_STYLES: Record<ReclamationStatut, string> = {
  ouverte: 'bg-amber-100 text-amber-800 border-amber-200',
  en_cours: 'bg-blue-100 text-blue-800 border-blue-200',
  traitee: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cloturee: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PRIORITE_STYLES: Record<string, string> = {
  haute: 'text-red-600 font-semibold',
  normale: 'text-gray-700',
  basse: 'text-gray-500',
}

export default function ReclamationPage() {
  const { user } = useAuth()
  const { members } = useTeamMembers()
  const { reclamations, addReclamation, updateReclamation } = useReclamations()
  const toast = useToast()
  const [filterStatut, setFilterStatut] = useState<ReclamationStatut | 'toutes'>('toutes')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<Reclamation, 'id'>>({
    date: '',
    clientName: '',
    clientTelephone: '',
    vehicleRef: '',
    sujet: '',
    description: '',
    statut: 'ouverte',
    assigneA: '',
    priorite: 'normale',
  })

  const memberNames = useMemo(() => members.map(m => m.name), [members])

  const filtered = useMemo(() => {
    let list = reclamations
    if (filterStatut !== 'toutes') list = list.filter(r => r.statut === filterStatut)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        r =>
          r.clientName.toLowerCase().includes(q) ||
          r.vehicleRef.toLowerCase().includes(q) ||
          r.sujet.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [reclamations, filterStatut, search])

  const selected = useMemo(() => (selectedId ? reclamations.find(r => r.id === selectedId) : null), [reclamations, selectedId])

  const openNew = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      clientName: '',
      clientTelephone: '',
      vehicleRef: '',
      sujet: '',
      description: '',
      statut: 'ouverte',
      assigneA: '',
      priorite: 'normale',
    })
    setSelectedId(null)
    setShowForm(true)
  }

  const openEdit = (r: Reclamation) => {
    setForm({
      date: r.date,
      clientName: r.clientName,
      clientTelephone: r.clientTelephone ?? '',
      vehicleRef: r.vehicleRef,
      sujet: r.sujet,
      description: r.description,
      statut: r.statut,
      assigneA: r.assigneA ?? '',
      priorite: r.priorite ?? 'normale',
    })
    setSelectedId(r.id)
    setShowForm(true)
  }

  const save = () => {
    if (!form.clientName.trim() || !form.date) return
    const payload = { ...form, clientTelephone: form.clientTelephone || undefined, assigneA: form.assigneA || undefined }
    if (selectedId) {
      updateReclamation(selectedId, payload)
      toast.success('Réclamation modifiée avec succès')
    } else {
      addReclamation(payload)
      toast.success('Réclamation ajoutée avec succès')
    }
    setShowForm(false)
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white">
              <AlertCircle className="w-5 h-5" />
            </span>
            Réclamations
          </h1>
          <p className="text-sm text-gray-500 mt-1">Suivi des réclamations clients</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Nouvelle réclamation
        </Button>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            placeholder="Rechercher (client, véhicule, sujet…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
          />
          <div className="inline-flex p-1 rounded-xl bg-gray-100">
            {(['toutes', ...RECLAMATION_STATUTS] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatut(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  filterStatut === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {s === 'toutes' ? 'Toutes' : RECLAMATION_STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card padding="lg" className="text-center py-14">
            <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucune réclamation</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterStatut !== 'toutes' || search ? 'Modifiez les filtres ou ajoutez une réclamation.' : 'Ajoutez une réclamation pour commencer.'}
            </p>
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Nouvelle réclamation
            </Button>
          </Card>
        ) : (
          <ul className="space-y-3">
            {filtered.map(r => (
              <li key={r.id}>
                <Card
                  padding="none"
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openEdit(r)}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border', STATUT_STYLES[r.statut])}>
                          {RECLAMATION_STATUT_LABELS[r.statut]}
                        </span>
                        {r.priorite && r.priorite !== 'normale' && (
                          <span className={cn('text-xs uppercase', PRIORITE_STYLES[r.priorite])}>{r.priorite}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                      </div>
                      <p className="font-semibold text-gray-900 truncate">{r.sujet}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {r.clientName}
                        {r.vehicleRef && (
                          <>
                            <span className="text-gray-300">·</span>
                            <Car className="w-3.5 h-3.5 text-gray-400" />
                            {r.vehicleRef}
                          </>
                        )}
                      </p>
                      {r.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                      )}
                      {r.assigneA && (
                        <p className="text-xs text-gray-400 mt-1.5">Assigné à {r.assigneA}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={selectedId ? 'Modifier la réclamation' : 'Nouvelle réclamation'}
        subtitle={form.date ? formatDate(form.date) : undefined}
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} />
          <Input label="Client" value={form.clientName} onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))} placeholder="Nom du client" />
          <Input label="Téléphone" type="tel" value={form.clientTelephone} onChange={e => setForm(prev => ({ ...prev, clientTelephone: e.target.value }))} placeholder="Optionnel" />
          <Input label="Véhicule (immat ou modèle)" value={form.vehicleRef} onChange={e => setForm(prev => ({ ...prev, vehicleRef: e.target.value }))} placeholder="Ex. SEAT IBIZA 127 TU 2987" />
          <Input label="Sujet" value={form.sujet} onChange={e => setForm(prev => ({ ...prev, sujet: e.target.value }))} placeholder="Ex. Bruit frein arrière" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Détails de la réclamation…"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={form.statut}
                onChange={e => setForm(prev => ({ ...prev, statut: e.target.value as ReclamationStatut }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {RECLAMATION_STATUTS.map(s => (
                  <option key={s} value={s}>{RECLAMATION_STATUT_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigné à</label>
              <select
                value={form.assigneA}
                onChange={e => setForm(prev => ({ ...prev, assigneA: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">— Non assigné —</option>
                {memberNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
            <select
              value={form.priorite}
              onChange={e => setForm(prev => ({ ...prev, priorite: e.target.value as Reclamation['priorite'] }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="basse">Basse</option>
              <option value="normale">Normale</option>
              <option value="haute">Haute</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.clientName.trim() || !form.date}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
