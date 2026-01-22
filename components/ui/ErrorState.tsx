import { AlertTriangle } from 'lucide-react'

/**
 * Composant ErrorState
 * État d'erreur réutilisable pour toutes les pages admin/client
 * Design cohérent avec les couleurs d'erreur de la plateforme
 */

interface ErrorStateProps {
  message: string
  minHeight?: string
}

export function ErrorState({
  message,
  minHeight = '40vh'
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-3" />
        <p className="text-sm font-medium text-red-700">
          Erreur : {message}
        </p>
      </div>
    </div>
  )
}
