import { NextResponse } from 'next/server'
import { setCsrfCookie } from '@/lib/csrf'

/**
 * Endpoint pour initialiser le token CSRF
 * À appeler au chargement de l'application
 * Retourne le token dans le body ET le définit dans un cookie
 *
 * @example
 * // Dans le root layout
 * useEffect(() => {
 *   fetch('/api/csrf-token').then(res => res.json())
 * }, [])
 */
export async function GET() {
  const response = NextResponse.json({ ok: true, token: '' })
  const token = setCsrfCookie(response)

  // Retourner aussi le token dans le body pour permettre le stockage en sessionStorage
  return NextResponse.json({ ok: true, token }, { headers: response.headers })
}
