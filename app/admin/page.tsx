'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import Link from 'next/link'

type ClientRow = {
  id: string
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

type ListeChoix = {
  id: string
  categorie: string
  label: string | null
  couleur: string | null
}

type DashboardStateCounts = {
  bon: number
  a_surveille: number
  planifier: number
  urgent: number
  non_evalue: number
}

function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'
  const v = etat.toLowerCase()

  if (v.includes('urgent')) return 'urgent'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier') || v.includes('planification')) return 'planifier'

  return 'non_evalue'
}

export default function AdminDashboardPage() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      const [clientsRes, batimentsRes, bassinsRes, listesRes] =
        await Promise.all([
          supabaseBrowser.from('clients').select('id'),
          supabaseBrowser
            .from('batiments')
            .select('id, client_id, name'),
          supabaseBrowser
            .from('bassins')
            .select(
              'id, batiment_id, name, surface_m2, etat_id, duree_vie_id, duree_vie_text'
            ),
          supabaseBrowser
            .from('listes_choix')
            .select('id, categorie, label, couleur'),
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
      if (listesRes.error) {
        setErrorMsg(listesRes.error.message)
        setLoading(false)
        return
      }

      setClients((clientsRes.data || []) as ClientRow[])
      setBatiments((batimentsRes.data || []) as BatimentRow[])
      setBassins((bassinsRes.data || []) as BassinRow[])
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

  const batimentById = useMemo(() => {
    const map = new Map<string, BatimentRow>()
    batiments.forEach((b) => {
      map.set(b.id, b)
    })
    return map
  }, [batiments])

  const etatLibelleFromId = (id: string | null) => {
    if (!id) return null
    return etatsBassin.find((e) => e.id === id)?.label ?? null
  }

  const dureeLibelleFromBassin = (b: BassinRow) => {
    if (b.duree_vie_id) {
      const fromList =
        dureesBassin.find((d) => d.id === b.duree_vie_id)?.label ?? null
      if (fromList) return fromList
    }
    return b.duree_vie_text ?? null
  }

  // Agrégats globaux
  const {
    nbClients,
    nbBatiments,
    nbBassins,
    totalSurfaceM2,
    totalSurfaceFt2,
    stateCounts,
    bassinsRisque,
  } = useMemo(() => {
    const nbClients = clients.length
    const nbBatiments = batiments.length
    const nbBassins = bassins.length

    let totalSurfaceM2 = 0
    const counts: DashboardStateCounts = {
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
      non_evalue: 4,
    }

    itemsRisque.sort((a, b) => {
      const sa = mapEtatToStateBadge(etatLibelleFromId(a.etat_id))
      const sb = mapEtatToStateBadge(etatLibelleFromId(b.etat_id))
      const oa = order[sa]
      const ob = order[sb]
      if (oa !== ob) return oa - ob
      const sfa =
        a.surface_m2 != null ? Number(a.surface_m2) : 0
      const sfb =
        b.surface_m2 != null ? Number(b.surface_m2) : 0
      return sfb - sfa
    })

    return {
      nbClients,
      nbBatiments,
      nbBassins,
      totalSurfaceM2,
      totalSurfaceFt2,
      stateCounts: counts,
      bassinsRisque: itemsRisque.slice(0, 10), // top 10
    }
  }, [clients, batiments, bassins, etatsBassin, dureesBassin])

  if (loading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-ct-gray">
          Chargement du dashboard…
        </p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold text-ct-primary">
          Dashboard administrateur
        </h1>
        <p className="mt-1 text-sm text-ct-gray">
          Vue globale des clients, bâtiments et bassins, avec un résumé de l’état
          du parc de toitures.
        </p>
      </div>

      {/* Cartes de KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Nombre de comptes clients</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-ct-grayDark">
              {nbClients}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bâtiments</CardTitle>
            <CardDescription>Adresses gérées</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-ct-grayDark">
              {nbBatiments}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bassins</CardTitle>
            <CardDescription>Unités de toiture suivies</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-ct-grayDark">
              {nbBassins}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Surface totale</CardTitle>
            <CardDescription>
              Somme des surfaces de bassins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-ct-grayDark">
              {Math.round(totalSurfaceFt2).toLocaleString('fr-CA')} pi²
            </p>
            <p className="mt-1 text-xs text-ct-gray">
              ({Math.round(totalSurfaceM2).toLocaleString('fr-CA')} m²)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par état */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Bassins à risque</CardTitle>
            <CardDescription>
              Bassins classés urgent, à planifier ou à surveiller.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bassinsRisque.length === 0 ? (
              <p className="text-sm text-ct-gray">
                Aucun bassin à risque identifié pour le moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-ct-grayLight/60 text-left">
                      <th className="border border-ct-grayLight px-3 py-2">
                        Bassin
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        Bâtiment
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        État
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                        Durée de vie
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                        Surface (pi²)
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        Fiche
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bassinsRisque.map((b) => {
                      const bat = b.batiment_id
                        ? batimentById.get(b.batiment_id)
                        : undefined
                      const etatLib = etatLibelleFromId(b.etat_id)
                      const state = mapEtatToStateBadge(etatLib)
                      const dureeLib = dureeLibelleFromBassin(b)
                      const surfaceFt2 =
                        b.surface_m2 != null
                          ? Math.round(Number(b.surface_m2) * 10.7639)
                          : null

                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-ct-primaryLight/10 transition-colors"
                        >
                          <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap font-medium text-ct-grayDark">
                            {b.name || '(Sans nom)'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                            {bat?.name || '—'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <StateBadge state={state} />
                              <span>{etatLib || 'Non évalué'}</span>
                            </div>
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                            {dureeLib || 'Non définie'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                            {surfaceFt2 != null
                              ? `${surfaceFt2.toLocaleString('fr-CA')} pi²`
                              : 'n/d'}
                          </td>
                          <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                            <Link
                              href={`/admin/bassins/${b.id}`}
                              className="text-ct-primary hover:underline"
                            >
                              Ouvrir
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des bassins</CardTitle>
            <CardDescription>Par état global</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StateBadge state="urgent" />
                  <span>Bassins urgents</span>
                </div>
                <span className="font-medium">
                  {stateCounts.urgent}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StateBadge state="planifier" />
                  <span>À planifier</span>
                </div>
                <span className="font-medium">
                  {stateCounts.planifier}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StateBadge state="a_surveille" />
                  <span>À surveiller</span>
                </div>
                <span className="font-medium">
                  {stateCounts.a_surveille}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StateBadge state="bon" />
                  <span>En bon état</span>
                </div>
                <span className="font-medium">
                  {stateCounts.bon}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StateBadge state="non_evalue" />
                  <span>Non évalués</span>
                </div>
                <span className="font-medium">
                  {stateCounts.non_evalue}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
