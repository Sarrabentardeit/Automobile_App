import type { EtatVehicule, VehiculeType } from '../types/vehicule'

export type DateFilterMode = 'toutes' | 'aujourdhui' | 'hier' | 'semaine' | 'date'

export type VehiculeFilteredCounts = {
  total: number
  byEtat: Record<string, number>
}

export type BrandFolder = {
  name: string
  slug: string
  count: number
}

export type BrandFoldersResponse = {
  brands: BrandFolder[]
  totalVehicles: number
}

export const ETATS_FILTRE: EtatVehicule[] = [
  'orange',
  'mauve',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'retour',
]

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidIsoDate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** Accepte AAAA-MM-JJ ou JJ/MM/AAAA (comme saisie manuelle mobile). */
export function normalizeDateInput(raw: string): string | undefined {
  const t = raw.trim()
  if (!t) return undefined
  if (isValidIsoDate(t)) return t
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const iso = `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`
    if (isValidIsoDate(iso)) return iso
  }
  return undefined
}

export function getDateRange(
  mode: DateFilterMode,
  dateFilter: string
): { date_debut?: string; date_fin?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (mode === 'toutes') return {}
  if (mode === 'aujourdhui') return { date_debut: fmt(today), date_fin: fmt(today) }
  if (mode === 'hier') {
    const y = new Date(today)
    y.setDate(y.getDate() - 1)
    return { date_debut: fmt(y), date_fin: fmt(y) }
  }
  if (mode === 'semaine') {
    const day = today.getDay() === 0 ? 7 : today.getDay()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - (day - 1))
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return { date_debut: fmt(weekStart), date_fin: fmt(weekEnd) }
  }
  if (mode === 'date') {
    const iso = normalizeDateInput(dateFilter)
    if (iso) return { date_debut: iso, date_fin: iso }
  }
  return {}
}

type FilterOpts = {
  tab: VehiculeType
  filtreEtat: EtatVehicule | 'tous'
  technicienId?: number
  dateFilterMode: DateFilterMode
  dateFilter: string
  search: string
  userId: number
  visibility: 'all' | 'own' | 'none'
  archives?: boolean
  marque?: string
}

export function buildFilterQuery(opts: FilterOpts) {
  const p = buildListParams({ ...opts, page: 1, limit: 1 })
  return {
    type: p.type,
    ...('exclude_etat' in p ? { exclude_etat: p.exclude_etat } : { etat: p.etat }),
    technicien_id: p.technicien_id,
    date_debut: p.date_debut,
    date_fin: p.date_fin,
    q: p.q,
    marque: p.marque,
  }
}

export function buildListParams(opts: FilterOpts & { page: number; limit: number }) {
  const { date_debut, date_fin } = getDateRange(opts.dateFilterMode, opts.dateFilter)
  const technicien_id =
    opts.visibility === 'own' ? opts.userId : opts.technicienId

  return {
    page: opts.page,
    limit: opts.limit,
    type: opts.tab,
    q: opts.search || undefined,
    technicien_id,
    date_debut,
    date_fin,
    ...(opts.archives
      ? { etat: 'vert' as const }
      : opts.filtreEtat !== 'tous'
        ? { etat: opts.filtreEtat }
        : { exclude_etat: 'vert' as const }),
    ...(opts.marque ? { marque: opts.marque } : {}),
  }
}
