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
    const check = async () => {
      const { data } = await supabaseBrowser.auth.getSession()
      if (!data.session) {
        setError("Session absente. Reprends l'invitation depuis le courriel.")
        setLoading(false)
        return
      }
      setLoading(false)
    }
    void check()
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

      if (prof?.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/client')
      }
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
      <p className="mt-2 text-sm text-ct-gray">
        Définissez un mot de passe pour accéder à la plateforme.
      </p>

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

        <button
          type="submit"
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </main>
  )
}
