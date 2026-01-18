import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { updateUserAccessSchema } from '@/lib/schemas/user.schema'

export async function POST(req: Request) {
  try {
    // Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
    if (authError) return authError

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
