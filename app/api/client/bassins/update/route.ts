import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireClient } from '@/lib/auth-middleware'
import { updateBassinSchema } from '@/lib/schemas/bassin.schema'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

export async function PUT(req: NextRequest) {
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
      validated = updateBassinSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que le bassin existe et que l'utilisateur y a accès
    const { data: existing } = await supabaseAdmin
      .from('bassins')
      .select('id, batiment_id, batiments!inner(client_id)')
      .eq('id', validated.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Bassin non trouvé' }, { status: 404 })
    }

    // Vérifier que le client a accès à ce bassin
    const batimentClientId = (existing.batiments as any)?.client_id
    if (!batimentClientId || !user!.clientIds.includes(batimentClientId)) {
      return NextResponse.json(
        { error: 'Accès refusé à ce bassin' },
        { status: 403 }
      )
    }

    // Vérifier que le bâtiment de destination existe et que l'utilisateur y a accès
    const { data: batimentExists } = await supabaseAdmin
      .from('batiments')
      .select('id, client_id')
      .eq('id', validated.batimentId)
      .single()

    if (!batimentExists) {
      return NextResponse.json({ error: 'Bâtiment non trouvé' }, { status: 404 })
    }

    if (!user!.clientIds.includes(batimentExists.client_id)) {
      return NextResponse.json(
        { error: 'Accès refusé à ce bâtiment' },
        { status: 403 }
      )
    }

    // Vérifier que les IDs de listes existent si fournis
    if (validated.membraneTypeId) {
      const { data: membraneExists } = await supabaseAdmin
        .from('listes_choix')
        .select('id')
        .eq('id', validated.membraneTypeId)
        .single()

      if (!membraneExists) {
        return NextResponse.json({ error: 'Type de membrane non trouvé' }, { status: 404 })
      }
    }

    if (validated.etatId) {
      const { data: etatExists } = await supabaseAdmin
        .from('listes_choix')
        .select('id')
        .eq('id', validated.etatId)
        .single()

      if (!etatExists) {
        return NextResponse.json({ error: 'État non trouvé' }, { status: 404 })
      }
    }

    if (validated.dureeVieId) {
      const { data: dureeVieExists } = await supabaseAdmin
        .from('listes_choix')
        .select('id')
        .eq('id', validated.dureeVieId)
        .single()

      if (!dureeVieExists) {
        return NextResponse.json({ error: 'Durée de vie non trouvée' }, { status: 404 })
      }
    }

    // Conversion camelCase → snake_case
    const dbData = {
      batiment_id: validated.batimentId,
      name: validated.name,
      surface_m2: validated.surfaceM2 ?? null,
      membrane_type_id: validated.membraneTypeId || null,
      etat_id: validated.etatId || null,
      duree_vie_id: validated.dureeVieId || null,
      duree_vie_text: validated.dureeVieText || null,
      annee_installation: validated.anneeInstallation ?? null,
      date_derniere_refection: validated.dateDerniereRefection || null,
      reference_interne: validated.referenceInterne || null,
      notes: validated.notes || null,
      polygone_geojson: validated.polygoneGeojson || null,
    }

    // Mise à jour du bassin
    const { data, error } = await supabaseAdmin
      .from('bassins')
      .update(dbData)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: `Erreur lors de la mise à jour du bassin: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /client/bassins/update', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
