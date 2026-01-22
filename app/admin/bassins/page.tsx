'use client'

import { useEffect, useMemo, useState, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import { Pagination } from '@/components/ui/Pagination'
import {
  Layers,
  Search,
  Building2,
  Users,
  MapPin,
  ChevronRight,
  AlertTriangle,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Hash,
  Ruler,
  X,
} from 'lucide-react'

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
}

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  client_id: string | null
  clients?: { id: string; name: string | null }[] | { id: string; name: string | null } | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string | null
  couleur: string | null
}

function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'

  const v = etat
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (v.includes('urgent')) return 'urgent'
  if (v.includes('tres bon') || v.includes('excellent')) return 'tres_bon'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier') || v.includes('planification')) return 'planifier'

  return 'non_evalue'
}

const ITEMS_PER_PAGE = 20

export default function AdminBassinsPage() {
  const router = useRouter()

  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [sortKey, setSortKey] = useState<'batiment' | 'client' | 'etat' | 'duree_vie' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Pagination côté serveur
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Debounce du champ de recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        // Listes de choix (chargées une seule fois, pas paginées)
        if (listes.length === 0) {
          const { data: listesData, error: listesError } = await supabaseBrowser
            .from('listes_choix')
            .select('id, categorie, label, couleur')

          if (listesError) {
            setErrorMsg(listesError.message)
            setLoading(false)
            return
          }

          setListes(listesData || [])
        }

        // Bassins avec pagination côté serveur
        let query = supabaseBrowser
          .from('bassins')
          .select(
            `
            id,
            batiment_id,
            name,
            surface_m2,
            annee_installation,
            date_derniere_refection,
            etat_id,
            duree_vie_id,
            duree_vie_text,
            reference_interne,
            batiments (
              id,
              name,
              address,
              city,
              postal_code,
              client_id,
              clients ( id, name )
            )
          `,
            { count: 'exact' }
          )

        // Recherche côté serveur (nom bassin)
        if (debouncedSearch.trim()) {
          query = query.ilike('name', `%${debouncedSearch.trim()}%`)
        }

        // Tri côté serveur (simplifié sur nom par défaut)
        query = query.order('name', { ascending: sortDir === 'asc' })

        // Pagination avec .range()
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        const end = start + ITEMS_PER_PAGE - 1
        query = query.range(start, end)

        const { data: bassinsData, error: bassinsError, count } = await query

        if (bassinsError) {
          setErrorMsg(bassinsError.message)
          setLoading(false)
          return
        }

        const bassinsList = (bassinsData || []) as BassinRow[]
        setBassins(bassinsList)
        setTotalCount(count || 0)
        setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))

        // Bâtiments pour la page actuelle seulement
        const batimentsFromBassins = bassinsList
          .map((b: any) => b.batiments)
          .filter((bat): bat is BatimentRow => bat !== null)
        setBatiments(batimentsFromBassins)

        setLoading(false)
      } catch (err: any) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur load bassins:', err)
        }
        setErrorMsg('Erreur lors du chargement des bassins.')
        setLoading(false)
      }
    }

    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, sortDir])

  const etatsBassin = useMemo(
    () =>
      listes.filter((l) =>
        ['etat_bassin', 'etat_toiture', 'etat'].includes(l.categorie)
      ),
    [listes]
  )

  const dureesBassin = useMemo(
    () =>
      listes.filter((l) =>
        ['duree_vie_bassin', 'duree_vie_toiture', 'duree_vie'].includes(
          l.categorie
        )
      ),
    [listes]
  )

  const batimentById = useMemo(() => {
    const map = new Map<string, BatimentRow>()
    batiments.forEach((b) => map.set(b.id, b))
    return map
  }, [batiments])

  const labelEtat = (id: string | null) => {
    if (!id) return null
    return etatsBassin.find((e) => e.id === id)?.label ?? null
  }

  const couleurEtat = (id: string | null) => {
    if (!id) return null
    return etatsBassin.find((e) => e.id === id)?.couleur ?? null
  }

  const labelDuree = (bassin: BassinRow) => {
    if (bassin.duree_vie_id) {
      const fromList =
        dureesBassin.find((d) => d.id === bassin.duree_vie_id)?.label ?? null
      if (fromList) return fromList
    }
    return bassin.duree_vie_text ?? null
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setCurrentPage(1) // Reset à la page 1 lors d'une recherche
  }

  // Calcul des indices pour l'affichage de pagination
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount)

  const toggleSort = (key: 'batiment' | 'client' | 'etat' | 'duree_vie') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: 'batiment' | 'client' | 'etat' | 'duree_vie' }) => {
    const active = sortKey === col
    if (!active) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDir === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    )
  }

  // Statistiques (Note: totalBatiments, totalClients et totalSurfaceFt2 sont calculés sur la page actuelle uniquement)
  const totalBassins = totalCount
  const totalBatiments = new Set(bassins.map((b) => b.batiment_id).filter(Boolean)).size
  const totalClients = new Set(
    batiments
      .map((b) => {
        if (!b.clients) return null
        return Array.isArray(b.clients) ? b.clients[0]?.id : b.clients.id
      })
      .filter(Boolean)
  ).size
  const totalSurfaceFt2 = bassins.reduce((sum, b) => {
    if (b.surface_m2 != null) {
      return sum + Math.round(b.surface_m2 * 10.7639)
    }
    return sum
  }, 0)

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">Chargement des bassins…</p>
        </div>
      </div>
    )
  }

  // Error state
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
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Bassins de toiture
                  </h1>
                  <p className="mt-0.5 text-sm text-white/70">
                    Vue d&apos;ensemble des bassins avec surfaces, états et durées de vie
                  </p>
                </div>
              </div>

              {/* Stats rapides */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Layers className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalBassins} bassin{totalBassins > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Building2 className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalBatiments} bâtiment{totalBatiments > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Users className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalClients} client{totalClients > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Ruler className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalSurfaceFt2.toLocaleString('fr-CA')} pi² total
                  </span>
                </div>
              </div>
            </div>
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
                Recherche
              </h2>
              <p className="text-xs text-slate-500">Filtrez par bassin, bâtiment, client ou adresse</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="max-w-md">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Bassin, bâtiment, adresse…"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  style={{ paddingLeft: '2.75rem', paddingRight: search ? '2.5rem' : '1rem' }}
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
          </div>
        </div>
      </div>

      {/* ========== LISTE DES BASSINS ========== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                <Layers className="h-5 w-5 text-[#1F4E79]" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Liste des bassins
                </h2>
                <p className="text-xs text-slate-500">
                  {totalCount} bassin{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                <Layers className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Aucun bassin trouvé</p>
              <p className="mt-1 text-xs text-slate-500">Modifiez votre recherche ou ajoutez un nouveau bassin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Bassin
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <button
                        type="button"
                        onClick={() => toggleSort('batiment')}
                        className="inline-flex items-center gap-1 hover:text-[#1F4E79] transition-colors"
                      >
                        Bâtiment
                        <SortIcon col="batiment" />
                      </button>
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <button
                        type="button"
                        onClick={() => toggleSort('client')}
                        className="inline-flex items-center gap-1 hover:text-[#1F4E79] transition-colors"
                      >
                        Client
                        <SortIcon col="client" />
                      </button>
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Adresse
                    </th>
                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Surface
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <button
                        type="button"
                        onClick={() => toggleSort('etat')}
                        className="inline-flex items-center gap-1 hover:text-[#1F4E79] transition-colors"
                      >
                        État
                        <SortIcon col="etat" />
                      </button>
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <button
                        type="button"
                        onClick={() => toggleSort('duree_vie')}
                        className="inline-flex items-center gap-1 hover:text-[#1F4E79] transition-colors"
                      >
                        Durée de vie
                        <SortIcon col="duree_vie" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bassins.map((bassin) => {
                    const bat = bassin.batiment_id
                      ? batimentById.get(bassin.batiment_id)
                      : undefined

                    const surfaceFt2 =
                      bassin.surface_m2 != null
                        ? Math.round(bassin.surface_m2 * 10.7639)
                        : null

                    const etatLibelle = labelEtat(bassin.etat_id)
                    const etatCouleur = couleurEtat(bassin.etat_id)
                    const dureeLibelle = labelDuree(bassin)

                    return (
                      <tr
                        key={bassin.id}
                        className="group cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => router.push(`/admin/bassins/${bassin.id}`)}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] text-sm font-semibold text-white shadow-sm">
                              {(bassin.name ?? 'B')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate font-semibold text-slate-800 transition-colors group-hover:text-[#1F4E79]">
                                {bassin.name ?? '(Sans nom)'}
                              </span>
                              {bassin.reference_interne && (
                                <p className="truncate text-xs text-slate-500">
                                  {bassin.reference_interne}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            {bat?.name ?? '—'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                            <Users className="h-3 w-3 text-slate-400" />
                            {bat?.clients
                              ? Array.isArray(bat.clients)
                                ? bat.clients[0]?.name ?? '—'
                                : bat.clients.name ?? '—'
                              : '—'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-slate-600">
                            {bat ? (
                              <>
                                {bat.address || ''}
                                {bat.city ? `, ${bat.city}` : ''}
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`inline-flex min-w-[3.5rem] items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            surfaceFt2 != null
                              ? 'bg-[#1F4E79]/10 text-[#1F4E79]'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {surfaceFt2 != null ? `${surfaceFt2.toLocaleString('fr-CA')} pi²` : 'n/d'}
                          </span>
                        </td>
                        <td className="py-4">
                          {etatLibelle ? (
                            <StateBadge
                              state={mapEtatToStateBadge(etatLibelle)}
                              color={etatCouleur ?? null}
                              label={etatLibelle ?? null}
                            />
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                              Non évalué
                            </span>
                          )}
                        </td>

                        <td className="py-4">
                          <span className="text-sm text-slate-600">
                            {dureeLibelle || 'Non définie'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination info */}
          {totalCount > 0 && (
            <div className="mt-4 text-sm text-ct-gray text-center">
              Affichage de {startIndex} à {endIndex} sur {totalCount} bassin{totalCount > 1 ? 's' : ''}
            </div>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </section>
  )
}
