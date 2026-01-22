'use client'

import { useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id?: string
  type: ToastType
  message: string
  duration?: number
  onClose: (id?: string) => void
}

/**
 * Composant Toast pour afficher des notifications temporaires
 * Supporte 4 types: success, error, warning, info
 * Avec animations, progress bar et auto-dismiss
 */
export function Toast({ id: providedId, type, message, duration = 5000, onClose }: ToastProps) {
  const id = providedId || `toast-${Date.now()}`

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [id, duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-gradient-to-r from-emerald-50 to-emerald-100/80',
          borderColor: 'border-emerald-200',
          iconColor: 'text-emerald-600',
          textColor: 'text-emerald-900',
          icon: CheckCircle,
          progressColor: 'bg-emerald-500',
        }
      case 'error':
        return {
          bgColor: 'bg-gradient-to-r from-red-50 to-red-100/80',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          textColor: 'text-red-900',
          icon: XCircle,
          progressColor: 'bg-red-500',
        }
      case 'warning':
        return {
          bgColor: 'bg-gradient-to-r from-amber-50 to-amber-100/80',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-600',
          textColor: 'text-amber-900',
          icon: AlertTriangle,
          progressColor: 'bg-amber-500',
        }
      case 'info':
        return {
          bgColor: 'bg-gradient-to-r from-[#C7D6E6] to-[#E5EBF1]',
          borderColor: 'border-[#1F4E79]/20',
          iconColor: 'text-[#1F4E79]',
          textColor: 'text-[#2E2E2E]',
          icon: Info,
          progressColor: 'bg-[#1F4E79]',
        }
    }
  }

  const styles = getTypeStyles()
  const Icon = styles.icon

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${styles.borderColor} ${styles.bgColor}
        shadow-lg backdrop-blur-sm
        animate-in slide-in-from-right-full duration-300
        min-w-[320px] max-w-md
      `}
      role="alert"
    >
      {/* Progress bar */}
      {duration > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-1 ${styles.progressColor}`}
          style={{
            animation: `shrink-width ${duration}ms linear forwards`,
          }}
        />
      )}

      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${styles.textColor} leading-relaxed`}>
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={() => onClose(id)}
          className={`
            flex-shrink-0 rounded-lg p-1 transition-colors
            hover:bg-white/50 ${styles.iconColor} opacity-60 hover:opacity-100
          `}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
