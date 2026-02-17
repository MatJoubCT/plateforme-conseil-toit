// app/client/carte/page.tsx
'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, Polygon, useJsApiLoader } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  Building2,
  MapPin,
  Layers,
  Users,
  Map as MapIcon,
  AlertTriangle,
} from 'lucide-react'
import type { GeoJSONPolygon } from '@/types/maps'
import type { ClientRow, ListeChoix } from '@/types/database'

/**
 * IMPORTANT
 * - libraries DOIT être une constante stable (sinon warning + reload du script)
 * - id DOIT matcher l'id déjà utilisé dans le projet (script-loader)
 */
const GOOGLE_MAPS_LIBRARIES: Libraries = ['drawing', 'geometry']

type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  client_name: string | null
  nb_bassins: number
}

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  etat_id: string | null
  polygone_geojson: GeoJSONPolygon | null
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

function ClientCarteMap({
  polygons,
  batiments,
  hoveredBatimentId,
  onHoverBatiment,
}: {
  polygons: CartePolygon[]
  batiments: BatimentRow[]
  hoveredBatimentId: string | null
  onHoverBatiment: (id: string | null) => void
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    id: 'script-loader',
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: 'weekly',
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const initialCenter = useMemo(() => ({ lat: 46.5, lng: -72.5 }), [])
  const hasInitializedBoundsRef = useRef(false)

  useEffect(() => {
    if (!isLoaded || !map || hasInitializedBoundsRef.current) return

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
      map.setCenter({ lat: 46.5, lng: -72.5 })
      map.setZoom(7)
    }

    hasInitializedBoundsRef.current = true
  }, [isLoaded, polygons, batiments, map])

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-xl bg-gradient-to-br from-ct-primary to-[#2d6ba8]" />
          <p className="text-sm font-medium">Chargement de la carte…</p>
        </div>
      </div>
    )
  }

  return (
    <GoogleMap
      onLoad={(m) => {
        setMap(m)
        m.setOptions({ rotateControl: false, tilt: 0, heading: 0 })
        m.setTilt(0)
        m.setHeading(0)
      }}
      mapContainerStyle={{ width: '100%', height: '100%' }}
      center={initialCenter}
      zoom={15}
      options={{
        mapTypeId: 'satellite',
        streetViewControl: false,
        fullscreenControl: true,
        rotateControl: false,
        tilt: 0,
        heading: 0,
        gestureHandling: 'greedy',
        scrollwheel: true,
      }}
    >
      {polygons.map((poly) => {
        const isHovered = poly.batimentId === hoveredBatimentId
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
            }}
            onMouseOver={() =>
              poly.batimentId && onHoverBatiment(poly.batimentId)
            }
            onMouseOut={() => onHoverBatiment(null)}
            onClick={() => {
              if (poly.batimentId) {
                window.location.href = `/client/batiments/${poly.batimentId}`
              }
            }}
          />
        )
      })}
    </GoogleMap>
  )
}

