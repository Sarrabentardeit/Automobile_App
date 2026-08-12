import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Filter,
  MessageSquare,
  Search,
  Send,
  Users,
  UserRound,
  Plus,
  UserPlus,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
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

function formatDayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, today)) return "Aujourd'hui"
  if (same(d, yesterday)) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

type ComposeMode = null | 'dm' | 'group'
type ListFilter = 'all' | 'unread'

export default function ChatPage() {
  const { getAccessToken, user } = useAuth()
  const toast = useToast()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [members, setMembers] = useState<ChatMember[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [q, setQ] = useState('')
  const [listFilter, setListFilter] = useState<ListFilter>('all')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [compose, setCompose] = useState<ComposeMode>(null)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupPick, setGroupPick] = useState<number[]>([])
  const [showMembers, setShowMembers] = useState(false)
  const [addPick, setAddPick] = useState<number[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<number | null>(null)

  const selected = useMemo(
    () => conversations.find(c => c.id === selectedId) ?? null,
    [conversations, selectedId]
  )

  const filteredConversations = useMemo(() => {
    const t = q.trim().toLowerCase()
    return conversations.filter(c => {
      if (listFilter === 'unread' && !(c.unreadCount > 0)) return false
      if (!t) return true
      return (
        c.title.toLowerCase().includes(t) ||
        (c.lastMessage?.body ?? '').toLowerCase().includes(t)
      )
    })
  }, [conversations, q, listFilter])

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
      setSelectedId(prev => {
        if (prev && list.some(c => c.id === prev)) return prev
        return list[0]?.id ?? null
      })
    } catch {
      /* silent on poll */
    } finally {
      setLoadingList(false)
    }
  }, [getAccessToken])

  const loadMessages = useCallback(
    async (conversationId: number, opts?: { silent?: boolean }) => {
      const token = getAccessToken()
      if (!token) return
      if (!opts?.silent) setLoadingMessages(true)
      try {
        const list = await fetchChatMessages(token, conversationId)
        setMessages(list)
        await markChatRead(token, conversationId)
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        )
      } catch {
        if (!opts?.silent) toast.error('Impossible de charger les messages')
      } finally {
        if (!opts?.silent) setLoadingMessages(false)
      }
    },
    [getAccessToken, toast]
  )

  useEffect(() => {
    void loadConversations()
    const token = getAccessToken()
    if (token) {
      void fetchChatMembers(token)
        .then(setMembers)
        .catch(() => setMembers([]))
    }
  }, [loadConversations, getAccessToken])

  useEffect(() => {
    if (selectedId == null) {
      setMessages([])
      return
    }
    setShowMembers(false)
    setAddPick([])
    void loadMessages(selectedId)
  }, [selectedId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, selectedId])

  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      void loadConversations()
      if (selectedId != null) void loadMessages(selectedId, { silent: true })
    }, 8000)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [loadConversations, loadMessages, selectedId])

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
      toast.error('Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  const handleOpenDm = async (memberId: number) => {
    const token = getAccessToken()
    if (!token) return
    try {
      const conv = await openDirectChat(token, memberId)
      setCompose(null)
      await loadConversations()
      setSelectedId(conv.id)
    } catch {
      toast.error('Impossible d’ouvrir la conversation')
    }
  }

  const togglePick = (id: number, list: number[], setList: (v: number[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const handleCreateGroup = async () => {
    const token = getAccessToken()
    if (!token) return
    const title = groupTitle.trim()
    if (!title) {
      toast.error('Donnez un nom au groupe')
      return
    }
    if (groupPick.length < 1) {
      toast.error('Sélectionnez au moins un membre')
      return
    }
    try {
      const conv = await createGroupChat(token, title, groupPick)
      setCompose(null)
      setGroupTitle('')
      setGroupPick([])
      await loadConversations()
      setSelectedId(conv.id)
      toast.success('Groupe créé')
    } catch {
      toast.error('Impossible de créer le groupe')
    }
  }

  const handleAddMembers = async () => {
    const token = getAccessToken()
    if (!token || !selected || selected.type !== 'group' || addPick.length === 0) return
    try {
      const updated = await addGroupMembers(token, selected.id, addPick)
      setConversations(prev => prev.map(c => (c.id === updated.id ? updated : c)))
      setAddPick([])
      toast.success('Membre(s) ajouté(s)')
    } catch {
      toast.error('Ajout impossible')
    }
  }

  const messageGroups = useMemo(() => {
    const groups: { day: string; items: ChatMessage[] }[] = []
    for (const m of messages) {
      const day = formatDayLabel(m.createdAt)
      const last = groups[groups.length - 1]
      if (!last || last.day !== day) groups.push({ day, items: [m] })
      else last.items.push(m)
    }
    return groups
  }, [messages])

  return (
    <div className="h-[calc(100vh-7rem)] min-h-[520px] flex flex-col">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            Chat équipe
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Messages privés et groupes entre les comptes de l’application
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr] rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <aside className="border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col min-h-0 bg-slate-50/50">
          <div className="p-3 space-y-2 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <button
                type="button"
                onClick={() => setListFilter('all')}
                className={cn(
                  'h-7 px-3 rounded-full text-xs font-semibold transition-colors',
                  listFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                )}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setListFilter('unread')}
                className={cn(
                  'h-7 px-3 rounded-full text-xs font-semibold transition-colors',
                  listFilter === 'unread'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                )}
              >
                Non lus
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCompose(c => (c === 'dm' ? null : 'dm'))}
                className={cn(
                  'h-9 inline-flex items-center justify-center gap-1 rounded-xl border text-xs font-semibold',
                  compose === 'dm'
                    ? 'border-orange-400 bg-orange-500 text-white'
                    : 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100'
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                Message
              </button>
              <button
                type="button"
                onClick={() => setCompose(c => (c === 'group' ? null : 'group'))}
                className={cn(
                  'h-9 inline-flex items-center justify-center gap-1 rounded-xl border text-xs font-semibold',
                  compose === 'group'
                    ? 'border-slate-700 bg-slate-800 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Groupe
              </button>
            </div>
          </div>

          {compose === 'dm' ? (
            <div className="border-b border-gray-100 bg-white max-h-48 overflow-y-auto">
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Message privé
              </p>
              {members.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">Aucun autre utilisateur</p>
              ) : (
                members.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void handleOpenDm(m.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-orange-50 text-left"
                  >
                    <span className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                      {initials(m.nom)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{m.nom}</span>
                      <span className="block text-[11px] text-gray-500 truncate">
                        <span className="capitalize">{m.role}</span>
                        {m.email ? ` · ${m.email}` : ''}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}

          {compose === 'group' ? (
            <div className="border-b border-gray-100 bg-white p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Nouveau groupe
              </p>
              <input
                value={groupTitle}
                onChange={e => setGroupTitle(e.target.value)}
                placeholder="Nom du groupe (ex. Atelier)"
                className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-orange-500"
              />
              <p className="text-[11px] text-gray-500">
                Cochez les membres
                {groupPick.length > 0 ? ` · ${groupPick.length} sélectionné(s)` : ''}
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {members.map(m => {
                  const on = groupPick.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => togglePick(m.id, groupPick, setGroupPick)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm',
                        on ? 'bg-orange-50 text-orange-900' : 'hover:bg-gray-50'
                      )}
                    >
                      <span
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center text-[10px]',
                          on ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300'
                        )}
                      >
                        {on ? '✓' : ''}
                      </span>
                      <span className="truncate font-medium">{m.nom}</span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => void handleCreateGroup()}
                disabled={!groupTitle.trim() || groupPick.length < 1}
                className="w-full h-9 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-40"
              >
                Créer le groupe
              </button>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="p-4 text-sm text-gray-400">Chargement…</p>
            ) : filteredConversations.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">
                {listFilter === 'unread' ? 'Aucun message non lu' : 'Aucune conversation'}
              </p>
            ) : (
              filteredConversations.map(c => {
                const active = c.id === selectedId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-3 py-3 text-left border-b border-gray-50 transition-colors',
                      active ? 'bg-orange-50/80' : 'hover:bg-white'
                    )}
                  >
                    <span
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        c.type === 'group'
                          ? 'bg-slate-800 text-orange-300'
                          : 'bg-orange-100 text-orange-700'
                      )}
                    >
                      {c.type === 'group' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-bold">{initials(c.title)}</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{c.title}</span>
                        {c.lastMessage ? (
                          <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0">
                            {formatTime(c.lastMessage.createdAt)}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-gray-500 truncate">
                          {c.lastMessage
                            ? `${c.lastMessage.senderId === user?.id ? 'Vous' : c.lastMessage.senderNom.split(' ')[0]} : ${c.lastMessage.body}`
                            : 'Aucun message'}
                        </span>
                        {c.unreadCount > 0 ? (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unreadCount > 99 ? '99+' : c.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <section className="flex flex-col min-h-0 min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium text-gray-500">Sélectionnez une conversation</p>
            </div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
                <span
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    selected.type === 'group'
                      ? 'bg-slate-800 text-orange-300'
                      : 'bg-orange-100 text-orange-800 text-xs font-bold'
                  )}
                >
                  {selected.type === 'group' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    initials(selected.title)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-gray-900 truncate">{selected.title}</h2>
                  <p className="text-xs text-gray-500">
                    {selected.type === 'group'
                      ? `${selected.participants.length} membre(s) · groupe`
                      : 'Message privé'}
                  </p>
                </div>
                {selected.type === 'group' ? (
                  <button
                    type="button"
                    onClick={() => setShowMembers(v => !v)}
                    className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Membres
                  </button>
                ) : null}
              </header>

              {showMembers && selected.type === 'group' ? (
                <div className="border-b border-gray-100 bg-slate-50 px-4 py-3 space-y-2 max-h-56 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Membres du groupe
                    </p>
                    <button type="button" onClick={() => setShowMembers(false)} className="p-1">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.participants.map(p => (
                      <span
                        key={p.userId}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-medium text-gray-700"
                      >
                        <UserRound className="w-3 h-3" />
                        {p.nom}
                        {p.userId === user?.id ? ' (vous)' : ''}
                      </span>
                    ))}
                  </div>
                  {membersNotInSelected.length > 0 ? (
                    <>
                      <p className="text-[11px] text-gray-500 pt-1">Ajouter :</p>
                      <div className="space-y-1">
                        {membersNotInSelected.map(m => {
                          const on = addPick.includes(m.id)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => togglePick(m.id, addPick, setAddPick)}
                              className={cn(
                                'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm',
                                on ? 'bg-orange-50' : 'hover:bg-white'
                              )}
                            >
                              <span
                                className={cn(
                                  'w-4 h-4 rounded border text-[10px] flex items-center justify-center',
                                  on
                                    ? 'bg-orange-500 border-orange-500 text-white'
                                    : 'border-gray-300'
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
                        disabled={addPick.length === 0}
                        onClick={() => void handleAddMembers()}
                        className="h-8 px-3 rounded-lg bg-orange-500 text-white text-xs font-semibold disabled:opacity-40"
                      >
                        Ajouter ({addPick.length})
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] text-gray-400">Tous les utilisateurs sont déjà membres</p>
                  )}
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#f7f8fa]">
                {loadingMessages && messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Démarrez la conversation — restez professionnel et clair.
                  </p>
                ) : (
                  messageGroups.map(g => (
                    <div key={g.day} className="space-y-3">
                      <div className="flex items-center justify-center">
                        <span className="text-[11px] font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1 rounded-full">
                          {g.day}
                        </span>
                      </div>
                      {g.items.map(m => (
                        <div
                          key={m.id}
                          className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm',
                              m.mine
                                ? 'bg-orange-500 text-white rounded-br-md'
                                : 'bg-white border border-gray-100 text-gray-900 rounded-bl-md'
                            )}
                          >
                            {!m.mine && selected.type === 'group' ? (
                              <p className="text-[11px] font-bold text-orange-600 mb-0.5">
                                {m.senderNom}
                              </p>
                            ) : null}
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {m.body}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] mt-1 tabular-nums',
                                m.mine ? 'text-orange-100 text-right' : 'text-gray-400'
                              )}
                            >
                              {formatTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <footer className="p-3 border-t border-gray-100 bg-white">
                <form
                  className="flex items-end gap-2"
                  onSubmit={e => {
                    e.preventDefault()
                    void handleSend()
                  }}
                >
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleSend()
                      }
                    }}
                    rows={1}
                    placeholder="Écrire un message… (Entrée pour envoyer)"
                    className="flex-1 resize-none max-h-32 min-h-[44px] px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="h-11 w-11 rounded-xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 disabled:opacity-40 flex-shrink-0"
                    title="Envoyer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
