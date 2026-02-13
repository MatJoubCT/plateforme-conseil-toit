import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAuth } from '@/lib/auth-middleware'
import { updateSelfProfileSchema } from '@/lib/schemas/profile.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

export async function POST(req: NextRequest) {
  let authenticatedUser: { id: string; email: string | undefined } | null = null

  try {
    // 1. Vérification CSRF
    const csrfError = checkCsrf(req)
    if (csrfError) return csrfError

    // 2. Authentification (admin ou client)
    const { error: authError, user } = await requireAuth(req)
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

    // 4. Validation Zod
    let validated
    try {
      validated = updateSelfProfileSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // 5. Mise à jour du profil de l'utilisateur connecté uniquement
    const { data: updatedProfile, error: upErr } = await supabaseAdmin
      .from('user_profiles')
      .update({ full_name: validated.full_name })
      .eq('user_id', user!.id)
      .select('full_name')
      .single()

    if (upErr) {
      logError('API /auth/profile/update', upErr, { userId: user!.id })
      return NextResponse.json(
        { error: 'Impossible de mettre à jour le profil.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      data: { full_name: updatedProfile.full_name },
    })
  } catch (e: unknown) {
    logError('API /auth/profile/update', e, { userId: authenticatedUser?.id })
    return NextResponse.json(
      { error: sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR) },
      { status: 500 }
    )
  }
}
