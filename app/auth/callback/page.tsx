'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [msg, setMsg] = useState('Validation en cours…')

  useEffect(() => {
    const run = async () => {
      try {
        // 1) Erreurs explicites dans le hash
        const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
        const hashParams = new URLSearchParams(hash)
        const err = hashParams.get('error')
        const errDesc = hashParams.get('error_description')

        if (err) {
          setMsg(`Erreur: ${err}${errDesc ? ` — ${decodeURIComponent(errDesc)}` : ''}`)
          return
        }

        // 2) Cas PKCE: ?code=...
        const url = new URL(window.location.href)
        const code = url.searchParams.get('code')
        if (code) {
          const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code)
          if (error) throw error
          window.history.replaceState({}, document.title, '/auth/callback')
          router.replace('/auth/set-password')
          return
        }

        // 3) Cas implicit: #access_token=...&refresh_token=...
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')

        if (access_token && refresh_token) {
          const { error } = await supabaseBrowser.auth.setSession({ access_token, refresh_token })
          if (error) throw error
          window.history.replaceState({}, document.title, '/auth/callback')
          router.replace('/auth/set-password')
          return
        }

        // 4) Sinon: pas de token => invite invalide/expirée ou redirect cassé
        setMsg("Lien invalide ou expiré (aucun token reçu). Demande une nouvelle invitation.")
      } catch (e: any) {
        setMsg(`Erreur callback: ${e?.message || 'Erreur inconnue'}`)
      }
    }

    void run()
  }, [router])

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold text-ct-primary">Connexion</h1>
      <p className="mt-2 text-sm text-ct-gray">{msg}</p>
    </main>
  )
}
