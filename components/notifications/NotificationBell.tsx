'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, BellOff } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import NotificationItem from './NotificationItem'
import type { NotificationRow } from '@/types/database'

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications()

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  const handleNotificationClick = useCallback(
    (notification: NotificationRow) => {
      setOpen(false)
      if (notification.link) {
        router.push(notification.link)
      }
    },
    [router]
  )

  const handleMarkAllRead = useCallback(() => {
    void markAllAsRead()
  }, [markAllAsRead])

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ct-primary"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panneau notifications */}
      {open && (
        <div
          ref={panelRef}
          className="notification-panel absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl sm:w-96"
        >
          {/* En-tête */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-ct-primary transition-colors hover:bg-ct-primary/5"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-ct-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <BellOff className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">Aucune notification</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Vous serez notifié des événements importants
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onRead={markAsRead}
                    onDelete={deleteNotification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
