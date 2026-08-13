import { apiFetch } from './api'

export type ChatMember = {
  id: number
  nom: string
  role: string
  email: string
  statut?: 'actif' | 'inactif'
}

export type ChatAttachment = {
  id: number
  url_path: string
  original_name: string
  mime_type: string
  size_bytes: number
  kind: 'image' | 'file'
}

export type ChatMessage = {
  id: number
  body: string
  createdAt: string
  senderId: number
  senderNom: string
  mine: boolean
  deleted?: boolean
  attachments?: ChatAttachment[]
}

export type ChatAttachmentInput = {
  dataUrl: string
  fileName?: string
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
  pinnedMessage?: ChatMessage | null
  pinnedAt?: string | null
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
  return apiFetch<{ data: ChatMessage[]; pinnedMessage: ChatMessage | null }>(
    `/chat/conversations/${conversationId}/messages`,
    {
      token,
      params: {
        limit: opts?.limit ?? 40,
        before: opts?.before,
        after: opts?.after,
      },
    }
  ).then((r) => ({
    messages: r.data ?? [],
    pinnedMessage: r.pinnedMessage ?? null,
  }))
}

export function sendChatMessage(
  token: string,
  conversationId: number,
  body: string,
  attachments?: ChatAttachmentInput[]
) {
  return apiFetch<{ data: ChatMessage }>(`/chat/conversations/${conversationId}/messages`, {
    token,
    method: 'POST',
    body: { body, attachments: attachments?.length ? attachments : undefined },
  }).then((r) => r.data)
}

export function deleteChatMessageForEveryone(token: string, messageId: number) {
  return apiFetch<{ data: ChatMessage }>(`/chat/messages/${messageId}`, {
    token,
    method: 'DELETE',
  }).then((r) => r.data)
}

export function hideChatMessageForMe(token: string, messageId: number) {
  return apiFetch<{ ok: boolean }>(`/chat/messages/${messageId}/hide`, {
    token,
    method: 'POST',
    body: {},
  })
}

export function pinChatMessage(token: string, conversationId: number, messageId: number) {
  return apiFetch<{ data: ChatMessage }>(`/chat/conversations/${conversationId}/pin`, {
    token,
    method: 'POST',
    body: { messageId },
  }).then((r) => r.data)
}

export function unpinChatMessage(token: string, conversationId: number) {
  return apiFetch<{ ok: boolean }>(`/chat/conversations/${conversationId}/pin`, {
    token,
    method: 'DELETE',
  })
}

export function markChatRead(token: string, conversationId: number) {
  return apiFetch<{ ok: boolean; lastReadAt?: string }>(
    `/chat/conversations/${conversationId}/read`,
    {
      token,
      method: 'POST',
      body: {},
    }
  )
}

/** Statut de lecture d’un message envoyé (basé sur lastReadAt des autres). */
export function getMessageReadReceipt(
  msg: Pick<ChatMessage, 'mine' | 'deleted' | 'createdAt'>,
  conversation: ChatConversation | null | undefined,
  myUserId: number | undefined
): { status: 'sent' | 'read'; label: string } | null {
  if (!msg.mine || msg.deleted || !conversation || !myUserId) return null
  const others = conversation.participants.filter((p) => p.userId !== myUserId)
  if (others.length === 0) return { status: 'sent', label: 'Envoyé' }
  const created = new Date(msg.createdAt).getTime()
  const times = others.map((p) => (p.lastReadAt ? new Date(p.lastReadAt).getTime() : NaN))
  if (times.some((t) => !Number.isFinite(t) || t < created)) {
    return { status: 'sent', label: 'Envoyé' }
  }
  const when = new Date(Math.max(...times))
  const hhmm = when.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return { status: 'read', label: `Lu · ${hhmm}` }
}

export function applyParticipantRead(
  conversations: ChatConversation[],
  conversationId: number,
  readUserId: number,
  lastReadAt: string
): ChatConversation[] {
  return conversations.map((c) => {
    if (c.id !== conversationId) return c
    return {
      ...c,
      participants: c.participants.map((p) =>
        p.userId === readUserId ? { ...p, lastReadAt } : p
      ),
    }
  })
}
