/**
 * Composant LoadingState
 * État de chargement réutilisable pour toutes les pages admin/client
 * Respecte l'identité visuelle avec les couleurs ct-primary
 */

interface LoadingStateProps {
  message?: string
  minHeight?: string
}

export function LoadingState({
  message = 'Chargement…',
  minHeight = '60vh'
}: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg animate-pulse" />
        </div>
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
    </div>
  )
}
