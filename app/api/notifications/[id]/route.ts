import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getBearerToken } from '@/lib/auth-middleware'
import { logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

/**
 * DELETE /api/notifications/[id] — Supprime une notification
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier le format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    // Supprimer uniquement si c'est la notification de l'utilisateur
    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userData.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    logError('API DELETE /notifications/[id]', e)
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}
