import { apiFetch } from './api'

export type ChatMember = {
  id: number
  nom: string
  role: string
  email: string
  statut?: 'actif' | 'inactif'
}

export type ChatMessage = {
  id: number
  body: string
  createdAt: string
  senderId: number
  senderNom: string
  mine: boolean
}

export type ChatConversation = {
  id: number
  type: 'group' | 'direct'
  title: string
  updatedAt: string
  unreadCount: number
  participants: Array<{
    userId: number
    nom: string
    role: string
    lastReadAt: string | null
  }>
  lastMessage: {
    id: number
    body: string
    createdAt: string
    senderId: number
    senderNom: string
  } | null
}

export function fetchChatConversations(token: string) {
  return apiFetch<{ data: ChatConversation[] }>('/chat/conversations', { token }).then(
    (r) => r.data ?? []
  )
}

export function fetchChatMembers(token: string) {
  return apiFetch<{ data: ChatMember[] }>('/chat/members', { token }).then((r) => r.data ?? [])
}

export function openDirectChat(token: string, userId: number) {
  return apiFetch<{ data: ChatConversation }>('/chat/conversations/direct', {
    token,
    method: 'POST',
    body: { userId },
  }).then((r) => r.data)
}

export function createGroupChat(token: string, title: string, memberIds: number[]) {
  return apiFetch<{ data: ChatConversation }>('/chat/conversations/group', {
    token,
    method: 'POST',
    body: { title, memberIds },
  }).then((r) => r.data)
}

export function addGroupMembers(token: string, conversationId: number, userIds: number[]) {
  return apiFetch<{ data: ChatConversation }>(`/chat/conversations/${conversationId}/members`, {
    token,
    method: 'POST',
    body: { userIds },
  }).then((r) => r.data)
}

export function fetchChatMessages(
  token: string,
  conversationId: number,
  opts?: { limit?: number; before?: string; after?: string }
) {
  return apiFetch<{ data: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`, {
    token,
    params: {
      limit: opts?.limit ?? 40,
      before: opts?.before,
      after: opts?.after,
    },
  }).then((r) => r.data ?? [])
}

export function sendChatMessage(token: string, conversationId: number, body: string) {
  return apiFetch<{ data: ChatMessage }>(`/chat/conversations/${conversationId}/messages`, {
    token,
    method: 'POST',
    body: { body },
  }).then((r) => r.data)
}

export function markChatRead(token: string, conversationId: number) {
  return apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/read`, {
    token,
    method: 'POST',
    body: {},
  })
}
