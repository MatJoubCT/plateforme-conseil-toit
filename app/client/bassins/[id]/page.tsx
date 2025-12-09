'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import BassinMap from '@/components/maps/BassinMap'

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
}

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
  notes: string | null
  polygone_geojson: GeoJSONPolygon | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string | null
  couleur: string | null
}

type GarantieRow = {
  id: string
  bassin_id: string | null
  type_garantie_id: string | null
  fournisseur: string | null
  numero_garantie: string | null
  date_debut: string | null
  date_fin: string | null
  statut_id: string | null
  couverture: string | null
  commentaire: string | null
  fichier_pdf_url: string | null
}

type RapportRow = {
  id: string
  bassin_id: string | null
  type_id: string | null
  date_rapport: string | null
  numero_ct: string | null
  titre: string | null
  description: string | null
  file_url: string | null
}

type UserProfileRow = {
  id: string
  user_id: string
  role: string | null
  client_id: string | null
  full_name: string | null
}

/** mappe un libellé d'état en type pour StateBadge */
function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'
  const v = etat.toLowerCase()

  if (v.includes('urgent')) return 'urgent'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier') || v.includes('planification')) return 'planifier'

  return 'non_evalue'
}

export default function ClientBassinDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bassinId = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [bassin, setBassin] = useState<BassinRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [garanties, setGaranties] = useState<GarantieRow[]>([])
  const [rapports, setRapports] = useState<RapportRow[]>([])
  const [activeTab, setActiveTab] = useState<'garanties' | 'rapports'>(
    'garanties',
  )

  useEffect(() => {
    if (!bassinId) return

    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Utilisateur courant
      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser()

      if (userError || !user) {
        setErrorMsg("Impossible de récupérer l'utilisateur connecté.")
        setLoading(false)
        router.push('/login')
        return
      }

      // 2) Profil
      const { data: profileData, error: profileError } =
        await supabaseBrowser
          .from('user_profiles')
          .select('id, user_id, role, client_id, full_name')
          .eq('user_id', user.id)
          .maybeSingle()

      if (profileError || !profileData) {
        setErrorMsg('Profil utilisateur introuvable.')
        setLoading(false)
        return
      }

      setProfile(profileData as UserProfileRow)

      // 3) Bassin (RLS limite déjà l’accès)
      const { data: bassinData, error: bassinError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, batiment_id, name, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson',
        )
        .eq('id', bassinId)
        .maybeSingle()

      if (bassinError) {
        setErrorMsg(bassinError.message)
        setLoading(false)
        return
      }

      if (!bassinData) {
        setErrorMsg('Bassin introuvable ou non accessible.')
        setLoading(false)
        return
      }

      setBassin(bassinData as BassinRow)

      // 4) Bâtiment parent
      let batData: BatimentRow | null = null
      if (bassinData.batiment_id) {
        const { data, error } = await supabaseBrowser
          .from('batiments')
          .select(
            'id, client_id, name, address, city, postal_code, latitude, longitude',
          )
          .eq('id', bassinData.batiment_id)
          .maybeSingle()

        if (error) {
          setErrorMsg(error.message)
          setLoading(false)
          return
        }

        batData = (data || null) as BatimentRow | null
      }

      setBatiment(batData)

      // 5) Listes de choix
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      setListes((listesData || []) as ListeChoix[])

      // 6) Garanties (lecture seule)
      const { data: garantiesData, error: garantiesError } =
        await supabaseBrowser
          .from('garanties')
          .select(
            'id, bassin_id, type_garantie_id, fournisseur, numero_garantie, date_debut, date_fin, statut_id, couverture, commentaire, fichier_pdf_url',
          )
          .eq('bassin_id', bassinId)
          .order('date_debut', { ascending: true })

      if (garantiesError) {
        setErrorMsg(garantiesError.message)
        setLoading(false)
        return
      }

      setGaranties((garantiesData || []) as GarantieRow[])

      // 7) Rapports (lecture seule) – schéma réel: type_id, numero_ct, file_url
      const { data: rapportsData, error: rapportsError } =
        await supabaseBrowser
          .from('rapports')
          .select(
            'id, bassin_id, type_id, date_rapport, numero_ct, titre, description, file_url',
          )
          .eq('bassin_id', bassinId)
          .order('date_rapport', { ascending: false })

      if (rapportsError) {
        setErrorMsg(rapportsError.message)
        setLoading(false)
        return
      }

      setRapports((rapportsData || []) as RapportRow[])

      setLoading(false)
    }

    void load()
  }, [bassinId, router])

  // Listes de choix
  const etatsBassin = useMemo(
    () =>
      listes.filter((l) =>
        ['etat_bassin', 'etat_toiture', 'etat'].includes(l.categorie),
      ),
    [listes],
  )

  const dureesBassin = useMemo(
    () =>
      listes.filter((l) =>
        ['duree_vie_bassin', 'duree_vie_toiture', 'duree_vie'].includes(
          l.categorie,
        ),
      ),
    [listes],
  )

  const typesGarantie = useMemo(
    () => listes.filter((l) => l.categorie === 'type_garantie'),
    [listes],
  )

  const statutsGarantie = useMemo(
    () => listes.filter((l) => l.categorie === 'statut_garantie'),
    [listes],
  )

  const typesRapport = useMemo(
    () => listes.filter((l) => l.categorie === 'type_rapport'),
    [listes],
  )

  const surfaceFt2 =
    bassin?.surface_m2 != null
      ? Math.round(bassin.surface_m2 * 10.7639)
      : null

  const etatLabel =
    bassin && bassin.etat_id
      ? etatsBassin.find((l) => l.id === bassin.etat_id)?.label || null
      : null

  const dureeLabel =
    bassin && bassin.duree_vie_id
      ? dureesBassin.find((l) => l.id === bassin.duree_vie_id)?.label ||
        bassin.duree_vie_text ||
        null
      : bassin?.duree_vie_text || null

  // couleur du polygone
  const couleurEtat: string | undefined = (() => {
    if (!bassin) return undefined
    const etatId = bassin.etat_id
    const dureeId = bassin.duree_vie_id

    const preferEtatCategories = ['etat_bassin', 'etat_toiture', 'etat']
    const preferDureeCategories = [
      'duree_vie_bassin',
      'duree_vie_toiture',
      'duree_vie',
    ]

    if (etatId) {
      const match =
        listes.find(
          (l) => l.id === etatId && preferEtatCategories.includes(l.categorie),
        ) || listes.find((l) => l.id === etatId)

      if (match?.couleur) return match.couleur
    }

    if (dureeId) {
      const match =
        listes.find(
          (l) =>
            l.id === dureeId && preferDureeCategories.includes(l.categorie),
        ) || listes.find((l) => l.id === dureeId)

      if (match?.couleur) return match.couleur
    }

    return undefined
  })()

  // centre de la carte
  const mapCenter = (() => {
    if (
      bassin?.polygone_geojson &&
      Array.isArray(bassin.polygone_geojson.coordinates) &&
      bassin.polygone_geojson.coordinates[0] &&
      bassin.polygone_geojson.coordinates[0].length > 0
    ) {
      const ring = bassin.polygone_geojson.coordinates[0]
      let sumLat = 0
      let sumLng = 0

      ring.forEach(([lng, lat]) => {
        sumLat += lat
        sumLng += lng
      })

      const count = ring.length || 1
      return { lat: sumLat / count, lng: sumLng / count }
    }

    if (batiment?.latitude != null && batiment?.longitude != null) {
      return { lat: batiment.latitude, lng: batiment.longitude }
    }

    return { lat: 46.35, lng: -72.55 }
  })()

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-ct-gray">
          Chargement des informations du bassin…
        </p>
      </main>
    )
  }

  if (errorMsg) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </main>
    )
  }

  if (!bassin) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-red-600">
          Bassin introuvable ou non accessible.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* En-tête */}
      <header className="space-y-2">
        {batiment && (
          <p className="text-xs uppercase tracking-wide text-ct-gray mb-1">
            Bâtiment{' '}
            <Link
              href="/client/batiments"
              className="font-medium text-ct-primary hover:underline"
            >
              {batiment.name || 'Sans nom'}
            </Link>
          </p>
        )}
        <h1 className="text-2xl font-semibold text-ct-primary">
          Bassin : {bassin.name || '(Sans nom)'}
        </h1>
        <p className="mt-1 text-sm text-ct-gray">
          Surface :{' '}
          <span className="font-medium text-ct-grayDark">
            {surfaceFt2 != null ? `${surfaceFt2} pi²` : 'n/d'}
          </span>{' '}
          · Année installation :{' '}
          <span className="font-medium text-ct-grayDark">
            {bassin.annee_installation ?? 'n/d'}
          </span>{' '}
          · Dernière réfection :{' '}
          <span className="font-medium text-ct-grayDark">
            {bassin.date_derniere_refection ?? 'n/d'}
          </span>
        </p>
      </header>

      {/* Résumé + carte */}
      <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
        {/* Résumé */}
        <div className="rounded-2xl border border-ct-grayLight bg-white p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
            Résumé du bassin
          </h2>
          <div className="space-y-2 text-sm text-ct-grayDark">
            <div className="flex items-center justify-between gap-4">
              <span className="text-ct-gray">État global</span>
              <StateBadge state={mapEtatToStateBadge(etatLabel)} />
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-ct-gray">Durée de vie résiduelle</span>
              <span className="font-medium">
                {dureeLabel || 'Non définie'}
              </span>
            </div>
          </div>
        </div>

        {/* Carte */}
        <div className="rounded-2xl border border-ct-grayLight bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
                Polygone de toiture
              </h2>
              <p className="text-xs text-ct-gray mt-1">
                Visualisation du bassin sur la vue satellite. Le contour
                représente la zone de toiture évaluée.
              </p>
            </div>
          </div>

          <div className="h-80 w-full rounded-xl border border-ct-grayLight overflow-hidden">
            <BassinMap
              bassinId={bassin.id}
              center={mapCenter}
              initialPolygon={bassin.polygone_geojson}
              couleurPolygon={couleurEtat}
            />
          </div>
        </div>
      </section>

      {/* Documents : Garanties / Rapports */}
      <section className="rounded-2xl border border-ct-grayLight bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
              Documents du bassin
            </h2>
            <p className="text-xs text-ct-gray mt-1">
              Consultez les garanties et les rapports PDF associés à ce bassin.
            </p>
          </div>

          {/* Onglets */}
          <div className="inline-flex rounded-full border border-ct-grayLight bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('garanties')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                activeTab === 'garanties'
                  ? 'bg-white text-ct-primary shadow-sm'
                  : 'text-ct-gray hover:text-ct-primary'
              }`}
            >
              Garanties
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rapports')}
              className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                activeTab === 'rapports'
                  ? 'bg-white text-ct-primary shadow-sm'
                  : 'text-ct-gray hover:text-ct-primary'
              }`}
            >
              Rapports
            </button>
          </div>
        </div>

        {activeTab === 'garanties' ? (
          garanties.length === 0 ? (
            <p className="text-sm text-ct-gray">
              Aucune garantie n&apos;est enregistrée pour ce bassin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-ct-grayLight/60 text-left">
                    <th className="border border-ct-grayLight px-3 py-2">
                      Type
                    </th>
                    <th className="border border-ct-grayLight px-3 py-2">
                      Fournisseur
                    </th>
                    <th className="border border-ct-grayLight px-3 py-2">
                      No garantie
                    </th>
                    <th className="border border-ct-grayLight px-3 py-2">
                      Début
                    </th>
                    <th className="border border-ct-grayLight px-3 py-2">
                      Fin
                    </th>
                    <th className="border border-ct-grayLight px-3 py-2">
                      Statut
                    </th>
                    <th className="border border-ct-grayLight px-3 py-2">
                      Couverture
                    </th>
                    <th className="border border-ct-grayLight px-3 py-2">
                      PDF
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {garanties.map((g) => {
                    const typeLabel =
                      typesGarantie.find((t) => t.id === g.type_garantie_id)
                        ?.label || null
                    const statutLabel =
                      statutsGarantie.find((s) => s.id === g.statut_id)
                        ?.label || null

                    return (
                      <tr
                        key={g.id}
                        className="hover:bg-ct-primaryLight/10 transition-colors"
                      >
                        <td className="border border-ct-grayLight px-3 py-2">
                          {typeLabel || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {g.fournisseur || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {g.numero_garantie || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {g.date_debut || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {g.date_fin || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {statutLabel || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {g.couverture || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {g.fichier_pdf_url ? (
                            <a
                              href={g.fichier_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ct-primary hover:underline"
                            >
                              Ouvrir
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : rapports.length === 0 ? (
          <p className="text-sm text-ct-gray">
            Aucun rapport PDF n&apos;est enregistré pour ce bassin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-ct-grayLight/60 text-left">
                  <th className="border border-ct-grayLight px-3 py-2">
                    Type
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2">
                    Date
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2">
                    No rapport (CT)
                  </th>
                  <th className="border border-ct-grayLight px-3 py-2">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody>
                {rapports.map((r) => {
                  const typeLabel =
                    typesRapport.find((t) => t.id === r.type_id)?.label || null

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-ct-primaryLight/10 transition-colors"
                    >
                      <td className="border border-ct-grayLight px-3 py-2">
                        {typeLabel || '—'}
                      </td>
                      <td className="border border-ct-grayLight px-3 py-2">
                        {r.date_rapport || '—'}
                      </td>
                      <td className="border border-ct-grayLight px-3 py-2">
                        {r.numero_ct || '—'}
                      </td>
                      <td className="border border-ct-grayLight px-3 py-2">
                        {r.file_url ? (
                          <a
                            href={r.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ct-primary hover:underline"
                          >
                            Télécharger
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
