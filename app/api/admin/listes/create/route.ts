import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { createListeChoixSchema } from '@/lib/schemas/liste.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

export async function POST(req: NextRequest) {
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
      validated = createListeChoixSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Si l'ordre n'est pas fourni, utiliser le max + 1 pour cette catégorie
    let ordre = validated.ordre ?? 0
    if (ordre === 0) {
      const { data: maxOrdre } = await supabaseAdmin
        .from('listes_choix')
        .select('ordre')
        .eq('categorie', validated.categorie)
        .order('ordre', { ascending: false })
        .limit(1)
        .maybeSingle()

      ordre = (maxOrdre?.ordre ?? 0) + 1
    }

    // Données pour la DB
    const dbData = {
      categorie: validated.categorie,
      code: validated.code || null,
      label: validated.label,
      couleur: validated.couleur || null,
      ordre,
      description: validated.description || null,
    }

    // Création de l'élément de liste
    const { data, error } = await supabaseAdmin
      .from('listes_choix')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la création de l'élément: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /admin/listes/create', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
