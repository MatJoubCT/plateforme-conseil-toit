/**
 * Rate Limiter basique en mémoire
 * IMPORTANT: Pour une application en production avec plusieurs instances,
 * utilisez Redis ou Upstash Rate Limit (@upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Stockage en mémoire (limité à une seule instance)
const storage = new Map<string, RateLimitEntry>()

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of storage.entries()) {
    if (entry.resetAt < now) {
      storage.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /**
   * Nombre maximum de requêtes autorisées
   */
  maxRequests: number

  /**
   * Fenêtre de temps en secondes
   */
  windowSeconds: number

  /**
   * Préfixe pour la clé (ex: 'api:login', 'api:create-user')
   */
  prefix: string
}

export interface RateLimitResult {
  /**
   * Si true, la requête est autorisée
   */
  allowed: boolean

  /**
   * Nombre de requêtes restantes
   */
  remaining: number

  /**
   * Timestamp de réinitialisation du compteur (ms)
   */
  resetAt: number

  /**
   * Temps restant avant réinitialisation (secondes)
   */
  retryAfter?: number
}

/**
 * Vérifie si une requête est autorisée selon les limites définies
 * @param identifier - Identifiant unique (ex: IP, user ID, email)
 * @param config - Configuration du rate limit
 * @returns Résultat du rate limit
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const key = `${config.prefix}:${identifier}`
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  // Récupérer ou créer l'entrée
  let entry = storage.get(key)

  // Si l'entrée existe et n'est pas expirée
  if (entry && entry.resetAt > now) {
    // Incrémenter le compteur
    entry.count++

    const allowed = entry.count <= config.maxRequests
    const remaining = Math.max(0, config.maxRequests - entry.count)
    const retryAfter = allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000)

    return {
      allowed,
      remaining,
      resetAt: entry.resetAt,
      retryAfter,
    }
  }

  // Créer une nouvelle entrée
  const resetAt = now + windowMs
  entry = {
    count: 1,
    resetAt,
  }
  storage.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - 1,
    resetAt,
  }
}

/**
 * Configurations prédéfinies pour différents endpoints
 */
export const RATE_LIMITS = {
  /**
   * Login: 5 tentatives par 15 minutes
   */
  LOGIN: {
    maxRequests: 5,
    windowSeconds: 15 * 60,
    prefix: 'login',
  },

  /**
   * Reset password: 3 tentatives par heure
   */
  PASSWORD_RESET: {
    maxRequests: 3,
    windowSeconds: 60 * 60,
    prefix: 'password-reset',
  },

  /**
   * API générique: 100 requêtes par minute
   */
  API_GENERAL: {
    maxRequests: 100,
    windowSeconds: 60,
    prefix: 'api',
  },

  /**
   * Création d'utilisateur: 10 par heure
   */
  USER_CREATION: {
    maxRequests: 10,
    windowSeconds: 60 * 60,
    prefix: 'user-create',
  },

  /**
   * Upload de fichiers: 20 par heure
   */
  FILE_UPLOAD: {
    maxRequests: 20,
    windowSeconds: 60 * 60,
    prefix: 'file-upload',
  },
} as const satisfies Record<string, RateLimitConfig>

/**
 * Extrait l'identifiant de la requête (IP ou user ID)
 * @param request - La requête Next.js
 * @param userId - ID utilisateur optionnel (prioritaire sur l'IP)
 * @returns Identifiant unique pour le rate limiting
 */
export function getRequestIdentifier(request: Request, userId?: string): string {
  // Si on a un userId, l'utiliser (plus précis)
  if (userId) {
    return `user:${userId}`
  }

  // Sinon, utiliser l'IP
  // En production avec Vercel/CloudFlare, utiliser les headers appropriés
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  return `ip:${ip}`
}

/**
 * Wrapper pour faciliter l'utilisation dans les API routes
 * @example
 * export async function POST(request: Request) {
 *   const rateLimitResult = await rateLimit(request, RATE_LIMITS.LOGIN)
 *   if (!rateLimitResult.allowed) {
 *     return NextResponse.json(
 *       { error: 'Trop de tentatives. Réessayez plus tard.' },
 *       {
 *         status: 429,
 *         headers: {
 *           'X-RateLimit-Limit': String(RATE_LIMITS.LOGIN.maxRequests),
 *           'X-RateLimit-Remaining': String(rateLimitResult.remaining),
 *           'X-RateLimit-Reset': String(rateLimitResult.resetAt),
 *           'Retry-After': String(rateLimitResult.retryAfter),
 *         }
 *       }
 *     )
 *   }
 *   // Continue avec la logique normale...
 * }
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig,
  userId?: string
): Promise<RateLimitResult> {
  const identifier = getRequestIdentifier(request, userId)
  return checkRateLimit(identifier, config)
}
