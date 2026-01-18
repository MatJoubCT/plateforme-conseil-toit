'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleMap, Polygon, useJsApiLoader } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
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

const GOOGLE_MAPS_LIBRARIES: Libraries = ['drawing', 'geometry']

type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude?: number | null
  longitude?: number | null
}

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  membrane_type_id: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
  polygone_geojson: GeoJSONPolygon | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string | null
  couleur: string | null
}

type CartePolygon = {
  id: string
  path: google.maps.LatLngLiteral[]
  color: string
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

function geoJsonToLatLngPath(poly: GeoJSONPolygon | null) {
  if (!poly?.coordinates?.[0]) return []
  return poly.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
}

/* ---------------- Carte Google du bâtiment (client) ---------------- */

function ClientBatimentMap({
  batiment,
  polygons,
  hoveredBassinId,
  onHoverBassin,
  onOpenBassin,
}: {
  batiment: BatimentRow | null
  polygons: CartePolygon[]
  hoveredBassinId: string | null
  onHoverBassin: (id: string | null) => void
  onOpenBassin: (id: string) => void
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    id: 'script-loader',
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: 'weekly',
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const enforcingRef = useRef(false)

  const defaultCenter: google.maps.LatLngLiteral = useMemo(() => {
    if (batiment?.latitude != null && batiment.longitude != null) {
      return { lat: batiment.latitude, lng: batiment.longitude }
    }
    return { lat: 46.5, lng: -72.5 }
  }, [batiment])

  useEffect(() => {
    if (!isLoaded || !map) return

    const enforceFlat = () => {
      if (enforcingRef.current) return
      enforcingRef.current = true

      requestAnimationFrame(() => {
        try {
          const t = map.getTilt ? map.getTilt() : 0
          const h = map.getHeading ? map.getHeading() : 0
          if (t !== 0) map.setTilt(0)
          if (h !== 0) map.setHeading(0)
        } finally {
          enforcingRef.current = false
        }
      })
    }

    map.setOptions({ rotateControl: false, tilt: 0, heading: 0 })
    map.setTilt(0)
    map.setHeading(0)

    const l1 = map.addListener('idle', enforceFlat)
    const l2 = map.addListener('maptypeid_changed', enforceFlat)

    return () => {
      l1.remove()
      l2.remove()
    }
  }, [isLoaded, map])

  useEffect(() => {
    if (!isLoaded || !map) return

    const bounds = new google.maps.LatLngBounds()
    let hasPoints = false

    polygons.forEach((p) => {
      p.path.forEach((pt) => {
        bounds.extend(pt)
        hasPoints = true
      })
    })

    if (hasPoints) {
      map.fitBounds(bounds, 60)
    } else {
      map.setCenter(defaultCenter)
      map.setZoom(16)
    }
  }, [isLoaded, map, polygons, defaultCenter])

  if (!isLoaded) {
    return (
      <div className="flex h-[480px] items-center justify-center text-sm text-ct-gray">
        Chargement de la carte…
      </div>
    )
  }

  return (
    <div className="ct-map-no-tilt relative h-[480px] w-full overflow-hidden rounded-xl border border-ct-grayLight bg-ct-grayLight">
      <style jsx global>{`
        .ct-map-no-tilt button[aria-label*='Tilt'],
        .ct-map-no-tilt button[aria-label*='tilt'],
        .ct-map-no-tilt button[aria-label*='Incliner'],
        .ct-map-no-tilt button[aria-label*='incliner'],
        .ct-map-no-tilt button[aria-label*='3D'],
        .ct-map-no-tilt button[aria-label*='2D'],
        .ct-map-no-tilt button[title*='Tilt'],
        .ct-map-no-tilt button[title*='tilt'],
        .ct-map-no-tilt button[title*='Incliner'],
        .ct-map-no-tilt button[title*='incliner'],
        .ct-map-no-tilt button[title*='3D'],
        .ct-map-no-tilt button[title*='2D'] {
          display: none !important;
        }
      `}</style>

      <GoogleMap
        onLoad={(m) => {
          setMap(m)
          m.setOptions({ rotateControl: false, tilt: 0, heading: 0 })
          m.setTilt(0)
          m.setHeading(0)
        }}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={defaultCenter}
        zoom={18}
        options={{
          mapTypeId: 'satellite',
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          tilt: 0,
          heading: 0,
          clickableIcons: false,
          gestureHandling: 'greedy',
          scrollwheel: true,
        }}
      >
        {polygons.map((poly) => {
          const isHovered = poly.id === hoveredBassinId
          return (
            <Polygon
              key={poly.id}
              path={poly.path}
              options={{
                fillColor: poly.color,
                fillOpacity: isHovered ? 0.75 : 0.4,
                strokeColor: poly.color,
                strokeOpacity: isHovered ? 1 : 0.9,
                strokeWeight: isHovered ? 4 : 2,
                zIndex: isHovered ? 2 : 1,
                clickable: true,
              }}
              onMouseOver={() => onHoverBassin(poly.id)}
              onMouseOut={() => onHoverBassin(null)}
              onClick={() => onOpenBassin(poly.id)}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}

/* ---------------- Page principale ---------------- */

export default function ClientBatimentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const batimentId = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [hoveredBassinId, setHoveredBassinId] = useState<string | null>(null)

  const openBassin = (id: string) => {
    router.push(`/client/bassins/${id}`)
  }

  useEffect(() => {
    if (!batimentId) return

    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select(
          'id, client_id, name, address, city, postal_code, latitude, longitude'
        )
        .eq('id', batimentId)
        .maybeSingle()

      if (batError) {
        setErrorMsg(batError.message)
        setLoading(false)
        return
      }
      if (!batData) {
        setErrorMsg('Bâtiment introuvable ou non accessible.')
        setLoading(false)
        return
      }
      setBatiment(batData as BatimentRow)

      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, batiment_id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, polygone_geojson'
        )
        .eq('batiment_id', batimentId)
        .order('name', { ascending: true })

      if (bassinsError) {
        setErrorMsg(bassinsError.message)
        setLoading(false)
        return
      }
      setBassins((bassinsData || []) as BassinRow[])

      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }
      setListes((listesData || []) as ListeChoix[])

      setLoading(false)
    }

    void load()
  }, [batimentId])

  const membranes = useMemo(
    () => listes.filter((l) => l.categorie === 'membrane'),
    [listes]
  )

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
        ['duree_vie', 'duree_vie_bassin', 'duree_vie_toiture'].includes(
          l.categorie
        )
      ),
    [listes]
  )

  const polygons = useMemo<CartePolygon[]>(() => {
    return bassins
      .map((b) => {
        const path = geoJsonToLatLngPath(b.polygone_geojson)
        if (!path.length) return null

        const etat = etatsBassin.find((l) => l.id === b.etat_id)
        const color = etat?.couleur || '#22c55e'

        return { id: b.id, path, color } as CartePolygon
      })
      .filter(Boolean) as CartePolygon[]
  }, [bassins, etatsBassin])

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Bâtiment</h1>
        <p className="text-sm text-ct-gray">Chargement…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Bâtiment</h1>
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
        <Link href="/client/carte" className="btn-secondary inline-flex">
          ← Retour à la carte des bâtiments
        </Link>
      </section>
    )
  }

  if (!batiment) return null

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-ct-gray mb-1">
            Bâtiment
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ct-primary">
            {batiment.name || 'Bâtiment sans nom'}
          </h1>
          <p className="mt-1 text-sm text-ct-gray">
            {batiment.address && (
              <>
                {batiment.address}
                {', '}
              </>
            )}
            {batiment.city && (
              <>
                {batiment.city}
                {', '}
              </>
            )}
            {batiment.postal_code}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/client/carte" className="btn-secondary">
            ← Retour à la carte des bâtiments
          </Link>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)]">
        {/* Bassins */}
        <Card>
          <CardHeader>
            <CardTitle>Bassins de toiture</CardTitle>
            <CardDescription>
              Liste des bassins associés à ce bâtiment avec leur état, membrane
              et durée de vie.
            </CardDescription>
          </CardHeader>

          {/* ✅ Hauteur fixée à celle de la carte, contenu en flex, pas d’espace blanc */}
          <CardContent className="flex h-[480px] flex-col">
            {bassins.length === 0 ? (
              <p className="text-sm text-ct-gray">
                Aucun bassin n’est encore associé à ce bâtiment.
              </p>
            ) : (
              <div className="flex-1 overflow-hidden">
                {/* ✅ Le DataTable remplit la hauteur restante (pas de maxHeight arbitraire) */}
                <DataTable>
                  <table className="w-full table-fixed">
                    <DataTableHeader>
                      <tr>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                          Nom du bassin
                        </th>
                        <th className="w-[130px] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                          État
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                          Durée de vie résiduelle
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                          Type de membrane
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                          Surface (pi²)
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                          Dernière réfection
                        </th>
                      </tr>
                    </DataTableHeader>

                    <DataTableBody>
                      {bassins.map((b) => {
                        const membraneLabel =
                          membranes.find((m) => m.id === b.membrane_type_id)
                            ?.label ?? 'N/D'

                        const etatLabel =
                          etatsBassin.find((e) => e.id === b.etat_id)?.label ??
                          'Non évalué'

                        const dureeLabel =
                          b.duree_vie_text ??
                          dureesBassin.find((d) => d.id === b.duree_vie_id)
                            ?.label ??
                          'Non définie'

                        const surfaceFt2 =
                          b.surface_m2 != null
                            ? Math.round(b.surface_m2 * 10.7639)
                            : null

                        const stateBadge = mapEtatToStateBadge(etatLabel)
                        const isHovered = hoveredBassinId === b.id

                        return (
                          <tr
                            key={b.id}
                            onMouseEnter={() => setHoveredBassinId(b.id)}
                            onMouseLeave={() => setHoveredBassinId(null)}
                            className={`cursor-pointer hover:bg-ct-primaryLight/10 ${
                              isHovered ? 'bg-ct-primaryLight/10' : ''
                            }`}
                            onClick={() => openBassin(b.id)}
                          >
                            <td className="px-3 py-2 align-middle">
                              <div className="flex flex-col">
                                <span className="font-medium text-ct-grayDark">
                                  {b.name || 'Bassin sans nom'}
                                </span>
                                {b.reference_interne && (
                                  <span className="text-xs text-ct-gray">
                                    Réf. interne : {b.reference_interne}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-2 align-middle whitespace-nowrap">
                              <StateBadge state={stateBadge} />
                            </td>

                            <td className="px-3 py-2 align-middle">{dureeLabel}</td>

                            <td className="px-3 py-2 align-middle">{membraneLabel}</td>

                            <td className="px-3 py-2 align-middle">
                              {surfaceFt2 != null ? `${surfaceFt2} pi²` : 'n/d'}
                            </td>

                            <td className="px-3 py-2 align-middle">
                              {b.date_derniere_refection || '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </DataTableBody>
                  </table>
                </DataTable>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Carte */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Localisation des bassins</CardTitle>
              <CardDescription>
                Visualisation des polygones des bassins sur l’image satellite.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ClientBatimentMap
              batiment={batiment}
              polygons={polygons}
              hoveredBassinId={hoveredBassinId}
              onHoverBassin={setHoveredBassinId}
              onOpenBassin={openBassin}
            />
          </CardContent>
        </Card>
      </section>
    </section>
  )
}
