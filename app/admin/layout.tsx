// app/admin/layout.tsx
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Image from 'next/image'

type NavItem = {
  label: string
  description?: string
  href: string
}

const primaryNav: NavItem[] = [
  {
    label: 'Tableau de bord',
    description: 'Vue globale des indicateurs',
    href: '/admin',
  },
  {
    label: 'Clients',
    description: 'Gestion des clients et comptes',
    href: '/admin/clients',
  },
  {
    label: 'Bâtiments',
    description: 'Gestion des bâtiments et adresses',
    href: '/admin/batiments',
  },
  {
    label: 'Bassins',
    description: 'Unités de toiture par bâtiment',
    href: '/admin/bassins',
  },
]

const secondaryNav: NavItem[] = [
  {
    label: 'Utilisateurs',
    description: 'Accès et rôles',
    href: '/admin/utilisateurs',
  },
  {
    label: 'Listes de choix',
    description: 'Types, états, durées de vie',
    href: '/admin/listes',
  },
  // À activer plus tard :
  // { label: 'Garanties', description: 'Types et fichiers de garanties', href: '/admin/garanties' },
  // { label: 'Rapports', description: 'Rapports PDF et métadonnées', href: '/admin/rapports' },
  // { label: 'Utilisateurs', description: 'Accès et rôles', href: '/admin/utilisateurs' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [checking, setChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Nom complet affiché dans le header
  const [userFullName, setUserFullName] = useState<string>('')

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut()
    router.push('/login')
  }

  // Vérification Auth + rôle admin (pattern du projet : getSession + user_profiles.user_id)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setChecking(true)
        setErrorMsg(null)

        const { data: sessionData, error: sessionError } =
          await supabaseBrowser.auth.getSession()

        if (sessionError || !sessionData?.session) {
          setErrorMsg("Vous devez être connecté pour accéder à l'admin.")
          router.replace('/login')
          return
        }

        const user = sessionData.session.user

        const { data: profile, error: profileError } = await supabaseBrowser
          .from('user_profiles')
          .select('role, full_name')
          .eq('user_id', user.id) // IMPORTANT : colonne user_id (conformément à ton schéma actuel)
          .single()

        if (profileError || !profile) {
          setErrorMsg('Profil introuvable pour cet utilisateur.')
          router.replace('/login')
          return
        }

        if (profile.role !== 'admin') {
          setErrorMsg('Accès refusé : rôle non administrateur.')
          router.replace('/login')
          return
        }

        // Nom complet (depuis user_profiles.full_name)
        setUserFullName((profile.full_name as string | null) || '')

        setChecking(false)
      } catch (err) {
        console.error('Erreur auth admin:', err)
        setErrorMsg("Erreur lors de la vérification de l'accès.")
        router.replace('/login')
      }
    }

    void checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-xl">
          <div className="h-10 w-10 rounded-xl bg-[#1F4E79] opacity-90" />
          <p className="text-sm font-medium text-slate-700">
            Chargement du portail administrateur…
          </p>
        </div>
      </div>
    )
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href)

    return (
      <Link
        key={item.href}
        href={item.href}
        className={[
          'group flex flex-col gap-1 rounded-xl px-3 py-2.5 transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
          active
            ? 'bg-white/12 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]'
            : 'hover:bg-white/8',
        ].join(' ')}
        onClick={() => setSidebarOpen(false)}
      >
        <span
          className={[
            'text-sm font-medium tracking-wide',
            active ? 'text-white' : 'text-slate-50',
          ].join(' ')}
        >
          {item.label}
        </span>
        {item.description && (
          <span className="text-[11px] font-normal text-slate-200/80">
            {item.description}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="admin-layout flex min-h-screen bg-[#F5F6F7] text-slate-900">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'admin-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#1F4E79] text-white shadow-2xl',
          'transition-transform duration-200 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo + titre */}
          <div className="flex items-center gap-4 border-b border-white/10 px-5 py-4">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
              <Image
                src="/brand/connect-toit-icon.png"
                alt="Connect-Toit"
                width={256}
                height={256}
                quality={100}
                className="object-cover h-24 w-24 md:h-34 md:w-34"
                priority
              />
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-100/80">
                Connect-Toit
              </span>
            </div>
          </div>

        {/* Navigation principale */}
        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200/70">
              Gestion
            </span>
            <span className="h-px flex-1 rounded bg-slate-100/10" />
          </div>

          <div className="mb-5 flex flex-col gap-1.5">
            {primaryNav.map(renderNavItem)}
          </div>

          <div className="mt-2 mb-3 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200/70">
              Configuration
            </span>
            <span className="h-px flex-1 rounded bg-slate-100/10" />
          </div>

          <div className="flex flex-col gap-1.5">
            {secondaryNav.map(renderNavItem)}
          </div>
        </nav>

        {/* Bas de sidebar : compte + déconnexion */}
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-[#1F4E79]">
              ADM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-50">
                Espace administrateur
              </span>
              <span className="text-[11px] text-slate-200/75">
                Accès complet aux données
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex w-full items-center justify-center rounded-lg border border-white/80 px-3 py-2 text-xs font-medium tracking-wide text-white shadow-sm transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Déconnexion
          </button>

          {errorMsg && (
            <p className="mt-3 text-[11px] leading-snug text-red-200">
              {errorMsg}
            </p>
          )}
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-72">
        {/* Barre supérieure (mobile) */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/95 px-3 py-2.5 shadow-sm md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4E79]"
          >
            <span className="h-0.5 w-3 rounded-full bg-slate-800" />
            <span className="h-0.5 w-3 rounded-full bg-slate-800" />
            <span className="h-0.5 w-3 rounded-full bg-slate-800" />
            <span className="ml-1">Menu</span>
          </button>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Admin Conseil-Toit
          </span>
          <div className="h-7 w-7 rounded-full bg-[#1F4E79]/90" />
        </header>

        {/* Header statique (desktop) : pleine largeur jusqu'au sidebar */}
        <div className="hidden md:block border-b border-slate-200/70 bg-white/95">
          <div className="flex items-center px-6 py-4 lg:px-8">
            <span className="text-base font-semibold text-slate-900">
              Bonjour{userFullName ? ` ${userFullName}` : ''}
            </span>
          </div>
        </div>

        <main className="admin-main flex-1 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
