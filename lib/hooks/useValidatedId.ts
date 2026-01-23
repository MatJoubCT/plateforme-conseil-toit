import { useParams, useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { validateUUID } from '@/lib/validation'

/**
 * Hook personnalisé pour valider les IDs UUID dans les routes dynamiques
 * Redirige automatiquement vers une page 404 si l'ID est invalide
 *
 * @param redirectPath - Chemin de redirection en cas d'ID invalide (défaut: page parente)
 * @returns L'ID validé ou null si en cours de validation/invalide
 *
 * @example
 * function MyPage() {
 *   const bassinId = useValidatedId()
 *
 *   if (!bassinId) {
 *     return <LoadingState />
 *   }
 *
 *   // À partir d'ici, bassinId est garanti comme étant un UUID valide
 * }
 */
export function useValidatedId(redirectPath?: string): string | null {
  const params = useParams()
  const router = useRouter()

  // Valider l'UUID de manière synchrone avec useMemo
  const validation = useMemo(() => {
    return validateUUID(params?.id)
  }, [params?.id])

  // Gérer la redirection dans un effet séparé
  useEffect(() => {
    if (!validation.success) {
      // ID invalide - rediriger
      console.error('Invalid UUID in route:', params?.id, validation.error)

      // Rediriger vers la page parente ou le chemin spécifié
      if (redirectPath) {
        router.push(redirectPath)
      } else {
        // Remonter d'un niveau dans l'URL
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          const parentPath = currentPath.split('/').slice(0, -1).join('/')
          router.push(parentPath || '/')
        }
      }
    }
  }, [validation.success, validation.error, params?.id, router, redirectPath])

  // Retourner l'ID validé ou null
  return validation.success ? validation.data : null
}

/**
 * Variante synchrone pour les cas où vous voulez gérer l'erreur manuellement
 * @returns Un objet avec success, data (UUID valide) ou error (message d'erreur)
 *
 * @example
 * function MyPage() {
 *   const params = useParams()
 *   const idValidation = useValidatedIdSync()
 *
 *   if (!idValidation.success) {
 *     return <ErrorState message={idValidation.error} />
 *   }
 *
 *   const bassinId = idValidation.data
 *   // ...
 * }
 */
export function useValidatedIdSync():
  | { success: true; data: string }
  | { success: false; error: string } {
  const params = useParams()
  return validateUUID(params?.id)
}
