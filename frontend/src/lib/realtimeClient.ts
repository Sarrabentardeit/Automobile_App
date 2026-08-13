import { playMessageSound, playNotificationSound, unlockAppSounds } from '@/lib/appSounds'

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

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
let reconnectTimer: number | null = null
let pingTimer: number | null = null
let handlers: Handlers = {}
let intentionalClose = false

function wsUrl(token: string) {
  const base = API_BASE.replace(/^http/, 'ws')
  return `${base}/realtime?token=${encodeURIComponent(token)}`
}

function clearTimers() {
  if (reconnectTimer != null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (pingTimer != null) {
    window.clearInterval(pingTimer)
    pingTimer = null
  }
}

function scheduleReconnect() {
  if (intentionalClose || !currentToken) return
  if (reconnectTimer != null) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    if (currentToken) connectRealtime(currentToken, handlers)
  }, 2000)
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
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) &&
    socket.url.includes(encodeURIComponent(token))
  ) {
    return
  }

  try {
    socket?.close()
  } catch {
    /* ignore */
  }
  socket = null
  clearTimers()

  const ws = new WebSocket(wsUrl(token))
  socket = ws

  ws.onopen = () => {
    unlockAppSounds()
    pingTimer = window.setInterval(() => {
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
        window.dispatchEvent(
          new CustomEvent('elmecano:chat_message', { detail: data })
        )
      } else if (data.type === 'notification') {
        playNotificationSound()
        handlers.onNotification?.(data)
      }
    } catch {
      /* ignore */
    }
  }

  ws.onclose = () => {
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
  clearTimers()
  try {
    socket?.close()
  } catch {
    /* ignore */
  }
  socket = null
}

export function isRealtimeConnected() {
  return socket != null && socket.readyState === WebSocket.OPEN
}
