import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { createClientSchema } from '@/lib/schemas/client.schema'
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

    // 3. Rate limiting (limiter par user ID)
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
      validated = createClientSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Création du client
    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        name: validated.name,
        type: validated.type,
        address: validated.address,
        city: validated.city,
        postal_code: validated.postal_code,
        contact_name: validated.contact_name,
        contact_email: validated.contact_email,
        contact_phone: validated.contact_phone,
        notes: validated.notes,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la création du client: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    // Log détaillé côté serveur
    logError('API /admin/clients/create', e, { userId: authenticatedUser?.id })

    // Message générique pour l'utilisateur
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
