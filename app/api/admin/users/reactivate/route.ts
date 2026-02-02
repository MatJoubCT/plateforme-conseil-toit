import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const reactivateSchema = z.object({
  user_id: z.string().uuid().optional(),
  all: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    console.log('📡 Requête POST /api/admin/users/reactivate')

    const body = await request.json()
    const validated = reactivateSchema.parse(body)

    if (validated.all) {
      // Réactiver tous les utilisateurs inactifs
      console.log('🔄 Réactivation de tous les utilisateurs inactifs...')

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({ is_active: true })
        .eq('is_active', false)
        .select()

      if (error) {
        console.error('❌ Erreur réactivation masse:', error)
        throw error
      }

      console.log(`✅ ${data.length} utilisateurs réactivés`)

      return NextResponse.json({
        ok: true,
        count: data.length,
        message: `${data.length} utilisateur(s) réactivé(s)`,
      })
    } else if (validated.user_id) {
      // Réactiver un utilisateur spécifique
      console.log('🔄 Réactivation utilisateur:', validated.user_id)

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .update({ is_active: true })
        .eq('user_id', validated.user_id)
        .select()
        .single()

      if (error) {
        console.error('❌ Erreur réactivation:', error)
        throw error
      }

      console.log('✅ Utilisateur réactivé')

      return NextResponse.json({
        ok: true,
        user: data,
        message: 'Utilisateur réactivé',
      })
    } else {
      return NextResponse.json(
        { error: 'user_id ou all requis' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('❌ Erreur API /admin/users/reactivate:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
