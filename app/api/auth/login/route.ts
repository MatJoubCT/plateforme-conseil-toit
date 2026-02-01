import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting par IP (avant même la validation)
    const rateLimitResult = await rateLimit(req, RATE_LIMITS.LOGIN)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMITS.LOGIN.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(rateLimitResult.retryAfter || 900), // 15 minutes
          },
        }
      )
    }

    const body = await req.json()

    // 2. Validation Zod
    let validated
    try {
      validated = loginSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // 3. Vérifier si l'utilisateur existe dans auth.users
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(validated.email)

    if (!authUser || !authUser.user) {
      logError('Login failed - user not found', new Error('User not found'), { email: validated.email })
      return NextResponse.json(
        { error: 'Aucun compte associé à cette adresse courriel' },
        { status: 401 }
      )
    }

    // 4. Authentification via Supabase Admin
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    })

    if (signInError) {
      // Log les tentatives échouées (pour monitoring)
      logError('Login failed - invalid password', signInError, { email: validated.email })

      return NextResponse.json(
        { error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    const user = signInData.user
    if (!user || !signInData.session) {
      return NextResponse.json({ error: 'Authentification échouée' }, { status: 401 })
    }

    // 5. Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, client_id, is_active, full_name')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Impossible de trouver le profil associé à cet utilisateur' },
        { status: 404 }
      )
    }

    // 6. Vérifier si l'utilisateur est actif
    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'Votre compte a été désactivé. Contactez un administrateur.' },
        { status: 403 }
      )
    }

    // 7. Retourner les données de session
    return NextResponse.json({
      ok: true,
      session: signInData.session,
      user: {
        id: user.id,
        email: user.email,
        role: profile.role,
        client_id: profile.client_id,
        full_name: profile.full_name,
      },
    })
  } catch (e: unknown) {
    logError('API /auth/login', e)
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
