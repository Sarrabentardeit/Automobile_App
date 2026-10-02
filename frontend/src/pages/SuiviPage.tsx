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
      tone: 'text-gray-950',
      bar: 'bg-gray-900',
      onClick: () => {
        setEtatFilter('tous')
        document.getElementById('suivi-garage')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
    },
    {
      key: 'validated' as const,
      label: 'Validées',
      value: data?.metrics.validated,
      hint: data?.period === 'semaine' ? 'sur la semaine' : 'sur la journée',
      tone: 'text-emerald-700',
      bar: 'bg-emerald-500',
      onClick: () => document.getElementById('suivi-validees')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    {
      key: 'parts' as const,
      label: 'En attente de pièces',
      value: data?.metrics.waitingParts,
      hint: 'depuis 5 jours ou plus',
      tone: (data?.metrics.waitingParts ?? 0) > 0 ? 'text-orange-600' : 'text-gray-950',
      bar: 'bg-orange-500',
      onClick: () => {
        setEtatFilter('parts')
        document.getElementById('suivi-garage')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      },
    },
  ]

  return (
    <div className="mx-auto max-w-[1360px] space-y-4 pb-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-950">Suivi atelier</h1>
          <p className="mt-1 text-sm text-gray-500">
            Garage, sorties et mouvements · <span className="capitalize">{periodLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
            <button
              type="button"
              onClick={() => {
                setPeriod('jour')
                setDate((current) => shiftDate(current, -1))
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
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
              className={cn('h-8 rounded-lg px-3 text-sm font-medium', isToday ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-50')}
            >
              Aujourd’hui
            </button>
            <button
              type="button"
              onClick={() => setPeriod((current) => (current === 'semaine' ? 'jour' : 'semaine'))}
              className={cn('h-8 rounded-lg px-3 text-sm font-medium', period === 'semaine' ? 'bg-gray-950 text-white' : 'text-gray-600 hover:bg-gray-50')}
            >
              Semaine
            </button>
          </div>
          <label className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm text-gray-700 shadow-sm ring-1 ring-gray-200">
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
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((item) => {
          const selected = (item.key === 'garage' && etatFilter === 'tous')
            || (item.key === 'parts' && etatFilter === 'parts')
          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className={cn(
                'rounded-2xl bg-white px-4 py-4 text-left shadow-sm ring-1 transition',
                selected ? 'ring-gray-900' : 'ring-gray-200 hover:ring-gray-300'
              )}
            >
              <span className={cn('mb-3 block h-1 w-8 rounded-full', item.bar)} />
              <p className="text-xs font-medium text-gray-500">{item.label}</p>
              <p className={cn('mt-1 text-3xl font-semibold tabular-nums tracking-tight', item.tone)}>
                {loading || item.value == null ? '—' : item.value}
              </p>
              <p className="mt-1 text-xs text-gray-400">{item.hint}</p>
            </button>
          )
        })}
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <section id="suivi-garage" className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-gray-950">{garageTitle}</h2>
              <p className="text-xs text-gray-400">
                {loading ? 'Chargement…' : `${visibleGarage.length} voiture${visibleGarage.length > 1 ? 's' : ''}`}
              </p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une voiture"
              className="h-9 w-full rounded-lg bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 sm:w-56"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto border-b border-gray-100 px-4 py-2.5 sm:px-5">
            <FilterChip active={etatFilter === 'tous'} onClick={() => setEtatFilter('tous')} label={`Tous ${garage.length}`} />
            {ETAT_ORDER.filter((etat) => counts[etat] > 0).map((etat) => (
              <FilterChip
                key={etat}
                active={etatFilter === etat}
                onClick={() => setEtatFilter(etatFilter === etat ? 'tous' : etat)}
                label={`${ETAT_CONFIG[etat].label} ${counts[etat]}`}
                tone={ETAT_CONFIG[etat].color}
              />
            ))}
          </div>
          <div className="max-h-[720px] overflow-auto">
            {loading ? (
              <Skeleton rows={6} />
            ) : visibleGarage.length === 0 ? (
              <Empty title="Aucune voiture" hint="Aucune voiture ne correspond à ce filtre." />
            ) : (
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-left text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Véhicule</th>
                    <th className="px-3 py-2.5 font-medium">État</th>
                    <th className="px-3 py-2.5 font-medium">Séjour</th>
                    <th className="px-3 py-2.5 font-medium">Équipe</th>
                    <th className="px-4 py-2.5 font-medium sm:px-5">Problème</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    group.rows.map((row, index) => {
                      const people = namesOf(row)
                      const stuck = row.etat === 'mauve' && row.stayDays >= 5
                      const showGroup = index === 0
                      return (
                        <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                          <td className="px-4 py-3 sm:px-5">
                            {showGroup ? (
                              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: ETAT_CONFIG[group.etat]?.color }}>
                                {ETAT_CONFIG[group.etat]?.label ?? group.etat}
                              </p>
                            ) : null}
                            <Link to={`/vehicules/${row.id}`} className="font-semibold text-gray-950 hover:text-orange-600">
                              {row.modele || 'Sans modèle'}
                            </Link>
                            <p className="mt-0.5 font-mono text-[11px] text-gray-500">{row.immatriculation || '—'}</p>
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <EtatBadge etat={row.etat} size="sm" />
                          </td>
                          <td className="px-3 py-3 align-middle">
                            <span className={cn('font-semibold tabular-nums', stuck ? 'text-orange-600' : 'text-gray-900')}>{row.stayDays} j</span>
                          </td>
                          <td className="min-w-[160px] px-3 py-3 align-middle text-gray-700">
                            {people.length === 0 ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {people.map((name, personIndex) => (
                                  <span key={`${name}-${personIndex}`}>{name}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="min-w-[220px] px-4 py-3 align-middle sm:px-5">
                            <p className="max-w-md whitespace-pre-line leading-5 text-gray-700">
                              {problemOf(row.defaut) || <span className="text-gray-300">—</span>}
                            </p>
                          </td>
                        </tr>
                      )
                    })
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
          <section id="suivi-validees" className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <PanelHead title={validatedTitle} hint="Voitures sorties de l’atelier" color="#047857" />
            <div className="max-h-[320px] overflow-y-auto">
              {loading ? (
                <Skeleton rows={3} />
              ) : (data?.validated.length ?? 0) === 0 ? (
                <Empty title="Aucune validation" hint="Rien n’a été validé sur cette période." />
              ) : (
                data?.validated.map((row) => (
                  <Link key={row.id} to={`/vehicules/${row.id}`} className="block border-t border-gray-100 px-4 py-3 hover:bg-emerald-50/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-950">{row.modele || 'Sans modèle'}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-gray-500">{row.immatriculation || '—'}</p>
                      </div>
                      <p className="shrink-0 text-xs font-medium text-emerald-700">{row.stayDays} j</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">{problemOf(row.defaut) || 'Séjour terminé'}</p>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <PanelHead title="Mouvements" hint="États changés et notes de réunion" color="#ea580c" />
            <div className="max-h-[420px] overflow-y-auto px-4 py-3">
              {loading ? (
                <Skeleton rows={4} />
              ) : (data?.activity.length ?? 0) === 0 ? (
                <Empty title="Aucun mouvement" hint="Pas de changement sur cette période." />
              ) : (
                <ol className="relative space-y-0 border-l border-gray-200 pl-4">
                  {data?.activity.map((item) => {
                    const when = data.period === 'semaine' ? `${shortDate(item.at.slice(0, 10))} ${clock(item.at)}` : clock(item.at)
                    return (
                      <li key={item.id} className="relative pb-4">
                        <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-gray-300 ring-1 ring-gray-200" />
                        <Link to={item.vehiculeId ? `/vehicules/${item.vehiculeId}` : '/suivi'} className="block">
                          <p className="text-[11px] font-medium text-gray-400">{when || '—'}</p>
                          <p className="mt-0.5 font-semibold text-gray-950">{item.modele || 'Véhicule'}</p>
                          {item.kind === 'note' ? (
                            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.detail}</p>
                          ) : (
                            <p className="mt-1 flex flex-wrap items-center gap-1">
                              {isEtat(item.etatFrom) ? <EtatBadge etat={item.etatFrom} size="sm" /> : null}
                              <span className="text-xs text-gray-300">→</span>
                              {isEtat(item.etatTo) ? <EtatBadge etat={item.etatTo} size="sm" /> : null}
                            </p>
                          )}
                          {item.auteur ? <p className="mt-1 text-[11px] text-gray-400">{item.auteur}</p> : null}
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              )}
              {data?.truncated ? <p className="pt-2 text-xs text-gray-400">250 mouvements les plus récents.</p> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function PanelHead({ title, hint, color }: { title: string; hint: string; color: string }) {
  return (
    <div className="border-b border-gray-100 px-4 py-4">
      <h2 className="text-base font-extrabold tracking-tight" style={{ color }}>{title}</h2>
      <span className="mt-1.5 block h-1 w-9 rounded-full" style={{ backgroundColor: color }} />
      <p className="mt-1.5 text-xs font-semibold" style={{ color }}>{hint}</p>
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
