'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  Building2,
  Layers,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Activity,
} from 'lucide-react'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'

type ClientRow = {
  id: string
  name: string | null
}

type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
}

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  surface_m2: number | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
}

type GarantieRow = {
  id: string
  bassin_id: string | null
  type_garantie_id: string | null
  date_fin: string | null
  fournisseur: string | null
  bassins: {
    id: string
    name: string | null
    batiment_id: string | null
    batiments: {
      id: string
      name: string | null
      client_id: string | null
      clients: {
        id: string
        name: string | null
      } | null
    } | null
  } | null
}

type ListeChoix = {
  id: string
  categorie: string
  code: string | null
  label: string | null
  couleur: string | null
}

type DashboardStateCounts = {
  tres_bon: number
  bon: number
  a_surveille: number
  planifier: number
  urgent: number
  non_evalue: number
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

export default function ClientDashboardPage() {
  const router = useRouter()

  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [garanties, setGaranties] = useState<GarantieRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'prioritaires' | 'garanties'>('prioritaires')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1. Récupérer le profil utilisateur pour obtenir les clients autorisés
      const {
        data: { user },
      } = await supabaseBrowser.auth.getUser()

      if (!user) {
        setErrorMsg('Non authentifié')
        setLoading(false)
        return
      }

      const { data: profile, error: profileError } = await supabaseBrowser
        .from('user_profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        setErrorMsg(profileError?.message || 'Profil introuvable')
        setLoading(false)
        return
      }

      // 2. Récupérer tous les clients autorisés via user_clients
      const { data: userClientsData, error: userClientsError } =
        await supabaseBrowser
          .from('user_clients')
          .select('client_id')
          .eq('user_id', user.id)

      if (userClientsError) {
        setErrorMsg(userClientsError.message)
        setLoading(false)
        return
      }

      // Combiner le client principal et les clients supplémentaires
      const authorizedClientIds = new Set<string>()
      if (profile.client_id) {
        authorizedClientIds.add(profile.client_id)
      }
      userClientsData?.forEach((uc) => {
        if (uc.client_id) authorizedClientIds.add(uc.client_id)
      })

      const clientIdsArray = Array.from(authorizedClientIds)

      if (clientIdsArray.length === 0) {
        setErrorMsg('Aucun client associé à ce compte')
        setLoading(false)
        return
      }

      // 3. Récupérer les données filtrées
      const [clientsRes, batimentsRes, bassinsRes, garantiesRes, listesRes] =
        await Promise.all([
          supabaseBrowser
            .from('clients')
            .select('id, name')
            .in('id', clientIdsArray),
          supabaseBrowser
            .from('batiments')
            .select('id, client_id, name')
            .in('client_id', clientIdsArray),
          supabaseBrowser
            .from('bassins')
            .select(
              'id, batiment_id, name, surface_m2, etat_id, duree_vie_id, duree_vie_text'
            ),
          supabaseBrowser
            .from('garanties')
            .select(`
              id,
              bassin_id,
              type_garantie_id,
              date_fin,
              fournisseur,
              bassins!inner(
                id,
                name,
                batiment_id,
                batiments!inner(
                  id,
                  name,
                  client_id,
                  clients(id, name)
                )
              )
            `)
            .in('bassins.batiments.client_id', clientIdsArray)
            .order('date_fin', { ascending: true }),
          supabaseBrowser
            .from('listes_choix')
            .select('id, categorie, code, label, couleur'),
        ])

      if (clientsRes.error) {
        setErrorMsg(clientsRes.error.message)
        setLoading(false)
        return
      }
      if (batimentsRes.error) {
        setErrorMsg(batimentsRes.error.message)
        setLoading(false)
        return
      }
      if (bassinsRes.error) {
        setErrorMsg(bassinsRes.error.message)
        setLoading(false)
        return
      }
      if (garantiesRes.error) {
        setErrorMsg(garantiesRes.error.message)
        setLoading(false)
        return
      }
      if (listesRes.error) {
        setErrorMsg(listesRes.error.message)
        setLoading(false)
        return
      }

      const allBatiments = (batimentsRes.data || []) as BatimentRow[]
      const allBassins = (bassinsRes.data || []) as BassinRow[]
      const allGaranties = (garantiesRes.data || []) as GarantieRow[]

      // Filtrer les bassins pour ne garder que ceux des bâtiments autorisés
      const batimentIds = new Set(allBatiments.map((b) => b.id))
      const filteredBassins = allBassins.filter((b) =>
        b.batiment_id ? batimentIds.has(b.batiment_id) : false
      )

      // Filtrer les garanties pour ne garder que celles des bassins autorisés
      const bassinIds = new Set(filteredBassins.map((b) => b.id))
      const filteredGaranties = allGaranties.filter((g) =>
        g.bassin_id ? bassinIds.has(g.bassin_id) : false
      )

      setClients((clientsRes.data || []) as ClientRow[])
      setBatiments(allBatiments)
      setBassins(filteredBassins)
      setGaranties(filteredGaranties)
      setListes((listesRes.data || []) as ListeChoix[])
      setLoading(false)
    }

    void fetchData()
  }, [])

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

  const typesGarantie = useMemo(
    () =>
      listes.filter((l) =>
        ['type_garantie', 'garantie'].includes(l.categorie)
      ),
    [listes]
  )

  const batimentById = useMemo(() => {
    const map = new Map<string, BatimentRow>()
    batiments.forEach((b) => {
      map.set(b.id, b)
    })
    return map
  }, [batiments])

  const clientById = useMemo(() => {
    const map = new Map<string, ClientRow>()
    clients.forEach((c) => {
      map.set(c.id, c)
    })
    return map
  }, [clients])

  const etatLibelleFromId = (id: string | null) => {
    if (!id) return null
    return etatsBassin.find((e) => e.id === id)?.label ?? null
  }

  const etatCouleurFromId = (id: string | null) => {
    if (!id) return null
    return etatsBassin.find((e) => e.id === id)?.couleur ?? null
  }

  const etatCouleurFromCode = (code: BassinState) => {
    if (code === 'tres_bon') {
      return etatsBassin.find((e) => e.code === 'tres_bon')?.couleur ?? null
    }
    if (code === 'a_surveille') {
      return etatsBassin.find((e) => e.code === 'surveiller')?.couleur ?? null
    }
    if (code === 'non_evalue') {
      return etatsBassin.find((e) => e.code === 'non_evalue')?.couleur ?? null
    }

    return etatsBassin.find((e) => e.code === code)?.couleur ?? null
  }

  const etatLabelFromCode = (code: BassinState) => {
    if (code === 'tres_bon') {
      return etatsBassin.find((e) => e.code === 'tres_bon')?.label ?? 'Très bon'
    }
    if (code === 'a_surveille') {
      return (
        etatsBassin.find((e) => e.code === 'surveiller')?.label ?? 'À surveiller'
      )
    }
    if (code === 'non_evalue') {
      return (
        etatsBassin.find((e) => e.code === 'non_evalue')?.label ?? 'Non évalué'
      )
    }

    return etatsBassin.find((e) => e.code === code)?.label ?? null
  }

  const dureeLibelleFromBassin = (b: BassinRow) => {
    if (b.duree_vie_id) {
      const fromList =
        dureesBassin.find((d) => d.id === b.duree_vie_id)?.label ?? null
      if (fromList) return fromList
    }
    return b.duree_vie_text ?? null
  }

  const typeGarantieLibelleFromId = (id: string | null) => {
    if (!id) return null
    return typesGarantie.find((t) => t.id === id)?.label ?? null
  }

  // Agrégats globaux
  const {
    nbBatiments,
    nbBassins,
    totalSurfaceM2,
    totalSurfaceFt2,
    stateCounts,
    bassinsRisque,
  } = useMemo(() => {
    const nbBatiments = batiments.length
    const nbBassins = bassins.length

    let totalSurfaceM2 = 0
    const counts: DashboardStateCounts = {
      tres_bon: 0,
      bon: 0,
      a_surveille: 0,
      planifier: 0,
      urgent: 0,
      non_evalue: 0,
    }

    const itemsRisque: BassinRow[] = []

    bassins.forEach((b) => {
      if (b.surface_m2 != null) {
        totalSurfaceM2 += Number(b.surface_m2)
      }

      const etatLib = etatLibelleFromId(b.etat_id)
      const state = mapEtatToStateBadge(etatLib)

      counts[state] += 1

      if (['urgent', 'a_surveille', 'planifier'].includes(state)) {
        itemsRisque.push(b)
      }
    })

    const totalSurfaceFt2 = totalSurfaceM2 * 10.7639

    // tri des bassins à risque : urgent > planifier > à surveiller, puis par surface
    const order: Record<BassinState, number> = {
      urgent: 0,
      planifier: 1,
      a_surveille: 2,
      bon: 3,
      tres_bon: 4,
      non_evalue: 5,
    }

    itemsRisque.sort((a, b) => {
      const sa = mapEtatToStateBadge(etatLibelleFromId(a.etat_id))
      const sb = mapEtatToStateBadge(etatLibelleFromId(b.etat_id))
      const oa = order[sa]
      const ob = order[sb]
      if (oa !== ob) return oa - ob
      const sfa = a.surface_m2 != null ? Number(a.surface_m2) : 0
      const sfb = b.surface_m2 != null ? Number(b.surface_m2) : 0
      return sfb - sfa
    })

    return {
      nbBatiments,
      nbBassins,
      totalSurfaceM2,
      totalSurfaceFt2,
      stateCounts: counts,
      bassinsRisque: itemsRisque.slice(0, 10), // top 10
    }
  }, [batiments, bassins, etatsBassin, dureesBassin])

  // Calcul des pourcentages
  const totalBassinsNonBon =
    stateCounts.urgent + stateCounts.planifier + stateCounts.a_surveille

  const pourcentageRisque =
    nbBassins > 0 ? Math.round((totalBassinsNonBon / nbBassins) * 100) : 0

  const pourcentageBon =
    nbBassins > 0 ? Math.round((stateCounts.bon / nbBassins) * 100) : 0

  const pourcentageTresBon =
    nbBassins > 0 ? Math.round((stateCounts.tres_bon / nbBassins) * 100) : 0

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ct-primary to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Chargement du tableau de bord…
          </p>
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
    <section className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ct-primary via-ct-primary-medium to-ct-primary-dark p-6 shadow-xl">
        {/* Décoration background */}
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Tableau de bord client
              </h1>
              <p className="mt-2 text-base text-white/80">
                Vue d'ensemble du parc de toitures et analyse des priorités
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Activity className="h-5 w-5 text-white" />
              <span className="text-sm font-medium text-white">
                En temps réel
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== CARTES KPI PRINCIPALES (3 cartes au lieu de 4) ========== */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Bâtiments */}
        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Bâtiments
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-800">
                  {nbBatiments}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {clients.length} client{clients.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bassins */}
        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                    <Layers className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Bassins
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-800">
                  {nbBassins}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {(nbBassins / Math.max(nbBatiments, 1)).toFixed(1)} par
                  bâtiment
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Surface totale */}
        <div className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Surface totale
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-800">
                  {Math.round(totalSurfaceFt2).toLocaleString('fr-CA')} pi²
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {Math.round(totalSurfaceM2).toLocaleString('fr-CA')} m²
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== BADGES D'IMPORTANCE / ALERTES ========== */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Bassins urgents */}
        <div className="overflow-hidden rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white shadow-sm">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-red-500">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Urgents
                </p>
                <p className="mt-1 text-3xl font-bold text-red-700">
                  {stateCounts.urgent}
                </p>
                <p className="mt-1 text-xs font-medium text-red-600">
                  Intervention immédiate requise
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bassins à planifier */}
        <div className="overflow-hidden rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-sm">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                  À planifier
                </p>
                <p className="mt-1 text-3xl font-bold text-orange-700">
                  {stateCounts.planifier}
                </p>
                <p className="mt-1 text-xs font-medium text-orange-600">
                  Budget à prévoir sous 12-24 mois
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bassins à surveiller */}
        <div className="overflow-hidden rounded-2xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white shadow-sm">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-yellow-500">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
                  À surveiller
                </p>
                <p className="mt-1 text-3xl font-bold text-yellow-700">
                  {stateCounts.a_surveille}
                </p>
                <p className="mt-1 text-xs font-medium text-yellow-700">
                  Inspection régulière nécessaire
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== GRILLE PRINCIPALE ========== */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,0.55fr)]">
        {/* Liste des bassins à risque / Garanties */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  {activeTab === 'prioritaires' ? 'Bassins prioritaires' : 'Garanties des bassins'}
                </h2>
                <p className="text-xs text-slate-500">
                  {activeTab === 'prioritaires'
                    ? `${bassinsRisque.length} bassin${bassinsRisque.length > 1 ? 's' : ''} nécessitant une attention`
                    : `${garanties.length} garantie${garanties.length > 1 ? 's' : ''} enregistrée${garanties.length > 1 ? 's' : ''}`
                  }
                </p>
              </div>
              {activeTab === 'prioritaires' && totalBassinsNonBon > 0 && (
                <div className="hidden sm:flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5">
                  <span className="text-xs font-bold text-red-700">
                    {pourcentageRisque}% à risque
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-slate-200 bg-white px-5">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('prioritaires')}
                className={`px-4 py-3 text-sm font-semibold transition-all ${
                  activeTab === 'prioritaires'
                    ? 'border-b-2 border-ct-primary text-ct-primary'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                Bassins prioritaires
              </button>
              <button
                onClick={() => setActiveTab('garanties')}
                className={`px-4 py-3 text-sm font-semibold transition-all ${
                  activeTab === 'garanties'
                    ? 'border-b-2 border-ct-primary text-ct-primary'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                Garanties des bassins
              </button>
            </div>
          </div>

          <div className="p-5">
            {activeTab === 'prioritaires' ? (
              // Contenu de l'onglet Bassins prioritaires
              bassinsRisque.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Excellent état général
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Aucun bassin à risque identifié pour le moment
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 pl-0 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Bassin
                        </th>
                        <th className="pb-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          État
                        </th>
                        <th className="hidden lg:table-cell pb-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Bâtiment
                        </th>
                        <th className="hidden xl:table-cell pb-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Client
                        </th>
                        <th className="pb-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Durée
                        </th>
                        <th className="pb-3 pr-0 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Surface
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bassinsRisque.map((b) => {
                        const bat = b.batiment_id
                          ? batimentById.get(b.batiment_id)
                          : undefined

                        const client = bat?.client_id
                          ? clientById.get(bat.client_id)
                          : undefined

                        const etatLib = etatLibelleFromId(b.etat_id)
                        const etatCouleur = etatCouleurFromId(b.etat_id)
                        const state = mapEtatToStateBadge(etatLib)
                        const dureeLib = dureeLibelleFromBassin(b)

                        const surfaceFt2 =
                          b.surface_m2 != null
                            ? Math.round(Number(b.surface_m2) * 10.7639)
                            : null

                        return (
                          <tr
                            key={b.id}
                            className="group cursor-pointer transition-colors hover:bg-slate-50"
                            onClick={() => router.push(`/client/bassins/${b.id}`)}
                          >
                            <td className="py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ct-primary to-[#2d6ba8] text-xs font-semibold text-white">
                                  {(b.name ?? 'B')[0].toUpperCase()}
                                </div>
                                <span className="font-semibold text-slate-800 transition-colors group-hover:text-ct-primary">
                                  {b.name || '(Sans nom)'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-3">
                              <StateBadge
                                state={state}
                                color={etatCouleur}
                                label={etatLib}
                              />
                            </td>
                            <td className="hidden lg:table-cell py-3.5 px-3 text-sm text-slate-600">
                              {bat?.name || '—'}
                            </td>
                            <td className="hidden xl:table-cell py-3.5 px-3 text-sm text-slate-600">
                              {client?.name || '—'}
                            </td>
                            <td className="py-3.5 px-3 text-sm text-slate-600">
                              {dureeLib || 'Non définie'}
                            </td>
                            <td className="py-3.5 pr-0 text-right">
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {surfaceFt2 != null
                                  ? `${surfaceFt2.toLocaleString('fr-CA')} pi²`
                                  : 'n/d'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Contenu de l'onglet Garanties
              garanties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Aucune garantie enregistrée
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Il n'y a pas encore de garanties pour vos bassins
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-3 pl-0 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Bassin
                        </th>
                        <th className="hidden lg:table-cell pb-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Bâtiment
                        </th>
                        <th className="hidden xl:table-cell pb-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Client
                        </th>
                        <th className="pb-3 px-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Échéance
                        </th>
                        <th className="pb-3 pr-0 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Type de garantie
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {garanties.map((g) => {
                        const bassinName = g.bassins?.name || '(Sans nom)'
                        const batimentName = g.bassins?.batiments?.name || '—'
                        const clientName = g.bassins?.batiments?.clients?.name || '—'
                        const typeGarantieLabel = typeGarantieLibelleFromId(g.type_garantie_id)

                        // Format date
                        let dateFinFormatted = '—'
                        if (g.date_fin) {
                          const date = new Date(g.date_fin + 'T00:00:00')
                          dateFinFormatted = date.toLocaleDateString('fr-CA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        }

                        return (
                          <tr
                            key={g.id}
                            className="group cursor-pointer transition-colors hover:bg-slate-50"
                            onClick={() => router.push(`/client/bassins/${g.bassin_id}`)}
                          >
                            <td className="py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ct-primary to-[#2d6ba8] text-xs font-semibold text-white">
                                  {bassinName[0].toUpperCase()}
                                </div>
                                <span className="font-semibold text-slate-800 transition-colors group-hover:text-ct-primary">
                                  {bassinName}
                                </span>
                              </div>
                            </td>
                            <td className="hidden lg:table-cell py-3.5 px-3 text-sm text-slate-600">
                              {batimentName}
                            </td>
                            <td className="hidden xl:table-cell py-3.5 px-3 text-sm text-slate-600">
                              {clientName}
                            </td>
                            <td className="py-3.5 px-3 text-sm text-slate-600">
                              {dateFinFormatted}
                            </td>
                            <td className="py-3.5 pr-0 text-sm text-slate-600">
                              {typeGarantieLabel || 'Non défini'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Répartition par état */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
                <Layers className="h-5 w-5 text-ct-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Répartition
                </h2>
                <p className="text-xs text-slate-500">État global des bassins</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              {/* Urgent */}
              <div className="group rounded-xl border border-red-200 bg-red-50/50 p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StateBadge
                      state="urgent"
                      color={etatCouleurFromCode('urgent')}
                      label={etatLabelFromCode('urgent')}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-700">
                      {stateCounts.urgent}
                    </p>
                    <p className="text-xs font-medium text-red-600">
                      {nbBassins > 0
                        ? Math.round((stateCounts.urgent / nbBassins) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>

              {/* Planifier */}
              <div className="group rounded-xl border border-orange-200 bg-orange-50/50 p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StateBadge
                      state="planifier"
                      color={etatCouleurFromCode('planifier')}
                      label={etatLabelFromCode('planifier')}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-700">
                      {stateCounts.planifier}
                    </p>
                    <p className="text-xs font-medium text-orange-600">
                      {nbBassins > 0
                        ? Math.round((stateCounts.planifier / nbBassins) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>

              {/* À surveiller */}
              <div className="group rounded-xl border border-yellow-200 bg-yellow-50/50 p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StateBadge
                      state="a_surveille"
                      color={etatCouleurFromCode('a_surveille')}
                      label={etatLabelFromCode('a_surveille')}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-700">
                      {stateCounts.a_surveille}
                    </p>
                    <p className="text-xs font-medium text-yellow-700">
                      {nbBassins > 0
                        ? Math.round(
                            (stateCounts.a_surveille / nbBassins) * 100
                          )
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>

              {/* Bon */}
              <div className="group rounded-xl border border-green-200 bg-green-50/50 p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StateBadge
                      state="bon"
                      color={etatCouleurFromCode('bon')}
                      label={etatLabelFromCode('bon')}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-700">
                      {stateCounts.bon}
                    </p>
                    <p className="text-xs font-medium text-green-600">
                      {pourcentageBon}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Très bon */}
              <div className="group rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StateBadge
                      state="tres_bon"
                      color={etatCouleurFromCode('tres_bon')}
                      label={etatLabelFromCode('tres_bon')}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-700">
                      {stateCounts.tres_bon}
                    </p>
                    <p className="text-xs font-medium text-emerald-600">
                      {pourcentageTresBon}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Non évalué */}
              <div className="group rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StateBadge
                      state="non_evalue"
                      color={etatCouleurFromCode('non_evalue')}
                      label={etatLabelFromCode('non_evalue')}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-700">
                      {stateCounts.non_evalue}
                    </p>
                    <p className="text-xs font-medium text-slate-600">
                      {nbBassins > 0
                        ? Math.round((stateCounts.non_evalue / nbBassins) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
