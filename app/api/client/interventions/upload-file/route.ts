import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireClient } from '@/lib/auth-middleware'
import { checkCsrf } from '@/lib/csrf'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeError, logError, GENERIC_ERROR_MESSAGES } from '@/lib/validation'

// Taille maximale des fichiers: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Types MIME autorisés
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]

/**
 * Sanitize un nom de fichier pour le storage
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255)
}

export async function POST(req: NextRequest) {
  let authenticatedUser: { id: string; email: string | undefined } | null = null

  try {
    // 1. Vérification CSRF
    const csrfError = checkCsrf(req)
    if (csrfError) return csrfError

    // 2. Vérification d'authentification et de rôle client
    const { error: authError, user } = await requireClient(req)
    if (authError) return authError
    authenticatedUser = user

    // 3. Rate limiting plus strict pour les uploads
    const rateLimitResult = await rateLimit(req, RATE_LIMITS.FILE_UPLOAD, user!.id)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: GENERIC_ERROR_MESSAGES.RATE_LIMIT },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMITS.FILE_UPLOAD.maxRequests),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    // 4. Parser le FormData
    const formData = await req.formData()
    const interventionId = formData.get('interventionId') as string
    const file = formData.get('file') as File

    if (!interventionId) {
      return NextResponse.json(
        { error: 'ID intervention requis' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'Fichier requis' },
        { status: 400 }
      )
    }

    // Validation de l'UUID
    const uuidSchema = z.string().uuid('ID intervention invalide')
    try {
      uuidSchema.parse(interventionId)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    // Vérifier que l'intervention existe et que l'utilisateur y a accès
    const { data: existing } = await supabaseAdmin
      .from('interventions')
      .select('id, bassin_id, bassins!inner(batiment_id, batiments!inner(client_id))')
      .eq('id', interventionId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Intervention non trouvée' }, { status: 404 })
    }

    // Vérifier que le client a accès à cette intervention
    const bassinData = existing.bassins as any
    const batimentClientId = bassinData?.batiments?.client_id
    if (!batimentClientId || !user!.clientIds.includes(batimentClientId)) {
      return NextResponse.json(
        { error: 'Accès refusé à cette intervention' },
        { status: 403 }
      )
    }

    // Validation du fichier
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10 MB)' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé (images et PDF uniquement)' },
        { status: 400 }
      )
    }

    // Obtenir le bassin_id pour la structure de dossiers
    const bassinId = existing.bassin_id

    // Sanitize le nom de fichier
    const safeName = sanitizeFileName(file.name || 'fichier')

    // Générer un chemin unique pour le fichier
    const fileId = crypto.randomUUID()
    const filePath = `${bassinId}/${interventionId}/${fileId}-${safeName}`

    // Convertir le fichier en ArrayBuffer pour Supabase
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Upload vers Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('interventions')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: `Erreur lors de l'upload du fichier: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Insérer l'enregistrement dans intervention_fichiers
    const { data, error: dbError } = await supabaseAdmin
      .from('intervention_fichiers')
      .insert({
        intervention_id: interventionId,
        file_path: filePath,
        file_name: file.name || null,
        mime_type: file.type || null,
      })
      .select()
      .single()

    if (dbError) {
      // Si l'insertion échoue, supprimer le fichier uploadé
      await supabaseAdmin.storage
        .from('interventions')
        .remove([filePath])

      return NextResponse.json(
        { error: `Erreur lors de l'enregistrement du fichier: ${dbError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, data })
  } catch (e: unknown) {
    logError('API /client/interventions/upload-file', e, { userId: authenticatedUser?.id })
    const errorMessage = sanitizeError(e, GENERIC_ERROR_MESSAGES.SERVER_ERROR)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
