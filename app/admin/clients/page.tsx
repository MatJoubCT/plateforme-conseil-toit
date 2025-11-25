'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import Link from 'next/link'

type ClientRow = {
  id: string
  name: string | null
  type: string | null
  city: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data, error } = await supabaseBrowser
        .from('clients')
        .select(
          'id, name, type, city, contact_name, contact_email, contact_phone'
        )
        .order('name', { ascending: true })

      if (error) {
        console.error('Erreur Supabase clients:', error)
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      setClients(data || [])
      setLoading(false)
    }

    void fetchClients()
  }, [])

  return (
    <section>
      <h2 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>
        Gestion des clients
      </h2>

      {loading && <p>Chargement des clients…</p>}

      {errorMsg && (
        <p style={{ color: 'red', marginBottom: 12 }}>
          Erreur lors du chargement : {errorMsg}
        </p>
      )}

      {!loading && !errorMsg && clients.length === 0 && (
        <p>Aucun client pour le moment.</p>
      )}

      {!loading && !errorMsg && clients.length > 0 && (
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
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Nom</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Type</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Ville</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Contact</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Courriel</th>
              <th style={{ border: '1px solid #ccc', padding: 6 }}>Téléphone</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
  <Link href={`/admin/clients/${c.id}`}>
    {c.name}
  </Link>
</td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {c.type}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {c.city}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {c.contact_name}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {c.contact_email}
                </td>
                <td style={{ border: '1px solid #ccc', padding: 6 }}>
                  {c.contact_phone}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
