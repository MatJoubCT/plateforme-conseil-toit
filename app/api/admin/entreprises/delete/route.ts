import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

const deleteEntrepriseSchema = z.object({
  id: z.string().uuid('ID entreprise invalide'),
})

export async function DELETE(req: NextRequest) {
  let authenticatedUser: { id: string; email: string | undefined } | null = null

  try {
    // 1. Vérification CSRF
    const csrfError = checkCsrf(req)
    if (csrfError) return csrfError

    // 2. Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
    if (authError) return authError
    authenticatedUser = user

    // 3. Rate limiting
    const rateLimitResult = await rateLimit(req, RATE_LIMITS.API_GENERAL, user!.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: GENERIC_ERROR_MESSAGES.RATE_LIMIT },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMITS.API_GENERAL.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    const body = await req.json()

    // Validation Zod
    let validated
    try {
      validated = deleteEntrepriseSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que l'entreprise existe
    const { data: existing } = await supabaseAdmin
      .from('entreprises')
      .select('id')
      .eq('id', validated.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    // Suppression de l'entreprise
    const { error } = await supabaseAdmin.from('entreprises').delete().eq('id', validated.id)

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la suppression de l'entreprise: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    logError('API /admin/entreprises/delete', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
