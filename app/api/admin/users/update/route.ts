import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { updateUserSchema } from '@/lib/schemas/user.schema'

export async function POST(req: Request) {
  try {
    // Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
    if (authError) return authError

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
      return NextResponse.json({ error: `user_profiles.update() refusé : ${upErr.message}` }, { status: 400 })
    }

    // 2) user_clients (delete + insert)
    const { error: delUcErr } = await supabaseAdmin.from('user_clients').delete().eq('user_id', userId)
    if (delUcErr) {
      return NextResponse.json({ error: `Suppression user_clients refusée : ${delUcErr.message}` }, { status: 400 })
    }

    if (uniqClients.length > 0) {
      const rows = uniqClients.map((client_id: string) => ({ user_id: userId, client_id }))
      const { error: insUcErr } = await supabaseAdmin.from('user_clients').insert(rows)
      if (insUcErr) {
        return NextResponse.json({ error: `Insertion user_clients refusée : ${insUcErr.message}` }, { status: 400 })
      }
    }

    // 3) user_batiments_access (delete + insert)
    const { error: delUbaErr } = await supabaseAdmin
      .from('user_batiments_access')
      .delete()
      .eq('user_id', userId)

    if (delUbaErr) {
      return NextResponse.json(
        { error: `Suppression user_batiments_access refusée : ${delUbaErr.message}` },
        { status: 400 },
      )
    }

    if (uniqBatiments.length > 0) {
      const rows = uniqBatiments.map((batiment_id: string) => ({ user_id: userId, batiment_id }))
      const { error: insUbaErr } = await supabaseAdmin.from('user_batiments_access').insert(rows)
      if (insUbaErr) {
        return NextResponse.json(
          { error: `Insertion user_batiments_access refusée : ${insUbaErr.message}` },
          { status: 400 },
        )
      }
    }

    return NextResponse.json({ ok: true, profile: updatedProfile })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
