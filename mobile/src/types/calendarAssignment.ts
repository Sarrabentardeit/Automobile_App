export interface CalendarAssignment {
  id: number
  date: string
  memberName: string
  vehicleId: number | null
  vehicleLabel: string
  description: string
  clientName?: string
  clientTelephone?: string
}

export type CalendarAssignmentInput = Omit<CalendarAssignment, 'id'>
