import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { updateUserAccessSchema } from '@/lib/schemas/user.schema'
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

    // Body
    const body = await req.json()

    // Validation Zod
    let validated
    try {
      validated = updateUserAccessSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    const userId = validated.userId
    const selectedClientIds = Array.from(new Set(validated.selectedClientIds))
    const selectedBatimentIds = Array.from(new Set(validated.selectedBatimentIds))

    // Écrire les accès (service role => bypass RLS)
    const { error: delClientsErr } = await supabaseAdmin.from('user_clients').delete().eq('user_id', userId)
    if (delClientsErr) {
      logError('API /admin/users/update-access - delete user_clients', delClientsErr, {
        userId: authenticatedUser?.id,
        targetUserId: userId,
      })
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des accès clients.' },
        { status: 500 }
      )
    }

    if (selectedClientIds.length > 0) {
      const rows = selectedClientIds.map((clientId) => ({ user_id: userId, client_id: clientId }))
      const { error: insClientsErr } = await supabaseAdmin.from('user_clients').insert(rows)
      if (insClientsErr) {
        logError('API /admin/users/update-access - insert user_clients', insClientsErr, {
          userId: authenticatedUser?.id,
          targetUserId: userId,
        })
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour des accès clients.' },
          { status: 500 }
        )
      }
    }

    const { error: delBatsErr } = await supabaseAdmin.from('user_batiments_access').delete().eq('user_id', userId)
    if (delBatsErr) {
      logError('API /admin/users/update-access - delete user_batiments_access', delBatsErr, {
        userId: authenticatedUser?.id,
        targetUserId: userId,
      })
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des accès bâtiments.' },
        { status: 500 }
      )
    }

    if (selectedBatimentIds.length > 0) {
      const rows = selectedBatimentIds.map((batimentId) => ({ user_id: userId, batiment_id: batimentId }))
      const { error: insBatsErr } = await supabaseAdmin.from('user_batiments_access').insert(rows)
      if (insBatsErr) {
        logError('API /admin/users/update-access - insert user_batiments_access', insBatsErr, {
          userId: authenticatedUser?.id,
          targetUserId: userId,
        })
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour des accès bâtiments.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      userId,
      counts: {
        clients: selectedClientIds.length,
        batiments: selectedBatimentIds.length,
      },
    })
  } catch (e: unknown) {
    logError('API /admin/users/update-access', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
