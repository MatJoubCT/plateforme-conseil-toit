import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'

/**
 * Configuration CSRF
 */
const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false, // Doit être false pour que JavaScript puisse lire le token
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 24 heures
}

/**
 * Génère un token CSRF aléatoire
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Hash un token pour la comparaison
 * Évite les timing attacks
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Vérifie le token CSRF
 * Compare le token du cookie avec le token du header/body
 * @param request - Requête Next.js
 * @returns true si le token est valide
 */
export function verifyCsrfToken(request: NextRequest): boolean {
  // Récupérer le token du cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value

  if (!cookieToken) {
    return false
  }

  // Récupérer le token du header
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  if (!headerToken) {
    return false
  }

  // Comparer les tokens (avec hash pour éviter timing attacks)
  const hashedCookieToken = hashToken(cookieToken)
  const hashedHeaderToken = hashToken(headerToken)

  return hashedCookieToken === hashedHeaderToken
}

/**
 * Middleware pour protéger les routes API contre le CSRF
 * À utiliser dans les API routes qui modifient des données (POST, PUT, DELETE, PATCH)
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const csrfCheck = await checkCsrf(request)
 *   if (csrfCheck) return csrfCheck // Retourne l'erreur 403
 *
 *   // Continue avec la logique normale...
 * }
 */
export function checkCsrf(request: NextRequest): NextResponse | null {
  // Ignorer les requêtes GET, HEAD, OPTIONS (safe methods)
  const method = request.method
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return null
  }

  // Vérifier le token
  const isValid = verifyCsrfToken(request)

  if (!isValid) {
    return NextResponse.json(
      { error: 'Token CSRF invalide ou manquant' },
      { status: 403 }
    )
  }

  return null
}

/**
 * Génère et définit un nouveau token CSRF dans un cookie
 * À appeler dans un API route GET pour initialiser le token
 *
 * @example
 * // Dans app/api/csrf-token/route.ts
 * export async function GET() {
 *   const response = NextResponse.json({ ok: true })
 *   setCsrfCookie(response)
 *   return response
 * }
 */
export function setCsrfCookie(response: NextResponse): string {
  const token = generateCsrfToken()

  response.cookies.set(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS)

  return token
}

/**
 * Récupère le token CSRF depuis les cookies ou sessionStorage
 * À utiliser côté client pour l'envoyer dans les requêtes
 * Vérifie d'abord les cookies, puis sessionStorage comme fallback
 */
export function getCsrfTokenFromCookies(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  // Essayer d'abord de lire le token depuis les cookies
  const cookies = document.cookie.split(';')
  const csrfCookie = cookies.find(c => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`))

  if (csrfCookie) {
    return csrfCookie.split('=')[1]
  }

  // Fallback: Essayer sessionStorage si le cookie n'est pas accessible
  try {
    const tokenFromStorage = sessionStorage.getItem(CSRF_COOKIE_NAME)
    return tokenFromStorage
  } catch (e) {
    // sessionStorage peut ne pas être accessible (iframe, navigation privée, etc.)
    return null
  }
}

/**
 * Hook React pour obtenir et utiliser le token CSRF
 * @example
 * function MyComponent() {
 *   const csrfToken = useCsrfToken()
 *
 *   const handleSubmit = async () => {
 *     await fetch('/api/endpoint', {
 *       method: 'POST',
 *       headers: {
 *         'x-csrf-token': csrfToken || '',
 *       },
 *       body: JSON.stringify(data),
 *     })
 *   }
 * }
 */
export function useCsrfToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return getCsrfTokenFromCookies()
}

/**
 * Utilitaire pour faire des requêtes avec protection CSRF
 * @example
 * const response = await fetchWithCsrf('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify(userData),
 * })
 */
export async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getCsrfTokenFromCookies()

  const headers = new Headers(options.headers)
  if (token) {
    headers.set(CSRF_HEADER_NAME, token)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
