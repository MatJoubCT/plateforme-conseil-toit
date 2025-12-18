import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function getOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (origin) return origin

  const proto = req.headers.get('x-forwarded-proto')
  const host = req.headers.get('x-forwarded-host')
  if (proto && host) return `${proto}://${host}`

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

function getBearerToken(req: Request) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1] || null
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Authorization Bearer token manquant.' }, { status: 401 })
    }

    // 1) Valider l’appelant (session)
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Token invalide ou session expirée.' }, { status: 401 })
    }

    // 2) Vérifier que l’appelant est admin
    const callerId = userData.user.id
    const { data: callerProfile, error: callerProfErr } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', callerId)
      .maybeSingle()

    if (callerProfErr) {
      return NextResponse.json(
        { error: `Impossible de lire le profil appelant: ${callerProfErr.message}` },
        { status: 500 },
      )
    }

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé (admin requis).' }, { status: 403 })
    }

    // 3) Body
    const body = await req.json()
    const userId = String(body?.userId || '').trim()
    if (!userId) {
      return NextResponse.json({ error: 'userId manquant.' }, { status: 400 })
    }

    // 4) Récupérer l’email depuis Supabase Auth
    const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (targetErr) {
      return NextResponse.json({ error: `Auth.getUserById() refusé : ${targetErr.message}` }, { status: 400 })
    }

    const email = target?.user?.email
    if (!email) {
      return NextResponse.json({ error: "Courriel introuvable pour cet utilisateur (Auth)." }, { status: 404 })
    }

    // 5) Envoyer le courriel de réinitialisation (redirige vers /auth/callback)
    const origin = getOrigin(req)
    const redirectTo = `${origin}/auth/callback`

    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
    if (resetErr) {
      return NextResponse.json({ error: `resetPasswordForEmail refusé : ${resetErr.message}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
