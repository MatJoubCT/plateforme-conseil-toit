import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin, getValidatedOrigin } from '@/lib/auth-middleware'
import { resetPasswordSchema } from '@/lib/schemas/user.schema'
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
    const rateLimitResult = await rateLimit(req, RATE_LIMITS.PASSWORD_RESET, user!.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: GENERIC_ERROR_MESSAGES.RATE_LIMIT },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMITS.PASSWORD_RESET.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    // Body
    const body = await req.json()

    // Validation Zod
    let validated
    try {
      validated = resetPasswordSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    const userId = validated.userId

    // Récupérer l'email depuis Supabase Auth
    const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (targetErr) {
      return NextResponse.json(
        { error: GENERIC_ERROR_MESSAGES.INVALID_INPUT },
        { status: 400 }
      )
    }

    const email = target?.user?.email
    if (!email) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable.' },
        { status: 404 }
      )
    }

    // Envoyer le courriel de réinitialisation
    const origin = getValidatedOrigin(req)
    const redirectTo = `${origin}/auth/callback`

    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
    if (resetErr) {
      logError('API /admin/users/reset-password - resetPasswordForEmail', resetErr, {
        userId: authenticatedUser?.id,
        targetUserId: userId,
      })
      return NextResponse.json(
        { error: 'Impossible d\'envoyer le courriel de réinitialisation.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    logError('API /admin/users/reset-password', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
