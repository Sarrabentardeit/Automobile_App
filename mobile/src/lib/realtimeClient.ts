import { DeviceEventEmitter } from 'react-native'
import { API_BASE } from './config'
import { playMessageSound, playNotificationSound } from './appSounds'

export const CHAT_MESSAGE_EVENT = 'elmecano:chat_message'

export type RealtimeEvent =
  | { type: 'connected'; userId: number }
  | { type: 'pong' }
  | {
      type: 'chat_message'
      conversationId: number
      messageId: number
      senderId: number
    }
  | {
      type: 'notification'
      notificationId: number
      notifType: string
      conversationId?: number | null
    }

type Handlers = {
  onChatMessage?: (ev: Extract<RealtimeEvent, { type: 'chat_message' }>) => void
  onNotification?: (ev: Extract<RealtimeEvent, { type: 'notification' }>) => void
}

let socket: WebSocket | null = null
let currentToken: string | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let pingTimer: ReturnType<typeof setInterval> | null = null
let handlers: Handlers = {}
let intentionalClose = false
let connected = false

function wsUrl(token: string) {
  const base = API_BASE.replace(/\/$/, '').replace(/^http/, 'ws')
  return `${base}/realtime?token=${encodeURIComponent(token)}`
}

function clearTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (pingTimer) {
    clearInterval(pingTimer)
    pingTimer = null
  }
}

function scheduleReconnect() {
  if (intentionalClose || !currentToken) return
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (currentToken) connectRealtime(currentToken, handlers)
  }, 2500)
}

export function setRealtimeHandlers(next: Handlers) {
  handlers = next
}

export function connectRealtime(token: string, nextHandlers?: Handlers) {
  if (nextHandlers) handlers = nextHandlers
  currentToken = token
  intentionalClose = false

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return
  }

  try {
    socket?.close()
  } catch {
    /* ignore */
  }
  socket = null
  connected = false
  clearTimers()

  const ws = new WebSocket(wsUrl(token))
  socket = ws

  ws.onopen = () => {
    connected = true
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }))
        } catch {
          /* ignore */
        }
      }
    }, 25_000)
  }

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(String(evt.data)) as RealtimeEvent
      if (data.type === 'chat_message') {
        playMessageSound()
        handlers.onChatMessage?.(data)
        DeviceEventEmitter.emit(CHAT_MESSAGE_EVENT, data)
      } else if (data.type === 'notification') {
        playNotificationSound()
        handlers.onNotification?.(data)
      }
    } catch {
      /* ignore */
    }
  }

  ws.onclose = () => {
    connected = false
    clearTimers()
    if (socket === ws) socket = null
    scheduleReconnect()
  }

  ws.onerror = () => {
    try {
      ws.close()
    } catch {
      /* ignore */
    }
  }
}

export function disconnectRealtime() {
  intentionalClose = true
  currentToken = null
  connected = false
  clearTimers()
  try {
    socket?.close()
  } catch {
    /* ignore */
  }
  socket = null
}

export function isRealtimeConnected() {
  return connected && socket != null && socket.readyState === WebSocket.OPEN
}
