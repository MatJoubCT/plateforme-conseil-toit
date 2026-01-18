// app/client/carte/page.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, Marker, Polygon, useJsApiLoader } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'

/**
 * IMPORTANT
 * - libraries DOIT être une constante stable (sinon warning + reload du script)
 * - id DOIT matcher l'id déjà utilisé dans le projet (script-loader)
 */
const GOOGLE_MAPS_LIBRARIES: Libraries = ['drawing', 'geometry']

type ClientRow = {
  id: string
  name: string | null
}

type UserProfileRow = {
  id: string
  user_id: string
  role: string | null
  client_id: string | null
  full_name: string | null
  is_active?: boolean | null
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

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  etat_id: string | null
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
  batimentId: string | null
  name: string | null
  path: google.maps.LatLngLiteral[]
  color: string
}

function geoJsonToLatLngPath(poly: GeoJSONPolygon | null) {
  if (!poly?.coordinates?.[0]) return []
  return poly.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
}

function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'
  const v = etat.toLowerCase()
  if (v.includes('urgent')) return 'urgent'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier')) return 'planifier'
  return 'non_evalue'
}

function ClientCarteMap({
  center,
  polygons,
  batiments,
  selectedBatimentId,
  onPolygonClick,
  onMarkerClick,
}: {
  center: google.maps.LatLngLiteral
  polygons: CartePolygon[]
  batiments: BatimentRow[]
  selectedBatimentId: string | null
  onPolygonClick: (poly: CartePolygon) => void
  onMarkerClick: (id: string) => void
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    id: 'script-loader',
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: 'weekly',
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)

  // Verrou anti-boucle (évite Maximum call stack size exceeded)
  const enforcingRef = useRef(false)

  useEffect(() => {
    if (!map) return

    // Appliquer une fois les options anti-rotation / anti-tilt
    map.setOptions({
      rotateControl: false,
      tilt: 0,
      heading: 0,
    })
    map.setTilt(0)
    map.setHeading(0)

    const enforceFlat = () => {
      if (enforcingRef.current) return
      enforcingRef.current = true

      // On décale dans le prochain frame pour éviter les cascades sync
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

    const l1 = map.addListener('tilt_changed', enforceFlat)
    const l2 = map.addListener('heading_changed', enforceFlat)
    const l3 = map.addListener('maptypeid_changed', enforceFlat)

    return () => {
      l1.remove()
      l2.remove()
      l3.remove()
    }
  }, [map])

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

    batiments.forEach((b) => {
      if (b.latitude && b.longitude) {
        bounds.extend({ lat: b.latitude, lng: b.longitude })
        hasPoints = true
      }
    })

    if (hasPoints) {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 })
    } else {
      map.setCenter(center)
      map.setZoom(7)
    }
  }, [isLoaded, polygons, batiments, map, center])

  if (!isLoaded) {
    return (
      <div className="flex h-[480px] items-center justify-center text-ct-gray">
        Chargement de la carte…
      </div>
    )
  }

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-2xl border border-ct-grayLight bg-white shadow-card">
      <GoogleMap
        onLoad={(m) => {
          setMap(m)
          // Double sécurité immédiate
          m.setOptions({ rotateControl: false, tilt: 0, heading: 0 })
          m.setTilt(0)
          m.setHeading(0)
        }}
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={15}
        options={{
          mapTypeId: 'satellite',
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          tilt: 0,
          heading: 0,
        }}
      >
        {polygons.map((poly) => {
          const selected = poly.batimentId === selectedBatimentId
          return (
            <Polygon
              key={poly.id}
              path={poly.path}
              options={{
                fillColor: poly.color,
                fillOpacity: selected ? 0.6 : 0.3,
                strokeColor: poly.color,
                strokeOpacity: selected ? 1 : 0.7,
                strokeWeight: selected ? 4 : 2,
              }}
              onClick={() => onPolygonClick(poly)}
            />
          )
        })}

        {batiments.map((b) => {
          if (!b.latitude || !b.longitude) return null
          return (
            <Marker
              key={b.id}
              position={{ lat: b.latitude, lng: b.longitude }}
              onClick={() => onMarkerClick(b.id)}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}

export default function ClientCartePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [client, setClient] = useState<ClientRow | null>(null)
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])

  const [selectedBatimentId, setSelectedBatimentId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setErrorMsg(null)

      const { data: userData, error: userErr } = await supabaseBrowser.auth.getUser()
      if (userErr || !userData?.user) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabaseBrowser
        .from('user_profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      if (profileError || !profileData) {
        setErrorMsg('Profil utilisateur introuvable.')
        setLoading(false)
        return
      }

      setProfile(profileData)

      if (profileData.client_id) {
        const { data: clientData } = await supabaseBrowser
          .from('clients')
          .select('*')
          .eq('id', profileData.client_id)
          .maybeSingle()
        setClient(clientData)
      }

      const { data: batsData } = await supabaseBrowser
        .from('batiments')
        .select('*')
        .order('name')

      setBatiments(batsData ?? [])
      if (batsData?.length) setSelectedBatimentId(batsData[0].id)

      const ids = (batsData ?? []).map((b) => b.id)
      if (ids.length) {
        const { data: bassinData } = await supabaseBrowser
          .from('bassins')
          .select('*')
          .in('batiment_id', ids)

        setBassins(bassinData ?? [])
      } else {
        setBassins([])
      }

      const { data: listesData } = await supabaseBrowser.from('listes_choix').select('*')
      setListes(listesData ?? [])

      setLoading(false)
    }

    void load()
  }, [router])

  const polygons = useMemo(() => {
    return bassins
      .map((b) => {
        const path = geoJsonToLatLngPath(b.polygone_geojson)
        if (!path.length) return null

        const etat = listes.find((l) => l.id === b.etat_id)
        const color = etat?.couleur || '#f97316'

        return {
          id: b.id,
          batimentId: b.batiment_id,
          name: b.name,
          path,
          color,
        } as CartePolygon
      })
      .filter(Boolean) as CartePolygon[]
  }, [bassins, listes])

  const mapCenter = useMemo(() => {
    if (!batiments.length) return { lat: 46.5, lng: -72.5 }

    const pts: { lat: number; lng: number }[] = []
    batiments.forEach((b) => {
      if (b.latitude && b.longitude) pts.push({ lat: b.latitude, lng: b.longitude })
    })

    if (!pts.length) return { lat: 46.5, lng: -72.5 }

    const lat = pts.reduce((sum, p) => sum + p.lat, 0) / pts.length
    const lng = pts.reduce((sum, p) => sum + p.lng, 0) / pts.length
    return { lat, lng }
  }, [batiments])

  if (loading) {
    return <div className="p-8 text-sm text-ct-gray">Chargement…</div>
  }

  if (errorMsg) {
    return <div className="p-8 text-sm text-red-600">Erreur : {errorMsg}</div>
  }

  const titreClient = client?.name ?? profile?.full_name ?? 'Portail client'

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <header className="space-y-1">
        <p className="text-xs tracking-wide uppercase text-ct-gray">Carte des bâtiments</p>
        <h1 className="text-2xl font-semibold text-ct-primary">{titreClient}</h1>
        <p className="text-sm text-ct-gray">
          Cliquez sur un bâtiment ou un polygone pour consulter les détails.
        </p>
      </header>

      <section className="grid gap-8 grid-cols-[560px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-ct-grayLight bg-white shadow-card p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-ct-grayDark">Bâtiments accessibles</h2>
          <p className="mt-1 text-xs text-ct-gray">
            Cliquez pour afficher sur la carte ou consulter les détails.
          </p>

          <div className="mt-4 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-ct-grayLight bg-white">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-ct-grayLight/50 border-b border-ct-grayLight">
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-ct-grayDark">
                  <th className="px-4 py-3 text-left whitespace-nowrap w-[44%]">Bâtiment</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap w-[28%]">Ville</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap w-[12%]">Bassins</th>
                  <th className="px-4 py-3 whitespace-nowrap w-[16%]">
                    <div className="w-full flex items-center justify-center">État</div>
                  </th>
                </tr>
              </thead>

              <tbody>
                {batiments.map((b) => {
                  const bassinsCount = bassins.filter((ba) => ba.batiment_id === b.id).length

                  const etat = (() => {
                    const list = bassins.filter((ba) => ba.batiment_id === b.id)
                    if (!list.length) return 'non_evalue' as BassinState
                    const order: BassinState[] = ['bon', 'a_surveille', 'planifier', 'urgent']
                    const ranked = list
                      .map((ba) => {
                        const label = listes.find((l) => l.id === ba.etat_id)?.label
                        return mapEtatToStateBadge(label ?? null)
                      })
                      .sort((a, b2) => order.indexOf(b2) - order.indexOf(a))
                    return ranked[0]
                  })()

                  const selected = selectedBatimentId === b.id

                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-ct-grayLight last:border-0 cursor-pointer transition-colors ${
                        selected ? 'bg-ct-primaryLight/10' : 'hover:bg-ct-grayLight/20'
                      }`}
                      onClick={() => {
                        setSelectedBatimentId(b.id)
                        router.push(`/client/batiments/${b.id}`)
                      }}
                    >
                      <td className="px-4 py-2 align-middle">{b.name}</td>
                      <td className="px-4 py-2 align-middle whitespace-nowrap">{b.city}</td>
                      <td className="px-4 py-2 text-center align-middle whitespace-nowrap">
                        {bassinsCount}
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center justify-center whitespace-nowrap">
                          <StateBadge state={etat} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-ct-grayLight bg-white shadow-card p-4">
          <h2 className="text-sm font-semibold text-ct-grayDark">Carte Google Maps</h2>
          <p className="mt-1 text-xs text-ct-gray mb-3">
            Visualisation des bâtiments et bassins de toiture.
          </p>

          <ClientCarteMap
            center={mapCenter}
            polygons={polygons}
            batiments={batiments}
            selectedBatimentId={selectedBatimentId}
            onPolygonClick={(p) => {
              if (p.batimentId) router.push(`/client/batiments/${p.batimentId}`)
            }}
            onMarkerClick={(id) => {
              setSelectedBatimentId(id)
              router.push(`/client/batiments/${id}`)
            }}
          />
        </div>
      </section>
    </main>
  )
}
