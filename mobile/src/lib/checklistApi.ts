import { apiFetch } from './api'
import type {
  ChecklistAuditLog,
  ChecklistHistoryEntry,
  ChecklistMonthlyKpi,
  ChecklistRole,
  ChecklistTemplatesAdminPayload,
  DailyChecklist,
  DailyChecklistData,
} from '../types/checklist'

export async function fetchTodayChecklist(
  token: string,
  date?: string
): Promise<DailyChecklist> {
  return apiFetch<DailyChecklist>('/checklists/me/today', {
    token,
    params: { date },
  })
}

export async function saveChecklistDraft(
  token: string,
  id: number,
  data: DailyChecklistData
): Promise<DailyChecklist> {
  return apiFetch<DailyChecklist>(`/checklists/${id}`, {
    method: 'PUT',
    token,
    body: { data },
  })
}

export async function submitChecklist(token: string, id: number): Promise<DailyChecklist> {
  return apiFetch<DailyChecklist>(`/checklists/${id}/submit`, {
    method: 'POST',
    token,
  })
}

export async function reviewChecklist(
  token: string,
  id: number,
  action: 'validate' | 'reject',
  comment?: string
): Promise<DailyChecklist> {
  return apiFetch<DailyChecklist>(`/checklists/${id}/review`, {
    method: 'POST',
    token,
    body: { action, comment },
  })
}

export async function fetchPendingReview(token: string, date?: string): Promise<DailyChecklist[]> {
  const list = await apiFetch<DailyChecklist[]>('/checklists/pending/review', {
    token,
    params: { date },
  })
  return Array.isArray(list) ? list : []
}

export async function fetchMonthlyKpi(
  token: string,
  year: number,
  month: number
): Promise<ChecklistMonthlyKpi> {
  return apiFetch<ChecklistMonthlyKpi>('/checklists/kpi/monthly', {
    token,
    params: { year, month },
  })
}

export async function fetchMyHistory(
  token: string,
  params?: { from?: string; to?: string; limit?: number }
): Promise<DailyChecklist[]> {
  const list = await apiFetch<DailyChecklist[]>('/checklists/me/history', { token, params })
  return Array.isArray(list) ? list : []
}

export async function fetchChecklistItem(token: string, id: number): Promise<DailyChecklist> {
  return apiFetch<DailyChecklist>(`/checklists/item/${id}`, { token })
}

export async function fetchChecklistAudit(
  token: string,
  id: number
): Promise<ChecklistAuditLog[]> {
  const list = await apiFetch<ChecklistAuditLog[]>(`/checklists/audit/${id}`, { token })
  return Array.isArray(list) ? list : []
}

export async function fetchReviewHistory(
  token: string,
  params?: {
    from?: string
    to?: string
    status?: string
    q?: string
    limit?: number
  }
): Promise<ChecklistHistoryEntry[]> {
  const list = await apiFetch<ChecklistHistoryEntry[]>('/checklists/review/history', {
    token,
    params,
  })
  return Array.isArray(list) ? list : []
}

export async function fetchAdminTemplates(
  token: string
): Promise<ChecklistTemplatesAdminPayload> {
  return apiFetch<ChecklistTemplatesAdminPayload>('/checklists/admin/templates', { token })
}

export async function saveAdminTemplates(
  token: string,
  templates: Partial<Record<ChecklistRole, DailyChecklistData>>
): Promise<ChecklistTemplatesAdminPayload> {
  return apiFetch<ChecklistTemplatesAdminPayload>('/checklists/admin/templates', {
    method: 'PUT',
    token,
    body: { templates },
  })
}

export async function resetAdminTemplate(
  token: string,
  role: ChecklistRole
): Promise<ChecklistTemplatesAdminPayload> {
  return apiFetch<ChecklistTemplatesAdminPayload>(`/checklists/admin/templates/${role}`, {
    method: 'DELETE',
    token,
  })
}
