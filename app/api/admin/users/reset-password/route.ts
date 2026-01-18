import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireAdmin, getValidatedOrigin } from '@/lib/auth-middleware'
import { resetPasswordSchema } from '@/lib/schemas/user.schema'

export async function POST(req: Request) {
  try {
    // Vérification d'authentification et de rôle admin
    const { error: authError, user } = await requireAdmin(req)
    if (authError) return authError

    // Body
    const body = await req.json()

    // Validation Zod
    let validated
    try {
      validated = resetPasswordSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
      }
      throw error
    }

    const userId = validated.userId

    // Récupérer l'email depuis Supabase Auth
    const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(userId)
    if (targetErr) {
      return NextResponse.json({ error: `Auth.getUserById() refusé : ${targetErr.message}` }, { status: 400 })
    }

    const email = target?.user?.email
    if (!email) {
      return NextResponse.json({ error: "Courriel introuvable pour cet utilisateur (Auth)." }, { status: 404 })
    }

    // Envoyer le courriel de réinitialisation (redirige vers /auth/callback)
    const origin = getValidatedOrigin(req)
    const redirectTo = `${origin}/auth/callback`

    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })
    if (resetErr) {
      return NextResponse.json({ error: `resetPasswordForEmail refusé : ${resetErr.message}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 })
  }
}
