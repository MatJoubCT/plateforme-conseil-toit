'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type ClientRow = {
  id: string
  name: string | null
}

type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

type UserProfileRow = {
  id: string
  user_id: string
  role: string | null
  client_id: string | null
  full_name: string | null
}

export default function ClientBatimentsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])

  useEffect(() => {
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

      // 3) Bâtiments accessibles (RLS fait le filtrage)
      const { data: batsData, error: batsError } =
        await supabaseBrowser
          .from('batiments')
          .select(
            'id, client_id, name, address, city, postal_code'
          )
          .order('name', { ascending: true })

      if (batsError) {
        setErrorMsg(batsError.message)
        setLoading(false)
        return
      }

      const batList = (batsData || []) as BatimentRow[]
      setBatiments(batList)

      // 4) Charger les clients correspondant aux bâtiments visibles
      const clientIds = Array.from(
        new Set(
          batList
            .map((b) => b.client_id)
            .filter((id): id is string => !!id)
        )
      )

      if (clientIds.length > 0) {
        const { data: clientsData, error: clientsError } =
          await supabaseBrowser
            .from('clients')
            .select('id, name')
            .in('id', clientIds)

        if (clientsError) {
          setErrorMsg(clientsError.message)
          setLoading(false)
          return
        }

        setClients((clientsData || []) as ClientRow[])
      }

      setLoading(false)
    }

    void load()
  }, [router])

  const clientsById = useMemo(() => {
    const m = new Map<string, ClientRow>()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  const batimentsGroupes = useMemo(() => {
    const map = new Map<string, BatimentRow[]>()
    batiments.forEach((b) => {
      const key = b.client_id || 'sans_client'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    })
    return map
  }, [batiments])

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-ct-gray">Chargement des bâtiments…</p>
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

  // Titre principal
  let titre = 'Bâtiments accessibles'
  const clientIds = Array.from(batimentsGroupes.keys()).filter(
    (id) => id !== 'sans_client'
  )
  if (clientIds.length === 1) {
    const c = clientsById.get(clientIds[0])
    if (c?.name) {
      titre = `Bâtiments – ${c.name}`
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-ct-primary">
          {titre}
        </h1>
        <p className="text-sm text-ct-gray">
          Voici la liste des bâtiments associés à votre compte. Cliquez sur
          un bâtiment pour consulter les détails des bassins et des
          garanties.
        </p>
      </header>

      {batiments.length === 0 ? (
        <p className="text-sm text-ct-gray">
          Aucun bâtiment n&apos;est associé à votre compte pour le
          moment.
        </p>
      ) : (
        Array.from(batimentsGroupes.entries()).map(
          ([clientId, bats]) => {
            const client = clientsById.get(clientId)
            const showClientHeader =
              batimentsGroupes.size > 1 || clientId === 'sans_client'

            return (
              <section key={clientId} className="space-y-3">
                {showClientHeader && (
                  <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
                    {client
                      ? client.name || 'Client'
                      : 'Bâtiments sans client'}
                  </h2>
                )}

                <div className="overflow-x-auto rounded-2xl border border-ct-grayLight bg-white shadow-sm">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-ct-grayLight/60 text-left">
                        <th className="border border-ct-grayLight px-3 py-2">
                          Bâtiment
                        </th>
                        <th className="border border-ct-grayLight px-3 py-2">
                          Adresse
                        </th>
                        <th className="border border-ct-grayLight px-3 py-2">
                          Ville
                        </th>
                        <th className="border border-ct-grayLight px-3 py-2">
                          Code postal
                        </th>
                        <th className="border border-ct-grayLight px-3 py-2">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bats.map((b) => (
                        <tr
                          key={b.id}
                          className="hover:bg-ct-primaryLight/10 transition-colors"
                        >
                          <td className="border border-ct-grayLight px-3 py-2">
                            {b.name || '(Sans nom)'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2">
                            {b.address || '—'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2">
                            {b.city || '—'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2">
                            {b.postal_code || '—'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2">
                            <Link
                              href={`/client/batiments/${b.id}`}
                              className="btn-secondary"
                            >
                              Voir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          }
        )
      )}
    </main>
  )
}
