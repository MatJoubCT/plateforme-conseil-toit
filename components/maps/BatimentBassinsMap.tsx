// components/maps/BatimentBassinsMap.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Polygon, useJsApiLoader } from '@react-google-maps/api'

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type BassinPolygon = {
  id: string
  name: string
  polygon: GeoJSONPolygon | null
  color: string
}

type BatimentBassinsMapProps = {
  center: { lat: number; lng: number }
  bassins: BassinPolygon[]
  onHoverBassin?: (id: string | null) => void
  onClickBassin?: (id: string) => void
}

const GOOGLE_MAPS_LIBRARIES = ['drawing', 'geometry'] as const

function geoJsonToLatLngPath(poly: GeoJSONPolygon | null) {
  if (!poly?.coordinates?.[0]?.length) return []
  return poly.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
}

export default function BatimentBassinsMap(props: BatimentBassinsMapProps) {
  const { center, bassins, onHoverBassin, onClickBassin } = props

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'script-loader',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES as unknown as string[],
    version: 'weekly',
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const enforcingRef = useRef(false)

  useEffect(() => {
    if (!map) return

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

    // Appliquer tout de suite
    map.setOptions({ rotateControl: false, tilt: 0, heading: 0 })
    map.setTilt(0)
    map.setHeading(0)

    // IMPORTANT: idle est plus robuste que tilt_changed (évite les loops + couvre plus de cas)
    const l1 = map.addListener('idle', enforceFlat)
    const l2 = map.addListener('maptypeid_changed', enforceFlat)

    return () => {
      l1.remove()
      l2.remove()
    }
  }, [map])

  const polygons = useMemo(
    () =>
      bassins.map((b) => ({
        id: b.id,
        name: b.name,
        path: geoJsonToLatLngPath(b.polygon),
        color: b.color || '#22c55e',
      })),
    [bassins]
  )

  if (loadError) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-ct-grayLight bg-white text-sm text-red-600">
        Erreur de chargement de Google Maps.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-ct-grayLight bg-white text-sm text-ct-gray">
        Chargement de la carte…
      </div>
    )
  }

  return (
    <div className="ct-map-no-tilt h-[420px] w-full overflow-hidden rounded-2xl border border-ct-grayLight bg-white shadow-card">
      {/* Masque uniquement dans ce bloc (pas dans toute l'app) */}
      <style jsx global>{`
        /* Boutons "Incliner / Tilt / 3D / 2D" (varie selon langue et version Maps) */
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
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={18}
        onLoad={(m) => {
          setMap(m)
          m.setOptions({ rotateControl: false, tilt: 0, heading: 0 })
          m.setTilt(0)
          m.setHeading(0)
        }}
        options={{
          mapTypeId: 'satellite',
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          mapTypeControl: true,
          rotateControl: false,
          tilt: 0,
          heading: 0,
        }}
      >
        {polygons.map((poly) => (
          <Polygon
            key={poly.id}
            path={poly.path}
            options={{
              fillColor: poly.color,
              fillOpacity: 0.4,
              strokeColor: poly.color,
              strokeOpacity: 1,
              strokeWeight: 2,
              clickable: true,
            }}
            onMouseOver={() => onHoverBassin?.(poly.id)}
            onMouseOut={() => onHoverBassin?.(null)}
            onClick={() => onClickBassin?.(poly.id)}
          />
        ))}
      </GoogleMap>
    </div>
  )
}
