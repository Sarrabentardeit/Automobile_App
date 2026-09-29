import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useNotesPersonnelles } from '@/contexts/NotesPersonnellesContext'
import { useToast } from '@/contexts/ToastContext'
import type { NoteCouleur, NotePersonnelle } from '@/types'
import { NOTE_COULEURS } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  CheckCircle2,
  Circle,
  Bell,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NoteFilter = 'all' | 'overdue' | 'today' | 'upcoming' | 'none' | 'done'
type RappelKind = 'overdue' | 'today' | 'upcoming' | 'none'

function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalValue(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function rappelKind(iso: string | null): RappelKind {
  if (!iso) return 'none'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'none'
  const now = Date.now()
  if (t < now) return 'overdue'
  if (t <= endOfDay().getTime()) return 'today'
  return 'upcoming'
}

/** Libellé pro du rappel (relatif + clair). */
function formatRappelSmart(iso: string | null): { label: string; kind: RappelKind } | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const kind = rappelKind(iso)
  const now = Date.now()
  const diffMs = d.getTime() - now
  const absMin = Math.round(Math.abs(diffMs) / 60_000)
  const hhmm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  if (kind === 'overdue') {
    if (absMin < 60) return { kind, label: `En retard · il y a ${Math.max(1, absMin)} min` }
    if (absMin < 60 * 24) {
      const h = Math.floor(absMin / 60)
      return { kind, label: `En retard · il y a ${h} h` }
    }
    const days = Math.floor(absMin / (60 * 24))
    if (days === 1) return { kind, label: 'En retard · hier' }
    return { kind, label: `En retard · il y a ${days} j` }
  }

  if (kind === 'today') {
    if (diffMs < 60 * 60_000) {
      const m = Math.max(1, Math.round(diffMs / 60_000))
      return { kind, label: `Dans ${m} min · ${hhmm}` }
    }
    return { kind, label: `Aujourd'hui · ${hhmm}` }
  }

  const tomorrow = startOfDay()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = startOfDay()
  dayAfter.setDate(dayAfter.getDate() + 2)
  if (d >= tomorrow && d < dayAfter) {
    return { kind, label: `Demain · ${hhmm}` }
  }

  const dateLabel = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  return { kind, label: `${dateLabel} · ${hhmm}` }
}

function couleurHex(c?: string): string | null {
  if (!c) return null
  return NOTE_COULEURS.find(x => x.value === c)?.hex ?? null
}

function cleanCategorie(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 60)
}

