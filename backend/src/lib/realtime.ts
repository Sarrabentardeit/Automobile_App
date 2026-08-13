import type { Server as HttpServer, IncomingMessage } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export type RealtimeEvent =
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

type Client = {
  userId: number
  socket: WebSocket
}

const clientsByUser = new Map<number, Set<WebSocket>>()

function addClient(userId: number, socket: WebSocket) {
  let set = clientsByUser.get(userId)
  if (!set) {
    set = new Set()
    clientsByUser.set(userId, set)
  }
  set.add(socket)
}

function removeClient(userId: number, socket: WebSocket) {
  const set = clientsByUser.get(userId)
  if (!set) return
  set.delete(socket)
  if (set.size === 0) clientsByUser.delete(userId)
}

function parseUserId(req: IncomingMessage): number | null {
  try {
    const host = req.headers.host ?? 'localhost'
    const url = new URL(req.url ?? '/', `http://${host}`)
    const token = url.searchParams.get('token')?.trim()
    if (!token) return null
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub?: number | string }
    const id = Number(payload.sub)
    return Number.isInteger(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

export function attachRealtime(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/realtime' })

  wss.on('connection', (socket, req) => {
    const userId = parseUserId(req)
    if (!userId) {
      socket.close(4401, 'Unauthorized')
      return
    }

    addClient(userId, socket)
    socket.send(JSON.stringify({ type: 'connected', userId }))

    socket.on('close', () => removeClient(userId, socket))
    socket.on('error', () => removeClient(userId, socket))
    // Keepalive from client optional; ping periodically
    socket.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw))
        if (data?.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
        }
      } catch {
        /* ignore */
      }
    })
  })

  const pingTimer = setInterval(() => {
    for (const set of clientsByUser.values()) {
      for (const socket of set) {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.ping()
          } catch {
            /* ignore */
          }
        }
      }
    }
  }, 30_000)
  pingTimer.unref?.()

  console.log('[realtime] WebSocket attached on /realtime')
}

export function emitToUser(userId: number, event: RealtimeEvent) {
  const set = clientsByUser.get(userId)
  if (!set || set.size === 0) return
  const payload = JSON.stringify(event)
  for (const socket of set) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(payload)
      } catch {
        /* ignore */
      }
    }
  }
}

export function emitToUsers(userIds: number[], event: RealtimeEvent) {
  const unique = Array.from(new Set(userIds.filter((id) => Number.isInteger(id) && id > 0)))
  for (const id of unique) emitToUser(id, event)
}
