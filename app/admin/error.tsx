'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur seulement en développement
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin error boundary:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-ct-gray-light flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-ct-card p-8 max-w-md w-full">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-ct-gray-dark mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-ct-gray mb-6">
            Nous sommes désolés, une erreur inattendue s'est produite. Veuillez réessayer.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="px-6 py-2 bg-ct-primary text-white rounded-md hover:bg-ct-primary-dark transition-colors font-medium"
            >
              Réessayer
            </button>
            <a
              href="/admin"
              className="px-6 py-2 border border-ct-gray-dark text-ct-gray-dark rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Retour au tableau de bord
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
