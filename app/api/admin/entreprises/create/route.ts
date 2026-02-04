import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { createEntrepriseSchema } from '@/lib/schemas/entreprise.schema'
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
      validated = createEntrepriseSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Conversion camelCase → snake_case pour la DB
    const dbData = {
      type: validated.type,
      nom: validated.nom,
      amcq_membre: validated.amcq_membre ?? null,
      source: validated.source || null,
      site_web: validated.site_web || null,
      telephone: validated.telephone || null,
      adresse: validated.adresse || null,
      ville: validated.ville || null,
      province: validated.province || null,
      code_postal: validated.code_postal || null,
      notes: validated.notes || null,
      actif: validated.actif ?? true,
    }

    // Debug logging
    console.log('🔍 DEBUG API - dbData:', JSON.stringify(dbData, null, 2))
    console.log('🔍 DEBUG API - Type à insérer:', dbData.type)

    // Création de l'entreprise
    const { data, error } = await supabaseAdmin
      .from('entreprises')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      console.error('❌ DEBUG API - Erreur Supabase complète:', JSON.stringify(error, null, 2))
      console.error('❌ DEBUG API - Error details:', error.details)
      console.error('❌ DEBUG API - Error hint:', error.hint)
      return NextResponse.json(
        { error: `Erreur lors de la création de l'entreprise: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /admin/entreprises/create', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
