import { CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ToastProps {
  type: 'success' | 'error'
  message: string
  onClose: () => void
  duration?: number
}

/**
 * Composant Toast pour afficher des notifications temporaires
 * Remplace les alert() pour une meilleure UX
 */
export function Toast({ type, message, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div
        className={`flex items-start gap-3 p-4 rounded-lg shadow-lg min-w-[320px] max-w-md ${
          type === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}
          >
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          className={`flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors ${
            type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Hook pour gérer les toasts
 */
export function useToast() {
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
  }

  const clearToast = () => {
    setToast(null)
  }

  return {
    toast,
    showToast,
    clearToast,
  }
}