function uniqueCategories(list: NotePersonnelle[]): string[] {
  const map = new Map<string, string>()
  for (const n of list) {
    const raw = cleanCategorie(n.categorie || '')
    if (!raw) continue
    const key = raw.toLocaleLowerCase('fr')
    if (!map.has(key)) map.set(key, raw)
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

function resolveCategorie(raw: string, existing: string[]): string {
  const clean = cleanCategorie(raw)
  if (!clean) return ''
  const hit = existing.find(c => c.toLocaleLowerCase('fr') === clean.toLocaleLowerCase('fr'))
  return hit ?? clean
}

function groupNotes(list: NotePersonnelle[]): { key: string; label: string; notes: NotePersonnelle[] }[] {
  const buckets = new Map<string, { label: string; notes: NotePersonnelle[] }>()
  for (const n of list) {
    const label = cleanCategorie(n.categorie || '')
    const key = label ? label.toLocaleLowerCase('fr') : '__none__'
    const bucket = buckets.get(key) ?? { label: label || 'Sans catégorie', notes: [] }
    bucket.notes.push(n)
    buckets.set(key, bucket)
  }
  return [...buckets.entries()]
    .sort((a, b) => {
      if (a[0] === '__none__') return 1
      if (b[0] === '__none__') return -1
      return a[1].label.localeCompare(b[1].label, 'fr')
    })
    .map(([key, value]) => ({ key, label: value.label, notes: value.notes }))
}

function sortNotesSmart(list: NotePersonnelle[]): NotePersonnelle[] {
  const rank = (n: NotePersonnelle) => {
    if (n.epinglee) return 0
    const k = rappelKind(n.rappelAt)
    if (k === 'overdue') return 1
    if (k === 'today') return 2
    if (k === 'upcoming') return 3
    return 4
  }
  return [...list].sort((a, b) => {
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    const ta = a.rappelAt ? new Date(a.rappelAt).getTime() : 0
    const tb = b.rappelAt ? new Date(b.rappelAt).getTime() : 0
    if (ra <= 3 && ta !== tb) {
      // overdue/today/upcoming : plus urgent d'abord
      if (ra === 1) return ta - tb // plus ancien retard d'abord
      return ta - tb // bientôt d'abord
    }
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

type FormState = {
  titre: string
  contenu: string
  categorie: string
  rappelLocal: string
  couleur: NoteCouleur
  epinglee: boolean
}

const emptyForm = (): FormState => ({
  titre: '',
  contenu: '',
  categorie: '',
  rappelLocal: '',
  couleur: '',
  epinglee: false,
})

export default function NotesPersonnellesPage() {
  const { user } = useAuth()
  const { notes, loading, addNote, updateNote, removeNote } = useNotesPersonnelles()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [categorieFilter, setCategorieFilter] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [catOpen, setCatOpen] = useState(false)

  // Ouverture depuis notification ?note=
  useEffect(() => {
    const raw = searchParams.get('note')
    if (!raw || loading) return
    const id = Number(raw)
    if (!Number.isInteger(id)) return
    const n = notes.find(x => x.id === id)
    if (!n) return
    setForm({
      titre: n.titre,
      contenu: n.contenu,
      categorie: n.categorie || '',
      rappelLocal: toDatetimeLocalValue(n.rappelAt),
      couleur: (n.couleur as NoteCouleur) || '',
      epinglee: n.epinglee,
    })
    setEditingId(n.id)
    setShowAdd(false)
    setFilter('all')
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('note')
      return next
    }, { replace: true })
  }, [searchParams, notes, loading, setSearchParams])

  const counts = useMemo(() => {
    const active = notes.filter(n => !n.faite)
    return {
      all: active.length,
      overdue: active.filter(n => rappelKind(n.rappelAt) === 'overdue').length,
      today: active.filter(n => rappelKind(n.rappelAt) === 'today').length,
      upcoming: active.filter(n => rappelKind(n.rappelAt) === 'upcoming').length,
      none: active.filter(n => rappelKind(n.rappelAt) === 'none').length,
      done: notes.filter(n => n.faite).length,
    }
  }, [notes])

  const baseList = useMemo(() => {
    let list = notes
    if (filter === 'done') list = list.filter(n => n.faite)
    else {
      list = list.filter(n => !n.faite)
      if (filter === 'overdue') list = list.filter(n => rappelKind(n.rappelAt) === 'overdue')
      if (filter === 'today') list = list.filter(n => rappelKind(n.rappelAt) === 'today')
      if (filter === 'upcoming') list = list.filter(n => rappelKind(n.rappelAt) === 'upcoming')
      if (filter === 'none') list = list.filter(n => rappelKind(n.rappelAt) === 'none')
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        n =>
          n.titre.toLowerCase().includes(q) ||
          n.contenu.toLowerCase().includes(q) ||
          (n.categorie || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [notes, search, filter])

  const filtered = useMemo(() => {
    let list = baseList
    if (categorieFilter === '__none__') {
      list = list.filter(n => !cleanCategorie(n.categorie || ''))
    } else if (categorieFilter) {
      list = list.filter(
        n => cleanCategorie(n.categorie || '').toLocaleLowerCase('fr') === categorieFilter
      )
    }
    return filter === 'done'
      ? [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : sortNotesSmart(list)
  }, [baseList, categorieFilter, filter])

  const openNew = () => {
    setForm(emptyForm())
    setEditingId(null)
    setShowAdd(true)
  }

  const openEdit = (n: NotePersonnelle) => {
    setForm({
      titre: n.titre,
      contenu: n.contenu,
      categorie: n.categorie || '',
      rappelLocal: toDatetimeLocalValue(n.rappelAt),
      couleur: (n.couleur as NoteCouleur) || '',
      epinglee: n.epinglee,
    })
    setEditingId(n.id)
    setShowAdd(false)
  }

  const closeForm = () => {
    setShowAdd(false)
    setEditingId(null)
    setForm(emptyForm())
    setCatOpen(false)
  }

  const categories = useMemo(() => uniqueCategories(notes), [notes])
  const categoryChips = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    let none = 0
    for (const n of baseList) {
      const label = cleanCategorie(n.categorie || '')
      if (!label) {
        none += 1
        continue
      }
      const key = label.toLocaleLowerCase('fr')
      const prev = counts.get(key)
      counts.set(key, { label: prev?.label ?? label, count: (prev?.count ?? 0) + 1 })
    }
    return {
      none,
      items: [...counts.entries()]
        .map(([key, value]) => ({ key, ...value }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    }
  }, [baseList])
  const categorieSuggestions = useMemo(() => {
    const q = cleanCategorie(form.categorie).toLocaleLowerCase('fr')
    if (!q) return categories
    return categories.filter(c => c.toLocaleLowerCase('fr').includes(q))
  }, [categories, form.categorie])
  const grouped = useMemo(() => groupNotes(filtered), [filtered])

  const save = async () => {
    if (!form.titre.trim() && !form.contenu.trim()) {
      toast.error('Ajoutez un titre ou un contenu')
      return
    }
    setSaving(true)
    try {
      const payload = {
        titre: form.titre.trim(),
        contenu: form.contenu.trim(),
        categorie: resolveCategorie(form.categorie, categories),
        rappelAt: fromDatetimeLocalValue(form.rappelLocal),
        couleur: form.couleur,
        epinglee: form.epinglee,
      }
      if (editingId) {
        await updateNote(editingId, payload)
        toast.success('Note modifiée')
      } else {
        await addNote(payload)
        toast.success('Note ajoutée')
      }
      closeForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement")
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (n: NotePersonnelle) => {
    try {
      await updateNote(n.id, { epinglee: !n.epinglee })
    } catch {
      toast.error("Impossible de modifier l'épingle")
    }
  }

  const toggleDone = async (n: NotePersonnelle) => {
    try {
      await updateNote(n.id, { faite: !n.faite })
      toast.success(n.faite ? 'Note réouverte' : 'Note marquée comme faite')
    } catch {
      toast.error('Impossible de mettre à jour')
    }
  }

  const confirmDelete = async () => {
    if (deleteId == null) return
    const ok = await removeNote(deleteId)
    if (ok) {
      toast.success('Note supprimée')
      setDeleteId(null)
    } else {
      toast.error('Erreur lors de la suppression')
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-12 flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-medium">Chargement des notes...</p>
      </div>
    )
  }

  const formOpen = showAdd || editingId != null
  const filterChips: {
    id: NoteFilter
    label: string
    count: number
    tone?: 'default' | 'danger' | 'sky' | 'emerald'
  }[] = [
    { id: 'all', label: 'Toutes', count: counts.all },
    { id: 'overdue', label: 'En retard', count: counts.overdue, tone: 'danger' },
    { id: 'today', label: "Aujourd'hui", count: counts.today, tone: 'sky' },
    { id: 'upcoming', label: 'À venir', count: counts.upcoming },
    { id: 'none', label: 'Sans rappel', count: counts.none },
    { id: 'done', label: 'Faites', count: counts.done, tone: 'emerald' },
  ]

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/25">
              <StickyNote className="w-5 h-5" />
            </span>
            Mes notes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Notes privées — visibles uniquement par vous</p>
        </div>
        <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
          Nouvelle note
        </Button>
      </header>

      <div className="rounded-2xl border border-black/[0.06] bg-white p-3 sm:p-4 mb-6 space-y-3">
        <input
          type="search"
          placeholder="Rechercher une note…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
        />
        <div className="flex gap-1.5 overflow-x-auto">
          {filterChips.map(chip => {
            const active = filter === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilter(chip.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
                  active
                    ? chip.tone === 'danger'
                      ? 'bg-red-600 text-white border-red-600'
                      : chip.tone === 'sky'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : chip.tone === 'emerald'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-gray-900 text-white border-gray-900'
                    : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                )}
              >
                {chip.label}
                <span className={cn('ml-1 tabular-nums', active ? 'opacity-80' : 'text-gray-400')}>
                  {chip.count}
                </span>
              </button>
            )
          })}
        </div>
        {categoryChips.items.length > 0 ? (
          <div className="flex items-center gap-2 pt-2 border-t border-black/[0.04]">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide shrink-0 hidden sm:inline">
              Catégories
            </span>
            <div className="flex gap-1.5 overflow-x-auto min-w-0">
              <button
                type="button"
                onClick={() => setCategorieFilter(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
                  categorieFilter == null
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                )}
              >
                Toutes
              </button>
              {categoryChips.items.map(chip => {
                const active = categorieFilter === chip.key
                return (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setCategorieFilter(active ? null : chip.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
                      active
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                    )}
                  >
                    {chip.label}
                    <span className={cn('ml-1 tabular-nums', active ? 'opacity-80' : 'text-gray-400')}>
                      {chip.count}
                    </span>
                  </button>
                )
              })}
              {categoryChips.none > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setCategorieFilter(categorieFilter === '__none__' ? null : '__none__')
                  }
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
                    categorieFilter === '__none__'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                  )}
                >
                  Sans catégorie
                  <span
                    className={cn(
                      'ml-1 tabular-nums',
                      categorieFilter === '__none__' ? 'opacity-80' : 'text-gray-400'
                    )}
                  >
                    {categoryChips.none}
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg" className="text-center py-14">
          <StickyNote className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune note</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || filter !== 'all' || categorieFilter
              ? 'Modifiez les filtres.'
              : 'Ajoutez une note personnelle.'}
          </p>
          {!search && filter === 'all' && !categorieFilter && (
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Nouvelle note
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => {
            const hideTitle = grouped.length === 1 && group.key === '__none__'
            return (
            <section key={group.key}>
              {hideTitle ? null : (
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-medium text-gray-800">{group.label}</h2>
                  <span className="text-[11px] text-gray-400 tabular-nums">{group.notes.length}</span>
                  <span className="h-px flex-1 bg-black/[0.06]" />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.notes.map(n => {
            const rappel = formatRappelSmart(n.rappelAt)
            const color = couleurHex(n.couleur)
            return (
              <Card
                key={n.id}
                padding="lg"
                className={cn(
                  'border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all flex flex-col relative overflow-hidden',
                  n.epinglee && 'ring-1 ring-amber-300/60',
                  n.faite && 'opacity-75'
                )}
              >
                {color && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ backgroundColor: color }}
                  />
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className={cn(
                      'font-semibold text-gray-900 line-clamp-2',
                      n.faite && 'line-through text-gray-500'
                    )}
                  >
                    {n.titre || 'Sans titre'}
                  </h3>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePin(n)}
                      className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                    >
                      {n.epinglee ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(n)}
                      className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(n.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {n.contenu ? (
                  <p
                    className={cn(
                      'text-sm text-gray-600 whitespace-pre-wrap line-clamp-4 flex-1',
                      n.faite && 'line-through text-gray-400'
                    )}
                  >
                    {n.contenu}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic flex-1">Pas de détail</p>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    {rappel ? (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md max-w-full',
                          rappel.kind === 'overdue' && 'bg-red-100 text-red-700',
                          rappel.kind === 'today' && 'bg-sky-100 text-sky-800',
                          rappel.kind === 'upcoming' && 'bg-violet-100 text-violet-800'
                        )}
                      >
                        {rappel.kind === 'overdue' ? (
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                        ) : rappel.kind === 'today' ? (
                          <Bell className="w-3 h-3 shrink-0" />
                        ) : (
                          <CalendarDays className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">{rappel.label}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {new Date(n.updatedAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDone(n)}
                    className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors shrink-0',
                      n.faite
                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        : 'text-gray-600 bg-gray-50 hover:bg-gray-100'
                    )}
                  >
                    {n.faite ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Faite
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" /> À faire
                      </>
                    )}
                  </button>
                </div>
              </Card>
            )
                })}
              </div>
            </section>
            )
          })}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingId ? 'Modifier la note' : 'Nouvelle note'}
      >
        <div className="space-y-4">
          <Input
            label="Titre"
            value={form.titre}
            onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
            placeholder="Ex. Rappeler le client"
          />
          <Textarea
            label="Contenu"
            rows={4}
            value={form.contenu}
            onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
            placeholder="Détails…"
            className="min-h-[5rem] sm:min-h-0"
          />

          <div className="relative">
            <Input
              label="Catégorie"
              value={form.categorie}
              onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              onFocus={() => setCatOpen(true)}
              onBlur={() => window.setTimeout(() => setCatOpen(false), 120)}
              placeholder="Ex. Atelier, Client, Fournisseur…"
              autoComplete="off"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Choisissez une catégorie existante ou saisissez-en une nouvelle.
            </p>
            {catOpen && (categorieSuggestions.length > 0 || cleanCategorie(form.categorie)) ? (
              <ul className="absolute z-20 left-0 right-0 top-[4.6rem] max-h-44 overflow-y-auto rounded-xl border border-black/[0.08] bg-white shadow-lg py-1">
                {categorieSuggestions.map(c => (
                  <li key={c}>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setForm(f => ({ ...f, categorie: c }))
                        setCatOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {c}
                    </button>
                  </li>
                ))}
                {cleanCategorie(form.categorie) &&
                !categories.some(
                  c =>
                    c.toLocaleLowerCase('fr') ===
                    cleanCategorie(form.categorie).toLocaleLowerCase('fr')
                ) ? (
                  <li>
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setCatOpen(false)}
                      className="w-full text-left px-3 py-2 text-sm text-orange-700 hover:bg-orange-50"
                    >
                      Utiliser « {cleanCategorie(form.categorie)} »
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>

          <div>
            <Input
              label="Rappel (optionnel)"
              type="datetime-local"
              value={form.rappelLocal}
              onChange={e => setForm(f => ({ ...f, rappelLocal: e.target.value }))}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Couleur</p>
            <div className="flex flex-wrap gap-2">
              {NOTE_COULEURS.map(c => (
                <button
                  key={c.value || 'none'}
                  type="button"
                  title={c.label}
                  onClick={() => setForm(f => ({ ...f, couleur: c.value }))}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-transform',
                    form.couleur === c.value ? 'scale-110 border-gray-800' : 'border-transparent'
                  )}
                  style={{
                    backgroundColor: c.value ? c.hex : '#fff',
                    boxShadow: c.value ? undefined : 'inset 0 0 0 1px #d1d5db',
                  }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.epinglee}
              onChange={e => setForm(f => ({ ...f, epinglee: e.target.checked }))}
              className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
            Épingler en haut
          </label>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 pb-1 sticky bottom-0 bg-white">
            <Button variant="outline" onClick={closeForm} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteId != null} onClose={() => setDeleteId(null)} title="Supprimer la note">
        <p className="text-sm text-gray-600 mb-6">Supprimer définitivement cette note ?</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Annuler
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
