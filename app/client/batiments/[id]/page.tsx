'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'

type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string | null
  couleur: string | null
}

type UserProfileRow = {
  id: string
  user_id: string
  role: string | null
  client_id: string | null
  full_name: string | null
}

/** mappe le libellé d'état pour StateBadge */
function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'
  const v = etat.toLowerCase()

  if (v.includes('urgent')) return 'urgent'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier') || v.includes('planification')) return 'planifier'

  return 'non_evalue'
}

export default function ClientBatimentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const batimentId = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])

  useEffect(() => {
    if (!batimentId) return

    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Utilisateur courant
      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser()

      if (userError || !user) {
        setErrorMsg("Impossible de récupérer l'utilisateur connecté.")
        setLoading(false)
        router.push('/login')
        return
      }

      // 2) Profil
      const { data: profileData, error: profileError } =
        await supabaseBrowser
          .from('user_profiles')
          .select('id, user_id, role, client_id, full_name')
          .eq('user_id', user.id)
          .maybeSingle()

      if (profileError || !profileData) {
        setErrorMsg('Profil utilisateur introuvable.')
        setLoading(false)
        return
      }

      setProfile(profileData as UserProfileRow)

      // 3) Bâtiment (RLS détermine l'accès)
      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select('id, client_id, name, address, city, postal_code')
        .eq('id', batimentId)
        .maybeSingle()

      if (batError) {
        setErrorMsg(batError.message)
        setLoading(false)
        return
      }

      if (!batData) {
        setErrorMsg('Bâtiment introuvable ou non accessible.')
        setLoading(false)
        return
      }

      setBatiment(batData as BatimentRow)

      // 4) Bassins du bâtiment
      const { data: bassinsData, error: bassinsError } =
        await supabaseBrowser
          .from('bassins')
          .select(
            'id, batiment_id, name, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text'
          )
          .eq('batiment_id', batimentId)
          .order('name', { ascending: true })

      if (bassinsError) {
        setErrorMsg(bassinsError.message)
        setLoading(false)
        return
      }

      setBassins((bassinsData || []) as BassinRow[])

      // 5) Listes de choix (états + durées)
      const { data: listesData, error: listesError } =
        await supabaseBrowser
          .from('listes_choix')
          .select('id, categorie, label, couleur')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      setListes((listesData || []) as ListeChoix[])
      setLoading(false)
    }

    void load()
  }, [batimentId, router])

  const etatsBassin = useMemo(
    () =>
      listes.filter((l) =>
        ['etat_bassin', 'etat_toiture', 'etat'].includes(l.categorie)
      ),
    [listes]
  )

  const dureesBassin = useMemo(
    () =>
      listes.filter((l) =>
        ['duree_vie_bassin', 'duree_vie_toiture', 'duree_vie'].includes(
          l.categorie
        )
      ),
    [listes]
  )

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-ct-gray">Chargement des informations du bâtiment…</p>
      </main>
    )
  }

  if (errorMsg) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </main>
    )
  }

  if (!batiment) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-600">Bâtiment introuvable ou non accessible.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* En-tête */}
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-ct-gray mb-1">Bâtiment</p>
        <h1 className="text-2xl font-semibold text-ct-primary">
          {batiment.name || '(Bâtiment sans nom)'}
        </h1>
        <p className="text-sm text-ct-gray">
          {batiment.address && <>{batiment.address} · </>}
          {batiment.city && <>{batiment.city} · </>}
          {batiment.postal_code}
        </p>

        <div className="mt-3">
          <Link href="/client/batiments" className="btn-secondary">
            ← Retour à la liste des bâtiments
          </Link>
        </div>
      </header>

      {/* Bassins */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
          Bassins de ce bâtiment
        </h2>

        {bassins.length === 0 ? (
          <p className="text-sm text-ct-gray">Aucun bassin n&apos;est enregistré pour ce bâtiment.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ct-grayLight bg-white shadow-sm">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-ct-grayLight/60 text-left">
                  <th className="border border-ct-grayLight px-3 py-2">Bassin</th>
                  <th className="border border-ct-grayLight px-3 py-2">Surface</th>
                  <th className="border border-ct-grayLight px-3 py-2">État</th>
                  <th className="border border-ct-grayLight px-3 py-2">Durée de vie résiduelle</th>
                  <th className="border border-ct-grayLight px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bassins.map((b) => {
                  const surfaceFt2 =
                    b.surface_m2 != null ? Math.round(b.surface_m2 * 10.7639) : null

                  const etatLabel =
                    etatsBassin.find((l) => l.id === b.etat_id)?.label || null

                  const dureeLabel =
                    dureesBassin.find((l) => l.id === b.duree_vie_id)?.label ||
                    b.duree_vie_text ||
                    null

                  return (
                    <tr key={b.id} className="hover:bg-ct-primaryLight/10 transition-colors">
                      <td className="border border-ct-grayLight px-3 py-2">
                        {b.name || '(Sans nom)'}
                      </td>

                      <td className="border border-ct-grayLight px-3 py-2">
                        {surfaceFt2 != null ? `${surfaceFt2} pi²` : 'n/d'}
                      </td>

                      {/* ÉTAT : uniquement la pastille */}
                      <td className="border border-ct-grayLight px-3 py-2">
                        <StateBadge state={mapEtatToStateBadge(etatLabel)} />
                      </td>

                      <td className="border border-ct-grayLight px-3 py-2">
                        {dureeLabel || 'Non définie'}
                      </td>

                      <td className="border border-ct-grayLight px-3 py-2">
                        <button
                          type="button"
                          className="btn-secondary cursor-not-allowed opacity-60"
                          disabled
                        >
                          Voir (bientôt)
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
