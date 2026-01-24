import { NextResponse } from 'next/server'
import { setCsrfCookie } from '@/lib/csrf'

/**
 * Endpoint pour initialiser le token CSRF
 * À appeler au chargement de l'application
 *
 * @example
 * // Dans le root layout
 * useEffect(() => {
 *   fetch('/api/csrf-token')
 * }, [])
 */
export async function GET() {
  const response = NextResponse.json({ ok: true })
  setCsrfCookie(response)
  return response
}
