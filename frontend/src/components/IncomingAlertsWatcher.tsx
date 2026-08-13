import { useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { fetchChatConversations } from '@/lib/chatApi'
import { playMessageSound, unlockAppSounds } from '@/lib/appSounds'

/** Son message global quand le total des non-lus chat augmente. */
export default function IncomingAlertsWatcher() {
  const { getAccessToken, user } = useAuth()
  const readyRef = useRef(false)
  const chatUnreadRef = useRef(0)

  useEffect(() => {
    const unlock = () => unlockAppSounds()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) {
      readyRef.current = false
      chatUnreadRef.current = 0
      return
    }

    let cancelled = false

    const tick = async () => {
      const token = getAccessToken()
      if (!token || cancelled) return
      try {
        const convos = await fetchChatConversations(token)
        const chatUnread = convos.reduce((s, c) => s + (c.unreadCount || 0), 0)
        if (readyRef.current && chatUnread > chatUnreadRef.current) {
          playMessageSound()
        }
        chatUnreadRef.current = chatUnread
        readyRef.current = true
      } catch {
        /* ignore */
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), 10_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [user?.id, getAccessToken])

  return null
}
