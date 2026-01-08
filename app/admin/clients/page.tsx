'use client'

import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  Users,
  Plus,
  Search,
  SlidersHorizontal,
  Building2,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react'

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

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const fetchClients = async () => {
    setLoading(true)
    setErrorMsg(null)

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
      nb_batiments: 0,
    }))

    const { data: batimentsData, error: batimentsError } = await supabaseBrowser
      .from('batiments')
      .select('id, client_id')

    if (batimentsError) {
      console.error('Erreur Supabase batiments:', batimentsError)
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

  useEffect(() => {
    void fetchClients()
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

  const openCreateModal = () => {
    setCreateName('')
    setCreateError(null)
    setCreateOpen(true)
  }

  const closeCreateModal = () => {
    if (createSaving) return
    setCreateOpen(false)
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      setCreateError('Le nom du client est obligatoire.')
      return
    }

    setCreateSaving(true)
    setCreateError(null)

    try {
      const { error: insertError } = await supabaseBrowser
        .from('clients')
        .insert([{ name: createName.trim() }])

      if (insertError) {
        console.error('Erreur insertion client:', insertError)
        setCreateError(
          insertError.message ?? 'Erreur lors de la création du client.'
        )
        setCreateSaving(false)
        return
      }

      await fetchClients()
      setCreateSaving(false)
      setCreateOpen(false)
    } catch (err: any) {
      console.error('Erreur inattendue insertion client:', err)
      setCreateError('Erreur inattendue lors de la création du client.')
      setCreateSaving(false)
    }
  }

  const filteredAndSortedClients = clients
    .filter((c) =>
      (c.name ?? '').toLowerCase().includes(search.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === 'name') {
        const aName = (a.name ?? '').toLowerCase()
        const bName = (b.name ?? '').toLowerCase()
        if (aName < bName) return sortDir === 'asc' ? -1 : 1
        if (aName > bName) return sortDir === 'asc' ? 1 : -1
        return 0
      }
      return sortDir === 'asc'
        ? a.nb_batiments - b.nb_batiments
        : b.nb_batiments - a.nb_batiments
    })

  const totalClients = clients.length
  const totalBatiments = clients.reduce((sum, c) => sum + c.nb_batiments, 0)
  const moyenneBatiments =
    totalClients > 0
      ? (totalBatiments / totalClients).toFixed(1).replace('.', ',')
      : '0,0'

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">Chargement des clients…</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <p className="text-sm font-medium text-red-700">Erreur : {errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <section className="space-y-6">
        {/* ========== HEADER ========== */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F4E79] via-[#1a4168] to-[#163555] p-6 shadow-xl">
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
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Clients</h1>
                    <p className="mt-0.5 text-sm text-white/70">
                      Vue d'ensemble des clients, recherche, tri et accès rapide aux fiches.
                    </p>
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Users className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {totalClients} client{totalClients > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Building2 className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {totalBatiments} bâtiment{totalBatiments > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Building2 className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {moyenneBatiments} bâtiments / client
                    </span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action */}
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1F4E79] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
              >
                <Plus className="h-4 w-4" />
                Nouveau client
              </button>
            </div>
          </div>
        </div>

        {/* ========== FILTRES ========== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                <SlidersHorizontal className="h-5 w-5 text-[#1F4E79]" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Filtres
                </h2>
                <p className="text-xs text-slate-500">Affinez la liste grâce à la recherche et au tri.</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              {/* Recherche */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Nom du client..."
                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    style={{ paddingLeft: '3rem' }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Trier par */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Trier par
                </label>
                <select
                  value={sortKey}
                  onChange={handleSortKeyChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="name">Nom du client</option>
                  <option value="nb_batiments">Nombre de bâtiments</option>
                </select>
              </div>

              {/* Ordre */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Ordre
                </label>
                <select
                  value={sortDir}
                  onChange={handleSortDirChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="asc">Croissant</option>
                  <option value="desc">Décroissant</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ========== LISTE DES CLIENTS ========== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                <Users className="h-5 w-5 text-[#1F4E79]" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Liste des clients
                </h2>
                <p className="text-xs text-slate-500">
                  {filteredAndSortedClients.length} client
                  {filteredAndSortedClients.length > 1 ? 's' : ''} trouvé
                  {filteredAndSortedClients.length > 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {filteredAndSortedClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">Aucun résultat</p>
                <p className="mt-1 text-xs text-slate-500">Modifiez la recherche ou le tri.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="pb-3 pl-0 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Client
                      </th>
                      <th className="pb-3 px-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <div className="flex justify-center">Bâtiments</div>
                      </th>
                      <th className="pb-3 px-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <div className="flex justify-center">Action</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAndSortedClients.map((c) => (
                      <tr
                        key={c.id}
                        className="group cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => {
                          window.location.href = `/admin/clients/${c.id}`
                        }}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] text-sm font-semibold text-white shadow-sm">
                              {(c.name ?? 'C')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate font-semibold text-slate-800 transition-colors group-hover:text-[#1F4E79]">
                                {c.name || '(Sans nom)'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-0">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                c.nb_batiments > 0
                                  ? 'bg-[#1F4E79]/10 text-[#1F4E79]'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {c.nb_batiments}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-0">
                          <div className="flex justify-center">
                            <Link
                              href={`/admin/clients/${c.id}`}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#1F4E79] transition-all hover:bg-[#1F4E79]/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Voir
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

        {/* Modal création client */}
        {createOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closeCreateModal}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Nouveau client</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Entrez un nom. Les détails pourront être complétés ensuite.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createSaving}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Nom du client <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Ex.: Ville de X, Immobilier ABC"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    autoFocus
                  />
                </div>

                {createError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{createError}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    disabled={createSaving}
                    className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    disabled={createSaving}
                    className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {createSaving ? 'Enregistrement…' : 'Créer le client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </>
  )
}
