import { NextRequest, NextResponse } from 'next/server'
import { checkCsrf } from './csrf'
import { rateLimit, RateLimitConfig } from './rate-limit'
import { GENERIC_ERROR_MESSAGES, sanitizeError, logError } from './validation'

/**
 * Wrapper de sécurité pour les API routes
 * Applique automatiquement:
 * - Protection CSRF
 * - Rate limiting
 * - Gestion d'erreur sécurisée
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   return withApiSecurity(req, RATE_LIMITS.USER_CREATION, async (req, userId) => {
 *     // Votre logique ici
 *     // userId est l'ID de l'utilisateur authentifié (si disponible)
 *     return NextResponse.json({ ok: true })
 *   })
 * }
 */
export async function withApiSecurity(
  req: NextRequest,
  rateLimitConfig: RateLimitConfig | null,
  handler: (req: NextRequest, userId?: string) => Promise<NextResponse>,
  options: {
    /**
     * Si true, ignore la vérification CSRF (pour les endpoints GET)
     */
    skipCsrf?: boolean
    /**
     * ID utilisateur optionnel pour le rate limiting
     * Si non fourni, utilise l'IP
     */
    userId?: string
    /**
     * Contexte pour les logs d'erreur
     */
    logContext?: string
  } = {}
): Promise<NextResponse> {
  const { skipCsrf = false, userId, logContext = 'API' } = options

  try {
    // 1. Vérification CSRF (sauf si skipCsrf ou méthode GET)
    if (!skipCsrf && req.method !== 'GET') {
      const csrfError = checkCsrf(req)
      if (csrfError) return csrfError
    }

    // 2. Rate limiting (si configuré)
    if (rateLimitConfig) {
      const rateLimitResult = await rateLimit(req, rateLimitConfig, userId)

      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: GENERIC_ERROR_MESSAGES.RATE_LIMIT },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
              'X-RateLimit-Reset': String(rateLimitResult.resetAt),
              'Retry-After': String(rateLimitResult.retryAfter || 60),
            },
          }
        )
      }
    }

    // 3. Exécuter le handler
    return await handler(req, userId)
  } catch (e: unknown) {
    // Log détaillé côté serveur
    logError(logContext, e, { userId })

    // Message générique pour l'utilisateur
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
