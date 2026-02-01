'use client'

import { useEffect, useState, FormEvent, ChangeEvent, useMemo } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useApiMutation } from '@/lib/hooks/useApiMutation'
import {
  Users,
  Plus,
  SlidersHorizontal,
  Building2,
  X,
} from 'lucide-react'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SearchInput } from '@/components/ui/SearchInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type ClientRow = {
  id: string
  name: string | null
  nb_batiments: number
}

type SortDir = 'asc' | 'desc'

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')

  // Hook de mutation pour créer un client
  const { mutate: createClient, isLoading: createSaving, error: createError, resetError } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/clients/create',
    defaultErrorMessage: 'Erreur lors de la création du client',
    onSuccess: async () => {
      await fetchClients()
      setCreateOpen(false)
      setCreateName('')
    }
  })

  const fetchClients = async () => {
    setLoading(true)
    setErrorMsg(null)

    try {
      // Charger TOUS les clients (pas de pagination côté serveur)
      const { data: clientsData, error: clientsError } = await supabaseBrowser
        .from('clients')
        .select('id, name, batiments(count)')
        .order('name', { ascending: true })

      if (clientsError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur Supabase clients:', clientsError)
        }
        setErrorMsg(clientsError.message)
        setLoading(false)
        return
      }

      const formattedClients: ClientRow[] = (clientsData || []).map((row: any) => ({
        id: row.id as string,
        name: (row.name as string) ?? null,
        nb_batiments: row.batiments?.[0]?.count ?? 0,
      }))

      setClients(formattedClients)
      setLoading(false)
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur fetch clients:', err)
      }
      setErrorMsg('Erreur lors du chargement des clients.')
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchClients()
  }, [])

  // Filtrage côté client
  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients

    return clients.filter((c) => {
      const hay = [c.name ?? ''].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [search, clients])

  // Tri côté client
  const sortedClients = useMemo(() => {
    const arr = [...filteredClients]
    arr.sort((a, b) => {
      const aName = (a.name ?? '').toLowerCase()
      const bName = (b.name ?? '').toLowerCase()
      const cmp = aName.localeCompare(bName, 'fr', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filteredClients, sortDir])

  // Pagination côté client
  const {
    currentPage,
    totalPages,
    currentItems,
    setCurrentPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(sortedClients, 20)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleSortDirChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortDir(e.target.value as SortDir)
    setCurrentPage(1)
  }

  const openCreateModal = () => {
    setCreateName('')
    resetError()
    setCreateOpen(true)
  }

  const closeCreateModal = (open: boolean) => {
    if (createSaving) return
    setCreateOpen(open)
    if (!open) {
      setCreateName('')
      resetError()
    }
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      return
    }

    await createClient({ name: createName.trim() })
  }

  // Stats de la page actuelle (pour affichage)
  const totalBatiments = clients.reduce((sum, c) => sum + c.nb_batiments, 0)

  if (loading) {
    return <LoadingState message="Chargement des clients…" />
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
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Clients</h1>
                    <p className="mt-0.5 text-sm text-white/70">
                      Vue d&apos;ensemble des clients, recherche et accès rapide
                      aux fiches.
                    </p>
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Users className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {clients.length} client{clients.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {totalBatiments > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                      <Building2 className="h-4 w-4 text-white/70" />
                      <span className="text-sm text-white/90">
                        {totalBatiments} bâtiment{totalBatiments > 1 ? 's' : ''} (page actuelle)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bouton d'action */}
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ct-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
                <SlidersHorizontal className="h-5 w-5 text-ct-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Filtres
                </h2>
                <p className="text-xs text-slate-500">
                  Affinez la liste grâce à la recherche et à l’ordre.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {/* Recherche */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Recherche
                </label>
                <SearchInput
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Nom du client..."
                  className="w-full"
                />
              </div>

              {/* Ordre */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Ordre (nom)
                </label>
                <select
                  value={sortDir}
                  onChange={handleSortDirChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
                <Users className="h-5 w-5 text-ct-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Liste des clients
                </h2>
                <p className="text-xs text-slate-500">
                  {filteredClients.length} client
                  {filteredClients.length > 1 ? 's' : ''} trouvé
                  {filteredClients.length > 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {sortedClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  Aucun résultat
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Modifiez la recherche ou l&apos;ordre.
                </p>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentItems.map((c) => (
                      <tr
                        key={c.id}
                        className="group cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => {
                          window.location.href = `/admin/clients/${c.id}`
                        }}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ct-primary to-[#2d6ba8] text-sm font-semibold text-white shadow-sm">
                              {(c.name ?? 'C')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate font-semibold text-slate-800 transition-colors group-hover:text-ct-primary">
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
                                  ? 'bg-ct-primary/10 text-ct-primary'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {c.nb_batiments}
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
            {sortedClients.length > 0 && (
              <div className="mt-4 text-sm text-ct-gray text-center">
                Affichage de {startIndex} à {endIndex} sur {totalItems} client{totalItems > 1 ? 's' : ''}
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

      {/* Modal création client */}
      <Dialog open={createOpen} onOpenChange={closeCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              Entrez un nom. Les détails pourront être complétés ensuite.
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Nom du client <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex.: Ville de X, Immobilier ABC"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                autoFocus
                required
              />
            </div>

            {createError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{createError}</p>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => closeCreateModal(false)}
                disabled={createSaving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={createSaving || !createName.trim()}
                className="rounded-xl bg-gradient-to-r from-ct-primary to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {createSaving ? 'Enregistrement…' : 'Créer le client'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
