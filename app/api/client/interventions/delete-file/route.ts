import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireClient } from '@/lib/auth-middleware'
import { deleteInterventionFileSchema } from '@/lib/schemas/bassin.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

export async function DELETE(req: NextRequest) {
  let authenticatedUser: { id: string; email: string | undefined } | null = null

  try {
    // 1. Vérification CSRF
    const csrfError = checkCsrf(req)
    if (csrfError) return csrfError

    // 2. Vérification d'authentification et de rôle client
    const { error: authError, user } = await requireClient(req)
    if (authError) return authError
    authenticatedUser = user

    // 3. Rate limiting
    const rateLimitResult = await rateLimit(req, RATE_LIMITS.API_GENERAL, user!.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: GENERIC_ERROR_MESSAGES.RATE_LIMIT },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMITS.API_GENERAL.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    const body = await req.json()

    // Validation Zod
    let validated
    try {
      validated = deleteInterventionFileSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que le fichier existe et que l'utilisateur y a accès
    const { data: existing } = await supabaseAdmin
      .from('intervention_fichiers')
      .select('id, file_path, intervention_id, interventions!inner(bassin_id, bassins!inner(batiment_id, batiments!inner(client_id)))')
      .eq('id', validated.fileId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }

    // Vérifier que le client a accès à ce fichier
    const interventionData = existing.interventions as any
    const bassinData = interventionData?.bassins
    const batimentClientId = bassinData?.batiments?.client_id
    if (!batimentClientId || !user!.clientIds.includes(batimentClientId)) {
      return NextResponse.json(
        { error: 'Accès refusé à ce fichier' },
        { status: 403 }
      )
    }

    // Supprimer le fichier du storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('interventions')
      .remove([existing.file_path])

    if (storageError) {
      // Log l'erreur mais continue la suppression de l'enregistrement
      console.error('Erreur suppression storage:', storageError)
    }

    // Supprimer l'enregistrement de la base de données
    const { error } = await supabaseAdmin
      .from('intervention_fichiers')
      .delete()
      .eq('id', validated.fileId)

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la suppression du fichier: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    logError('API /client/interventions/delete-file', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
