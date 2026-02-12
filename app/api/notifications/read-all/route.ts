import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getBearerToken } from '@/lib/auth-middleware'
import { logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

/**
 * PUT /api/notifications/read-all — Marque toutes les notifications comme lues
 */
export async function PUT(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userData.user.id)
      .eq('is_read', false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    logError('API PUT /notifications/read-all', e)
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}
