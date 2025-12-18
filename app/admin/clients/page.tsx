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
    <>
      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ct-primary">Clients</h1>
            <p className="mt-1 text-sm text-ct-gray">
              Vue d’ensemble des clients, nombre de bâtiments, recherche et accès
              rapide à leurs fiches.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={openCreateModal}
          >
            + Nouveau client
          </button>
        </div>

        {/* Synthèse */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-ct-grayLight bg-ct-white px-4 py-3 shadow-ct-card">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ct-gray">
              Clients actifs
            </p>
            <p className="mt-1 text-2xl font-semibold text-ct-primary">
              {totalClients}
            </p>
          </div>

          <div className="rounded-xl border border-ct-primaryLight bg-ct-primary/5 px-4 py-3 shadow-ct-card">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ct-primary">
              Bâtiments suivis
            </p>
            <p className="mt-1 text-2xl font-semibold text-ct-primary">
              {totalBatiments}
            </p>
          </div>

          <div className="rounded-xl border border-ct-grayLight bg-ct-white px-4 py-3 shadow-ct-card">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ct-gray">
              Bâtiments / client
            </p>
            <p className="mt-1 text-2xl font-semibold text-ct-primary">
              {moyenneBatiments}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle>Filtres et tri</CardTitle>
            <CardDescription>
              Affinez la liste grâce à la recherche et à l’ordre d’affichage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Recherche
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Nom du client…"
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Trier par
                </label>
                <select
                  value={sortKey}
                  onChange={handleSortKeyChange}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                >
                  <option value="name">Nom du client</option>
                  <option value="nb_batiments">Nombre de bâtiments</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Ordre
                </label>
                <select
                  value={sortDir}
                  onChange={handleSortDirChange}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
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
            <CardTitle>Liste des clients</CardTitle>
            <CardDescription>
              {filteredAndSortedClients.length} client
              {filteredAndSortedClients.length > 1 ? 's' : ''} trouvé
              {filteredAndSortedClients.length > 1 ? 's' : ''}.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {filteredAndSortedClients.length === 0 ? (
              <p className="text-sm text-ct-gray">Aucun résultat.</p>
            ) : (
              <DataTable maxHeight={600}>
                <table>
                  <DataTableHeader>
                    <tr>
                      <th>Nom du client</th>
                      <th>Nombre de bâtiments</th>
                    </tr>
                  </DataTableHeader>

                  <DataTableBody>
                    {filteredAndSortedClients.map((c) => (
                      <tr
                        key={c.id}
                        className="transition-colors hover:bg-ct-grayLight/70 cursor-pointer"
                        onClick={() => {
                          window.location.href = `/admin/clients/${c.id}`
                        }}
                      >
                        {/* ✅ SEULE MODIF : augmenter la hauteur des lignes (py-6) */}
                        <td className="py-6 text-sm text-ct-grayDark">
                          <span className="font-medium text-ct-primary hover:underline">
                            {c.name || '(Sans nom)'}
                          </span>
                        </td>

                        <td className="py-6 text-sm text-ct-grayDark">
                          {c.nb_batiments}
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

      {/* Modal création client */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeCreateModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-ct-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ct-primary">
                  Nouveau client
                </h2>
                <p className="mt-1 text-xs text-ct-gray">
                  Entrez un nom. Les détails pourront être complétés ensuite.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full border border-ct-grayLight px-2 py-1 text-xs text-ct-gray"
                disabled={createSaving}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Nom du client
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex.: Ville de X, Immobilier ABC"
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  autoFocus
                />
              </div>

              {createError && (
                <p className="text-xs text-red-600">{createError}</p>
              )}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={createSaving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={createSaving}
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
