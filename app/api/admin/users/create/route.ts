import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, fullName, role } = body as {
      email?: string
      fullName?: string | null
      role?: string | null
    }

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Les champs "email" et "role" sont requis.' },
        { status: 400 },
      )
    }

    const trimmedEmail = email.trim().toLowerCase()
    const name = fullName && fullName.trim().length > 0 ? fullName.trim() : null
    const finalRole = role.trim() || 'client'

    // 1) Invitation Supabase Auth (envoie un courriel d’invitation)
    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(trimmedEmail)

    if (inviteError) {
      return NextResponse.json(
        {
          error:
            inviteError.message ||
            "Erreur lors de l'envoi de l'invitation Supabase.",
        },
        { status: 500 },
      )
    }

    const user = inviteData?.user
    if (!user || !user.id) {
      return NextResponse.json(
        { error: "Utilisateur Auth non retourné par Supabase." },
        { status: 500 },
      )
    }

    // 2) Création du profil dans user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: user.id,
        full_name: name,
        role: finalRole,
        is_active: true,
      })
      .select('id, user_id, full_name, role, is_active')
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            profileError?.message ||
            'Erreur lors de la création du profil utilisateur.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ profile })
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          'Erreur serveur inconnue lors de la création de l’utilisateur.',
      },
      { status: 500 },
    )
  }
}
