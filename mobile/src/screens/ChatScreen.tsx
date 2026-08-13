import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  addGroupMembers,
  createGroupChat,
  deleteChatMessageForEveryone,
  fetchChatConversations,
  fetchChatMembers,
  fetchChatMessages,
  hideChatMessageForMe,
  applyParticipantRead,
  getMessageReadReceipt,
  markChatRead,
  openDirectChat,
  pinChatMessage,
  sendChatMessage,
  unpinChatMessage,
  type ChatAttachmentInput,
  type ChatConversation,
  type ChatMember,
  type ChatMessage,
} from '../lib/chatApi'
import { playMessageSound } from '../lib/appSounds'
import {
  CHAT_MESSAGE_EVENT,
  CHAT_READ_EVENT,
  isRealtimeConnected,
} from '../lib/realtimeClient'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { resolveUploadUrl } from '../lib/config'
import { downloadChatFile } from '../lib/downloadChatFile'
import { pickVehiculeImages } from '../lib/imageUpload'
import { getSheetBottomInset, getStatusBarInset } from '../lib/safeArea'
import { theme } from '../theme/appTheme'

type Props = {
  accessToken: string
  userId: number
  /** Ouvre directement une conversation (deep-link notif) */
  initialConversationId?: number | null
}

type ComposeMode = 'dm' | 'group'
type ListFilter = 'all' | 'unread'

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

