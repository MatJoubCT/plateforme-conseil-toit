import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { updateGarantieSchema } from '@/lib/schemas/garantie.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'
import { notifyForBassin, getBassinContext } from '@/lib/notifications/create'

export async function PUT(req: NextRequest) {
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
      validated = updateGarantieSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que la garantie existe
    const { data: existing } = await supabaseAdmin
      .from('garanties')
      .select('id')
      .eq('id', validated.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Garantie non trouvée' }, { status: 404 })
    }

    // Vérifier que le bassin de destination existe
    const { data: bassinExists } = await supabaseAdmin
      .from('bassins')
      .select('id')
      .eq('id', validated.bassinId)
      .single()

    if (!bassinExists) {
      return NextResponse.json({ error: 'Bassin non trouvé' }, { status: 404 })
    }

    // Vérifier que les IDs de listes existent si fournis
    if (validated.typeGarantieId) {
      const { data: typeExists } = await supabaseAdmin
        .from('listes_choix')
        .select('id')
        .eq('id', validated.typeGarantieId)
        .single()

      if (!typeExists) {
        return NextResponse.json({ error: 'Type de garantie non trouvé' }, { status: 404 })
      }
    }

    if (validated.statutId) {
      const { data: statutExists } = await supabaseAdmin
        .from('listes_choix')
        .select('id')
        .eq('id', validated.statutId)
        .single()

      if (!statutExists) {
        return NextResponse.json({ error: 'Statut non trouvé' }, { status: 404 })
      }
    }

    // Conversion camelCase → snake_case
    const dbData = {
      bassin_id: validated.bassinId,
      type_garantie_id: validated.typeGarantieId || null,
      fournisseur: validated.fournisseur || null,
      numero_garantie: validated.numeroGarantie || null,
      date_debut: validated.dateDebut || null,
      date_fin: validated.dateFin || null,
      statut_id: validated.statutId || null,
      couverture: validated.couverture || null,
      commentaire: validated.commentaire || null,
      fichier_pdf_url: validated.fichierPdfUrl || null,
    }

    // Mise à jour de la garantie
    const { data, error } = await supabaseAdmin
      .from('garanties')
      .update(dbData)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour de la garantie: ${error.message}` },
        { status: 500 }
      )
    }

    // Notification (fire-and-forget) — notifier les clients du bassin
    void (async () => {
      try {
        const ctx = await getBassinContext(validated.bassinId)
        await notifyForBassin(validated.bassinId, {
          type: 'garantie_updated',
          title: 'Garantie modifiée',
          message: `Une garantie a été modifiée pour le bassin ${ctx.bassinName} de ${ctx.batimentName}.`,
          link: `/client/bassins/${validated.bassinId}`,
        }, { notifyClients: true, notifyAdmins: false })
      } catch { /* silencieux */ }
    })()

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /admin/garanties/update', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
