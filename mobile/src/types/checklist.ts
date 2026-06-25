export type ChecklistRole = 'chef_atelier' | 'coordinateur' | 'technicien'
export type ChecklistItemStatus = 'todo' | 'done' | 'na'
export type ChecklistWorkflowStatus = 'draft' | 'submitted' | 'validated' | 'rejected'

export interface ChecklistItem {
  id: string
  label: string
  status: ChecklistItemStatus
  comment: string
}

export interface ChecklistSection {
  id: string
  title: string
  items: ChecklistItem[]
}

export interface DailyChecklistData {
  version: number
  sections: ChecklistSection[]
}

export interface DailyChecklist {
  id: number
  userId: number
  userName: string
  role: ChecklistRole
  date: string
  status: ChecklistWorkflowStatus
  data: DailyChecklistData
  submittedAt: string | null
  validatedAt: string | null
  validatorId: number | null
  validatorName: string
  validatorComment: string
  createdAt: string
  updatedAt: string
}

export interface ChecklistAuditLog {
  id: number
  checklistId: number
  action: string
  actorId: number | null
  actorName: string
  actorRole: string
  summary: string
  snapshot: DailyChecklistData | null
  createdAt: string
}

export interface ChecklistMonthlyKpi {
  period: string
  totalChecklists: number
  submitted: number
  validated: number
  rejected: number
  lateSubmissions: number
  nonConformities: number
  submissionRate: number
  validationRate: number
  byRole: Record<string, number>
}

export interface ChecklistHistoryMetrics {
  done: number
  todo: number
  na: number
  total: number
  nonConformities: number
}

export interface ChecklistHistoryEntry extends DailyChecklist {
  metrics: ChecklistHistoryMetrics
  lateSubmission: boolean
}

export interface ChecklistTemplatesAdminPayload {
  effective: Record<ChecklistRole, DailyChecklistData>
  defaults: Record<ChecklistRole, DailyChecklistData>
  usingCustom: Record<ChecklistRole, boolean>
}
