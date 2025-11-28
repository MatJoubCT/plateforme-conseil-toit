'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card'
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
} from '@/components/ui/DataTable'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'

type ClientRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  phone: string | null
  email: string | null
  notes: string | null
}

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  nb_bassins: number
}

const DEFAULT_BATIMENT_STATE: BassinState = 'non_evalue'

export default function AdminClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params?.id as string

  const [client, setClient] = useState<ClientRow | null>(null)
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [batimentSearch, setBatimentSearch] = useState('')

  useEffect(() => {
    if (!clientId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Client (utilise contact_phone et contact_email)
      const { data: clientData, error: clientError } = await supabaseBrowser
        .from('clients')
        .select(
          `
          id,
          name,
          address,
          city,
          postal_code,
          contact_phone,
          contact_email,
          notes
        `
        )
        .eq('id', clientId)
        .maybeSingle()

      if (clientError) {
        console.error('Erreur Supabase client:', clientError)
        setErrorMsg(clientError.message)
        setLoading(false)
        return
      }

      if (!clientData) {
        setErrorMsg('Client introuvable.')
        setLoading(false)
        return
      }

      const mappedClient: ClientRow = {
        id: clientData.id,
        name: clientData.name ?? null,
        address: clientData.address ?? null,
        city: clientData.city ?? null,
        postal_code: clientData.postal_code ?? null,
        phone: clientData.contact_phone ?? null,
        email: clientData.contact_email ?? null,
        notes: clientData.notes ?? null,
      }
      setClient(mappedClient)

      // 2) Bâtiments du client
      const { data: batimentsData, error: batimentsError } =
        await supabaseBrowser
          .from('batiments')
          .select(
            `
          id,
          name,
          address,
          city,
          postal_code
        `
          )
          .eq('client_id', clientId)
          .order('name', { ascending: true })

      if (batimentsError) {
        console.error('Erreur Supabase batiments du client:', batimentsError)
        setErrorMsg(batimentsError.message)
        setLoading(false)
        return
      }

      const mappedBatiments: BatimentRow[] = (batimentsData || []).map(
        (row: any) => ({
          id: row.id as string,
          name: (row.name as string) ?? null,
          address: (row.address as string) ?? null,
          city: (row.city as string) ?? null,
          postal_code: (row.postal_code as string) ?? null,
          nb_bassins: 0,
        })
      )

      // 3) Comptage des bassins par bâtiment
      if (mappedBatiments.length > 0) {
        const batimentIds = mappedBatiments.map((b) => b.id)

        const { data: bassinsData, error: bassinsError } =
          await supabaseBrowser
            .from('bassins')
            .select('id, batiment_id')
            .in('batiment_id', batimentIds)

        if (bassinsError) {
          console.error(
            'Erreur Supabase bassins (count par batiment):',
            bassinsError
          )
          // On n’arrête pas la page; on garde nb_bassins à 0
          setBatiments(mappedBatiments)
          setLoading(false)
          return
        }

        const countByBatiment = new Map<string, number>()
        ;(bassinsData || []).forEach((b: any) => {
          const batId = b.batiment_id as string | null
          if (!batId) return
          const current = countByBatiment.get(batId) ?? 0
          countByBatiment.set(batId, current + 1)
        })

        const merged = mappedBatiments.map((b) => ({
          ...b,
          nb_bassins: countByBatiment.get(b.id) ?? 0,
        }))

        setBatiments(merged)
      } else {
        setBatiments([])
      }

      setLoading(false)
    }

    void fetchData()
  }, [clientId])

  const handleBatimentSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBatimentSearch(e.target.value)
  }

  const filteredBatiments = batiments.filter((b) => {
    const s = batimentSearch.trim().toLowerCase()
    if (s.length === 0) return true
    const haystack = [
      b.name ?? '',
      b.address ?? '',
      b.city ?? '',
      b.postal_code ?? '',
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(s)
  })

  if (!clientId) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">
          Identifiant de client manquant dans l’URL.
        </p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Client</h1>
        <p className="text-sm text-ct-gray">Chargement des informations…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Client</h1>
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </section>
    )
  }

  if (!client) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">Client introuvable.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* En-tête + navigation */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-ct-gray mb-1">
            Client
          </p>
          <h1 className="text-2xl font-semibold text-ct-primary">
            {client.name || '(Sans nom)'}
          </h1>
          <p className="mt-1 text-sm text-ct-gray">
            {client.city || client.address || client.postal_code
              ? [
                  client.address,
                  client.city,
                  client.postal_code ? `(${client.postal_code})` : null,
                ]
                  .filter(Boolean)
                  .join(', ')
              : 'Coordonnées à compléter'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push('/admin/clients')}
          >
            ← Retour à la liste des clients
          </button>
        </div>
      </div>

      {/* Informations du client */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Informations du client</CardTitle>
            <CardDescription>
              Coordonnées générales et informations internes pour ce client.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Nom
              </p>
              <p className="text-sm text-ct-grayDark">
                {client.name || '—'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Téléphone
              </p>
              <p className="text-sm text-ct-grayDark">
                {client.phone || '—'}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Courriel
              </p>
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="text-sm text-ct-primary hover:underline"
                >
                  {client.email}
                </a>
              ) : (
                <p className="text-sm text-ct-grayDark">—</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Adresse
              </p>
              <p className="text-sm text-ct-grayDark">
                {client.address || '—'}
              </p>
              <p className="text-sm text-ct-grayDark">
                {client.city || client.postal_code
                  ? [client.city, client.postal_code]
                      .filter(Boolean)
                      .join(' ')
                  : null}
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Notes internes
              </p>
              <p className="text-sm text-ct-grayDark whitespace-pre-line">
                {client.notes || 'Aucune note pour ce client.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bâtiments du client */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Bâtiments associés</CardTitle>
              <CardDescription>
                {batiments.length} bâtiment
                {batiments.length > 1 ? 's' : ''} rattaché
                {batiments.length > 1 ? 's' : ''} à ce client.
              </CardDescription>
            </div>
            <div className="w-full md:w-64 space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">
                Recherche dans les bâtiments
              </label>
              <input
                type="text"
                value={batimentSearch}
                onChange={handleBatimentSearchChange}
                placeholder="Nom, adresse, ville…"
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {batiments.length === 0 ? (
            <p className="text-sm text-ct-gray">
              Aucun bâtiment n’est encore associé à ce client.
            </p>
          ) : filteredBatiments.length === 0 ? (
            <p className="text-sm text-ct-gray">
              Aucun bâtiment ne correspond à la recherche.
            </p>
          ) : (
            <DataTable maxHeight={600}>
              <table>
                <DataTableHeader>
                  <tr>
                    <th>Nom du bâtiment</th>
                    <th>Adresse</th>
                    <th>Ville</th>
                    <th>État global</th>
                    <th>Bassins</th>
                    <th>Actions</th>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {filteredBatiments.map((b) => (
                    <tr key={b.id}>
                      <td className="text-sm text-ct-grayDark">
                        <Link
                          href={`/admin/batiments/${b.id}`}
                          className="font-medium text-ct-primary hover:underline"
                        >
                          {b.name || '(Sans nom)'}
                        </Link>
                        {b.postal_code && (
                          <div className="text-xs text-ct-gray">
                            {b.postal_code}
                          </div>
                        )}
                      </td>
                      <td className="text-sm text-ct-grayDark">
                        {b.address || '—'}
                      </td>
                      <td className="text-sm text-ct-grayDark">
                        {b.city || '—'}
                      </td>
                      <td className="text-sm">
                        <StateBadge state={DEFAULT_BATIMENT_STATE} />
                      </td>
                      <td className="text-sm text-ct-grayDark">
                        {b.nb_bassins}
                      </td>
                      <td className="text-sm">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/batiments/${b.id}`}
                            className="btn-secondary px-2 py-1 text-xs"
                          >
                            Voir bâtiment
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </DataTableBody>
              </table>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
