import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin, getValidatedOrigin } from '@/lib/auth-middleware'

async function findUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return null
  const found = data?.users?.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
  return found?.id ?? null
}

export async function POST(req: Request) {
  try {
    // Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
    if (authError) return authError

    const body = await req.json()

    const email = String(body?.email || '').trim().toLowerCase()
    const fullName = body?.fullName ? String(body.fullName).trim() : null
    const role = body?.role ? String(body.role).trim() : 'client'
    const clientIdRaw = body?.clientId ? String(body.clientId).trim() : ''
    const clientId = clientIdRaw ? clientIdRaw : null

    if (!email) {
      return NextResponse.json({ error: 'Courriel manquant.' }, { status: 400 })
    }

    const origin = getValidatedOrigin(req)
    const redirectTo = `${origin}/auth/callback`

    // 1) Invitation standard
    const inviteRes = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo })
    let userId: string | null = inviteRes.data?.user?.id ?? null

    // 2) Si déjà enregistré → generateLink(invite)
    if (inviteRes.error) {
      const msg = inviteRes.error.message || 'Erreur Supabase Auth'
      const isAlreadyRegistered = msg.toLowerCase().includes('already been registered')

      if (!isAlreadyRegistered) {
        return NextResponse.json({ error: msg }, { status: 400 })
      }

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
        return NextResponse.json({ error: `generateLink(invite) refusé : ${linkErr.message}` }, { status: 400 })
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

    return NextResponse.json({ ok: true, profile })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
