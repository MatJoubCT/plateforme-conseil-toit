import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { createRapportSchema } from '@/lib/schemas/rapport.schema'
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
      validated = createRapportSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que le bassin existe
    const { data: bassinExists } = await supabaseAdmin
      .from('bassins')
      .select('id')
      .eq('id', validated.bassin_id)
      .single()

    if (!bassinExists) {
      return NextResponse.json({ error: 'Bassin non trouvé' }, { status: 404 })
    }

    // Vérifier que le type de rapport existe si fourni
    if (validated.type_id) {
      const { data: typeExists } = await supabaseAdmin
        .from('listes_choix')
        .select('id')
        .eq('id', validated.type_id)
        .eq('categorie', 'type_rapport')
        .single()

      if (!typeExists) {
        return NextResponse.json({ error: 'Type de rapport non trouvé' }, { status: 404 })
      }
    }

    // Création du rapport
    const { data, error } = await supabaseAdmin
      .from('rapports')
      .insert({
        bassin_id: validated.bassin_id,
        type_id: validated.type_id || null,
        date_rapport: validated.date_rapport || null,
        numero_ct: validated.numero_ct || null,
        titre: validated.titre || null,
        description: validated.description || null,
        file_url: validated.file_url || null,
      })
      .select('id, bassin_id, type_id, date_rapport, numero_ct, titre, description, file_url')
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la création du rapport: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /admin/rapports/create', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
