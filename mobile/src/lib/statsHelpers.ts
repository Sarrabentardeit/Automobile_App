export const MOIS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

export function isInStatsMonth(dateStr: string, year: number, month: number): boolean {
  const [y, m] = dateStr.slice(0, 10).split('-').map(Number)
  return y === year && m === month
}

export function monthShortLabel(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('fr-FR', { month: 'short' }).replace('.', '')
}

export function monthYearLabel(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${year}`
}

export function yearOptions(centerYear: number): number[] {
  return Array.from({ length: 5 }, (_, i) => centerYear - 2 + i)
}
