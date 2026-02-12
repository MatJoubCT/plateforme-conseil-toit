'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { getSessionToken } from '@/lib/hooks/useSessionToken'
import type { NotificationRow } from '@/types/database'

const POLL_INTERVAL_MS = 60_000 // 60 secondes

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: sessionData } = await supabaseBrowser.auth.getSession()
      if (!sessionData?.session?.user) return

      const userId = sessionData.session.user.id

      // Récupérer les 50 dernières notifications
      const { data, error } = await supabaseBrowser
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) return

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n) => !n.is_read).length)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch initial + polling
  useEffect(() => {
    void fetchNotifications()

    intervalRef.current = setInterval(() => {
      void fetchNotifications()
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchNotifications])

  const markAsRead = useCallback(
    async (id: string) => {
      const token = await getSessionToken()
      if (!token) return

      // Optimiste : mise à jour locale immédiate
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      })
    },
    []
  )

  const markAllAsRead = useCallback(async () => {
    const token = await getSessionToken()
    if (!token) return

    // Optimiste
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)

    await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }, [])

  const deleteNotification = useCallback(
    async (id: string) => {
      const token = await getSessionToken()
      if (!token) return

      // Optimiste
      const notif = notifications.find((n) => n.id === id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      if (notif && !notif.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }

      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    },
    [notifications]
  )

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
