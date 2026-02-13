import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * Extrait le token Bearer du header Authorization
 */
export function getBearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1] || null
}

/**
 * Valide l'origine de la requête contre une liste blanche
 * Protège contre les attaques de type open redirect
 */
export function getValidatedOrigin(req: Request): string {
  // Liste blanche des origines autorisées
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean) as string[]

  const origin = req.headers.get('origin')

  // Vérifier que l'origin est dans la liste blanche
  if (origin && allowedOrigins.includes(origin)) {
    return origin
  }

  // Ne JAMAIS faire confiance aux X-Forwarded headers sans validation
  const proto = req.headers.get('x-forwarded-proto')
  const host = req.headers.get('x-forwarded-host')

  if (proto && host) {
    const constructedOrigin = `${proto}://${host}`
    // Vérifier contre la liste blanche
    if (allowedOrigins.includes(constructedOrigin)) {
      return constructedOrigin
    }
  }

  // Fallback sécurisé
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

interface AuthResult {
  error: NextResponse | null
  user: {
    id: string
    email: string | undefined
    profile: {
      role: string
      user_id: string
      full_name: string | null
      client_id?: string | null
      is_active?: boolean
    }
  } | null
}

interface ClientAuthResult {
  error: NextResponse | null
  user: {
    id: string
    email: string | undefined
    profile: {
      role: string
      user_id: string
      full_name: string | null
      client_id: string | null
      is_active: boolean
    }
    clientIds: string[]
  } | null
}

/**
 * Middleware d'authentification qui vérifie :
 * 1. Présence du token Bearer
 * 2. Validité du token
 * 3. Rôle admin de l'utilisateur
 *
 * @param req - La requête Next.js
 * @returns Objet avec error (NextResponse) ou user (données utilisateur)
 *
 * @example
 * const { error, user } = await requireAdmin(req)
 * if (error) return error
 * // À partir d'ici, user est authentifié et admin
 */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const token = getBearerToken(req)
  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Authorization Bearer token manquant.' },
        { status: 401 }
      ),
      user: null
    }
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return {
      error: NextResponse.json(
        { error: 'Token invalide ou session expirée.' },
        { status: 401 }
      ),
      user: null
    }
  }

  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('user_profiles')
    .select('role, user_id, full_name')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profileErr) {
    return {
      error: NextResponse.json(
        { error: `Impossible de lire le profil: ${profileErr.message}` },
        { status: 500 }
      ),
      user: null
    }
  }

  if (!callerProfile || callerProfile.role !== 'admin') {
    return {
      error: NextResponse.json(
        { error: 'Accès refusé (admin requis).' },
        { status: 403 }
      ),
      user: null
    }
  }

  return {
    error: null,
    user: {
      id: userData.user.id,
      email: userData.user.email,
      profile: callerProfile
    }
  }
}

/**
 * Middleware d'authentification qui vérifie :
 * 1. Présence du token Bearer
 * 2. Validité du token
 * 3. Rôle client de l'utilisateur
 * 4. Statut actif de l'utilisateur
 * 5. Récupère la liste des clients auxquels l'utilisateur a accès
 *
 * @param req - La requête Next.js
 * @returns Objet avec error (NextResponse) ou user (données utilisateur + clientIds)
 *
 * @example
 * const { error, user } = await requireClient(req)
 * if (error) return error
 * // À partir d'ici, user est authentifié, client, actif, avec ses clientIds
 */
/**
 * Middleware d'authentification qui vérifie :
 * 1. Présence du token Bearer
 * 2. Validité du token
 * 3. Existence du profil utilisateur
 *
 * Ne vérifie PAS le rôle — accepte admin et client.
 *
 * @param req - La requête Next.js
 * @returns Objet avec error (NextResponse) ou user (données utilisateur)
 *
 * @example
 * const { error, user } = await requireAuth(req)
 * if (error) return error
 * // À partir d'ici, user est authentifié (admin ou client)
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const token = getBearerToken(req)
  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Authorization Bearer token manquant.' },
        { status: 401 }
      ),
      user: null
    }
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return {
      error: NextResponse.json(
        { error: 'Token invalide ou session expirée.' },
        { status: 401 }
      ),
      user: null
    }
  }

  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('user_profiles')
    .select('role, user_id, full_name')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profileErr) {
    return {
      error: NextResponse.json(
        { error: `Impossible de lire le profil: ${profileErr.message}` },
        { status: 500 }
      ),
      user: null
    }
  }

  if (!callerProfile) {
    return {
      error: NextResponse.json(
        { error: 'Profil introuvable.' },
        { status: 403 }
      ),
      user: null
    }
  }

  return {
    error: null,
    user: {
      id: userData.user.id,
      email: userData.user.email,
      profile: callerProfile
    }
  }
}

export async function requireClient(req: Request): Promise<ClientAuthResult> {
  const token = getBearerToken(req)
  if (!token) {
    return {
      error: NextResponse.json(
        { error: 'Authorization Bearer token manquant.' },
        { status: 401 }
      ),
      user: null
    }
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return {
      error: NextResponse.json(
        { error: 'Token invalide ou session expirée.' },
        { status: 401 }
      ),
      user: null
    }
  }

  const { data: callerProfile, error: profileErr } = await supabaseAdmin
    .from('user_profiles')
    .select('role, user_id, full_name, client_id, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profileErr) {
    return {
      error: NextResponse.json(
        { error: `Impossible de lire le profil: ${profileErr.message}` },
        { status: 500 }
      ),
      user: null
    }
  }

  if (!callerProfile || callerProfile.role !== 'client') {
    return {
      error: NextResponse.json(
        { error: 'Accès refusé (client requis).' },
        { status: 403 }
      ),
      user: null
    }
  }

  if (!callerProfile.is_active) {
    return {
      error: NextResponse.json(
        { error: 'Compte suspendu. Veuillez contacter l\'administrateur.' },
        { status: 403 }
      ),
      user: null
    }
  }

  // Récupérer la liste des clients auxquels l'utilisateur a accès
  const { data: userClients, error: clientsErr } = await supabaseAdmin
    .from('user_clients')
    .select('client_id')
    .eq('user_id', userData.user.id)

  if (clientsErr) {
    return {
      error: NextResponse.json(
        { error: `Impossible de récupérer les accès clients: ${clientsErr.message}` },
        { status: 500 }
      ),
      user: null
    }
  }

  const clientIds = userClients?.map(uc => uc.client_id) || []

  return {
    error: null,
    user: {
      id: userData.user.id,
      email: userData.user.email,
      profile: callerProfile,
      clientIds
    }
  }
}
