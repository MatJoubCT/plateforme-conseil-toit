import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'

export async function POST(req: Request) {
  try {
    // Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
    if (authError) return authError

    const body = await req.json()
    const { profileId, isActive } = body as {
      profileId?: string
      isActive?: boolean
    }

    if (!profileId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'profileId et isActive (bool) sont requis.' },
        { status: 400 },
      )
    }

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
