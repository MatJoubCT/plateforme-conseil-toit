import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { deleteInterventionSchema } from '@/lib/schemas/bassin.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

export async function DELETE(req: NextRequest) {
  let authenticatedUser: { id: string; email: string | undefined } | null = null

  try {
    // 1. Vérification CSRF
    const csrfError = checkCsrf(req)
    if (csrfError) return csrfError

    // 2. Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
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
      validated = deleteInterventionSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que l'intervention existe
    const { data: existing } = await supabaseAdmin
      .from('interventions')
      .select('id')
      .eq('id', validated.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 })
    }

    // Récupérer les fichiers associés pour les supprimer du storage
    const { data: files } = await supabaseAdmin
      .from('intervention_fichiers')
      .select('id, file_path')
      .eq('intervention_id', validated.id)

    // Supprimer les fichiers du storage s'il y en a
    if (files && files.length > 0) {
      const filePaths = files.map(f => f.file_path).filter(Boolean)
      if (filePaths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('interventions')
          .remove(filePaths)

        if (storageError) {
          console.error('Erreur suppression storage:', storageError)
        }
      }

      // Supprimer les enregistrements de fichiers
      const { error: filesError } = await supabaseAdmin
        .from('intervention_fichiers')
        .delete()
        .eq('intervention_id', validated.id)

      if (filesError) {
        return NextResponse.json(
          { error: `Erreur lors de la suppression des fichiers: ${filesError.message}` },
          { status: 500 }
        )
      }
    }

    // Suppression de l'intervention
    const { error } = await supabaseAdmin.from('interventions').delete().eq('id', validated.id)

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la suppression de l'intervention: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    logError('API /admin/interventions/delete', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
