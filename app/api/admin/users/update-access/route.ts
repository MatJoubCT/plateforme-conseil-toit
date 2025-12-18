import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    // 1) Valider l’appelant (session) via Supabase Auth
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Token invalide ou session expirée.' }, { status: 401 })
    }

    // 2) Vérifier que l’appelant est admin (user_profiles.role)
    const callerId = userData.user.id
    const { data: callerProfile, error: callerProfErr } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', callerId)
      .maybeSingle()

    if (callerProfErr) {
      return NextResponse.json({ error: `Impossible de lire le profil appelant: ${callerProfErr.message}` }, { status: 500 })
    }

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé (admin requis).' }, { status: 403 })
    }

    // 3) Body
    const body = await req.json()

    const userId = String(body?.userId || '').trim()
    const selectedClientIdsRaw = Array.isArray(body?.selectedClientIds) ? body.selectedClientIds : []
    const selectedBatimentIdsRaw = Array.isArray(body?.selectedBatimentIds) ? body.selectedBatimentIds : []

    if (!userId) {
      return NextResponse.json({ error: 'userId manquant.' }, { status: 400 })
    }

    const selectedClientIds = Array.from(
      new Set(
        selectedClientIdsRaw
          .map((x: any) => String(x || '').trim())
          .filter((x: string) => x.length > 0),
      ),
    )

    const selectedBatimentIds = Array.from(
      new Set(
        selectedBatimentIdsRaw
          .map((x: any) => String(x || '').trim())
          .filter((x: string) => x.length > 0),
      ),
    )

    // 4) Écrire les accès (service role => bypass RLS)
    const { error: delClientsErr } = await supabaseAdmin.from('user_clients').delete().eq('user_id', userId)
    if (delClientsErr) {
      return NextResponse.json({ error: `Suppression user_clients refusée : ${delClientsErr.message}` }, { status: 500 })
    }

    if (selectedClientIds.length > 0) {
      const rows = selectedClientIds.map((clientId) => ({ user_id: userId, client_id: clientId }))
      const { error: insClientsErr } = await supabaseAdmin.from('user_clients').insert(rows)
      if (insClientsErr) {
        return NextResponse.json({ error: `Insertion user_clients refusée : ${insClientsErr.message}` }, { status: 500 })
      }
    }

    const { error: delBatsErr } = await supabaseAdmin.from('user_batiments_access').delete().eq('user_id', userId)
    if (delBatsErr) {
      return NextResponse.json(
        { error: `Suppression user_batiments_access refusée : ${delBatsErr.message}` },
        { status: 500 },
      )
    }

    if (selectedBatimentIds.length > 0) {
      const rows = selectedBatimentIds.map((batimentId) => ({ user_id: userId, batiment_id: batimentId }))
      const { error: insBatsErr } = await supabaseAdmin.from('user_batiments_access').insert(rows)
      if (insBatsErr) {
        return NextResponse.json(
          { error: `Insertion user_batiments_access refusée : ${insBatsErr.message}` },
          { status: 500 },
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
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
