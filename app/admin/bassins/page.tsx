'use client'

import { useEffect, useMemo, useState, ChangeEvent } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'

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
}

type ListeChoix = {
  id: string
  categorie: string
  label: string | null
  couleur: string | null
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

export default function AdminBassinsPage() {
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bassins
      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, batiment_id, name, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne'
        )
        .order('id', { ascending: true })

      if (bassinsError) {
        setErrorMsg(bassinsError.message)
        setLoading(false)
        return
      }

      const bassinsList = (bassinsData || []) as BassinRow[]
      setBassins(bassinsList)

      // 2) Bâtiments associés
      const batimentIds = Array.from(
        new Set(
          bassinsList
            .map((b) => b.batiment_id)
            .filter((id): id is string => id !== null)
        )
      )

      let batimentsList: BatimentRow[] = []
      if (batimentIds.length > 0) {
        const { data: batimentsData, error: batimentsError } =
          await supabaseBrowser
            .from('batiments')
            .select('id, name, address, city, postal_code')
            .in('id', batimentIds)

        if (batimentsError) {
          setErrorMsg(batimentsError.message)
          setLoading(false)
          return
        }

        batimentsList = (batimentsData || []) as BatimentRow[]
      }
      setBatiments(batimentsList)

      // 3) Listes de choix (états / durées de vie)
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      setListes(listesData || [])
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
    batiments.forEach((b) => map.set(b.id, b))
    return map
  }, [batiments])

  const labelEtat = (id: string | null) => {
    if (!id) return null
    return etatsBassin.find((e) => e.id === id)?.label ?? null
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
  }

  const filteredBassins = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return bassins

    return bassins.filter((b) => {
      const bat = b.batiment_id ? batimentById.get(b.batiment_id) : undefined
      const fields = [
        b.name ?? '',
        b.reference_interne ?? '',
        bat?.name ?? '',
        bat?.address ?? '',
        bat?.city ?? '',
        bat?.postal_code ?? '',
      ]
      return fields.some((f) => f.toLowerCase().includes(s))
    })
  }, [bassins, batimentById, search])

  if (loading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-ct-gray">Chargement des bassins…</p>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ct-primary">
            Bassins de toiture
          </h1>
          <p className="mt-1 text-sm text-ct-gray">
            Vue d’ensemble des bassins de toiture, avec surfaces en pi², état et
            durée de vie résiduelle.
          </p>
        </div>

        <div className="w-full max-w-xs">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ct-grayDark">
            Recherche
          </label>
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Bassin, bâtiment, adresse…"
            className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
          />
        </div>
      </div>

      {/* Tableau bassins */}
      <div className="rounded-2xl border border-ct-grayLight bg-white p-4 shadow-sm">
        {filteredBassins.length === 0 ? (
          <p className="text-sm text-ct-gray">
            Aucun bassin trouvé pour le moment.
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
                    Adresse
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                    Surface (pi²)
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2">
                    État
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                    Durée de vie
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2">
                    Référence interne
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2">
                    Fiche
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBassins.map((b) => {
                  const bat = b.batiment_id
                    ? batimentById.get(b.batiment_id)
                    : undefined

                  const surfaceFt2 =
                    b.surface_m2 != null
                      ? Math.round(b.surface_m2 * 10.7639)
                      : null

                  const etatLibelle = labelEtat(b.etat_id)
                  const dureeLibelle = labelDuree(b)

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
                      <td className="border border-ct-grayLight px-3 py-2">
                        {bat ? (
                          <span>
                            {bat.address || ''}{' '}
                            {bat.city ? `, ${bat.city}` : ''}
                            {bat.postal_code ? ` (${bat.postal_code})` : ''}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                        {surfaceFt2 != null ? `${surfaceFt2} pi²` : 'n/d'}
                      </td>
                      <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                        {etatLibelle ? (
                          <div className="flex items-center gap-2">
                            <StateBadge
                              state={mapEtatToStateBadge(etatLibelle)}
                            />
                            <span>{etatLibelle}</span>
                          </div>
                        ) : (
                          <span className="text-ct-gray">Non évalué</span>
                        )}
                      </td>
                      <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                        {dureeLibelle || 'Non définie'}
                      </td>
                      <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                        {b.reference_interne || '—'}
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
      </div>
    </section>
  )
}
