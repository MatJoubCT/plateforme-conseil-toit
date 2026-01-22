'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastType, ToastProps } from '@/components/ui/Toast'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

/**
 * Hook pour utiliser le système de toast
 * Usage: const toast = useToast()
 * toast.success('Opération réussie !')
 * toast.error('Une erreur est survenue')
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

/**
 * Provider global pour le système de toast
 * À intégrer dans le layout root de l'application
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id?: string) => {
    if (!id) return
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string, duration: number = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const newToast: ToastItem = { id, type, message, duration }

      setToasts((prev) => {
        // Limiter à 3 toasts simultanés
        const updated = [...prev, newToast]
        if (updated.length > 3) {
          return updated.slice(-3)
        }
        return updated
      })
    },
    []
  )

  const success = useCallback(
    (message: string, duration?: number) => {
      showToast('success', message, duration)
    },
    [showToast]
  )

  const error = useCallback(
    (message: string, duration?: number) => {
      showToast('error', message, duration)
    },
    [showToast]
  )

  const warning = useCallback(
    (message: string, duration?: number) => {
      showToast('warning', message, duration)
    },
    [showToast]
  )

  const info = useCallback(
    (message: string, duration?: number) => {
      showToast('info', message, duration)
    },
    [showToast]
  )

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}

      {/* Toast container - fixed top-right */}
      <div
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              type={toast.type}
              message={toast.message}
              duration={toast.duration}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
