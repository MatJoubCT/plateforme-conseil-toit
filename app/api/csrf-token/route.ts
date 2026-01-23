import { NextResponse } from 'next/server'
import { setCsrfCookie } from '@/lib/csrf'

/**
 * API route pour obtenir un token CSRF
 * À appeler au chargement de l'application pour initialiser le token
 */
export async function GET() {
  const response = NextResponse.json({ ok: true })
  const token = setCsrfCookie(response)

  // Retourner le token dans la réponse pour faciliter l'usage
  return NextResponse.json(
    { token },
    {
      headers: response.headers,
    }
  )
}
