import { useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useUsers } from '@/contexts/UsersContext'
import type { Reclamation, ReclamationStatut, ReclamationType } from '@/types'
import { RECLAMATION_STATUTS, RECLAMATION_STATUT_LABELS, RECLAMATION_TYPE_LABELS } from '@/types'
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
  const { users } = useUsers()
  const { reclamations, loading, addReclamation, updateReclamation } = useReclamations()
  const toast = useToast()
  const [filterStatut, setFilterStatut] = useState<ReclamationStatut | 'toutes'>('toutes')
  const [filterType, setFilterType] = useState<ReclamationType | 'toutes'>('toutes')
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
    type: 'externe',
    assigneA: '',
    priorite: 'normale',
    techniciens: [],
  })

  const assignableUserNames = useMemo(
    () => users.filter(u => u.statut === 'actif').map(u => u.nom_complet),
    [users]
  )

  const filtered = useMemo(() => {
    let list = reclamations
    if (filterStatut !== 'toutes') list = list.filter(r => r.statut === filterStatut)
    if (filterType !== 'toutes') list = list.filter(r => (r.type || 'externe') === filterType)
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
  }, [reclamations, filterStatut, filterType, search])

  const selected = useMemo(() => (selectedId ? reclamations.find(r => r.id === selectedId) : null), [reclamations, selectedId])

  const stats = useMemo(() => {
    const scoped =
      filterType === 'toutes'
        ? reclamations
        : reclamations.filter(r => (r.type || 'externe') === filterType)
    return {
      total: reclamations.length,
      externes: reclamations.filter(r => (r.type || 'externe') === 'externe').length,
      internes: reclamations.filter(r => r.type === 'interne').length,
      scopedTotal: scoped.length,
      ouvertes: scoped.filter(r => r.statut === 'ouverte').length,
      enCours: scoped.filter(r => r.statut === 'en_cours').length,
      traitees: scoped.filter(r => r.statut === 'traitee').length,
      cloturees: scoped.filter(r => r.statut === 'cloturee').length,
    }
  }, [reclamations, filterType])

  const groups = useMemo(() => {
    if (filterType !== 'toutes') {
      return [{ key: filterType, label: RECLAMATION_TYPE_LABELS[filterType], items: filtered }]
    }
    return (['externe', 'interne'] as const)
      .map(key => ({
        key,
        label: RECLAMATION_TYPE_LABELS[key],
        items: filtered.filter(r => (r.type || 'externe') === key),
      }))
      .filter(g => g.items.length > 0)
  }, [filtered, filterType])

  const openNew = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      clientName: '',
      clientTelephone: '',
      vehicleRef: '',
      sujet: '',
      description: '',
      statut: 'ouverte',
      type: 'externe',
      assigneA: '',
      priorite: 'normale',
      techniciens: [],
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
      type: r.type || 'externe',
      assigneA: r.assigneA ?? '',
      priorite: r.priorite ?? 'normale',
      techniciens: r.techniciens ?? [],
    })
    setSelectedId(r.id)
    setShowForm(true)
  }

  const save = async () => {
    if (!form.clientName.trim() || !form.date) return
    const payload = {
      ...form,
      clientTelephone: form.clientTelephone || undefined,
      assigneA: form.assigneA || undefined,
      techniciens: form.techniciens ?? [],
    }
    try {
      if (selectedId) {
        await updateReclamation(selectedId, payload)
        toast.success('Réclamation modifiée avec succès')
      } else {
        await addReclamation(payload)
        toast.success('Réclamation ajoutée avec succès')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-12">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white">
                <AlertCircle className="w-5 h-5" />
              </span>
              Réclamations
            </h1>
            <p className="text-sm text-gray-500 mt-1">Réclamations externes et internes</p>
          </div>
        </header>
        <div className="flex items-center justify-center py-16">
          <p className="text-gray-500 font-medium">Chargement des réclamations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white">
              <AlertCircle className="w-5 h-5" />
            </span>
            Réclamations
          </h1>
          <p className="text-sm text-gray-500 mt-1">Réclamations externes (clients) et internes (atelier)</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Nouvelle réclamation
        </Button>
      </header>

      <div className="grid grid-cols-3 rounded-2xl border border-black/[0.06] bg-white overflow-hidden mb-4">
        {(
          [
            { id: 'toutes' as const, label: 'Toutes', value: stats.total, hint: 'Réclamations' },
            { id: 'externe' as const, label: 'Externes', value: stats.externes, hint: 'Clients' },
            { id: 'interne' as const, label: 'Internes', value: stats.internes, hint: 'Atelier' },
          ]
        ).map(kpi => {
          const active = filterType === kpi.id
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setFilterType(kpi.id)}
              className={cn(
                'text-left px-4 sm:px-6 py-5 border-r border-black/[0.06] last:border-r-0 transition-colors',
                active ? 'bg-orange-50/70' : 'hover:bg-gray-50'
              )}
            >
              <p className={cn('text-xs font-medium', active ? 'text-orange-700' : 'text-gray-500')}>
                {kpi.label}
              </p>
              <p className="text-3xl sm:text-4xl font-semibold text-gray-950 tabular-nums tracking-tight mt-2 leading-none">
                {kpi.value}
              </p>
              <p className="text-[11px] text-gray-400 mt-2">{kpi.hint}</p>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-3 sm:p-4 mb-6 space-y-3">
        <input
          type="search"
          placeholder="Rechercher (client, véhicule, sujet…)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
        />
        <div className="flex gap-1.5 overflow-x-auto">
          {(['toutes', ...RECLAMATION_STATUTS] as const).map(s => {
            const active = filterStatut === s
            const count =
              s === 'toutes'
                ? stats.scopedTotal
                : s === 'ouverte'
                  ? stats.ouvertes
                  : s === 'en_cours'
                    ? stats.enCours
                    : s === 'traitee'
                      ? stats.traitees
                      : stats.cloturees
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatut(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
                  active
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                )}
              >
                {s === 'toutes' ? 'Tous les statuts' : RECLAMATION_STATUT_LABELS[s]}
                <span className={cn('ml-1 tabular-nums', active ? 'opacity-80' : 'text-gray-400')}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-14">
          <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune réclamation</p>
          <p className="text-sm text-gray-400 mt-1">
            {filterStatut !== 'toutes' || filterType !== 'toutes' || search
              ? 'Modifiez les filtres ou ajoutez une réclamation.'
              : 'Ajoutez une réclamation pour commencer.'}
          </p>
          {filterStatut === 'toutes' && filterType === 'toutes' && !search ? (
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Nouvelle réclamation
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.key}>
              {filterType === 'toutes' ? (
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-medium text-gray-800">{group.label}</h2>
                  <span className="text-[11px] text-gray-400 tabular-nums">{group.items.length}</span>
                  <span className="h-px flex-1 bg-black/[0.06]" />
                </div>
              ) : null}
              <ul className="space-y-3">
                {group.items.map(r => (
                  <li key={r.id}>
                    <Card
                      padding="none"
                      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openEdit(r)}
                    >
                      <div className="p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className={cn(
                                'inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium',
                                (r.type || 'externe') === 'interne'
                                  ? 'bg-violet-50 text-violet-700'
                                  : 'bg-sky-50 text-sky-700'
                              )}
                            >
                              {RECLAMATION_TYPE_LABELS[r.type || 'externe']}
                            </span>
                            <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border', STATUT_STYLES[r.statut])}>
                              {RECLAMATION_STATUT_LABELS[r.statut]}
                            </span>
                            {r.priorite && r.priorite !== 'normale' && (
                              <span className={cn('text-xs uppercase', PRIORITE_STYLES[r.priorite])}>{r.priorite}</span>
                            )}
                            <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                          </div>
                          <p className="font-semibold text-gray-900 truncate">{r.sujet || 'Sans sujet'}</p>
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
                          {r.description ? (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{r.description}</p>
                          ) : null}
                          {(r.assigneA || (r.techniciens && r.techniciens.length > 0)) && (
                            <p className="text-xs text-gray-400 mt-1.5">
                              {r.assigneA && <>Assigné à {r.assigneA}</>}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={selectedId ? 'Modifier la réclamation' : 'Nouvelle réclamation'}
        subtitle={form.date ? formatDate(form.date) : undefined}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(['externe', 'interne'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, type: t }))}
                  className={cn(
                    'h-10 rounded-xl border text-sm font-medium transition-colors',
                    form.type === t
                      ? t === 'interne'
                        ? 'bg-violet-50 border-violet-300 text-violet-800'
                        : 'bg-sky-50 border-sky-300 text-sky-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {RECLAMATION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              {form.type === 'interne'
                ? 'Réclamation interne : suivi atelier, sans lien obligatoire avec un client extérieur.'
                : 'Réclamation externe : signalée par un client.'}
            </p>
          </div>
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
                {assignableUserNames.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Autres assignés</label>
              <select
                multiple
                value={form.techniciens ?? []}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    techniciens: Array.from(e.target.selectedOptions).map(o => o.value),
                  }))
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[90px]"
              >
                {assignableUserNames.map(n => (
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
