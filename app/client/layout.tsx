'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut()
    router.push('/login')
  }

useEffect(() => {
  const checkAuth = async () => {
    setChecking(true)
    setErrorMsg(null)

    // 1) Vérifier la session
    const { data: sessionData, error: sessionError } =
      await supabaseBrowser.auth.getSession()

    if (sessionError || !sessionData.session) {
      router.replace('/login')
      return
    }

    const user = sessionData.session.user

    // 2) Charger le profil incluant is_active
    const { data: profile, error: profileError } = await supabaseBrowser
      .from('user_profiles')
      .select('role, client_id, is_active')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      setErrorMsg("Profil introuvable pour cet utilisateur.")
      router.replace('/login')
      return
    }

    // 3) Vérifier rôle
    if (profile.role !== 'client') {
      setErrorMsg('Accès client uniquement.')
      router.replace('/login')
      return
    }

    // 4) Vérifier si l’utilisateur est suspendu
    if (profile.is_active === false) {
      setErrorMsg(
        "Votre accès au portail client a été suspendu. Veuillez contacter Conseil-Toit."
      )

      // Déconnexion propre
      await supabaseBrowser.auth.signOut()

      router.replace('/login')
      return
    }

    // 5) OK
    setChecking(false)
  }

  void checkAuth()
}, [router])

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p>Vérification des accès…</p>
      </div>
    )
  }

  return (
    <div className="layout-client">
      <header className="client-header">
        <div>Portail client – Conseil-Toit</div>
        <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/client" style={{ color: 'white' }}>
            Dashboard
          </Link>
          <Link href="/client/carte" style={{ color: 'white' }}>
            Carte
          </Link>
          <Link href="/client/batiments" style={{ color: 'white' }}>
            Bâtiments
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              marginLeft: 16,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #fff',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Déconnexion
          </button>
        </nav>
      </header>
      <main className="client-main">{children}</main>
    </div>
  )
}
