import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationsContext'
import { ROLE_CONFIG } from '@/types'
import { Menu, Bell } from 'lucide-react'

interface HeaderProps { onMenuClick: () => void }

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { myNotifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const myNotifs = user ? myNotifications(user.id) : []
  const unread = user ? unreadCount(user.id) : 0

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [])

  return (
    <header className="lg:hidden bg-white border-b border-gray-200 px-3 py-2.5 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 rounded-xl transition-colors active:bg-gray-200">
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <img src="/logo.jpg" alt="El Mecano" className="w-8 h-8 rounded-lg object-contain" />
        <span className="font-bold text-gray-900 text-sm">EL MECANO</span>
      </div>
      {user && (
        <div className="flex items-center gap-2">
          <div className="relative" ref={notifRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNotif(!showNotif) }}
              className={`p-2 rounded-xl relative ${showNotif ? 'bg-orange-100' : 'hover:bg-gray-100'}`}
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg ring-2 ring-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute top-full right-0 mt-2 w-80 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-orange-200 text-gray-900 z-[100]">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-orange-50 rounded-t-2xl">
                  <span className="text-sm font-bold">Notifications</span>
                  {unread > 0 && (
                    <button onClick={() => markAllAsRead(user.id)} className="text-xs text-orange-600 hover:underline">
                      Tout marquer lu
                    </button>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {myNotifs.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">Aucune notification</p>
                  ) : (
                    myNotifs.slice(0, 20).map(n => (
                      <div
                        key={n.id}
                        className={`p-3 text-left cursor-pointer hover:bg-gray-50 ${!n.read ? 'bg-orange-50/50' : ''}`}
                        onClick={() => {
                          markAsRead(n.id)
                          setShowNotif(false)
                          if (n.reclamationId != null) navigate('/reclamation')
                        }}
                      >
                        {n.title && <p className="text-xs font-semibold text-orange-600">{n.title}</p>}
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(n.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${ROLE_CONFIG[user.role].bg} ${ROLE_CONFIG[user.role].color}`}>
            {ROLE_CONFIG[user.role].label}
          </span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-bold text-white">
            {user.nom_complet.charAt(0)}
          </div>
        </div>
      )}
    </header>
  )
}
