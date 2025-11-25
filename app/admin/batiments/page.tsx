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
  client_id: string | null
  client_name: string | null
}

export default function AdminBatimentsPage() {
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchBatiments = async () => {
      setLoading(true)
      setErrorMsg(null)

      // On récupère les bâtiments + le nom du client
      const { data, error } = await supabaseBrowser
        .from('batiments')
        .select(
          `
          id,
          name,
          address,
          city,
          postal_code,
          client_id,
          clients ( name )
        `
        )
        .order('name', { ascending: true })

      if (error) {
        console.error('Erreur Supabase batiments:', error)
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      const mapped: BatimentRow[] =
        (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          address: row.address,
          city: row.city,
          postal_code: row.postal_code,
          client_id: row.client_id,
          client_name: row.clients?.name ?? null,
        }))

      setBatiments(mapped)
      setLoading(false)
    }

    void fetchBatiments()
  }, [])

  return (
    <section>
      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>
        Tous les bâtiments
      </h2>

      {loading && <p>Chargement des bâtiments…</p>}

      {errorMsg && (
        <p style={{ color: 'red', marginBottom: 12 }}>
          Erreur lors du chargement : {errorMsg}
        </p>
      )}

      {!loading && !errorMsg && batiments.length === 0 && (
        <p>Aucun bâtiment pour le moment.</p>
      )}

      {!loading && !errorMsg && batiments.length > 0 && (
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
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Client</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Adresse</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Ville</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>
                Code postal
              </th>
            </tr>
          </thead>
          <tbody>
            {batiments.map((b) => (
              <tr key={b.id}>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {/* plus tard on pointera vers /admin/batiments/[id] */}
                  {b.name}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {b.client_id ? (
                    <Link href={`/admin/clients/${b.client_id}`}>
                      {b.client_name || 'Client'}
                    </Link>
                  ) : (
                    '—'
                  )}
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
