import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { updateUserSchema } from '@/lib/schemas/user.schema'
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
      validated = updateUserSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    const profileId = validated.profileId
    const userId = validated.userId
    const fullName = validated.fullName || null
    const role = validated.role || null

    const uniqClients = Array.from(new Set(validated.selectedClientIds))
    const uniqBatiments = Array.from(new Set(validated.selectedBatimentIds))

    // 1) Update profil
    const { data: updatedProfile, error: upErr } = await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name: fullName,
        role,
      })
      .eq('id', profileId)
      .select('id, user_id, full_name, role, client_id, is_active')
      .single()

    if (upErr) {
      logError('API /admin/users/update - profile update', upErr, {
        userId: authenticatedUser?.id,
        profileId,
      })
      return NextResponse.json(
        { error: 'Impossible de mettre à jour le profil utilisateur.' },
        { status: 400 }
      )
    }

    // 2) user_clients (delete + insert)
    const { error: delUcErr } = await supabaseAdmin.from('user_clients').delete().eq('user_id', userId)
    if (delUcErr) {
      logError('API /admin/users/update - delete user_clients', delUcErr, {
        userId: authenticatedUser?.id,
        targetUserId: userId,
      })
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des accès clients.' },
        { status: 400 }
      )
    }

    if (uniqClients.length > 0) {
      const rows = uniqClients.map((client_id: string) => ({ user_id: userId, client_id }))
      const { error: insUcErr } = await supabaseAdmin.from('user_clients').insert(rows)
      if (insUcErr) {
        logError('API /admin/users/update - insert user_clients', insUcErr, {
          userId: authenticatedUser?.id,
          targetUserId: userId,
        })
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour des accès clients.' },
          { status: 400 }
        )
      }
    }

    // 3) user_batiments_access (delete + insert)
    const { error: delUbaErr } = await supabaseAdmin
      .from('user_batiments_access')
      .delete()
      .eq('user_id', userId)

    if (delUbaErr) {
      logError('API /admin/users/update - delete user_batiments_access', delUbaErr, {
        userId: authenticatedUser?.id,
        targetUserId: userId,
      })
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour des accès bâtiments.' },
        { status: 400 }
      )
    }

    if (uniqBatiments.length > 0) {
      const rows = uniqBatiments.map((batiment_id: string) => ({ user_id: userId, batiment_id }))
      const { error: insUbaErr } = await supabaseAdmin.from('user_batiments_access').insert(rows)
      if (insUbaErr) {
        logError('API /admin/users/update - insert user_batiments_access', insUbaErr, {
          userId: authenticatedUser?.id,
          targetUserId: userId,
        })
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour des accès bâtiments.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ ok: true, profile: updatedProfile })
  } catch (e: unknown) {
    logError('API /admin/users/update', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
