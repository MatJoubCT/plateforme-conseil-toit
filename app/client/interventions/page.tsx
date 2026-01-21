'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabaseBrowser'
import {
  FileText,
  Search,
  Filter,
  Building2,
  Layers,
  Calendar,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'

type InterventionRow = {
  id: string
  bassin_id: string
  date_intervention: string
  type_intervention_id: string | null
  commentaire: string | null
  bassin_name: string | null
  batiment_id: string | null
  batiment_name: string | null
  client_id: string | null
  client_name: string | null
  type_label: string | null
}

type ListeChoixRow = {
  id: string
  categorie: string
  code: string
  label: string
  couleur: string
  ordre: number
}

export default function ClientInterventionsPage() {
  const router = useRouter()
  const supabaseBrowser = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [interventions, setInterventions] = useState<InterventionRow[]>([])
  const [listes, setListes] = useState<ListeChoixRow[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Filtres
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')

  // Charger les données
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setErrorMsg(null)

        // 1. Vérifier l'authentification
        const { data: { user }, error: userError } = await supabaseBrowser.auth.getUser()
        if (userError || !user) {
          router.replace('/login')
          return
        }

        // 2. Récupérer le profil et les clients autorisés
        const { data: profile, error: profileError } = await supabaseBrowser
          .from('user_profiles')
          .select('client_id, role, is_active')
          .eq('user_id', user.id)
          .single()

        if (profileError || !profile) {
          setErrorMsg('Profil introuvable.')
          return
        }

        if (profile.role !== 'client' || profile.is_active === false) {
          router.replace('/login')
          return
        }

        // 3. Construire la liste des clients autorisés
        const authorizedClientIds = new Set<string>()
        if (profile.client_id) {
          authorizedClientIds.add(profile.client_id)
        }

        const { data: userClientsData } = await supabaseBrowser
          .from('user_clients')
          .select('client_id')
          .eq('user_id', user.id)

        userClientsData?.forEach((uc) => {
          if (uc.client_id) authorizedClientIds.add(uc.client_id)
        })

        const clientIdsArray = Array.from(authorizedClientIds)

        if (clientIdsArray.length === 0) {
          setInterventions([])
          setLoading(false)
          return
        }

        // 4. Charger les listes de choix
        const { data: listesData, error: listesError } = await supabaseBrowser
          .from('listes_choix')
          .select('id, categorie, code, label, couleur, ordre')
          .order('ordre', { ascending: true })

        if (listesError) {
          console.error('Erreur chargement listes:', listesError)
        }

        setListes(listesData || [])

        // 5. Charger toutes les interventions des bassins des bâtiments autorisés
        const { data: interventionsData, error: interventionsError } = await supabaseBrowser
          .from('interventions')
          .select(`
            id,
            bassin_id,
            date_intervention,
            type_intervention_id,
            commentaire,
            bassins!inner(
              id,
              name,
              batiment_id,
              batiments!inner(
                id,
                name,
                client_id,
                clients(name)
              )
            )
          `)
          .order('date_intervention', { ascending: false })

        if (interventionsError) {
          throw interventionsError
        }

        // 6. Filtrer et formater les interventions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedInterventions: InterventionRow[] = (interventionsData || []).map((row: any) => {
          const bassin = row.bassins
          const batiment = bassin?.batiments
          const client = batiment?.clients

          return {
            id: row.id as string,
            bassin_id: row.bassin_id as string,
            date_intervention: row.date_intervention as string,
            type_intervention_id: (row.type_intervention_id as string | null) ?? null,
            commentaire: (row.commentaire as string | null) ?? null,
            bassin_name: (bassin?.name as string | null) ?? null,
            batiment_id: (batiment?.id as string | null) ?? null,
            batiment_name: (batiment?.name as string | null) ?? null,
            client_id: (batiment?.client_id as string | null) ?? null,
            client_name: (client?.name as string | null) ?? null,
            type_label: null,
          }
        })

        // Filtrer selon les clients autorisés
        const filteredInterventions = formattedInterventions.filter((i) =>
          i.client_id && clientIdsArray.includes(i.client_id)
        )

        // Enrichir avec les labels de type
        const typesInterventions = (listesData || []).filter((l) => l.categorie === 'type_interventions')
        filteredInterventions.forEach((intervention) => {
          const typeItem = typesInterventions.find((t) => t.id === intervention.type_intervention_id)
          intervention.type_label = typeItem?.label ?? null
        })

        setInterventions(filteredInterventions)
      } catch (err: unknown) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur chargement interventions:', err)
        }
        setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du chargement des interventions.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [router, supabaseBrowser])

  // Filtrage
  const filteredInterventions = useMemo(() => {
    return interventions.filter((i) => {
      // Filtre de recherche textuelle
      if (search) {
        const searchLower = search.toLowerCase()
        const matchBassin = i.bassin_name?.toLowerCase().includes(searchLower)
        const matchBatiment = i.batiment_name?.toLowerCase().includes(searchLower)
        const matchClient = i.client_name?.toLowerCase().includes(searchLower)
        const matchCommentaire = i.commentaire?.toLowerCase().includes(searchLower)
        const matchType = i.type_label?.toLowerCase().includes(searchLower)

        if (!matchBassin && !matchBatiment && !matchClient && !matchCommentaire && !matchType) {
          return false
        }
      }

      // Filtre par type
      if (filterType && i.type_intervention_id !== filterType) {
        return false
      }

      return true
    })
  }, [interventions, search, filterType])

  // Types d'interventions pour le filtre
  const typesInterventions = useMemo(() => {
    return listes.filter((l) => l.categorie === 'type_interventions')
  }, [listes])

  // Stats rapides
  const totalInterventions = interventions.length
  const interventionsFiltered = filteredInterventions.length

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-ct-primary border-t-transparent" />
          <p className="text-sm text-slate-600">Chargement des interventions…</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-lg bg-red-50 px-6 py-4 text-center border border-red-200">
          <p className="text-sm text-red-800">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ct-primary via-ct-primary-medium to-ct-primary-dark p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Interventions</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Historique des interventions sur vos bassins
              </p>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
              <FileText className="h-4 w-4 text-white/70" />
              <span className="text-sm text-white/90">
                {totalInterventions} intervention{totalInterventions > 1 ? 's' : ''}
              </span>
            </div>

            {search || filterType ? (
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                <Filter className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white/90">
                  {interventionsFiltered} résultat{interventionsFiltered > 1 ? 's' : ''}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="rounded-xl bg-white p-4 shadow-md border border-slate-200">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recherche textuelle */}
          <div>
            <label htmlFor="search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par bassin, bâtiment, client, type..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
              />
            </div>
          </div>

          {/* Filtre par type */}
          <div>
            <label htmlFor="filterType" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Type d&apos;intervention
            </label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-900 transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
            >
              <option value="">Tous les types</option>
              {typesInterventions.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bouton reset */}
        {(search || filterType) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setSearch('')
                setFilterType('')
              }}
              className="text-xs font-medium text-ct-primary hover:text-ct-primary-dark transition-colors"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Liste des interventions */}
      {filteredInterventions.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-md border border-slate-200">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">
            {search || filterType ? 'Aucune intervention trouvée' : 'Aucune intervention'}
          </h3>
          <p className="text-sm text-slate-600">
            {search || filterType
              ? 'Essayez de modifier vos critères de recherche.'
              : 'Aucune intervention n\'a encore été enregistrée pour vos bassins.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-md border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-slate-200 bg-slate-50">
                <tr>
                  <th className="py-4 pl-6 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Date
                  </th>
                  <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden md:table-cell">
                    Type
                  </th>
                  <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                    Bassin
                  </th>
                  <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden lg:table-cell">
                    Bâtiment
                  </th>
                  <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden xl:table-cell">
                    Client
                  </th>
                  <th className="py-4 pr-6 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden 2xl:table-cell">
                    Commentaire
                  </th>
                  <th className="py-4 pr-6 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                    Détails
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredInterventions.map((intervention) => (
                  <tr
                    key={intervention.id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => {
                      if (intervention.bassin_id) {
                        router.push(`/client/bassins/${intervention.bassin_id}`)
                      }
                    }}
                  >
                    {/* Date */}
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">
                          {new Date(intervention.date_intervention).toLocaleDateString('fr-CA')}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-4 hidden md:table-cell">
                      <span className="inline-flex items-center rounded-full bg-ct-primary/10 px-2.5 py-0.5 text-xs font-medium text-ct-primary">
                        {intervention.type_label || 'Non spécifié'}
                      </span>
                    </td>

                    {/* Bassin */}
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700">
                          {intervention.bassin_name || 'Sans nom'}
                        </span>
                      </div>
                    </td>

                    {/* Bâtiment */}
                    <td className="py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {intervention.batiment_name || 'Sans nom'}
                        </span>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="py-4 hidden xl:table-cell">
                      <span className="text-sm text-slate-600">
                        {intervention.client_name || 'Sans nom'}
                      </span>
                    </td>

                    {/* Commentaire */}
                    <td className="py-4 pr-6 hidden 2xl:table-cell">
                      <div className="flex items-start gap-2 max-w-xs">
                        <MessageSquare className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600 line-clamp-2">
                          {intervention.commentaire || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 pr-6">
                      <div className="flex justify-center">
                        <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-ct-primary" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
