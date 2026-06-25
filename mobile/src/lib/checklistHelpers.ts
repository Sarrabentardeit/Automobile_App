import type { ChecklistWorkflowStatus, DailyChecklist } from '../types/checklist'

export const CHECKLIST_ROLE_LABELS: Record<string, string> = {
  technicien: 'Technicien',
  coordinateur: 'Coordinateur',
  chef_atelier: 'Chef atelier',
}

export const WORKFLOW_LABELS: Record<ChecklistWorkflowStatus, string> = {
  draft: 'Brouillon',
  submitted: 'Soumise',
  validated: 'Validée',
  rejected: 'À corriger',
}

export function workflowColors(status: ChecklistWorkflowStatus): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'submitted':
      return { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' }
    case 'validated':
      return { bg: '#d1fae5', text: '#047857', border: '#a7f3d0' }
    case 'rejected':
      return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
    default:
      return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }
  }
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function monthBounds(date: string): { from: string; to: string } {
  const [y, m] = date.split('-').map(Number)
  const year = Number.isFinite(y) ? y : new Date().getFullYear()
  const month = Number.isFinite(m) ? m : new Date().getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDateFr(date: string): string {
  const [y, m, day] = date.split('-')
  return `${day}/${m}/${y}`
}

export function completion(checklist: DailyChecklist | null): { done: number; total: number } {
  if (!checklist) return { done: 0, total: 0 }
  let total = 0
  let done = 0
  checklist.data.sections.forEach((section) => {
    section.items.forEach((item) => {
      total += 1
      if (item.status === 'done' || item.status === 'na') done += 1
    })
  })
  return { done, total }
}

export function isChecklistReadOnly(status: ChecklistWorkflowStatus): boolean {
  return status === 'submitted' || status === 'validated'
}
