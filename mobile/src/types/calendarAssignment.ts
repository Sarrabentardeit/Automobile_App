export type CalendarRdvStatut = 'prevu' | 'honore' | 'annule' | 'non_honore'

export const CALENDAR_RDV_STATUTS: CalendarRdvStatut[] = ['prevu', 'honore', 'annule', 'non_honore']

export const CALENDAR_RDV_STATUT_CONFIG: Record<
  CalendarRdvStatut,
  { label: string; color: string; bg: string; text: string }
> = {
  prevu: { label: 'Prévu', color: '#64748b', bg: '#f1f5f9', text: '#334155' },
  honore: { label: 'Honoré', color: '#16a34a', bg: '#dcfce7', text: '#166534' },
  annule: { label: 'Annulé', color: '#dc2626', bg: '#fee2e2', text: '#991b1b' },
  non_honore: { label: 'Non honoré', color: '#2563eb', bg: '#dbeafe', text: '#1e40af' },
}

export interface CalendarAssignment {
  id: number
  date: string
  memberName: string
  vehicleId: number | null
  vehicleLabel: string
  description: string
  clientName?: string
  clientTelephone?: string
  statut?: CalendarRdvStatut
}

export type CalendarAssignmentInput = Omit<CalendarAssignment, 'id'>
