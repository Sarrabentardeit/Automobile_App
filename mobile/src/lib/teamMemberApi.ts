import { apiFetch } from './api'
import type { TeamMember, TeamMemberInput } from '../types/teamMember'

export async function fetchTeamMembers(token: string): Promise<TeamMember[]> {
  const list = await apiFetch<TeamMember[]>('/team-members', { token })
  return Array.isArray(list) ? list : []
}

export async function createTeamMember(
  token: string,
  data: TeamMemberInput
): Promise<TeamMember> {
  return apiFetch<TeamMember>('/team-members', { method: 'POST', token, body: data })
}

export async function updateTeamMember(
  token: string,
  id: number,
  data: TeamMemberInput
): Promise<TeamMember> {
  return apiFetch<TeamMember>(`/team-members/${id}`, { method: 'PUT', token, body: data })
}

export async function deleteTeamMember(token: string, id: number): Promise<void> {
  await apiFetch<void>(`/team-members/${id}`, { method: 'DELETE', token })
}
