import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { toggleUserActiveSchema } from '@/lib/schemas/user.schema'

export async function POST(req: Request) {
  try {
    // Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
    if (authError) return authError

    const body = await req.json()

    // Validation Zod
    let validated
    try {
      validated = toggleUserActiveSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    const { profileId, isActive } = validated

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ is_active: isActive })
      .eq('id', profileId)

    if (error) {
      return NextResponse.json(
        { error: error.message ?? 'Erreur Supabase' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Erreur serveur inconnue' },
      { status: 500 },
    )
  }
}
