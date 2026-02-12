'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { getSessionToken } from '@/lib/hooks/useSessionToken'
import type { NotificationRow } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'

const FALLBACK_POLL_MS = 30_000 // Polling de secours 30s (au cas où Realtime déconnecte)

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)
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

  // Fetch initial + polling de secours (identique à l'ancien comportement)
  useEffect(() => {
    void fetchNotifications()

    intervalRef.current = setInterval(() => {
      void fetchNotifications()
    }, FALLBACK_POLL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchNotifications])

  // Abonnement Realtime pour les mises à jour instantanées
  useEffect(() => {
    let cancelled = false

    async function setupRealtime() {
      const { data: sessionData } = await supabaseBrowser.auth.getSession()
      if (cancelled || !sessionData?.session?.user) return

      const userId = sessionData.session.user.id

      channelRef.current = supabaseBrowser
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as NotificationRow
            setNotifications((prev) => [newNotif, ...prev].slice(0, 50))
            setUnreadCount((prev) => prev + 1)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id
            setNotifications((prev) => {
              const removed = prev.find((n) => n.id === deletedId)
              if (removed && !removed.is_read) {
                setUnreadCount((c) => Math.max(0, c - 1))
              }
              return prev.filter((n) => n.id !== deletedId)
            })
          }
        )
        .subscribe()
    }

    void setupRealtime()

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabaseBrowser.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

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
