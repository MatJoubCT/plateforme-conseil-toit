'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    // 1) Authentification Supabase
    const { data: signInData, error: signInError } =
      await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      })

    if (signInError) {
      setLoading(false)
      setErrorMsg(signInError.message)
      return
    }

    const user = signInData.user
    if (!user) {
      setLoading(false)
      setErrorMsg('Authentification échouée.')
      return
    }

    // 2) Aller chercher le profil pour connaître le rôle
    const { data: profile, error: profileFetchError } = await supabaseBrowser
      .from('user_profiles')
      .select('role, client_id')
      .eq('user_id', user.id)
      .single()

    console.log('PROFILE DEBUG', {
      userId: user.id,
      profile,
      profileFetchError,
    })

    setLoading(false)

    if (profileFetchError || !profile) {
      setErrorMsg("Impossible de trouver le profil associé à cet utilisateur.")
      return
    }

    if (profile.role === 'admin') {
      router.push('/admin')
    } else if (profile.role === 'client') {
      router.push('/client')
    } else {
      setErrorMsg(`Rôle inconnu : ${profile.role}`)
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F6F7',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: 360,
          padding: 24,
          borderRadius: 8,
          backgroundColor: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
          Connexion
        </h1>
        <p style={{ marginBottom: 16, fontSize: 14, color: '#555' }}>
          Entrez vos identifiants pour accéder au portail.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Courriel
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid #ccc',
                fontSize: 14,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {errorMsg && (
            <p style={{ color: 'red', fontSize: 13 }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: '100%',
              padding: '8px 10px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: '#1F4E79',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  )
}
