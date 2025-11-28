'use client'

import { useEffect, useState, ChangeEvent } from 'react'
import Link from 'next/link'
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

type ClientRow = {
  id: string
  name: string | null
  nb_batiments: number
}

type SortKey = 'name' | 'nb_batiments'
type SortDir = 'asc' | 'desc'

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Clients
      const { data: clientsData, error: clientsError } = await supabaseBrowser
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (clientsError) {
        console.error('Erreur Supabase clients:', clientsError)
        setErrorMsg(clientsError.message)
        setLoading(false)
        return
      }

      const rawClients: ClientRow[] = (clientsData || []).map((row: any) => ({
        id: row.id as string,
        name: (row.name as string) ?? null,
        nb_batiments: 0, // sera mis à jour après la requête batiments
      }))

      // 2) Batiments -> comptage par client_id
      const { data: batimentsData, error: batimentsError } = await supabaseBrowser
        .from('batiments')
        .select('id, client_id')

      if (batimentsError) {
        console.error('Erreur Supabase batiments (count by client):', batimentsError)
        // On ne bloque pas la page; nb_batiments restera à 0
        setClients(rawClients)
        setLoading(false)
        return
      }

      const countByClient = new Map<string, number>()
      ;(batimentsData || []).forEach((b: any) => {
        const clientId = b.client_id as string | null
        if (!clientId) return
        const current = countByClient.get(clientId) ?? 0
        countByClient.set(clientId, current + 1)
      })

      const merged = rawClients.map((c) => ({
        ...c,
        nb_batiments: countByClient.get(c.id) ?? 0,
      }))

      setClients(merged)
      setLoading(false)
    }

    void fetchData()
  }, [])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleSortKeyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortKey(e.target.value as SortKey)
  }

  const handleSortDirChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortDir(e.target.value as SortDir)
  }

  // Filtrage + tri côté client
  const filteredAndSortedClients = clients
    .filter((c) => {
      const s = search.trim().toLowerCase()
      if (s.length === 0) return true
      const name = (c.name ?? '').toLowerCase()
      return name.includes(s)
    })
    .sort((a, b) => {
      if (sortKey === 'name') {
        const aName = (a.name ?? '').toLowerCase()
        const bName = (b.name ?? '').toLowerCase()
        if (aName < bName) return sortDir === 'asc' ? -1 : 1
        if (aName > bName) return sortDir === 'asc' ? 1 : -1
        return 0
      }

      // tri sur nb_batiments
      if (a.nb_batiments < b.nb_batiments) return sortDir === 'asc' ? -1 : 1
      if (a.nb_batiments > b.nb_batiments) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Clients</h1>
        <p className="text-sm text-ct-gray">Chargement des clients…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Clients</h1>
        <p className="text-sm text-red-600">
          Erreur lors du chargement des données : {errorMsg}
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ct-primary">Clients</h1>
          <p className="mt-1 text-sm text-ct-gray">
            Liste des clients avec le nombre de bâtiments associés, la recherche
            et des actions rapides.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled
          title="La création de client se fait pour l’instant ailleurs."
        >
          + Nouveau client
        </button>
      </div>

      {/* Barre de recherche + tri */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle>Filtres et tri</CardTitle>
              <CardDescription>
                Recherchez un client par nom et ajustez l’ordre d’affichage.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">
                Recherche
              </label>
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Nom du client…"
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">
                Trier par
              </label>
              <select
                value={sortKey}
                onChange={handleSortKeyChange}
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              >
                <option value="name">Nom du client</option>
                <option value="nb_batiments">Nombre de bâtiments</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">
                Ordre
              </label>
              <select
                value={sortDir}
                onChange={handleSortDirChange}
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              >
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau clients */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Liste des clients</CardTitle>
              <CardDescription>
                {filteredAndSortedClients.length} client
                {filteredAndSortedClients.length > 1 ? 's' : ''} trouvé
                {filteredAndSortedClients.length > 1 ? 's' : ''}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedClients.length === 0 ? (
            <p className="text-sm text-ct-gray">
              Aucun client ne correspond à la recherche.
            </p>
          ) : (
            <DataTable maxHeight={600}>
              <table>
                <DataTableHeader>
                  <tr>
                    <th>Nom du client</th>
                    <th>Nombre de bâtiments</th>
                    <th>Actions</th>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {filteredAndSortedClients.map((c) => (
                    <tr key={c.id}>
                      <td className="text-sm text-ct-grayDark">
                        <Link
                          href={`/admin/clients/${c.id}`}
                          className="font-medium text-ct-primary hover:underline"
                        >
                          {c.name || '(Sans nom)'}
                        </Link>
                      </td>
                      <td className="text-sm text-ct-grayDark">
                        {c.nb_batiments}
                      </td>
                      <td className="text-sm">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/clients/${c.id}`}
                            className="btn-secondary px-2 py-1 text-xs"
                          >
                            Voir fiche client
                          </Link>
                          <Link
                            href={`/admin/batiments?clientId=${c.id}`}
                            className="btn-secondary px-2 py-1 text-xs"
                          >
                            Voir bâtiments
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
