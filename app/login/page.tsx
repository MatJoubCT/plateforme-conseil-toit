'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Image from 'next/image'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'

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
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 px-4 py-8">
      {/* Décoration arrière-plan */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#1F4E79]/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#2d6ba8]/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Container principal */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
          {/* En-tête avec branding */}
          <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-r from-[#1F4E79] via-[#1a4168] to-[#163555] px-8 py-8">
            {/* Décoration background */}
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white blur-2xl" />
              <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white blur-2xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Logo */}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg ring-4 ring-white/20">
                <Image
                  src="/brand/connect-toit-icon.png"
                  alt="Connect-Toit"
                  width={256}
                  height={256}
                  quality={100}
                  className="h-34 w-34 rounded-xl object-cover p-1"
                  priority
                />
              </div>

              {/* Titre */}
              <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">
                CONNECT-TOIT
              </h1>
              <p className="text-sm text-white/80">
                Portail de gestion des toitures
              </p>
            </div>
          </div>

          {/* Formulaire de connexion */}
          <div className="px-8 py-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Connexion
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Entrez vos identifiants pour accéder au portail
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Champ Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Adresse courriel
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                    style={{ paddingLeft: '40px' }}
                    className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{ paddingLeft: '40px' }}
                    className="block w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-4 text-sm transition-colors placeholder:text-slate-400 focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              {/* Message d'erreur */}
              {errorMsg && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      Erreur d'authentification
                    </p>
                    <p className="mt-0.5 text-xs text-red-700">
                      {errorMsg}
                    </p>
                  </div>
                </div>
              )}

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4E79] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {/* Effet de brillance au survol */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                
                <span className="relative flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Connexion en cours…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Se connecter
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-8 py-4">
            <p className="text-center text-xs text-slate-500">
              Problème de connexion ?{' '}
              <button
                type="button"
                className="font-medium text-[#1F4E79] transition-colors hover:text-[#2d6ba8] focus:outline-none focus:underline"
              >
                Contactez le support
              </button>
            </p>
          </div>
        </div>

        {/* Texte sous le formulaire */}
        <p className="mt-6 text-center text-xs text-slate-500">
          © 2026 Connect-Toit Inc. et Les Services Conseil-Toit Inc. Tous droits réservés.
        </p>
      </div>
    </main>
  )
}