export default function ClientCartePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [listes, setListes] = useState<ListeChoix[]>([])

  const [hoveredBatimentId, setHoveredBatimentId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
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
      const [clientsRes, batimentsRes, bassinsRes, listesRes] =
        await Promise.all([
          supabaseBrowser
            .from('clients')
            .select('id, name')
            .in('id', clientIdsArray),
          supabaseBrowser
            .from('batiments')
            .select(
              `
              id,
              name,
              address,
              city,
              postal_code,
              latitude,
              longitude,
              client_id,
              clients (name)
            `
            )
            .in('client_id', clientIdsArray)
            .order('name', { ascending: true }),
          supabaseBrowser.from('bassins').select('*'),
          supabaseBrowser.from('listes_choix').select('*'),
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

      const rawBatiments: BatimentRow[] = (batimentsRes.data || []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (row: any) => ({
          id: row.id as string,
          name: (row.name as string | null) ?? null,
          address: (row.address as string | null) ?? null,
          city: (row.city as string | null) ?? null,
          postal_code: (row.postal_code as string | null) ?? null,
          latitude: (row.latitude as number | null) ?? null,
          longitude: (row.longitude as number | null) ?? null,
          client_id: (row.client_id as string | null) ?? null,
          client_name: (row.clients?.name as string | null) ?? null,
          nb_bassins: 0,
        })
      )

      const allBassins = (bassinsRes.data || []) as BassinRow[]

      // Filtrer les bassins pour ne garder que ceux des bâtiments autorisés
      const batimentIds = new Set(rawBatiments.map((b) => b.id))
      const filteredBassins = allBassins.filter((b) =>
        b.batiment_id ? batimentIds.has(b.batiment_id) : false
      )

      // Compter les bassins par bâtiment
      const countByBatiment = new Map<string, number>()
      filteredBassins.forEach((b) => {
        const batId = b.batiment_id
        if (!batId) return
        const current = countByBatiment.get(batId) ?? 0
        countByBatiment.set(batId, current + 1)
      })

      const merged = rawBatiments.map((b) => ({
        ...b,
        nb_bassins: countByBatiment.get(b.id) ?? 0,
      }))

      const sortedBatiments = merged.sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', 'fr', { numeric: true })
      )

      setClients((clientsRes.data || []) as ClientRow[])
      setBatiments(sortedBatiments)
      setBassins(filteredBassins)
      setListes((listesRes.data || []) as ListeChoix[])
      setLoading(false)
    }

    void load()
  }, [])

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

  const totalBatiments = batiments.length
  const totalBassins = bassins.length
  const totalClients = clients.length
  const totalVilles = new Set(batiments.map((b) => b.city).filter(Boolean)).size

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ct-primary to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Chargement de la carte…
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
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10">
          {/* Titre */}
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                  <MapIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Carte des bâtiments
                  </h1>
                  <p className="mt-0.5 text-sm text-white/70">
                    Visualisation géographique de vos bâtiments et bassins
                  </p>
                </div>
              </div>

              {/* Stats rapides */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Building2 className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalBatiments} bâtiment{totalBatiments > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Layers className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalBassins} bassin{totalBassins > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Users className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalClients} client{totalClients > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalVilles} ville{totalVilles > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== GRILLE LISTE + CARTE ========== */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)]">
        {/* ========== LISTE DES BÂTIMENTS ========== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
                  <Building2 className="h-5 w-5 text-ct-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Liste des bâtiments
                  </h2>
                  <p className="text-xs text-slate-500">
                    {batiments.length} bâtiment{batiments.length > 1 ? 's' : ''} trouvé{batiments.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {batiments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  Aucun bâtiment trouvé
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Contactez votre administrateur
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="py-4 pl-6 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                        Bâtiment
                      </th>
                      <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden md:table-cell">
                        Client
                      </th>
                      <th className="py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600 hidden lg:table-cell">
                        Localisation
                      </th>
                      <th className="py-4 pr-6 text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                        Bassins
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {batiments.map((b) => {
                      const isHovered = hoveredBatimentId === b.id

                      return (
                        <tr
                          key={b.id}
                          className={`group cursor-pointer transition-all ${
                            isHovered
                              ? 'bg-ct-primary/10 shadow-sm'
                              : 'hover:bg-slate-50'
                          }`}
                          onMouseEnter={() => setHoveredBatimentId(b.id)}
                          onMouseLeave={() => setHoveredBatimentId(null)}
                          onClick={() => {
                            router.push(`/client/batiments/${b.id}`)
                          }}
                        >
                          {/* Nom du bâtiment */}
                          <td className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm transition-all ${
                                  isHovered
                                    ? 'bg-gradient-to-br from-ct-primary to-[#163555] scale-110'
                                    : 'bg-gradient-to-br from-ct-primary to-[#2d6ba8]'
                                }`}
                              >
                                {(b.name ?? 'B')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span
                                  className={`block truncate font-semibold transition-colors ${
                                    isHovered
                                      ? 'text-ct-primary'
                                      : 'text-slate-800 group-hover:text-ct-primary'
                                  }`}
                                >
                                  {b.name || '(Sans nom)'}
                                </span>
                                <p className="truncate text-xs text-slate-500 md:hidden">
                                  {b.client_name || '—'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Client (caché sur mobile) */}
                          <td className="py-4 hidden md:table-cell">
                            <p className="text-sm text-slate-700">
                              {b.client_name || '—'}
                            </p>
                          </td>

                          {/* Localisation (cachée sur mobile/tablet) */}
                          <td className="py-4 hidden lg:table-cell">
                            <div className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                              <div className="text-sm">
                                {b.city || b.address ? (
                                  <>
                                    <p className="font-medium text-slate-700">
                                      {b.city || '—'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {b.address || '—'}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-slate-500">—</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Nombre de bassins (centré) */}
                          <td className="py-4 pr-6">
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                                  b.nb_bassins > 0
                                    ? isHovered
                                      ? 'bg-ct-primary text-white scale-110'
                                      : 'bg-ct-primary/10 text-ct-primary'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {b.nb_bassins}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ========== CARTE ========== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
                <MapIcon className="h-5 w-5 text-ct-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Carte Google Maps
                </h2>
                <p className="text-xs text-slate-500">
                  Visualisation des bâtiments et bassins de toiture
                </p>
              </div>
            </div>
          </div>

          <div className="h-[600px]">
            <ClientCarteMap
              polygons={polygons}
              batiments={batiments}
              hoveredBatimentId={hoveredBatimentId}
              onHoverBatiment={setHoveredBatimentId}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
