import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin } from '@/lib/auth-middleware'
import { createInterventionSchema } from '@/lib/schemas/bassin.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'
import { notifyForBassin, getBassinContext } from '@/lib/notifications/create'

export async function POST(req: NextRequest) {
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
      validated = createInterventionSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que le bassin existe
    const { data: bassinExists } = await supabaseAdmin
      .from('bassins')
      .select('id')
      .eq('id', validated.bassinId)
      .single()

    if (!bassinExists) {
      return NextResponse.json({ error: 'Bassin non trouvé' }, { status: 404 })
    }

    // Vérifier que le type d'intervention existe si fourni
    if (validated.typeInterventionId) {
      const { data: typeExists } = await supabaseAdmin
        .from('listes_choix')
        .select('id')
        .eq('id', validated.typeInterventionId)
        .single()

      if (!typeExists) {
        return NextResponse.json({ error: 'Type d\'intervention non trouvé' }, { status: 404 })
      }
    }

    // Conversion camelCase → snake_case
    const dbData = {
      bassin_id: validated.bassinId,
      date_intervention: validated.dateIntervention,
      type_intervention_id: validated.typeInterventionId || null,
      commentaire: validated.commentaire || null,
      location_geojson: validated.locationGeojson || null,
    }

    // Création de l'intervention
    const { data, error } = await supabaseAdmin
      .from('interventions')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la création de l'intervention: ${error.message}` },
        { status: 500 }
      )
    }

    // Notification — liens différents pour clients et admins
    try {
      const ctx = await getBassinContext(validated.bassinId)

      // Récupérer le label du type d'intervention
      let typeLabel = ''
      if (validated.typeInterventionId) {
        const { data: typeData } = await supabaseAdmin
          .from('listes_choix')
          .select('label')
          .eq('id', validated.typeInterventionId)
          .single()
        if (typeData?.label) typeLabel = typeData.label
      }

      const typePart = typeLabel ? ` (${typeLabel})` : ''
      const message = `Une intervention${typePart} a été ajoutée au bassin ${ctx.bassinName} de ${ctx.batimentName}.`

      // Notifier les clients avec un lien client
      await notifyForBassin(validated.bassinId, {
        type: 'intervention_added',
        title: 'Nouvelle intervention',
        message,
        link: `/client/bassins/${validated.bassinId}`,
      }, { notifyClients: true, notifyAdmins: false })

      // Notifier les admins avec un lien admin
      await notifyForBassin(validated.bassinId, {
        type: 'intervention_added',
        title: 'Nouvelle intervention',
        message,
        link: `/admin/bassins/${validated.bassinId}`,
      }, { notifyClients: false, notifyAdmins: true })
    } catch (notifError) {
      console.error('[NOTIFICATIONS] Erreur notification intervention (admin):', notifError)
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /admin/interventions/create', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