export default function ChatScreen({
  accessToken,
  userId,
  initialConversationId = null,
}: Props) {
  const topInset = getStatusBarInset()
  const bottomInset = getSheetBottomInset()
  const winH = Dimensions.get('window').height
  const composeCardH = Math.min(winH * 0.78, 560)
  const composeScrollH = Math.max(180, composeCardH - 160)
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [members, setMembers] = useState<ChatMember[]>([])
  const [selected, setSelected] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<Array<ChatAttachmentInput & { previewUri?: string }>>(
    []
  )
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [openingDm, setOpeningDm] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>('dm')
  const [listFilter, setListFilter] = useState<ListFilter>('all')
  const [groupTitle, setGroupTitle] = useState('')
  const [groupPick, setGroupPick] = useState<number[]>([])
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [addPick, setAddPick] = useState<number[]>([])
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)
  const [brokenImageIds, setBrokenImageIds] = useState<Set<number>>(() => new Set())
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  messagesRef.current = messages

  const loadList = useCallback(async () => {
    const list = await fetchChatConversations(accessToken)
    setConversations(list)
    setSelected((prev) => {
      if (!prev) return prev
      return list.find((c) => c.id === prev.id) ?? prev
    })
    return list
  }, [accessToken])

  const loadThread = useCallback(
    async (conv: ChatConversation) => {
      const { messages: list, pinnedMessage: pinned } = await fetchChatMessages(
        accessToken,
        conv.id,
        { limit: 40 }
      )
      setMessages(list)
      setPinnedMessage(pinned)
      setHasMoreOlder(list.length >= 40)
      await markChatRead(accessToken, conv.id)
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      )
    },
    [accessToken]
  )

  const pollNewMessages = useCallback(
    async (conv: ChatConversation) => {
      const newest = messagesRef.current[messagesRef.current.length - 1]?.createdAt
      if (!newest) {
        await loadThread(conv)
        return
      }
      const { messages: newer, pinnedMessage: pinned } = await fetchChatMessages(
        accessToken,
        conv.id,
        {
          after: newest,
          limit: 50,
        }
      )
      setPinnedMessage(pinned)
      if (newer.length === 0) return
      const fromOthers = newer.filter((m) => !m.mine && !m.deleted)
      if (fromOthers.length > 0 && !isRealtimeConnected()) playMessageSound()
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        const add = newer.filter((m) => !ids.has(m.id))
        return add.length ? [...prev, ...add] : prev
      })
      await markChatRead(accessToken, conv.id)
    },
    [accessToken, loadThread]
  )

  const loadOlder = useCallback(async () => {
    if (!selected || loadingOlder || !hasMoreOlder) return
    const oldest = messagesRef.current[0]?.createdAt
    if (!oldest) return
    setLoadingOlder(true)
    try {
      const { messages: older } = await fetchChatMessages(accessToken, selected.id, {
        before: oldest,
        limit: 40,
      })
      if (older.length === 0) {
        setHasMoreOlder(false)
        return
      }
      setHasMoreOlder(older.length >= 40)
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id))
        const add = older.filter((m) => !ids.has(m.id))
        return [...add, ...prev]
      })
    } finally {
      setLoadingOlder(false)
    }
  }, [accessToken, selected, loadingOlder, hasMoreOlder])

  useEffect(() => {
    setLoading(true)
    void loadList()
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
    void fetchChatMembers(accessToken)
      .then(setMembers)
      .catch(() => setMembers([]))
  }, [accessToken, loadList])

  useEffect(() => {
    if (!initialConversationId) return
    void loadList()
      .then((list) => {
        const conv = list.find((c) => c.id === initialConversationId)
        if (conv) {
          setSelected(conv)
          setDraft('')
        }
      })
      .catch(() => undefined)
  }, [initialConversationId, loadList])

  useEffect(() => {
    if (!selected) return
    const conv = selected
    setHasMoreOlder(true)
    void loadThread(conv).catch(() => setMessages([]))
    const id = setInterval(() => {
      void pollNewMessages(conv).catch(() => undefined)
      void loadList().catch(() => undefined)
    }, 10000)
    return () => clearInterval(id)
    // Recharger le fil uniquement au changement de conversation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      CHAT_MESSAGE_EVENT,
      (data: { conversationId?: number }) => {
        void loadList().catch(() => undefined)
        if (selected && data?.conversationId === selected.id) {
          void pollNewMessages(selected).catch(() => undefined)
        }
      }
    )
    return () => sub.remove()
  }, [selected, loadList, pollNewMessages])

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      CHAT_READ_EVENT,
      (data: { conversationId?: number; userId?: number; lastReadAt?: string }) => {
        if (!data?.conversationId || !data.userId || !data.lastReadAt) return
        setConversations((prev) =>
          applyParticipantRead(prev, data.conversationId!, data.userId!, data.lastReadAt!)
        )
        setSelected((prev) => {
          if (!prev || prev.id !== data.conversationId) return prev
          return {
            ...prev,
            participants: prev.participants.map((p) =>
              p.userId === data.userId ? { ...p, lastReadAt: data.lastReadAt! } : p
            ),
          }
        })
      }
    )
    return () => sub.remove()
  }, [])

  const openConversation = (c: ChatConversation) => {
    setSelected(c)
    setDraft('')
    setPending([])
    setPinnedMessage(null)
    setShowAddMembers(false)
    setAddPick([])
  }

  const handlePickImage = async (useCamera: boolean) => {
    try {
      const left = 5 - pending.length
      if (left <= 0) {
        Alert.alert('Chat', 'Maximum 5 pièces jointes')
        return
      }
      const picked = await pickVehiculeImages({
        useCamera,
        category: 'intervention',
        selectionLimit: left,
      })
      if (!picked.length) return
      setPending((prev) => [
        ...prev,
        ...picked.map((p) => ({
          dataUrl: p.payload.dataUrl,
          fileName: p.payload.fileName,
          previewUri: p.uri,
        })),
      ])
    } catch (e) {
      Alert.alert('Chat', e instanceof Error ? e.message : 'Sélection impossible')
    }
  }

  const handlePickPdf = async () => {
    try {
      const left = 5 - pending.length
      if (left <= 0) {
        Alert.alert('Chat', 'Maximum 5 pièces jointes')
        return
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: left > 1,
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets?.length) return
      const assets = result.assets.slice(0, left)
      const next: Array<ChatAttachmentInput & { previewUri?: string }> = []
      for (const asset of assets) {
        const size = asset.size ?? 0
        if (size > 8 * 1024 * 1024) {
          Alert.alert('Chat', `${asset.name || 'PDF'} trop volumineux (max 8 Mo)`)
          continue
        }
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        if (!base64) continue
        next.push({
          dataUrl: `data:application/pdf;base64,${base64}`,
          fileName: asset.name || `document-${Date.now()}.pdf`,
        })
      }
      if (next.length) setPending((prev) => [...prev, ...next])
    } catch (e) {
      Alert.alert('Chat', e instanceof Error ? e.message : 'Sélection PDF impossible')
    }
  }

  const handleAttachPress = () => {
    Alert.alert('Joindre', 'Photo, image ou PDF', [
      { text: 'Galerie', onPress: () => void handlePickImage(false) },
      { text: 'Caméra', onPress: () => void handlePickImage(true) },
      { text: 'PDF', onPress: () => void handlePickPdf() },
      { text: 'Annuler', style: 'cancel' },
    ])
  }

  const handleSend = async () => {
    if (!selected || sending) return
    const text = draft.trim()
    if (!text && pending.length === 0) return
    const snapshot = pending
    const attachments = snapshot.map(({ dataUrl, fileName }) => ({ dataUrl, fileName }))
    setSending(true)
    setDraft('')
    setPending([])
    try {
      const msg = await sendChatMessage(accessToken, selected.id, text, attachments)
      setMessages((prev) => [...prev, msg])
      void loadList()
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80)
    } catch {
      setDraft(text)
      setPending(snapshot)
      Alert.alert('Chat', 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  const openMessageActions = (m: ChatMessage) => {
    if (m.deleted || !selected) return
    const buttons: Array<{
      text: string
      style?: 'cancel' | 'destructive' | 'default'
      onPress?: () => void
    }> = [
      {
        text: 'Épingler',
        onPress: () => {
          void pinChatMessage(accessToken, selected.id, m.id)
            .then((pinned) => {
              setPinnedMessage(pinned)
            })
            .catch(() => Alert.alert('Chat', 'Épinglage impossible'))
        },
      },
      {
        text: 'Supprimer pour moi',
        onPress: () => {
          void hideChatMessageForMe(accessToken, m.id)
            .then(() => {
              setMessages((prev) => prev.filter((x) => x.id !== m.id))
              if (pinnedMessage?.id === m.id) setPinnedMessage(null)
            })
            .catch(() => Alert.alert('Chat', 'Action impossible'))
        },
      },
    ]
    if (m.mine) {
      buttons.push({
        text: 'Supprimer pour tous',
        style: 'destructive',
        onPress: () => {
          void deleteChatMessageForEveryone(accessToken, m.id)
            .then((updated) => {
              setMessages((prev) => prev.map((x) => (x.id === m.id ? updated : x)))
              if (pinnedMessage?.id === m.id) setPinnedMessage(null)
              void loadList()
            })
            .catch(() => Alert.alert('Chat', 'Suppression impossible'))
        },
      })
    }
    buttons.push({ text: 'Annuler', style: 'cancel' })
    Alert.alert('Message', undefined, buttons)
  }

  const handleNewDm = async (memberId: number) => {
    if (openingDm) return
    setOpeningDm(true)
    try {
      const conv = await openDirectChat(accessToken, memberId)
      if (!conv?.id) throw new Error('Conversation introuvable')
      setShowCompose(false)
      await loadList()
      openConversation(conv)
    } catch (e) {
      Alert.alert(
        'Chat',
        e instanceof Error ? e.message : 'Impossible d’ouvrir la conversation'
      )
    } finally {
      setOpeningDm(false)
    }
  }

  const togglePick = (id: number, list: number[], setList: (v: number[]) => void) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const handleCreateGroup = async () => {
    const title = groupTitle.trim()
    if (!title || groupPick.length < 1) return
    try {
      const conv = await createGroupChat(accessToken, title, groupPick)
      if (!conv?.id) throw new Error('Groupe introuvable')
      setShowCompose(false)
      setGroupTitle('')
      setGroupPick([])
      await loadList()
      openConversation(conv)
    } catch (e) {
      Alert.alert(
        'Chat',
        e instanceof Error ? e.message : 'Impossible de créer le groupe'
      )
    }
  }

  const membersNotInSelected = useMemo(() => {
    if (!selected || selected.type !== 'group') return []
    const have = new Set(selected.participants.map((p) => p.userId))
    return members.filter((m) => !have.has(m.id))
  }, [members, selected])

  const handleAddMembers = async () => {
    if (!selected || selected.type !== 'group' || addPick.length === 0) return
    try {
      const updated = await addGroupMembers(accessToken, selected.id, addPick)
      setSelected(updated)
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setAddPick([])
      setShowAddMembers(false)
    } catch {
      /* ignore */
    }
  }

  const totalUnread = useMemo(
    () => conversations.reduce((s, c) => s + (c.unreadCount || 0), 0),
    [conversations]
  )

  const filteredConversations = useMemo(() => {
    if (listFilter === 'all') return conversations
    return conversations.filter((c) => c.unreadCount > 0)
  }, [conversations, listFilter])

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View>
          <Text style={styles.title}>Chat équipe</Text>
          <Text style={styles.sub}>
            {totalUnread > 0 ? `${totalUnread} non lu(s)` : 'Privés et groupes'}
          </Text>
        </View>
        <Pressable
          style={styles.newBtn}
          onPress={() => {
            setComposeMode('dm')
            setShowCompose(true)
          }}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <Ionicons name="filter-outline" size={14} color={theme.textSubtle} />
        <Pressable
          style={[styles.pill, listFilter === 'all' && styles.pillActive]}
          onPress={() => setListFilter('all')}
        >
          <Text style={[styles.pillText, listFilter === 'all' && styles.pillTextActive]}>Tous</Text>
        </Pressable>
        <Pressable
          style={[styles.pill, listFilter === 'unread' && styles.pillActive]}
          onPress={() => setListFilter('unread')}
        >
          <Text style={[styles.pillText, listFilter === 'unread' && styles.pillTextActive]}>
            Non lus
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadList().finally(() => setRefreshing(false))
              }}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {listFilter === 'unread'
                ? 'Aucun message non lu'
                : 'Aucune conversation pour le moment'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openConversation(item)}>
              <View
                style={[
                  styles.avatar,
                  item.type === 'group' ? styles.avatarGroup : styles.avatarDm,
                ]}
              >
                {item.type === 'group' ? (
                  <Ionicons name="people" size={18} color="#fdba74" />
                ) : (
                  <Text style={styles.avatarText}>{initials(item.title)}</Text>
                )}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.lastMessage ? (
                    <Text style={styles.rowTime}>{formatTime(item.lastMessage.createdAt)}</Text>
                  ) : null}
                </View>
                <View style={styles.rowTop}>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {item.lastMessage
                      ? `${item.lastMessage.senderId === userId ? 'Vous' : item.lastMessage.senderNom.split(' ')[0]} : ${item.lastMessage.body}`
                      : 'Aucun message'}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={selected != null} animationType="slide" onRequestClose={() => setSelected(null)}>
        <KeyboardAvoidingView
          style={styles.threadRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.threadHeader, { paddingTop: topInset + 8 }]}>
            <Pressable onPress={() => setSelected(null)} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.threadTitle} numberOfLines={1}>
                {selected?.title}
              </Text>
              <Text style={styles.threadSub}>
                {selected?.type === 'group'
                  ? `${selected.participants.length} membre(s)`
                  : 'Message privé'}
              </Text>
            </View>
            {selected?.type === 'group' ? (
              <Pressable
                onPress={() => {
                  setAddPick([])
                  setShowAddMembers(true)
                }}
                hitSlop={10}
                style={styles.backBtn}
              >
                <Ionicons name="person-add-outline" size={22} color={theme.primary} />
              </Pressable>
            ) : null}
          </View>

          {pinnedMessage && !pinnedMessage.deleted ? (
            <View style={styles.pinBar}>
              <Ionicons name="pin" size={14} color="#92400e" />
              <Text style={styles.pinText} numberOfLines={1}>
                {pinnedMessage.body?.trim() ||
                  (pinnedMessage.attachments?.[0]?.kind === 'image'
                    ? '📷 Photo'
                    : pinnedMessage.attachments?.length
                      ? '📎 Pièce jointe'
                      : 'Message épinglé')}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  if (!selected) return
                  void unpinChatMessage(accessToken, selected.id)
                    .then(() => setPinnedMessage(null))
                    .catch(() => Alert.alert('Chat', 'Impossible de retirer l’épingle'))
                }}
              >
                <Ionicons name="close" size={16} color="#92400e" />
              </Pressable>
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.msgPad}
            onContentSizeChange={() => {
              if (loadingOlder) return
              listRef.current?.scrollToEnd({ animated: false })
            }}
            ListHeaderComponent={
              hasMoreOlder && messages.length > 0 ? (
                <Pressable
                  style={styles.loadOlderBtn}
                  onPress={() => void loadOlder()}
                  disabled={loadingOlder}
                >
                  <Text style={styles.loadOlderText}>
                    {loadingOlder ? 'Chargement…' : 'Messages plus anciens'}
                  </Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={<Text style={styles.empty}>Écrivez le premier message</Text>}
            renderItem={({ item }) => (
              <Pressable
                onLongPress={() => openMessageActions(item)}
                style={[styles.bubbleWrap, item.mine ? styles.mineWrap : styles.theirsWrap]}
              >
                <View
                  style={[
                    styles.bubble,
                    item.deleted
                      ? styles.deletedBubble
                      : item.mine
                        ? styles.mineBubble
                        : styles.theirsBubble,
                  ]}
                >
                  {!item.mine && !item.deleted && selected?.type === 'group' ? (
                    <Text style={styles.sender}>{item.senderNom}</Text>
                  ) : null}
                  {item.deleted ? (
                    <Text style={[styles.bubbleText, styles.deletedText]}>Message supprimé</Text>
                  ) : (
                    <>
                      {(item.attachments ?? []).map((a) => {
                        const url = resolveUploadUrl(a.url_path)
                        const openFile = () => {
                          void downloadChatFile(a.url_path, a.original_name || 'fichier', {
                            accessToken,
                          }).catch(() => {
                            Alert.alert(
                              'Téléchargement',
                              'Impossible de télécharger le fichier'
                            )
                            void Linking.openURL(url)
                          })
                        }
                        if (a.kind === 'image' && !brokenImageIds.has(a.id)) {
                          return (
                            <Pressable
                              key={a.id}
                              onPress={openFile}
                              onLongPress={openFile}
                              style={styles.attImgWrap}
                            >
                              <Image
                                source={{ uri: url }}
                                style={styles.attImg}
                                onError={() => {
                                  setBrokenImageIds((prev) => {
                                    const next = new Set(prev)
                                    next.add(a.id)
                                    return next
                                  })
                                }}
                              />
                            </Pressable>
                          )
                        }
                        return (
                          <Pressable
                            key={a.id}
                            onPress={openFile}
                            style={[styles.fileChip, item.mine && styles.fileChipMine]}
                          >
                            <Ionicons
                              name={
                                a.kind === 'image' ? 'image-outline' : 'document-text-outline'
                              }
                              size={14}
                              color={item.mine ? '#fff' : theme.text}
                            />
                            <Text
                              style={[styles.fileChipText, item.mine && styles.mineText]}
                              numberOfLines={1}
                            >
                              {a.original_name || (a.kind === 'image' ? 'Photo' : 'Fichier')}
                            </Text>
                            <Ionicons
                              name="download-outline"
                              size={14}
                              color={item.mine ? '#fff' : theme.text}
                            />
                          </Pressable>
                        )
                      })}
                      {item.body?.trim() ? (
                        <Text style={[styles.bubbleText, item.mine && styles.mineText]}>
                          {item.body}
                        </Text>
                      ) : null}
                    </>
                  )}
                  <Text
                    style={[
                      styles.bubbleTime,
                      item.mine && !item.deleted && styles.mineTime,
                      item.deleted && styles.deletedText,
                    ]}
                  >
                    {formatTime(item.createdAt)}
                    {(() => {
                      const receipt = getMessageReadReceipt(item, selected, userId)
                      if (!receipt) return ''
                      return ` · ${receipt.label}`
                    })()}
                  </Text>
                </View>
              </Pressable>
            )}
          />

          {pending.length > 0 ? (
            <ScrollView
              horizontal
              style={styles.pendingRow}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 10 }}
            >
              {pending.map((p, i) => (
                <View key={`${p.fileName}-${i}`} style={styles.pendingThumb}>
                  {p.previewUri ? (
                    <Image source={{ uri: p.previewUri }} style={styles.pendingImg} />
                  ) : (
                    <Ionicons name="document" size={20} color={theme.textMuted} />
                  )}
                  <Pressable
                    style={styles.pendingRemove}
                    onPress={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={[styles.composer, { paddingBottom: Math.max(10, bottomInset) }]}>
            <Pressable style={styles.attachBtn} onPress={handleAttachPress}>
              <Ionicons name="attach" size={22} color={theme.textSecondary} />
            </Pressable>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Écrire un message…"
              placeholderTextColor={theme.textSubtle}
              multiline
            />
            <Pressable
              style={[
                styles.sendBtn,
                ((!draft.trim() && pending.length === 0) || sending) && styles.sendDisabled,
              ]}
              disabled={(!draft.trim() && pending.length === 0) || sending}
              onPress={() => void handleSend()}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Composer DM / Groupe — centré */}
      <Modal
        visible={showCompose}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompose(false)}
      >
        <View style={styles.centerOverlay}>
          <Pressable style={styles.backdropTap} onPress={() => setShowCompose(false)} />
          <View style={[styles.composeCard, { height: composeCardH }]}>
            <View style={styles.composeAccent} />
            <View style={styles.composeHeader}>
              <Text style={styles.sheetTitle}>Nouvelle conversation</Text>
              <Pressable onPress={() => setShowCompose(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, composeMode === 'dm' && styles.tabActive]}
                onPress={() => setComposeMode('dm')}
              >
                <Text style={[styles.tabText, composeMode === 'dm' && styles.tabTextActive]}>
                  Message
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, composeMode === 'group' && styles.tabActiveDark]}
                onPress={() => setComposeMode('group')}
              >
                <Text style={[styles.tabText, composeMode === 'group' && styles.tabTextActive]}>
                  Groupe
                </Text>
              </Pressable>
            </View>

            {composeMode === 'dm' ? (
              <ScrollView
                style={{ maxHeight: composeScrollH }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {openingDm ? (
                  <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
                ) : null}
                {members.length === 0 ? (
                  <Text style={styles.empty}>Aucun autre utilisateur</Text>
                ) : (
                  members.map((m) => (
                    <Pressable
                      key={m.id}
                      style={[styles.memberRow, openingDm && { opacity: 0.5 }]}
                      disabled={openingDm}
                      onPress={() => void handleNewDm(m.id)}
                    >
                      <View style={[styles.avatar, styles.avatarDm]}>
                        <Text style={styles.avatarText}>{initials(m.nom)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{m.nom}</Text>
                        <Text style={styles.threadSub} numberOfLines={1}>
                          {m.role}
                          {m.email ? ` · ${m.email}` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            ) : (
              <ScrollView
                style={{ maxHeight: composeScrollH }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <TextInput
                  style={styles.groupInput}
                  value={groupTitle}
                  onChangeText={setGroupTitle}
                  placeholder="Nom du groupe"
                  placeholderTextColor={theme.textSubtle}
                />
                <Text style={[styles.sheetHint, { paddingHorizontal: 16 }]}>
                  Sélectionnez les membres
                </Text>
                {members.map((m) => {
                  const on = groupPick.includes(m.id)
                  return (
                    <Pressable
                      key={m.id}
                      style={styles.memberRow}
                      onPress={() => togglePick(m.id, groupPick, setGroupPick)}
                    >
                      <View style={[styles.check, on && styles.checkOn]}>
                        {on ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                      </View>
                      <Text style={styles.rowTitle}>{m.nom}</Text>
                    </Pressable>
                  )
                })}
                <Pressable
                  style={[
                    styles.createBtn,
                    (!groupTitle.trim() || groupPick.length < 1) && styles.sendDisabled,
                  ]}
                  disabled={!groupTitle.trim() || groupPick.length < 1}
                  onPress={() => void handleCreateGroup()}
                >
                  <Text style={styles.createBtnText}>Créer le groupe</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Ajouter membres */}
      <Modal
        visible={showAddMembers}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddMembers(false)}
      >
        <View style={styles.centerOverlay}>
          <Pressable style={styles.backdropTap} onPress={() => setShowAddMembers(false)} />
          <View style={[styles.composeCard, { maxHeight: composeCardH, height: undefined }]}>
            <View style={styles.composeAccent} />
            <View style={styles.composeHeader}>
              <Text style={styles.sheetTitle}>Ajouter des membres</Text>
              <Pressable onPress={() => setShowAddMembers(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.sheetHint, { paddingHorizontal: 16 }]}>
              {selected?.participants.map((p) => p.nom).join(', ')}
            </Text>
            <ScrollView
              style={{ maxHeight: composeScrollH }}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {membersNotInSelected.length === 0 ? (
                <Text style={styles.empty}>Tous les utilisateurs sont déjà membres</Text>
              ) : (
                membersNotInSelected.map((m) => {
                  const on = addPick.includes(m.id)
                  return (
                    <Pressable
                      key={m.id}
                      style={styles.memberRow}
                      onPress={() => togglePick(m.id, addPick, setAddPick)}
                    >
                      <View style={[styles.check, on && styles.checkOn]}>
                        {on ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
                      </View>
                      <Text style={styles.rowTitle}>{m.nom}</Text>
                    </Pressable>
                  )
                })
              )}
            </ScrollView>
            {membersNotInSelected.length > 0 ? (
              <View style={{ padding: 16, paddingBottom: Math.max(16, bottomInset) }}>
                <Pressable
                  style={[styles.createBtn, addPick.length === 0 && styles.sendDisabled]}
                  disabled={addPick.length === 0}
                  onPress={() => void handleAddMembers()}
                >
                  <Text style={styles.createBtnText}>Ajouter ({addPick.length})</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '800', color: theme.text },
  sub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.bg,
  },
  pill: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pillText: { fontSize: 12, fontWeight: '700', color: theme.textMuted },
  pillTextActive: { color: '#fff' },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listPad: { padding: 12, paddingBottom: 40 },
  empty: { textAlign: 'center', color: theme.textSubtle, marginTop: 24, fontSize: 13 },
  loadOlderBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: theme.surfaceMuted,
  },
  loadOlderText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGroup: { backgroundColor: '#1e293b' },
  avatarDm: { backgroundColor: '#ffedd5' },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#c2410c' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: theme.text, flex: 1 },
  rowTime: { fontSize: 11, color: theme.textSubtle },
  rowPreview: { fontSize: 12, color: theme.textMuted, flex: 1, marginTop: 3 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  threadRoot: { flex: 1, backgroundColor: theme.bg },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 10,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  backBtn: { padding: 6 },
  threadTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
  threadSub: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  pinBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  pinText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400e' },
  msgPad: { padding: 12, paddingBottom: 20 },
  bubbleWrap: { marginBottom: 8, flexDirection: 'row' },
  mineWrap: { justifyContent: 'flex-end' },
  theirsWrap: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mineBubble: { backgroundColor: theme.primary, borderBottomRightRadius: 4 },
  theirsBubble: {
    backgroundColor: theme.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.borderLight,
  },
  deletedBubble: {
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.border,
  },
  sender: { fontSize: 11, fontWeight: '800', color: theme.primaryDark, marginBottom: 2 },
  bubbleText: { fontSize: 14, color: theme.text, lineHeight: 20 },
  deletedText: { color: theme.textSubtle, fontStyle: 'italic' },
  mineText: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: theme.textSubtle, marginTop: 4 },
  mineTime: { color: '#ffedd5', textAlign: 'right' },
  attImgWrap: { marginBottom: 6, borderRadius: 10, overflow: 'hidden' },
  attImg: { width: 200, height: 160, borderRadius: 10 },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: theme.surfaceMuted,
    marginBottom: 6,
    maxWidth: 200,
  },
  fileChipMine: { backgroundColor: 'rgba(255,255,255,0.2)' },
  fileChipText: { fontSize: 12, fontWeight: '600', color: theme.text, flexShrink: 1 },
  pendingRow: {
    maxHeight: 72,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
    paddingVertical: 8,
  },
  pendingThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: theme.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pendingImg: { width: 56, height: 56 },
  pendingRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  attachBtn: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.surfaceMuted,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  centerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  composeCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: 'hidden',
    zIndex: 2,
    elevation: 12,
    paddingBottom: 8,
  },
  composeAccent: { height: 3, backgroundColor: theme.primary },
  composeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: theme.text },
  sheetHint: { fontSize: 12, color: theme.textMuted, marginBottom: 10 },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceMuted,
  },
  tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabActiveDark: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  tabText: { fontSize: 13, fontWeight: '700', color: theme.textMuted },
  tabTextActive: { color: '#fff' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  groupInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
    marginBottom: 8,
    marginHorizontal: 16,
    backgroundColor: theme.surfaceMuted,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  createBtn: {
    marginTop: 12,
    marginHorizontal: 16,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
})
