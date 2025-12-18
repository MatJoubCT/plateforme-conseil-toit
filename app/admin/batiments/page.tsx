'use client'

import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
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

type ClientSelectOption = {
  id: string
  name: string
}

const DEFAULT_BATIMENT_STATE: BassinState = 'non_evalue'

export default function AdminBatimentsPage() {
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [clients, setClients] = useState<ClientSelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')

  // Modal création bâtiment
  const [addOpen, setAddOpen] = useState(false)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [addName, setAddName] = useState('')
  const [addClientId, setAddClientId] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [addCity, setAddCity] = useState('')
  const [addPostalCode, setAddPostalCode] = useState('')
  const [addLatitude, setAddLatitude] = useState('')
  const [addLongitude, setAddLongitude] = useState('')
  const [addNotes, setAddNotes] = useState('')

  const loadData = async () => {
    setLoading(true)
    setErrorMsg(null)

    // Bâtiments + client
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

    const rawBatiments: BatimentRow[] = (batimentsData || []).map((row: any) => ({
      id: row.id as string,
      name: (row.name as string) ?? null,
      address: (row.address as string) ?? null,
      city: (row.city as string) ?? null,
      postal_code: (row.postal_code as string) ?? null,
      client_id: (row.client_id as string) ?? null,
      client_name: (row.clients?.name as string) ?? null,
      nb_bassins: 0,
    }))

    // Bassins => count par bâtiment
    const { data: bassinsData, error: bassinsError } = await supabaseBrowser
      .from('bassins')
      .select('id, batiment_id')

    if (bassinsError) {
      console.error('Erreur Supabase bassins (count):', bassinsError)
      setBatiments(rawBatiments)
    } else {
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
    }

    // Clients pour sélecteurs
    const { data: clientsData, error: clientsError } = await supabaseBrowser
      .from('clients')
      .select('id, name')
      .order('name', { ascending: true })

    if (clientsError) {
      console.error('Erreur Supabase clients (liste):', clientsError)
      setClients([])
    } else {
      setClients(
        (clientsData || []).map((c: any) => ({
          id: c.id as string,
          name: (c.name as string) ?? '(Sans nom)',
        }))
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadData()
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

  const clientOptions = Array.from(
    new Map(
      batiments
        .filter((b) => b.client_id && b.client_name)
        .map((b) => [b.client_id as string, b.client_name as string])
    ).entries()
  ).map(([id, name]) => ({ id, name }))

  const cityOptions = Array.from(
    new Set(
      batiments
        .map((b) => b.city?.trim())
        .filter((c): c is string => !!c && c.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, 'fr-CA'))

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

  // --- Modal "Nouveau bâtiment" ---

  const openAddModal = () => {
    setAddName('')
    setAddClientId('')
    setAddAddress('')
    setAddCity('')
    setAddPostalCode('')
    setAddLatitude('')
    setAddLongitude('')
    setAddNotes('')
    setAddError(null)
    setAddOpen(true)
  }

  const closeAddModal = () => {
    if (!addSaving) setAddOpen(false)
  }

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!addName.trim()) {
      setAddError('Le nom du bâtiment est obligatoire.')
      return
    }
    if (!addClientId) {
      setAddError('Vous devez sélectionner un client existant.')
      return
    }

    setAddSaving(true)
    setAddError(null)

    let latitude: number | null = null
    let longitude: number | null = null

    if (addLatitude.trim() !== '') {
      const val = Number(addLatitude.replace(',', '.'))
      if (Number.isNaN(val)) {
        setAddError('La latitude doit être un nombre.')
        setAddSaving(false)
        return
      }
      latitude = val
    }

    if (addLongitude.trim() !== '') {
      const val = Number(addLongitude.replace(',', '.'))
      if (Number.isNaN(val)) {
        setAddError('La longitude doit être un nombre.')
        setAddSaving(false)
        return
      }
      longitude = val
    }

    const payload = {
      name: addName.trim(),
      client_id: addClientId,
      address: addAddress.trim() || null,
      city: addCity.trim() || null,
      postal_code: addPostalCode.trim() || null,
      latitude,
      longitude,
      notes: addNotes.trim() || null,
    }

    const { error } = await supabaseBrowser.from('batiments').insert([payload])

    if (error) {
      console.error('Erreur création bâtiment:', error)
      setAddError(error.message)
      setAddSaving(false)
      return
    }

    await loadData()
    setAddSaving(false)
    setAddOpen(false)
  }

  return (
    <>
      <section className="space-y-6">
        {/* En-tête (aligné avec la page client) */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ct-primary">Bâtiments</h1>
            <p className="text-sm text-ct-gray">
              Vue d’ensemble des bâtiments, avec recherche, filtres et accès rapide à
              chaque fiche.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={openAddModal}
          >
            + Nouveau bâtiment
          </button>
        </div>

        {/* Filtres */}
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
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Client
                </label>
                <select
                  value={clientFilter}
                  onChange={handleClientFilterChange}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
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
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
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

        {/* Liste des bâtiments */}
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
            {loading ? (
              <p className="text-sm text-ct-gray">Chargement des bâtiments…</p>
            ) : errorMsg ? (
              <p className="text-sm text-red-600">{errorMsg}</p>
            ) : filteredBatiments.length === 0 ? (
              <p className="text-sm text-ct-gray">
                Aucun bâtiment ne correspond aux filtres/recherche.
              </p>
            ) : (
              <DataTable maxHeight={600}>
                <table>
                  <DataTableHeader>
                    <tr>
                      <th className="w-[26%] text-left text-xs font-semibold uppercase tracking-[0.14em] text-ct-gray">
                        Nom du bâtiment
                      </th>
                      <th className="w-[18%] text-left text-xs font-semibold uppercase tracking-[0.14em] text-ct-gray">
                        Client
                      </th>
                      <th className="w-[28%] text-left text-xs font-semibold uppercase tracking-[0.14em] text-ct-gray">
                        Adresse
                      </th>
                      <th className="w-[12%] text-left text-xs font-semibold uppercase tracking-[0.14em] text-ct-gray">
                        Ville
                      </th>
                      <th className="w-[6%] text-left text-xs font-semibold uppercase tracking-[0.14em] text-ct-gray">
                        Bassins
                      </th>
                    </tr>
                  </DataTableHeader>
                  <DataTableBody>
                    {filteredBatiments.map((b) => (
                      <tr
                        key={b.id}
                        className="transition-colors hover:bg-ct-grayLight/60 cursor-pointer"
                        onClick={() => {
                          window.location.href = `/admin/batiments/${b.id}`
                        }}
                      >
                        <td className="align-top py-3 text-sm">
                          <div className="flex flex-col">
                            <Link
                              href={`/admin/batiments/${b.id}`}
                              className="font-medium text-ct-primary underline-offset-2 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {b.name ?? '(Sans nom)'}
                            </Link>
                            {b.postal_code && (
                              <span className="text-[11px] text-ct-gray">
                                {b.postal_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="align-top py-3 text-sm text-ct-grayDark">
                          {b.client_name ?? '—'}
                        </td>
                        <td className="align-top py-3 text-sm text-ct-grayDark">
                          {b.address ?? '—'}
                        </td>
                        <td className="align-top py-3 text-sm text-ct-grayDark">
                          {b.city ?? '—'}
                        </td>
                        <td className="align-top py-3 text-sm text-ct-grayDark">
                          {b.nb_bassins}
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

      {/* Modal Nouveau bâtiment */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeAddModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-ct-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ct-primary">
                  Nouveau bâtiment
                </h2>
                <p className="mt-1 text-xs text-ct-gray">
                  Créez un bâtiment et assignez-le à un client existant.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-full border border-ct-grayLight px-2 py-1 text-xs text-ct-gray hover:bg-ct-grayLight/70 transition-colors"
                disabled={addSaving}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Nom du bâtiment *
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Client associé *
                  </label>
                  <select
                    value={addClientId}
                    onChange={(e) => setAddClientId(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Sélectionnez un client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="No civique, rue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={addCity}
                    onChange={(e) => setAddCity(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={addPostalCode}
                    onChange={(e) => setAddPostalCode(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Latitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addLatitude}
                    onChange={(e) => setAddLatitude(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="ex.: 46.12345"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Longitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addLongitude}
                    onChange={(e) => setAddLongitude(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="ex.: -72.98765"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Notes internes
                </label>
                <textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                />
              </div>

              {addError && (
                <p className="text-xs text-red-600">{addError}</p>
              )}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={addSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={addSaving}
                >
                  {addSaving ? 'Enregistrement…' : 'Créer le bâtiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
