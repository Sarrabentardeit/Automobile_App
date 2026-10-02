import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CalendarDays, Check, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { apiFetch } from '@/lib/api'
import { daysSince, cn, formatDate, parseDateOnly, parseVehiculeAssigneesFromText, resolveVehiculeAssigneeIds } from '@/lib/utils'
import EtatBadge from '@/components/vehicules/EtatBadge'
import UserAvatar from '@/components/ui/UserAvatar'
import { ETAT_CONFIG, type EtatVehicule } from '@/types'

interface ReunionRow {
  id: number
  modele: string
  immatriculation: string
  etat_actuel: EtatVehicule
  defaut: string
  notes: string
  date_entree: string
  date_sortie: string | null
  technicien_id: number | null
  responsable_id: number | null
  note: string
}

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoFromDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDate(iso: string, delta: number) {
  const d = parseDateOnly(iso)
  d.setDate(d.getDate() + delta)
  const next = isoFromDate(d)
  const max = today()
  return next > max ? max : next
}

function stayDays(row: Pick<ReunionRow, 'date_entree' | 'date_sortie' | 'etat_actuel'>) {
  if (row.etat_actuel === 'vert' && row.date_sortie) {
    const start = parseDateOnly(row.date_entree).getTime()
    const end = parseDateOnly(row.date_sortie).getTime()
    return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)))
  }
  return daysSince(row.date_entree)
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return (name.trim().slice(0, 2) || '?').toUpperCase()
}

const ETATS_FILTRE: EtatVehicule[] = [
  'orange',
  'mauve',
  'sous_traitance',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'retour',
]

