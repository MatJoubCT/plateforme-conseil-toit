'use client'

import { useEffect, useState, useMemo, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import { validateCoordinates } from '@/lib/utils/validation'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import {
  Building2,
  Plus,
  Filter,
  MapPin,
  Users,
  Layers,
  ChevronRight,
  X,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react'

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

    try {
      // Charger TOUS les bâtiments (pas de pagination côté serveur)
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
          clients ( name ),
          bassins ( count )
        `
        )
        .order('name', { ascending: true })

      if (batimentsError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur Supabase batiments:', batimentsError)
        }
        setErrorMsg(batimentsError.message)
        setLoading(false)
        return
      }

      const formattedBatiments: BatimentRow[] = (batimentsData || []).map((row: any) => ({
        id: row.id as string,
        name: (row.name as string) ?? null,
        address: (row.address as string) ?? null,
        city: (row.city as string) ?? null,
        postal_code: (row.postal_code as string) ?? null,
        client_id: (row.client_id as string) ?? null,
        client_name: (row.clients?.name as string) ?? null,
        nb_bassins: row.bassins?.[0]?.count ?? 0,
      }))

      setBatiments(formattedBatiments)

      // Clients pour sélecteurs
      const { data: clientsData, error: clientsError } = await supabaseBrowser
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (!clientsError && clientsData) {
        setClients(
          clientsData.map((c: any) => ({
            id: c.id as string,
            name: (c.name as string) ?? '(Sans nom)',
          }))
        )
      }

      setLoading(false)
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur load batiments:', err)
      }
      setErrorMsg('Erreur lors du chargement des bâtiments.')
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  // Filtrage côté client
  const filteredBatiments = useMemo(() => {
    let result = [...batiments]

    // Filtre par recherche (nom, adresse, ville, client)
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter((b) => {
        const hay = [
          b.name ?? '',
          b.address ?? '',
          b.city ?? '',
          b.client_name ?? '',
        ].join(' ').toLowerCase()
        return hay.includes(q)
      })
    }

    // Filtre par client
    if (clientFilter !== 'all') {
      result = result.filter((b) => b.client_id === clientFilter)
    }

    // Filtre par ville
    if (cityFilter !== 'all') {
      result = result.filter((b) => b.city === cityFilter)
    }

    return result
  }, [batiments, search, clientFilter, cityFilter])

  // Pagination côté client
  const {
    currentPage,
    totalPages,
    currentItems,
    setCurrentPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filteredBatiments, 20)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleClientFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setClientFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleCityFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setCityFilter(e.target.value)
    setCurrentPage(1)
  }

  const clientOptions = Array.from(
    new Map(
      batiments
        .filter((b) => b.client_id && b.client_name)
        .map((b) => [b.client_id as string, b.client_name as string])
    ).entries()
  ).map(([id, name]) => ({ id, name }))

  // Villes uniques pour le filtre (basé sur page actuelle)
  const cityOptions = Array.from(
    new Set(
      batiments
        .map((b) => b.city?.trim())
        .filter((c): c is string => !!c && c.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, 'fr-CA'))

  // Statistiques
  const totalBatiments = batiments.length
  const totalBassins = batiments.reduce((sum, b) => sum + b.nb_bassins, 0)
  const totalClients = new Set(batiments.map((b) => b.client_id).filter(Boolean)).size
  const totalVilles = cityOptions.length

  // --- Modal "Nouveau bâtiment" ---

  const openAddModal = () => {
    setAddOpen(true)
    setAddError(null)
  }

  const closeAddModal = () => {
    setAddOpen(false)
    setAddError(null)
    setAddName('')
    setAddClientId('')
    setAddAddress('')
    setAddCity('')
    setAddPostalCode('')
    setAddLatitude('')
    setAddLongitude('')
    setAddNotes('')
  }

  const handleAddSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAddSaving(true)
    setAddError(null)

    const { latitude, longitude, error: coordError } = validateCoordinates(addLatitude, addLongitude)

    if (coordError) {
      setAddError(coordError)
      setAddSaving(false)
      return
    }

    const { error: insertError } = await supabaseBrowser.from('batiments').insert({
      name: addName.trim(),
      client_id: addClientId,
      address: addAddress.trim() || null,
      city: addCity.trim() || null,
      postal_code: addPostalCode.trim() || null,
      latitude,
      longitude,
      notes: addNotes.trim() || null,
    })

    setAddSaving(false)

    if (insertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur insert batiment:', insertError)
      }
      setAddError(insertError.message)
      return
    }

    closeAddModal()
    void loadData()
  }

  if (loading) {
    return <LoadingState message="Chargement des bâtiments…" />
  }

  if (errorMsg) {
    return <ErrorState message={errorMsg} />
  }

  return (
    <>
      <section className="space-y-6">
        {/* ========== HEADER ========== */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ct-primary via-ct-primary-medium to-ct-primary-dark p-6 shadow-xl">
          {/* Décoration background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          </div>

          <div className="relative z-10">
            {/* Titre + actions */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Bâtiments
                    </h1>
                    <p className="mt-0.5 text-sm text-white/70">
                      Vue d'ensemble des bâtiments, avec recherche et filtres
                    </p>
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Building2 className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {totalBatiments} bâtiment{totalBatiments > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Layers className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {totalBassins} bassin{totalBassins > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Users className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {totalClients} client{totalClients > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <MapPin className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {totalVilles} ville{totalVilles > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ct-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
              >
                <Plus className="h-4 w-4" />
                Nouveau bâtiment
              </button>
            </div>
          </div>
        </div>

        {/* ========== FILTRES ========== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
                <SlidersHorizontal className="h-5 w-5 text-ct-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Filtres
                </h2>
                <p className="text-xs text-slate-500">Affinez la liste par client, ville ou recherche texte</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)]">
              {/* Recherche */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Recherche
                </label>

                <SearchInput
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Nom de bâtiment, adresse, client…"
                  className="w-full"
                />
              </div>

              {/* Client */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Client
                </label>
                <select
                  value={clientFilter}
                  onChange={handleClientFilterChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                >
                  <option value="all">Tous les clients</option>
                  {clientOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ville */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Ville
                </label>
                <select
                  value={cityFilter}
                  onChange={handleCityFilterChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
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
          </div>
        </div>

        {/* ========== LISTE DES BÂTIMENTS ========== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
                  <Building2 className="h-5 w-5 text-ct-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Liste des bâtiments
                  </h2>
                  <p className="text-xs text-slate-500">
                    {filteredBatiments.length} bâtiment{filteredBatiments.length > 1 ? 's' : ''} trouvé{filteredBatiments.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {filteredBatiments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">Aucun bâtiment trouvé</p>
                <p className="mt-1 text-xs text-slate-500">Modifiez vos filtres ou ajoutez un nouveau bâtiment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-slate-200 bg-slate-50">
                    <tr>
                      <th className="py-4 pl-6 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Bâtiment
                      </th>
                      <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden md:table-cell">
                        Client
                      </th>
                      <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden lg:table-cell">
                        Localisation
                      </th>
                      <th className="py-4 pr-6 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Bassins
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {currentItems.map((b) => (
                    <tr
                      key={b.id}
                      className="group hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        window.location.href = `/admin/batiments/${b.id}`
                      }}
                    >
                      {/* Nom du bâtiment */}
                      <td className="py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ct-primary to-[#2d6ba8] text-sm font-semibold text-white shadow-sm">
                            {(b.name ?? 'B')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800 transition-colors group-hover:text-ct-primary">
                              {b.name || '(Sans nom)'}
                            </span>
                            <p className="truncate text-xs text-slate-500 md:hidden">
                              {b.client_name || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Client (caché sur mobile) */}
                      <td className="py-4 hidden md:table-cell">
                        <p className="text-sm text-slate-700">{b.client_name || '—'}</p>
                      </td>

                      {/* Localisation (cachée sur mobile/tablet) */}
                      <td className="py-4 hidden lg:table-cell">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                          <div className="text-sm">
                            {b.city || b.address ? (
                              <>
                                <p className="font-medium text-slate-700">{b.city || '—'}</p>
                                <p className="text-xs text-slate-500">{b.address || '—'}</p>
                              </>
                            ) : (
                              <p className="text-slate-500">—</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Nombre de bassins (centré) */}
                      <td className="py-4 pr-6">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
                              b.nb_bassins > 0
                                ? 'bg-ct-primary/10 text-ct-primary'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {b.nb_bassins}
                          </span>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination info */}
            {filteredBatiments.length > 0 && (
              <div className="mt-4 text-sm text-ct-gray text-center">
                Affichage de {startIndex} à {endIndex} sur {totalItems} bâtiment{totalItems > 1 ? 's' : ''}
              </div>
            )}

            {/* Pagination controls */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </section>

      {/* ========== MODAL NOUVEAU BÂTIMENT ========== */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeAddModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header du modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Nouveau bâtiment</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Créez un bâtiment et assignez-le à un client existant
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={addSaving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Corps du modal */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5">
              {/* Informations principales */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Nom du bâtiment <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                    placeholder="Ex: École Primaire Saint-Joseph"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Client associé <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={addClientId}
                    onChange={(e) => setAddClientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
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
              </div>

              {/* Localisation */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                    placeholder="No civique, rue"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={addCity}
                    onChange={(e) => setAddCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                    placeholder="Montréal"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={addPostalCode}
                    onChange={(e) => setAddPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                    placeholder="H2X 1Y4"
                  />
                </div>
              </div>

              {/* Coordonnées GPS */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Latitude <span className="text-xs font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={addLatitude}
                    onChange={(e) => setAddLatitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                    placeholder="ex.: 46.12345"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Longitude <span className="text-xs font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={addLongitude}
                    onChange={(e) => setAddLongitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                    placeholder="ex.: -72.98765"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Notes internes
                </label>
                <textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                  placeholder="Informations supplémentaires sur le bâtiment..."
                />
              </div>

              {/* Message d'erreur */}
              {addError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-700">{addError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={addSaving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="rounded-xl bg-gradient-to-r from-ct-primary to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
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
