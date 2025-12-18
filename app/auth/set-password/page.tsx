'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function SetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const ensureSession = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1) Si une session existe déjà, parfait
        const s1 = await supabaseBrowser.auth.getSession()
        if (s1.data.session) {
          setLoading(false)
          return
        }

        // 2) Sinon, tenter de "consommer" l'URL (PKCE: ?code=... OU implicit: #access_token=...&refresh_token=...)
        const url = new URL(window.location.href)

        // a) PKCE
        const code = url.searchParams.get('code')
        if (code) {
          const { error: exErr } = await supabaseBrowser.auth.exchangeCodeForSession(code)
          if (exErr) throw exErr
          window.history.replaceState({}, document.title, '/auth/set-password')
        } else {
          // b) Implicit flow
          const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : ''
          const hashParams = new URLSearchParams(hash)

          const err = hashParams.get('error')
          const errDesc = hashParams.get('error_description')
          if (err) {
            setError(`Erreur: ${err}${errDesc ? ` — ${decodeURIComponent(errDesc)}` : ''}`)
            setLoading(false)
            return
          }

          const access_token = hashParams.get('access_token')
          const refresh_token = hashParams.get('refresh_token')

          if (access_token && refresh_token) {
            const { error: setErr } = await supabaseBrowser.auth.setSession({ access_token, refresh_token })
            if (setErr) throw setErr
            window.history.replaceState({}, document.title, '/auth/set-password')
          }
        }

        // 3) Re-check session après tentative
        const s2 = await supabaseBrowser.auth.getSession()
        if (!s2.data.session) {
          setError("Session absente. Reprends l'invitation depuis le courriel (lien invalide/expiré ou redirect non conforme).")
          setLoading(false)
          return
        }

        setLoading(false)
      } catch (e: any) {
        setError(e?.message || 'Erreur lors de la validation de la session.')
        setLoading(false)
      }
    }

    void ensureSession()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Mot de passe trop court (min 8 caractères).')
      return
    }
    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    // Sécurité: confirmer qu'on a encore une session juste avant updateUser()
    const s = await supabaseBrowser.auth.getSession()
    if (!s.data.session) {
      setError("Auth session missing! Reprends l'invitation depuis le courriel.")
      return
    }

    setSaving(true)

    const { error: upErr } = await supabaseBrowser.auth.updateUser({ password })
    if (upErr) {
      setError(upErr.message)
      setSaving(false)
      return
    }

    // Redirection selon rôle (si possible)
    const { data: u } = await supabaseBrowser.auth.getUser()
    const uid = u.user?.id

    if (uid) {
      const { data: prof } = await supabaseBrowser
        .from('user_profiles')
        .select('role')
        .eq('user_id', uid)
        .maybeSingle()

      if (prof?.role === 'admin') router.replace('/admin')
      else router.replace('/client')
    } else {
      router.replace('/login')
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <p className="text-sm text-ct-gray">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-xl font-semibold text-ct-primary">Créer votre mot de passe</h1>
      <p className="mt-2 text-sm text-ct-gray">Définissez un mot de passe pour accéder à la plateforme.</p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nouveau mot de passe</label>
          <input
            type="password"
            className="w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Confirmer le mot de passe</label>
          <input
            type="password"
            className="w-full rounded-lg border px-3 py-2"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.replace('/login')}
            disabled={saving}
          >
            Annuler
          </button>
        </div>
      </form>
    </main>
  )
}
