import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getBearerToken } from '@/lib/auth-middleware'
import { markReadSchema } from '@/lib/schemas/notification.schema'
import { logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

/**
 * Résout le user_id depuis le token Bearer.
 * Accepte admin ET client.
 */
async function getUserFromToken(req: NextRequest) {
  const token = getBearerToken(req)
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return null

  return data.user
}

/**
 * GET /api/notifications — Liste les notifications de l'utilisateur connecté
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 100)
    const unreadOnly = url.searchParams.get('unread_only') === 'true'

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Compteur non lues
    const { count, error: countError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      ok: true,
      data: data || [],
      unreadCount: countError ? 0 : (count ?? 0),
    })
  } catch (e: unknown) {
    logError('API GET /notifications', e)
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}

/**
 * PUT /api/notifications — Marque une notification comme lue
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()

    let validated
    try {
      validated = markReadSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', validated.id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    logError('API PUT /notifications', e)
    return NextResponse.json({ error: GENERIC_ERROR_MESSAGES.SERVER_ERROR }, { status: 500 })
  }
}
