import { apiFetch } from './api'
import type { CalendarAssignment, CalendarAssignmentInput } from '../types/calendarAssignment'

export async function fetchCalendarAssignments(
  token: string,
  params?: { year?: number; month?: number }
): Promise<CalendarAssignment[]> {
  const list = await apiFetch<CalendarAssignment[]>('/calendar-assignments', {
    token,
    params,
  })
  return Array.isArray(list) ? list : []
}

export async function createCalendarAssignment(
  token: string,
  data: CalendarAssignmentInput
): Promise<CalendarAssignment> {
  return apiFetch<CalendarAssignment>('/calendar-assignments', {
    method: 'POST',
    token,
    body: data,
  })
}

export async function updateCalendarAssignment(
  token: string,
  id: number,
  data: CalendarAssignmentInput
): Promise<CalendarAssignment> {
  return apiFetch<CalendarAssignment>(`/calendar-assignments/${id}`, {
    method: 'PUT',
    token,
    body: data,
  })
}

export async function deleteCalendarAssignment(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/calendar-assignments/${id}`, { method: 'DELETE', token })
}
