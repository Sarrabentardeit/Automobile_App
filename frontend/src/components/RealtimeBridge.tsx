import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { connectRealtime, disconnectRealtime, setRealtimeHandlers } from '@/lib/realtimeClient'

/** Connexion WebSocket globale : son immédiat + refresh notifs. */
export default function RealtimeBridge() {
  const { getAccessToken, isAuthenticated } = useAuth()
  const { refreshApiNotifications } = useNotifications()

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectRealtime()
      return
    }
    const token = getAccessToken()
    if (!token) {
      disconnectRealtime()
      return
    }

    setRealtimeHandlers({
      onNotification: () => {
        void refreshApiNotifications()
      },
      onChatMessage: () => {
        // Le fil chat se met à jour via son poll / reload ; son déjà joué.
      },
    })
    connectRealtime(token)

    return () => {
      disconnectRealtime()
    }
  }, [isAuthenticated, getAccessToken, refreshApiNotifications])

  return null
}
