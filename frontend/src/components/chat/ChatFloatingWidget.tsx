import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Filter,
  Maximize2,
  MessageSquare,
  Minus,
  Plus,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  addGroupMembers,
  createGroupChat,
  fetchChatConversations,
  fetchChatMembers,
  fetchChatMessages,
  markChatRead,
  openDirectChat,
  sendChatMessage,
  type ChatConversation,
  type ChatMember,
  type ChatMessage,
} from '@/lib/chatApi'
import { playMessageSound } from '@/lib/appSounds'
import { cn } from '@/lib/utils'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

type ComposeMode = null | 'dm' | 'group'
type ListFilter = 'all' | 'unread'

export default function ChatFloatingWidget() {
  const { getAccessToken } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [members, setMembers] = useState<ChatMember[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [listFilter, setListFilter] = useState<ListFilter>('all')
  const [compose, setCompose] = useState<ComposeMode>(null)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupPick, setGroupPick] = useState<number[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [addPick, setAddPick] = useState<number[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<number | null>(null)
  const lastMsgIdRef = useRef(0)
  const threadReadyRef = useRef(false)

  const hideOnFullPage = location.pathname === '/chat'

  const unreadTotal = useMemo(
    () => conversations.reduce((s, c) => s + (c.unreadCount || 0), 0),
    [conversations]
  )

  const selected = useMemo(
    () => conversations.find(c => c.id === selectedId) ?? null,
    [conversations, selectedId]
  )

  const badgeLabel =
    unreadTotal <= 0 ? null : unreadTotal > 99 ? '99+' : unreadTotal === 1 ? '+1' : `+${unreadTotal}`

  const filteredConversations = useMemo(() => {
    if (listFilter === 'all') return conversations
    return conversations.filter(c => c.unreadCount > 0)
  }, [conversations, listFilter])

  const membersNotInSelected = useMemo(() => {
    if (!selected || selected.type !== 'group') return []
    const have = new Set(selected.participants.map(p => p.userId))
    return members.filter(m => !have.has(m.id))
  }, [members, selected])

  const loadConversations = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    try {
      const list = await fetchChatConversations(token)
      setConversations(list)
    } catch {
      /* ignore poll errors */
    }
  }, [getAccessToken])

  const loadMessages = useCallback(
    async (conversationId: number, opts?: { silent?: boolean }) => {
      const token = getAccessToken()
      if (!token) return
      if (!opts?.silent) setLoadingMsgs(true)
      try {
        const { messages: list } = await fetchChatMessages(token, conversationId)
        if (opts?.silent && threadReadyRef.current) {
          const incoming = list.filter(m => !m.mine && m.id > lastMsgIdRef.current)
          if (incoming.length > 0) playMessageSound()
        }
        lastMsgIdRef.current = list.reduce((m, x) => Math.max(m, x.id), 0)
        threadReadyRef.current = true
        setMessages(list)
        await markChatRead(token, conversationId)
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        )
      } catch {
        /* ignore */
      } finally {
        if (!opts?.silent) setLoadingMsgs(false)
      }
    },
    [getAccessToken]
  )

  useEffect(() => {
    void loadConversations()
    pollRef.current = window.setInterval(() => {
      void loadConversations()
    }, 10000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [loadConversations])

  useEffect(() => {
    if (!open) return
    void loadConversations()
    const token = getAccessToken()
    if (token) {
      void fetchChatMembers(token)
        .then(setMembers)
        .catch(() => setMembers([]))
    }
  }, [open, loadConversations, getAccessToken])

  useEffect(() => {
    if (!open || selectedId == null) {
      setMessages([])
      lastMsgIdRef.current = 0
      threadReadyRef.current = false
      return
    }
    setShowAdd(false)
    setAddPick([])
    lastMsgIdRef.current = 0
    threadReadyRef.current = false
    void loadMessages(selectedId)
    const id = window.setInterval(() => {
      void loadMessages(selectedId, { silent: true })
      void loadConversations()
    }, 8000)
    return () => window.clearInterval(id)
  }, [open, selectedId, loadMessages, loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, selectedId, open])

  const handleSend = async () => {
    const token = getAccessToken()
    const text = draft.trim()
    if (!token || !selectedId || !text || sending) return
    setSending(true)
    setDraft('')
    try {
      const msg = await sendChatMessage(token, selectedId, text)
      setMessages(prev => [...prev, msg])
      void loadConversations()
    } catch {
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  const handleOpenDm = async (userId: number) => {
    const token = getAccessToken()
    if (!token) return
    try {
      const conv = await openDirectChat(token, userId)
      setCompose(null)
      await loadConversations()
      setSelectedId(conv.id)
    } catch {
      /* ignore */
    }
  }

  const togglePick = (id: number, list: number[], setList: (v: number[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const handleCreateGroup = async () => {
    const token = getAccessToken()
    if (!token || !groupTitle.trim() || groupPick.length < 1) return
    try {
      const conv = await createGroupChat(token, groupTitle.trim(), groupPick)
      setCompose(null)
      setGroupTitle('')
      setGroupPick([])
      await loadConversations()
      setSelectedId(conv.id)
    } catch {
      /* ignore */
    }
  }

  const handleAddMembers = async () => {
    const token = getAccessToken()
    if (!token || !selected || selected.type !== 'group' || addPick.length === 0) return
    try {
      const updated = await addGroupMembers(token, selected.id, addPick)
      setConversations(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      setAddPick([])
      setShowAdd(false)
    } catch {
      /* ignore */
    }
  }

  if (hideOnFullPage) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-5 right-5 z-[60] w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all flex items-center justify-center"
        title="Chat équipe"
        aria-label="Ouvrir le chat"
      >
        {open ? <Minus className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {badgeLabel && !open ? (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white shadow">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed bottom-[5.5rem] right-5 z-[60] w-[min(100vw-1.5rem,380px)] h-[min(70vh,520px)] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
          <header className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 text-white">
            {selected ? (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                title="Retour"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <MessageSquare className="w-4 h-4 text-orange-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">
                {selected ? selected.title : 'Chat équipe'}
              </p>
              <p className="text-[10px] text-slate-300">
                {selected
                  ? selected.type === 'group'
                    ? `${selected.participants.length} membre(s)`
                    : 'Message privé'
                  : unreadTotal > 0
                    ? `${unreadTotal} non lu(s)`
                    : 'Conversations'}
              </p>
            </div>
            {selected?.type === 'group' ? (
              <button
                type="button"
                onClick={() => setShowAdd(v => !v)}
                className="p-1.5 rounded-lg hover:bg-white/10"
                title="Ajouter des membres"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/chat')
              }}
              className="p-1.5 rounded-lg hover:bg-white/10"
              title="Ouvrir en pleine page"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {!selected ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="p-2 border-b border-gray-100 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() => setListFilter('all')}
                    className={cn(
                      'h-6 px-2.5 rounded-full text-[11px] font-semibold',
                      listFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-500'
                    )}
                  >
                    Tous
                  </button>
                  <button
                    type="button"
                    onClick={() => setListFilter('unread')}
                    className={cn(
                      'h-6 px-2.5 rounded-full text-[11px] font-semibold',
                      listFilter === 'unread'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-500'
                    )}
                  >
                    Non lus
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCompose(c => (c === 'dm' ? null : 'dm'))}
                    className={cn(
                      'h-8 inline-flex items-center justify-center gap-1 rounded-lg border text-[11px] font-semibold',
                      compose === 'dm'
                        ? 'border-orange-400 bg-orange-500 text-white'
                        : 'border-orange-200 bg-orange-50 text-orange-800'
                    )}
                  >
                    <Plus className="w-3 h-3" />
                    Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompose(c => (c === 'group' ? null : 'group'))}
                    className={cn(
                      'h-8 inline-flex items-center justify-center gap-1 rounded-lg border text-[11px] font-semibold',
                      compose === 'group'
                        ? 'border-slate-700 bg-slate-800 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-800'
                    )}
                  >
                    <Users className="w-3 h-3" />
                    Groupe
                  </button>
                </div>
              </div>

              {compose === 'dm' ? (
                <div className="max-h-32 overflow-y-auto border-b border-gray-100 bg-gray-50">
                  {members.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => void handleOpenDm(m.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 text-left"
                    >
                      <span className="w-7 h-7 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center">
                        {initials(m.nom)}
                      </span>
                      <span className="text-xs font-semibold truncate">{m.nom}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {compose === 'group' ? (
                <div className="border-b border-gray-100 bg-gray-50 p-2 space-y-1.5">
                  <input
                    value={groupTitle}
                    onChange={e => setGroupTitle(e.target.value)}
                    placeholder="Nom du groupe (ex. Atelier)"
                    className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs outline-none"
                  />
                  <p className="text-[10px] text-gray-500">
                    Cochez les membres, puis cliquez Créer
                    {groupPick.length > 0 ? ` · ${groupPick.length} sélectionné(s)` : ''}
                  </p>
                  <div className="max-h-28 overflow-y-auto space-y-0.5">
                    {members.map(m => {
                      const on = groupPick.includes(m.id)
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => togglePick(m.id, groupPick, setGroupPick)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs',
                            on ? 'bg-orange-100' : 'hover:bg-white'
                          )}
                        >
                          <span
                            className={cn(
                              'w-3.5 h-3.5 rounded border text-[9px] flex items-center justify-center',
                              on ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'
                            )}
                          >
                            {on ? '✓' : ''}
                          </span>
                          {m.nom}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreateGroup()}
                    disabled={!groupTitle.trim() || groupPick.length < 1}
                    className="w-full h-8 rounded-lg bg-orange-500 text-white text-xs font-semibold disabled:opacity-40"
                  >
                    Créer le groupe
                  </button>
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <p className="p-4 text-xs text-gray-400 text-center">
                    {listFilter === 'unread' ? 'Aucun message non lu' : 'Aucune conversation'}
                  </p>
                ) : (
                  filteredConversations.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-orange-50/60 border-b border-gray-50 text-left"
                    >
                      <span
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-bold',
                          c.type === 'group'
                            ? 'bg-slate-800 text-orange-300'
                            : 'bg-orange-100 text-orange-800'
                        )}
                      >
                        {c.type === 'group' ? (
                          <Users className="w-3.5 h-3.5" />
                        ) : (
                          initials(c.title)
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {c.title}
                          </span>
                          {c.lastMessage ? (
                            <span className="text-[10px] text-gray-400 flex-shrink-0">
                              {formatTime(c.lastMessage.createdAt)}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex justify-between gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-500 truncate">
                            {c.lastMessage?.body ?? 'Aucun message'}
                          </span>
                          {c.unreadCount > 0 ? (
                            <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                              {c.unreadCount === 1 ? '+1' : `+${c.unreadCount}`}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col">
              {showAdd && selected.type === 'group' ? (
                <div className="border-b border-gray-100 bg-slate-50 p-2 max-h-36 overflow-y-auto space-y-1">
                  {membersNotInSelected.length === 0 ? (
                    <p className="text-[11px] text-gray-400 text-center py-2">Aucun membre à ajouter</p>
                  ) : (
                    <>
                      {membersNotInSelected.map(m => {
                        const on = addPick.includes(m.id)
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => togglePick(m.id, addPick, setAddPick)}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs',
                              on ? 'bg-orange-100' : 'hover:bg-white'
                            )}
                          >
                            <span
                              className={cn(
                                'w-3.5 h-3.5 rounded border text-[9px] flex items-center justify-center',
                                on ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'
                              )}
                            >
                              {on ? '✓' : ''}
                            </span>
                            {m.nom}
                          </button>
                        )
                      })}
                      <button
                        type="button"
                        disabled={addPick.length === 0}
                        onClick={() => void handleAddMembers()}
                        className="w-full h-7 rounded-lg bg-orange-500 text-white text-[11px] font-semibold disabled:opacity-40"
                      >
                        Ajouter ({addPick.length})
                      </button>
                    </>
                  )}
                </div>
              ) : null}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-[#f7f8fa]">
                {loadingMsgs && messages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Chargement…</p>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Aucun message</p>
                ) : (
                  messages.map(m => (
                    <div
                      key={m.id}
                      className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                          m.deleted
                            ? 'bg-gray-100 border border-dashed border-gray-200 text-gray-400 italic'
                            : m.mine
                              ? 'bg-orange-500 text-white rounded-br-md'
                              : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'
                        )}
                      >
                        {!m.mine && !m.deleted && selected.type === 'group' ? (
                          <p className="text-[10px] font-bold text-orange-600 mb-0.5">
                            {m.senderNom}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-snug">
                          {m.deleted
                            ? 'Message supprimé'
                            : m.body?.trim() ||
                              (m.attachments?.some(a => a.kind === 'image')
                                ? '📷 Photo'
                                : m.attachments?.length
                                  ? '📎 Pièce jointe'
                                  : '')}
                        </p>
                        <p
                          className={cn(
                            'text-[9px] mt-1',
                            m.deleted
                              ? 'text-gray-400'
                              : m.mine
                                ? 'text-orange-100 text-right'
                                : 'text-gray-400'
                          )}
                        >
                          {formatTime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <form
                className="p-2 border-t border-gray-100 flex gap-2 bg-white"
                onSubmit={e => {
                  e.preventDefault()
                  void handleSend()
                }}
              >
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Écrire…"
                  className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="h-9 w-9 rounded-xl bg-orange-500 text-white flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
