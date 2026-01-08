// app/admin/layout.tsx
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Building2,
  Layers,
  UserCog,
  ListChecks,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

type NavItem = {
  label: string
  description?: string
  href: string
  icon: LucideIcon
}

const primaryNav: NavItem[] = [
  {
    label: 'Tableau de bord',
    description: 'Vue globale des indicateurs',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    label: 'Clients',
    description: 'Gestion des clients et comptes',
    href: '/admin/clients',
    icon: Users,
  },
  {
    label: 'Bâtiments',
    description: 'Gestion des bâtiments et adresses',
    href: '/admin/batiments',
    icon: Building2,
  },
  {
    label: 'Bassins',
    description: 'Unités de toiture par bâtiment',
    href: '/admin/bassins',
    icon: Layers,
  },
]

const secondaryNav: NavItem[] = [
  {
    label: 'Utilisateurs',
    description: 'Accès et rôles',
    href: '/admin/utilisateurs',
    icon: UserCog,
  },
  {
    label: 'Listes de choix',
    description: 'Types, états, durées de vie',
    href: '/admin/listes',
    icon: ListChecks,
  },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [checking, setChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userFullName, setUserFullName] = useState<string>('')

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut()
    router.push('/login')
  }

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
          .eq('user_id', user.id)
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

        const fn = (profile.full_name as string | null) || ''
        setUserFullName(fn.trim())

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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/80 px-10 py-8 shadow-2xl backdrop-blur-sm border border-white/60">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg" />
            <div className="absolute inset-0 h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] animate-pulse opacity-50" />
          </div>
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

  const getInitials = (name: string) => {
    if (!name) return 'AD'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href)
    const Icon = item.icon

    return (
      <Link
        key={item.href}
        href={item.href}
        className={[
          'group relative flex flex-col gap-1.5 rounded-xl px-4 py-3 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F4E79]',
          active
            ? 'bg-white/15 shadow-[0_0_0_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.1)]'
            : 'hover:bg-white/10 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]',
        ].join(' ')}
        onClick={() => setSidebarOpen(false)}
      >
        {active && (
          <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white shadow-lg" />
        )}
        
        <span
          className={[
            'flex items-center gap-3 text-sm font-semibold tracking-wide transition-colors',
            active ? 'text-white' : 'text-slate-100 group-hover:text-white',
          ].join(' ')}
        >
          <Icon className={[
            'h-[18px] w-[18px] transition-transform',
            active ? 'scale-110' : 'group-hover:scale-105'
          ].join(' ')} />
          {item.label}
        </span>

        {item.description && (
          <span className={[
            'text-[11px] font-normal transition-colors pl-[30px]',
            active ? 'text-slate-100/90' : 'text-slate-200/70 group-hover:text-slate-100/80'
          ].join(' ')}>
            {item.description}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="admin-layout flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 text-slate-900">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'admin-sidebar fixed inset-y-0 left-0 z-40 flex w-72 flex-col',
          'bg-gradient-to-b from-[#1F4E79] via-[#1a4168] to-[#163555]',
          'text-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo + titre */}
        <div className="relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-lg ring-1 ring-white/20 md:h-12 md:w-12">
            <Image
              src="/brand/connect-toit-icon.png"
              alt="Connect-Toit"
              width={256}
              height={256}
              quality={100}
              className="h-28 w-28 rounded-xl object-cover p-1"
              priority
            />
          </div>

          <span className="min-w-0 whitespace-nowrap text-sm font-bold tracking-[0.2em] text-white md:text-[15px]">
            CONNECT-TOIT
          </span>

          {/* Bouton fermeture mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto md:hidden rounded-lg p-1.5 hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation principale */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mb-4 flex items-center gap-3 px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-200/80">
              Gestion
            </span>
            <span className="h-px flex-1 rounded bg-gradient-to-r from-slate-100/20 to-transparent" />
          </div>

          <div className="mb-6 flex flex-col gap-2">
            {primaryNav.map(renderNavItem)}
          </div>

          <div className="mb-4 flex items-center gap-3 px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-200/80">
              Configuration
            </span>
            <span className="h-px flex-1 rounded bg-gradient-to-r from-slate-100/20 to-transparent" />
          </div>

          <div className="flex flex-col gap-2">
            {secondaryNav.map(renderNavItem)}
          </div>
        </nav>

        {/* Bas de sidebar : compte + déconnexion */}
        <div className="border-t border-white/10 bg-gradient-to-r from-white/5 to-transparent px-4 py-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-white via-slate-50 to-slate-100 text-xs font-bold text-[#1F4E79] shadow-md ring-2 ring-white/20">
              {getInitials(userFullName)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">
                {userFullName || 'Administrateur'}
              </span>
              <span className="text-[11px] text-slate-200/75">
                Accès complet
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-3 py-2.5 text-xs font-semibold tracking-wide text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1F4E79]"
          >
            <LogOut className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Déconnexion
          </button>

          {errorMsg && (
            <p className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-[11px] leading-snug text-red-100 border border-red-400/30">
              {errorMsg}
            </p>
          )}
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-72">
        {/* Barre supérieure (mobile) */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/80 backdrop-blur-md px-4 py-3 shadow-sm md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition-all hover:bg-slate-50 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4E79]"
          >
            <Menu className="h-4 w-4" />
            <span>Menu</span>
          </button>

          <span className="truncate text-sm font-semibold text-slate-700">
            {userFullName || 'Admin'}
          </span>

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] text-[10px] font-bold text-white shadow-md">
            {getInitials(userFullName)}
          </div>
        </header>

        {/* Header statique (desktop) */}
        <div className="hidden border-b border-slate-200/70 bg-white/80 backdrop-blur-md shadow-sm md:block">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Bonjour{userFullName ? ` ${userFullName}` : ''} 👋
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bienvenue dans votre espace d'administration
              </p>
            </div>
            
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] text-sm font-bold text-white shadow-lg ring-2 ring-slate-200">
              {getInitials(userFullName)}
            </div>
          </div>
        </div>

        <main className="admin-main flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}