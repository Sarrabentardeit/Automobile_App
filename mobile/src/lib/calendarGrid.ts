export const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export const MONTH_NAMES = [
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
]

export type DayCell = {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
}

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getCalendarGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = (first.getDay() + 6) % 7
  const prevMonthDays = new Date(year, month - 1, 0).getDate()
  const todayStr = todayDateStr()

  const cells: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    let d: number
    let m: number
    let y: number
    let isCurrentMonth: boolean
    if (i < startWeekday) {
      d = prevMonthDays - startWeekday + 1 + i
      m = month === 1 ? 12 : month - 1
      y = month === 1 ? year - 1 : year
      isCurrentMonth = false
    } else if (i < startWeekday + daysInMonth) {
      d = i - startWeekday + 1
      m = month
      y = year
      isCurrentMonth = true
    } else {
      d = i - startWeekday - daysInMonth + 1
      m = month === 12 ? 1 : month + 1
      y = month === 12 ? year + 1 : year
      isCurrentMonth = false
    }
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, day: d, isCurrentMonth, isToday: dateStr === todayStr })
  }
  return cells
}

export function formatDateFr(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function offsetDateStr(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Libellé relatif pour le jour sélectionné (Aujourd'hui, Demain, Hier). */
export function relativeDayLabel(date: string): string | null {
  if (date === todayDateStr()) return "Aujourd'hui"
  if (date === offsetDateStr(1)) return 'Demain'
  if (date === offsetDateStr(-1)) return 'Hier'
  return null
}
