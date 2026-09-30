import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers } from '@/contexts/UsersContext'
import { apiFetch } from '@/lib/api'
import { cn, formatDate, parseVehiculeAssigneesFromText, resolveVehiculeAssigneeIds } from '@/lib/utils'
import EtatBadge from '@/components/vehicules/EtatBadge'
import { ETAT_CONFIG, type EtatVehicule } from '@/types'

type Period = 'jour' | 'semaine'

interface GarageCar {
  id: number
  modele: string
  immatriculation: string
  etat: EtatVehicule
  defaut: string
  date_entree: string
  technicien_id: number | null
  responsable_id: number | null
  stayDays: number
}

interface ValidatedCar {
  id: number
  modele: string
  immatriculation: string
  defaut: string
  date_entree: string
  date_sortie: string | null
  stayDays: number
}

interface ActivityItem {
  id: string
  at: string
  kind: 'etat' | 'note'
  vehiculeId: number
  modele: string
  immatriculation: string
  etatFrom: string | null
  etatTo: string | null
  auteur: string
  detail: string
}

interface SuiviData {
  from: string
  to: string
  period: Period
  garageAsOf: string
  metrics: { inGarage: number; validated: number; waitingParts: number }
  garage: GarageCar[]
  validated: ValidatedCar[]
  activity: ActivityItem[]
  truncated: boolean
}

const ETAT_ORDER: EtatVehicule[] = [
  'orange',
  'mauve',
  'sous_traitance',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'retour',
]

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDate(iso: string, delta: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const next = new Date(y, m - 1, d + delta)
  const pad = (n: number) => String(n).padStart(2, '0')
  const value = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
  const max = today()
  return value > max ? max : value
}

function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

