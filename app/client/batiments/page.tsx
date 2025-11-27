'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

type UserProfile = {
  id: string
  user_id: string
  role: string
  client_id: string | null
}

export default function ClientBatimentsPage() {
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Utilisateur courant
      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser()

      if (userError) {
        setErrorMsg(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        setErrorMsg('Utilisateur non authentifié.')
        setLoading(false)
        return
      }

      // 2) Profil utilisateur (filtre sur user_id)
      const { data: profile, error: profileError } = await supabaseBrowser
        .from('user_profiles')
        .select('id, user_id, role, client_id')
        .eq('user_id', user.id) // <<< ICI : user_id, pas id
        .maybeSingle<UserProfile>()

      if (profileError) {
        setErrorMsg(
          "Impossible de récupérer le profil de l'utilisateur : " +
            profileError.message
        )
        setLoading(false)
        return
      }

      if (!profile) {
        setErrorMsg(
          "Aucun profil n'est associé à ce compte utilisateur dans user_profiles."
        )
        setLoading(false)
        return
      }

      if (!profile.client_id) {
        setErrorMsg(
          "Aucun client n'est associé à ce profil utilisateur."
        )
        setLoading(false)
        return
      }

      const clientId = profile.client_id

      // 3) Nom du client (optionnel)
      const { data: clientData, error: clientError } = await supabaseBrowser
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .maybeSingle()

      if (!clientError) {
        setClientName(clientData?.name ?? null)
      }

      // 4) Bâtiments du client
      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select('id, name, address, city, postal_code')
        .eq('client_id', clientId)
        .order('name', { ascending: true })

      if (batError) {
        setErrorMsg(
          'Erreur lors du chargement des bâtiments : ' + batError.message
        )
        setLoading(false)
        return
      }

      setBatiments(batData || [])
      setLoading(false)
    }

    void fetchData()
  }, [])

  if (loading) {
    return <p>Chargement…</p>
  }

  if (errorMsg) {
    return <p style={{ color: 'red' }}>Erreur : {errorMsg}</p>
  }

  return (
    <section>
      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>
        {clientName ? `Bâtiments – ${clientName}` : 'Bâtiments'}
      </h2>
      <p style={{ marginBottom: 16, color: '#555', fontSize: 14 }}>
        Voici la liste des bâtiments associés à votre compte. Cliquez sur un
        bâtiment pour consulter les détails des bassins et des garanties.
      </p>

      {batiments.length === 0 ? (
        <p>Aucun bâtiment n’est associé à votre compte.</p>
      ) : (
        <table
          style={{
            borderCollapse: 'collapse',
            border: '1px solid #ccc',
            width: '100%',
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Bâtiment</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Adresse</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Ville</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Code postal
              </th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batiments.map(b => (
              <tr key={b.id}>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  <Link href={`/client/batiments/${b.id}`}>{b.name}</Link>
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {b.address}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {b.city}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {b.postal_code}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
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
      )}
    </section>
  )
}
