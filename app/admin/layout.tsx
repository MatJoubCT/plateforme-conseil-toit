'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function AdminLayout({ children }: { children: ReactNode }) {
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

      const { data: sessionData, error: sessionError } =
        await supabaseBrowser.auth.getSession()

      if (sessionError || !sessionData.session) {
        router.replace('/login')
        return
      }

      const user = sessionData.session.user

      const { data: profile, error: profileError } = await supabaseBrowser
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        setErrorMsg("Profil introuvable pour cet utilisateur.")
        router.replace('/login')
        return
      }

      if (profile.role !== 'admin') {
        setErrorMsg('Accès refusé (rôle non admin).')
        router.replace('/login')
        return
      }

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
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h1 className="admin-sidebar-title">Admin Conseil-Toit</h1>
        <nav>
          <ul className="admin-sidebar-nav">
            <li>
              <Link href="/admin">Dashboard</Link>
            </li>
            <li>
              <Link href="/admin/clients">Clients</Link>
            </li>
            <li>
              <Link href="/admin/batiments">Bâtiments</Link>
            </li>
            <li>
              <Link href="/admin/bassins">Bassins</Link>
            </li>
            <li>
              <Link href="/admin/listes">Listes de choix</Link>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: 24,
            padding: '8px 10px',
            width: '100%',
            borderRadius: 4,
            border: '1px solid #fff',
            background: 'transparent',
            color: 'white',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Déconnexion
        </button>

        {errorMsg && (
          <p style={{ marginTop: 16, fontSize: 12, color: '#ffdede' }}>
            {errorMsg}
          </p>
        )}
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  )
}
