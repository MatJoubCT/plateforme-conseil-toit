import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { updateMateriauSchema } from '@/lib/schemas/materiau.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

export async function PUT(req: NextRequest) {
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
      validated = updateMateriauSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que le matériau existe
    const { data: existing } = await supabaseAdmin
      .from('materiaux')
      .select('id')
      .eq('id', validated.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Matériau non trouvé' }, { status: 404 })
    }

    // Conversion camelCase → snake_case
    const dbData = {
      nom: validated.nom,
      categorie: validated.categorie || null,
      unite: validated.unite || null,
      prix_unitaire: validated.prixUnitaire ?? null,
      description: validated.description || null,
    }

    // Mise à jour du matériau
    const { data, error } = await supabaseAdmin
      .from('materiaux')
      .update(dbData)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour du matériau: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /admin/materiaux/update', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
