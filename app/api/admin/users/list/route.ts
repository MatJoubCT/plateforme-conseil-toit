import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    console.log('📡 Requête GET /api/admin/users/list')

    // Récupérer tous les profils utilisateurs
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, full_name, role, is_active, client_id')
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('❌ Erreur récupération profils:', profilesError)
      throw profilesError
    }

    console.log(`✅ ${profiles.length} profils récupérés`)

    // Pour chaque profil, récupérer l'email depuis auth.users
    const usersWithEmail = await Promise.all(
      (profiles || []).map(async (profile) => {
        try {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(
            profile.user_id
          )

          if (error) {
            console.warn(`⚠️ Erreur récupération email pour ${profile.user_id}:`, error)
            return {
              ...profile,
              email: 'Email non disponible',
            }
          }

          return {
            ...profile,
            email: data.user?.email || 'Email non disponible',
          }
        } catch (err) {
          console.warn(`⚠️ Exception récupération email pour ${profile.user_id}:`, err)
          return {
            ...profile,
            email: 'Email non disponible',
          }
        }
      })
    )

    console.log('✅ Emails récupérés pour tous les utilisateurs')

    return NextResponse.json({
      ok: true,
      users: usersWithEmail,
    })
  } catch (error: any) {
    console.error('❌ Erreur API /admin/users/list:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