export default function ReunionPage() {
  const { getAccessToken, permissions } = useAuth()
  const { users } = useUsers()
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState<ReunionRow[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [savedFlash, setSavedFlash] = useState<number | null>(null)
  const [filtreEtat, setFiltreEtat] = useState<EtatVehicule | 'tous'>('tous')

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    setLoading(true)
    void apiFetch<{ date: string; rows: ReunionRow[] }>('/reunions', { token, params: { date } })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.rows) ? data.rows : []
        const next = Object.fromEntries(list.map((row) => [row.id, row.note || '']))
        setRows(list)
        setNotes(next)
        setSaved(next)
      })
      .catch(() => {
        if (!cancelled) {
          setRows([])
          setNotes({})
          setSaved({})
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, getAccessToken])

  const ordered = useMemo(
    () => [...rows].sort((a, b) => stayDays(b) - stayDays(a) || a.id - b.id),
    [rows]
  )
  const counts = useMemo(() => {
    const map = Object.fromEntries(ETATS_FILTRE.map((etat) => [etat, 0])) as Record<EtatVehicule, number>
    for (const row of ordered) {
      if (row.etat_actuel in map) map[row.etat_actuel] += 1
    }
    return map
  }, [ordered])
  const visible = filtreEtat === 'tous' ? ordered : ordered.filter((row) => row.etat_actuel === filtreEtat)
  const inShop = ordered.length
  const longest = ordered[0] ? stayDays(ordered[0]) : null
  const isToday = date === today()

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const peopleOf = (row: ReunionRow) => {
    const assignees = resolveVehiculeAssigneeIds(row)
    const ids = assignees.technicien_ids.length ? assignees.technicien_ids : assignees.responsable_ids
    return ids
      .map((id) => users.find((user) => user.id === id)?.nom_complet)
      .filter((name): name is string => Boolean(name))
  }

  const saveNote = async (vehiculeId: number, note: string) => {
    if ((saved[vehiculeId] ?? '') === note) return
    const token = getAccessToken()
    if (!token) return
    setSavingId(vehiculeId)
    try {
      await apiFetch('/reunions', {
        method: 'PUT',
        token,
        body: JSON.stringify({ date, vehiculeId, note }),
      })
      setSaved((prev) => ({ ...prev, [vehiculeId]: note }))
      setSavedFlash(vehiculeId)
      window.setTimeout(() => setSavedFlash((current) => (current === vehiculeId ? null : current)), 1400)
    } finally {
      setSavingId((current) => (current === vehiculeId ? null : current))
    }
  }

  if (permissions && !permissions.canViewReunion) {
    return <Navigate to="/dashboard" replace />
  }

  const metrics = [
    { label: 'Au garage', value: loading ? '—' : String(inShop), hint: inShop === 1 ? 'voiture' : 'voitures' },
    { label: 'Plus ancienne', value: loading || longest == null ? '—' : String(longest), hint: longest === 1 ? 'jour' : 'jours' },
  ]

  return (
    <div className="max-w-[1180px] mx-auto pb-10">
      <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.04)]">
        <header className="border-b border-gray-100 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Atelier</p>
              <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-gray-950">Réunion</h1>
              <p className="mt-1 text-sm capitalize text-gray-500">{dateLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDate((current) => shiftDate(current, -1))}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Veille
              </button>
              <button
                type="button"
                onClick={() => setDate(today())}
                disabled={isToday}
                className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-default disabled:text-gray-400 disabled:hover:bg-white"
              >
                Aujourd’hui
              </button>
              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => setDate(e.target.value || today())}
                  className="bg-transparent font-medium text-gray-900 focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 divide-x divide-gray-100 border-t border-gray-100 pt-5">
            {metrics.map((item) => (
              <div key={item.label} className="px-1 sm:px-4 first:pl-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight text-gray-950">{item.value}</span>
                  <span className="text-xs text-gray-400">{item.hint}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setFiltreEtat('tous')}
              className={cn(
                'flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                filtreEtat === 'tous'
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              )}
            >
              Tous ({loading ? '—' : inShop})
            </button>
            {ETATS_FILTRE.map((etat) => {
              const cfg = ETAT_CONFIG[etat]
              const active = filtreEtat === etat
              return (
                <button
                  key={etat}
                  type="button"
                  onClick={() => setFiltreEtat(active ? 'tous' : etat)}
                  className={cn(
                    'flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                    !active && 'bg-white hover:brightness-95'
                  )}
                  style={{
                    borderColor: cfg.color,
                    color: active ? '#fff' : cfg.color,
                    backgroundColor: active ? cfg.color : '#fff',
                  }}
                >
                  {cfg.label} ({loading ? '—' : counts[etat]})
                </button>
              )
            })}
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                <th className="w-14 px-5 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Véhicule</th>
                <th className="px-3 py-3 font-medium">État</th>
                <th className="px-3 py-3 font-medium">Séjour</th>
                <th className="px-3 py-3 font-medium">Problème</th>
                <th className="px-3 py-3 font-medium">Réalisé par</th>
                <th className="min-w-[250px] px-5 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="border-t border-gray-100">
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-base font-medium text-gray-900">
                      {filtreEtat === 'tous' ? 'Aucune voiture au garage' : 'Aucune voiture dans cet état'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">Les voitures validées ne sont pas dans cette liste.</p>
                  </td>
                </tr>
              ) : (
                visible.map((row, index) => {
                  const days = stayDays(row)
                  const problem = parseVehiculeAssigneesFromText(row.defaut).notes.trim()
                  const people = peopleOf(row)
                  const color = ETAT_CONFIG[row.etat_actuel]?.color ?? '#9ca3af'
                  const longStay = days >= 5 && row.etat_actuel !== 'vert'
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-gray-100 align-middle transition-colors hover:bg-gray-50/70"
                      style={{ boxShadow: `inset 3px 0 0 ${color}` }}
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold tabular-nums text-gray-300">{String(index + 1).padStart(2, '0')}</span>
                      </td>
                      <td className="px-3 py-4">
                        <Link to={`/vehicules/${row.id}`} className="group block">
                          <p className="font-semibold text-gray-950 group-hover:text-orange-600">{row.modele || 'Sans modèle'}</p>
                          <p className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-gray-700">
                              {row.immatriculation || '—'}
                            </span>
                            <span className="text-[11px] text-gray-400">Entrée {formatDate(row.date_entree)}</span>
                          </p>
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        <EtatBadge etat={row.etat_actuel} size="sm" />
                      </td>
                      <td className="px-3 py-4">
                        <p className={cn('text-lg font-semibold tabular-nums leading-none', longStay ? 'text-orange-600' : 'text-gray-900')}>
                          {days}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">{days === 1 ? 'jour' : 'jours'}</p>
                      </td>
                      <td className="max-w-[240px] px-3 py-4 leading-5 text-gray-700">
                        {problem || <span className="text-gray-300">Non renseigné</span>}
                      </td>
                      <td className="min-w-[180px] px-3 py-4">
                        {people.length === 0 ? (
                          <span className="text-gray-300">Non assigné</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {people.map((name, personIndex) => (
                              <div key={`${name}-${personIndex}`} className="flex items-center gap-2">
                                <UserAvatar name={initials(name)} size="sm" />
                                <span className="text-sm text-gray-800">{name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <textarea
                          value={notes[row.id] ?? ''}
                          rows={2}
                          placeholder="À noter…"
                          onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          onBlur={(e) => void saveNote(row.id, e.target.value)}
                          className="w-full resize-none rounded-xl bg-gray-50 px-3 py-2 text-sm leading-5 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                        />
                        <p className="mt-1 h-4 text-[11px] text-gray-400">
                          {savingId === row.id ? 'Enregistrement…' : savedFlash === row.id ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <Check className="h-3 w-3" /> Enregistré
                            </span>
                          ) : null}
                        </p>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && visible.length > 0 ? (
          <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-400 sm:px-7">
            {visible.length} voiture{visible.length > 1 ? 's' : ''}
            {filtreEtat !== 'tous' ? ` · ${ETAT_CONFIG[filtreEtat].label}` : ''} · les plus anciennes en premier
          </p>
        ) : null}
      </section>
    </div>
  )
}
