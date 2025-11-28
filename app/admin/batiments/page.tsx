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
import { StateBadge, BassinState } from '@/components/ui/StateBadge'

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  client_id: string | null
  client_name: string | null
  nb_bassins: number
}

/**
 * Pour l’instant, l’état global du bâtiment n’est pas calculé en BD.
 * On affiche donc une pastille "non_evalue" uniforme (gris).
 * Plus tard, on pourra brancher un champ ou une vue Supabase.
 */
const DEFAULT_BATIMENT_STATE: BassinState = 'non_evalue'

export default function AdminBatimentsPage() {
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bâtiments + nom du client (jointure clients)
      const { data: batimentsData, error: batimentsError } = await supabaseBrowser
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

      if (batimentsError) {
        console.error('Erreur Supabase batiments:', batimentsError)
        setErrorMsg(batimentsError.message)
        setLoading(false)
        return
      }

      const rawBatiments = (batimentsData || []).map((row: any) => ({
        id: row.id as string,
        name: (row.name as string) ?? null,
        address: (row.address as string) ?? null,
        city: (row.city as string) ?? null,
        postal_code: (row.postal_code as string) ?? null,
        client_id: (row.client_id as string) ?? null,
        client_name: (row.clients?.name as string) ?? null,
        nb_bassins: 0, // sera mis à jour après la requête bassins
      })) as BatimentRow[]

      // 2) Bassins -> comptage par batiment_id
      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select('id, batiment_id')

      if (bassinsError) {
        console.error('Erreur Supabase bassins (count):', bassinsError)
        // On ne bloque pas la page; on garde nb_bassins = 0
        setBatiments(rawBatiments)
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

      const merged = rawBatiments.map((b) => ({
        ...b,
        nb_bassins: countByBatiment.get(b.id) ?? 0,
      }))

      setBatiments(merged)
      setLoading(false)
    }

    void fetchData()
  }, [])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const handleClientFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setClientFilter(e.target.value)
  }

  const handleCityFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setCityFilter(e.target.value)
  }

  // Liste des clients uniques pour le filtre
  const clientOptions = Array.from(
    new Map(
      batiments
        .filter((b) => b.client_id)
        .map((b) => [b.client_id as string, b.client_name || 'Client sans nom'])
    ).entries()
  ).map(([id, name]) => ({ id, name }))

  // Liste des villes uniques pour le filtre
  const cityOptions = Array.from(
    new Set(
      batiments
        .map((b) => b.city?.trim())
        .filter((c): c is string => !!c && c.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, 'fr-CA'))

  // Filtrage côté client
  const filteredBatiments = batiments.filter((b) => {
    const s = search.trim().toLowerCase()
    if (s.length > 0) {
      const haystack = [
        b.name ?? '',
        b.address ?? '',
        b.city ?? '',
        b.postal_code ?? '',
        b.client_name ?? '',
      ]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(s)) return false
    }

    if (clientFilter !== 'all') {
      if (!b.client_id || b.client_id !== clientFilter) return false
    }

    if (cityFilter !== 'all') {
      if (!b.city || b.city.trim() !== cityFilter) return false
    }

    return true
  })

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">
          Bâtiments
        </h1>
        <p className="text-sm text-ct-gray">Chargement des bâtiments…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">
          Bâtiments
        </h1>
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
          <h1 className="text-2xl font-semibold text-ct-primary">
            Bâtiments
          </h1>
          <p className="mt-1 text-sm text-ct-gray">
            Vue d’ensemble des bâtiments, avec recherche, filtres et accès
            rapide à chaque fiche.
          </p>
        </div>
        {/* Bouton d’action global (future création de bâtiment) */}
        <button
          type="button"
          className="btn-secondary"
          disabled
          title="La création de bâtiment se fait pour l’instant ailleurs."
        >
          + Nouveau bâtiment
        </button>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Filtres</CardTitle>
            <CardDescription>
              Affinez la liste par client, ville ou recherche texte.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)]">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">
                Recherche
              </label>
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Nom de bâtiment, adresse, client…"
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">
                Client
              </label>
              <select
                value={clientFilter}
                onChange={handleClientFilterChange}
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              >
                <option value="all">Tous les clients</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">
                Ville
              </label>
              <select
                value={cityFilter}
                onChange={handleCityFilterChange}
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              >
                <option value="all">Toutes les villes</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des bâtiments */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Liste des bâtiments</CardTitle>
              <CardDescription>
                {filteredBatiments.length} bâtiment
                {filteredBatiments.length > 1 ? 's' : ''} trouvé
                {filteredBatiments.length > 1 ? 's' : ''}.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBatiments.length === 0 ? (
            <p className="text-sm text-ct-gray">
              Aucun bâtiment ne correspond aux filtres/recherche.
            </p>
          ) : (
            <DataTable maxHeight={600}>
              <table>
                <DataTableHeader>
                  <tr>
                    <th>Nom du bâtiment</th>
                    <th>Client</th>
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
                        {b.client_name || '—'}
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
                            Voir fiche
                          </Link>
                          {/* Bouton futur : vue carte globale, etc. */}
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