function clock(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function problemOf(defaut: string) {
  return parseVehiculeAssigneesFromText(defaut).notes.trim()
}

function isEtat(value: string | null | undefined): value is EtatVehicule {
  return Boolean(value && value in ETAT_CONFIG)
}

export default function SuiviPage() {
  const { getAccessToken, permissions } = useAuth()
  const { users } = useUsers()
  const [date, setDate] = useState(today)
  const [period, setPeriod] = useState<Period>('jour')
  const [data, setData] = useState<SuiviData | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [etatFilter, setEtatFilter] = useState<EtatVehicule | 'parts' | 'tous'>('tous')
  const [panel, setPanel] = useState<'garage' | 'validated' | 'activity'>('garage')

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    setLoading(true)
    void apiFetch<SuiviData>('/suivi', { token, params: { date, period } })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date, period, getAccessToken])

  const isToday = date === today() && period === 'jour'
  const garage = data?.garage ?? []
  const counts = useMemo(() => {
    const map = Object.fromEntries(ETAT_ORDER.map((etat) => [etat, 0])) as Record<EtatVehicule, number>
    for (const row of garage) {
      if (row.etat in map) map[row.etat] += 1
    }
    return map
  }, [garage])

  const visibleGarage = useMemo(() => {
    const q = query.trim().toLowerCase()
    return garage.filter((row) => {
      if (etatFilter === 'parts' && !(row.etat === 'mauve' && row.stayDays >= 5)) return false
      if (etatFilter !== 'tous' && etatFilter !== 'parts' && row.etat !== etatFilter) return false
      if (!q) return true
      return `${row.modele} ${row.immatriculation}`.toLowerCase().includes(q)
    })
  }, [garage, etatFilter, query])

  const groups = useMemo(() => {
    const known = ETAT_ORDER.map((etat) => ({
      etat,
      rows: visibleGarage.filter((row) => row.etat === etat),
    })).filter((group) => group.rows.length > 0)
    const extra = visibleGarage.filter((row) => !ETAT_ORDER.includes(row.etat))
    return extra.length ? [...known, { etat: extra[0].etat, rows: extra }] : known
  }, [visibleGarage])

  const namesOf = (row: Pick<GarageCar, 'defaut' | 'technicien_id' | 'responsable_id'>) => {
    const assignees = resolveVehiculeAssigneeIds(row)
    const ids = assignees.technicien_ids.length ? assignees.technicien_ids : assignees.responsable_ids
    return ids
      .map((id) => users.find((user) => user.id === id)?.nom_complet)
      .filter((name): name is string => Boolean(name))
  }

  if (permissions && !permissions.canViewSuivi) {
    return <Navigate to="/dashboard" replace />
  }

  const periodLabel = !data
    ? longDate(date)
    : data.period === 'semaine'
      ? `Semaine du ${shortDate(data.from)} au ${shortDate(data.to)}`
      : isToday
        ? `Aujourd’hui · ${longDate(data.to)}`
        : longDate(data.to)

  const garageTitle = !data
    ? 'Au garage'
    : data.period === 'semaine' && data.to === today()
      ? 'Au garage maintenant'
      : data.to === today()
        ? 'Au garage'
        : `Au garage le ${shortDate(data.to)}`

  const validatedTitle = data?.period === 'semaine'
    ? 'Validées sur la période'
    : isToday
      ? 'Validées aujourd’hui'
      : 'Validées ce jour'

  const metrics = [
    {
      key: 'garage' as const,
      label: 'Au garage',
      value: data?.metrics.inGarage,
      hint: garageTitle === 'Au garage maintenant' ? 'en ce moment' : 'sur la date',
      onClick: () => {
        setEtatFilter('tous')
        setPanel('garage')
      },
    },
    {
      key: 'validated' as const,
      label: 'Validées',
      value: data?.metrics.validated,
      hint: data?.period === 'semaine' ? 'cette semaine' : 'ce jour',
      onClick: () => setPanel('validated'),
    },
    {
      key: 'parts' as const,
      label: 'Att. pièces +5 j',
      value: data?.metrics.waitingParts,
      hint: 'à surveiller',
      onClick: () => {
        setEtatFilter('parts')
        setPanel('garage')
      },
    },
  ]

  return (
    <div className="mx-auto max-w-[1280px] pb-10">
      <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.04)]">
        <header className="border-b border-gray-100 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Direction</p>
              <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-gray-950">Suivi atelier</h1>
              <p className="mt-1 text-sm capitalize text-gray-500">{periodLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPeriod('jour')
                  setDate((current) => shiftDate(current, -1))
                }}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Veille
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod('jour')
                  setDate(today())
                }}
                className={cn(
                  'inline-flex h-10 items-center rounded-xl border px-3 text-sm font-medium',
                  isToday ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                Aujourd’hui
              </button>
              <button
                type="button"
                onClick={() => setPeriod((current) => (current === 'semaine' ? 'jour' : 'semaine'))}
                className={cn(
                  'inline-flex h-10 items-center rounded-xl border px-3 text-sm font-medium',
                  period === 'semaine' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                Semaine
              </button>
              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => {
                    setPeriod('jour')
                    setDate(e.target.value || today())
                  }}
                  className="bg-transparent font-medium text-gray-900 focus:outline-none"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 pt-5">
            {metrics.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className="px-1 text-left sm:px-4 first:pl-0"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className={cn(
                    'text-3xl font-semibold tabular-nums tracking-tight',
                    item.key === 'parts' && (item.value ?? 0) > 0 ? 'text-orange-600' : 'text-gray-950'
                  )}>
                    {loading || item.value == null ? '—' : item.value}
                  </span>
                  <span className="hidden text-xs text-gray-400 sm:inline">{item.hint}</span>
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 border-t border-gray-100 lg:hidden">
            {([
              ['garage', 'Garage'],
              ['validated', 'Validées'],
              ['activity', 'Mouvements'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPanel(key)}
                className={cn('py-3 text-xs font-semibold', panel === key ? 'text-gray-950' : 'text-gray-400')}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)_minmax(300px,0.9fr)] lg:divide-x lg:divide-gray-100">
          <section className={cn('min-w-0', panel !== 'garage' && 'hidden lg:block')}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-gray-950">{garageTitle}</h2>
                <p className="text-xs text-gray-400">{loading ? 'Chargement…' : `${visibleGarage.length} voiture${visibleGarage.length > 1 ? 's' : ''}`}</p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Modèle, immatriculation"
                className="h-9 w-40 rounded-xl bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 sm:w-52"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto px-5 pb-3 sm:px-6">
              <FilterChip active={etatFilter === 'tous'} onClick={() => setEtatFilter('tous')} label={`Tous (${garage.length})`} />
              <FilterChip active={etatFilter === 'parts'} onClick={() => setEtatFilter(etatFilter === 'parts' ? 'tous' : 'parts')} label={`+5 j pièces (${data?.metrics.waitingParts ?? 0})`} tone="#ea580c" />
              {ETAT_ORDER.filter((etat) => counts[etat] > 0).map((etat) => (
                <FilterChip
                  key={etat}
                  active={etatFilter === etat}
                  onClick={() => setEtatFilter(etatFilter === etat ? 'tous' : etat)}
                  label={`${ETAT_CONFIG[etat].label} (${counts[etat]})`}
                  tone={ETAT_CONFIG[etat].color}
                />
              ))}
            </div>
            <div className="max-h-[640px] overflow-y-auto border-t border-gray-100">
              {loading ? (
                <Skeleton rows={5} />
              ) : groups.length === 0 ? (
                <Empty title="Aucune voiture au garage" hint="Les voitures validées sont dans la liste Validées." />
              ) : (
                groups.map((group) => (
                  <div key={group.etat}>
                    <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-50/95 px-5 py-2 backdrop-blur sm:px-6">
                      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ETAT_CONFIG[group.etat]?.color }}>
                        {ETAT_CONFIG[group.etat]?.label ?? group.etat}
                      </span>
                      <span className="text-[11px] tabular-nums text-gray-400">{group.rows.length}</span>
                    </div>
                    {group.rows.map((row) => {
                      const people = namesOf(row)
                      const stuck = row.etat === 'mauve' && row.stayDays >= 5
                      return (
                        <Link
                          key={row.id}
                          to={`/vehicules/${row.id}`}
                          className="flex items-start gap-3 border-t border-gray-100 px-5 py-3.5 transition-colors hover:bg-gray-50 sm:px-6"
                          style={{ boxShadow: `inset 3px 0 0 ${ETAT_CONFIG[row.etat]?.color ?? '#e5e7eb'}` }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-gray-950">{row.modele || 'Sans modèle'}</p>
                            <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                              <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono tracking-wide text-gray-700">
                                {row.immatriculation || '—'}
                              </span>
                              <span>Entrée {formatDate(row.date_entree)}</span>
                              {people.length > 0 ? <span className="truncate">{people.join(', ')}</span> : null}
                            </p>
                            <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-gray-600">
                              {problemOf(row.defaut) || 'Problème non renseigné'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className={cn('text-lg font-semibold tabular-nums leading-none', stuck ? 'text-orange-600' : 'text-gray-900')}>
                              {row.stayDays}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-400">{row.stayDays === 1 ? 'jour' : 'jours'}</p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={cn('min-w-0 border-t border-gray-100 lg:border-t-0', panel !== 'validated' && 'hidden lg:block')}>
            <div className="px-5 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-gray-950">{validatedTitle}</h2>
              <p className="text-xs text-gray-400">Sorties de l’atelier, hors liste de travail</p>
            </div>
            <div className="max-h-[640px] overflow-y-auto border-t border-gray-100">
              {loading ? (
                <Skeleton rows={4} />
              ) : (data?.validated.length ?? 0) === 0 ? (
                <Empty title="Aucune validation" hint="Une voiture validée sur cette période apparaît ici." />
              ) : (
                data?.validated.map((row) => (
                  <Link
                    key={row.id}
                    to={`/vehicules/${row.id}`}
                    className="block border-t border-gray-100 px-5 py-3.5 hover:bg-gray-50 sm:px-6"
                    style={{ boxShadow: 'inset 3px 0 0 #22c55e' }}
                  >
                    <p className="font-semibold text-gray-950">{row.modele || 'Sans modèle'}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-gray-700">
                        {row.immatriculation || '—'}
                      </span>
                      <span>Validée {row.date_sortie ? formatDate(row.date_sortie) : '—'}</span>
                    </p>
                    <p className="mt-1.5 text-sm text-gray-600">{problemOf(row.defaut) || 'Séjour terminé'}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{row.stayDays} jour{row.stayDays > 1 ? 's' : ''} au garage</p>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className={cn('min-w-0 border-t border-gray-100 lg:border-t-0', panel !== 'activity' && 'hidden lg:block')}>
            <div className="px-5 py-4 sm:px-6">
              <h2 className="text-sm font-semibold text-gray-950">Ce qui a été fait</h2>
              <p className="text-xs text-gray-400">Changements d’état et notes de réunion</p>
            </div>
            <div className="max-h-[640px] overflow-y-auto border-t border-gray-100">
              {loading ? (
                <Skeleton rows={6} />
              ) : (data?.activity.length ?? 0) === 0 ? (
                <Empty title="Aucun mouvement" hint="Les changements d’état de la période s’affichent ici." />
              ) : (
                data?.activity.map((item) => {
                  const when = data.period === 'semaine' ? `${shortDate(item.at.slice(0, 10))} · ${clock(item.at)}` : clock(item.at)
                  return (
                    <Link
                      key={item.id}
                      to={item.vehiculeId ? `/vehicules/${item.vehiculeId}` : '/suivi'}
                      className="block border-t border-gray-100 px-5 py-3.5 hover:bg-gray-50 sm:px-6"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{when || '—'}</p>
                      <p className="mt-1 font-semibold text-gray-950">{item.modele || 'Véhicule'}</p>
                      <p className="font-mono text-[11px] text-gray-500">{item.immatriculation || '—'}</p>
                      {item.kind === 'note' ? (
                        <p className="mt-2 text-sm leading-5 text-gray-700">
                          <span className="font-medium text-gray-500">Note · </span>
                          {item.detail}
                        </p>
                      ) : (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5">
                          {isEtat(item.etatFrom) ? <EtatBadge etat={item.etatFrom} size="sm" /> : null}
                          <span className="text-xs text-gray-300">→</span>
                          {isEtat(item.etatTo) ? <EtatBadge etat={item.etatTo} size="sm" /> : <span className="text-sm text-gray-700">{item.etatTo}</span>}
                        </p>
                      )}
                      {item.kind === 'etat' && item.detail ? <p className="mt-1.5 text-sm text-gray-600">{item.detail}</p> : null}
                      {item.auteur ? <p className="mt-1 text-[11px] text-gray-400">{item.auteur}</p> : null}
                    </Link>
                  )
                })
              )}
              {data?.truncated ? (
                <p className="px-5 py-3 text-xs text-gray-400 sm:px-6">Les 250 mouvements les plus récents sont affichés.</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  tone?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold',
        !tone && (active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-500')
      )}
      style={tone ? {
        borderColor: tone,
        color: active ? '#fff' : tone,
        backgroundColor: active ? tone : '#fff',
      } : undefined}
    >
      {label}
    </button>
  )
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  )
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-px">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="px-5 py-4 sm:px-6">
          <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ))}
    </div>
  )
}
