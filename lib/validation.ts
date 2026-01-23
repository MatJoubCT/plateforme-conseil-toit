import { z } from 'zod'

/**
 * Schéma de validation UUID v4
 */
export const uuidSchema = z.string().uuid('ID invalide')

/**
 * Valide un UUID et retourne le résultat
 * @param value - La valeur à valider
 * @returns Un objet avec success (boolean) et data (string si succès) ou error (string si échec)
 */
export function validateUUID(value: unknown): { success: true; data: string } | { success: false; error: string } {
  const result = uuidSchema.safeParse(value)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return { success: false, error: result.error.issues[0]?.message || 'ID invalide' }
}

/**
 * Politique de mot de passe renforcée
 * - Minimum 12 caractères
 * - Au moins une majuscule
 * - Au moins une minuscule
 * - Au moins un chiffre
 * - Au moins un caractère spécial
 */
export const passwordSchema = z
  .string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)')

/**
 * Valide un mot de passe selon la politique de sécurité
 */
export function validatePassword(password: string): { success: true; data: string } | { success: false; errors: string[] } {
  const result = passwordSchema.safeParse(password)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    errors: result.error.issues.map((err: { message: string }) => err.message)
  }
}

/**
 * Messages d'erreur génériques pour éviter les fuites d'information
 */
export const GENERIC_ERROR_MESSAGES = {
  AUTH_FAILED: 'Échec de l\'authentification. Veuillez réessayer.',
  UNAUTHORIZED: 'Vous n\'êtes pas autorisé à effectuer cette action.',
  NOT_FOUND: 'La ressource demandée n\'existe pas.',
  INVALID_INPUT: 'Les données fournies sont invalides.',
  SERVER_ERROR: 'Une erreur est survenue. Veuillez réessayer plus tard.',
  FORBIDDEN: 'Accès refusé.',
  RATE_LIMIT: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
} as const

/**
 * Sanitise un message d'erreur pour l'affichage utilisateur
 * Retourne un message générique en production, le message réel en développement
 */
export function sanitizeError(error: unknown, fallbackMessage: string = GENERIC_ERROR_MESSAGES.SERVER_ERROR): string {
  // En développement, on peut afficher les erreurs détaillées
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
  }

  // En production, on retourne toujours un message générique
  return fallbackMessage
}

/**
 * Log une erreur côté serveur de manière sécurisée
 * @param context - Le contexte de l'erreur (ex: 'API /users/create')
 * @param error - L'erreur à logger
 * @param metadata - Métadonnées additionnelles (sans données sensibles!)
 */
export function logError(context: string, error: unknown, metadata?: Record<string, unknown>): void {
  // En production, vous devriez utiliser un service de logging comme Sentry, LogRocket, etc.
  console.error(`[${context}]`, error, metadata)

  // TODO: Intégrer avec un service de monitoring
  // Example: Sentry.captureException(error, { tags: { context }, extra: metadata })
}

/**
 * Valide et sanitise une URL de redirection
 * Empêche les open redirects
 */
export function validateRedirectUrl(url: string | null | undefined, allowedPaths: string[] = ['/admin', '/client']): string | null {
  if (!url) return null

  try {
    const parsedUrl = new URL(url, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')

    // Vérifier que c'est le même domaine
    const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
    if (parsedUrl.origin !== siteUrl.origin) {
      return null
    }

    // Vérifier que le path est autorisé
    const isAllowed = allowedPaths.some(path => parsedUrl.pathname.startsWith(path))
    if (!isAllowed) {
      return null
    }

    return parsedUrl.pathname
  } catch {
    return null
  }
}
