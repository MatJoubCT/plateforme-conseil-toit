import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin, getValidatedOrigin } from '@/lib/auth-middleware'
import { createUserSchema } from '@/lib/schemas/user.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return null
  const found = data?.users?.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
  return found?.id ?? null
}

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
    const rateLimitResult = await rateLimit(req, RATE_LIMITS.USER_CREATION, user!.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: GENERIC_ERROR_MESSAGES.RATE_LIMIT },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMITS.USER_CREATION.maxRequests),
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
      validated = createUserSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    const email = validated.email.trim().toLowerCase()
    const fullName = validated.fullName || null
    const role = validated.role
    const clientId = validated.clientId || null

    const origin = getValidatedOrigin(req)
    const redirectTo = `${origin}/auth/callback`

    let userId: string | null = null
    let emailSent = true

    // 1) Invitation standard (envoie un email)
    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })
    userId = inviteRes.data?.user?.id ?? null

    // 2) Gestion des erreurs d'invitation
    if (inviteRes.error) {
      const msg = inviteRes.error.message || 'Erreur Supabase Auth'
      const isAlreadyRegistered = msg.toLowerCase().includes('already been registered')
      const isRateLimit = msg.toLowerCase().includes('rate limit')

      if (isAlreadyRegistered) {
        // Utilisateur existe déjà → générer un lien d'invitation
        userId = await findUserIdByEmail(email)
        if (!userId) {
          return NextResponse.json(
            { error: "L'utilisateur existe déjà dans Auth, mais impossible de retrouver son user_id." },
            { status: 500 },
          )
        }

        const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email,
          options: { redirectTo },
        })

        if (linkErr) {
          // Si le generateLink échoue aussi à cause du rate limit, on continue quand même
          const linkMsg = linkErr.message || ''
          if (!linkMsg.toLowerCase().includes('rate limit')) {
            return NextResponse.json({ error: `generateLink(invite) refusé : ${linkMsg}` }, { status: 400 })
          }
          emailSent = false
        }
      } else if (isRateLimit) {
        // Rate limit email → créer l'utilisateur sans envoyer d'email
        const createRes = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
        })

        if (createRes.error) {
          const createMsg = createRes.error.message || ''
          // Si l'utilisateur existe déjà, récupérer son ID
          if (createMsg.toLowerCase().includes('already been registered') || createMsg.toLowerCase().includes('already exists')) {
            userId = await findUserIdByEmail(email)
            if (!userId) {
              return NextResponse.json(
                { error: "L'utilisateur existe déjà, mais impossible de retrouver son user_id." },
                { status: 500 },
              )
            }
          } else {
            return NextResponse.json({ error: createMsg }, { status: 400 })
          }
        } else {
          userId = createRes.data.user.id
        }
        emailSent = false
      } else {
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'User introuvable (id manquant).' }, { status: 500 })
    }

    // 3) Upsert user_profiles (incluant client_id)
    const { data: profile, error: profErr } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          role,
          client_id: clientId,
          is_active: true,
        },
        { onConflict: 'user_id' },
      )
      .select('id, user_id, full_name, role, client_id, is_active')
      .single()

    if (profErr) {
      return NextResponse.json(
        { error: `Invitation OK, mais profile non créé: ${profErr.message}` },
        { status: 500 },
      )
    }

    // 4) Si un client est choisi → le mettre aussi dans user_clients (cohérence avec ton modal Modifier)
    if (clientId) {
      const { error: ucErr } = await supabaseAdmin
        .from('user_clients')
        .insert({ user_id: userId, client_id: clientId })

      // Si déjà là, on ignore
      if (ucErr && !String(ucErr.message || '').toLowerCase().includes('duplicate')) {
        return NextResponse.json(
          { error: `Profile OK, mais user_clients non créé: ${ucErr.message}` },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ ok: true, profile, emailSent })
  } catch (e: unknown) {
    // Log détaillé côté serveur
    logError('API /admin/users/create', e, { userId: authenticatedUser?.id })

    // Message générique pour l'utilisateur
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
