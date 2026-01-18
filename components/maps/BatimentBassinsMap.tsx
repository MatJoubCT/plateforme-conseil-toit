// components/maps/BatimentBassinsMap.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, Polygon, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import type { Libraries } from '@react-google-maps/api'

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
  hoveredBassinId?: string | null  // ✨ AJOUTÉ pour le hover externe
}

const GOOGLE_MAPS_LIBRARIES: Libraries = ['drawing', 'geometry']

function geoJsonToLatLngPath(poly: GeoJSONPolygon | null) {
  if (!poly?.coordinates?.[0]?.length) return []
  return poly.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
}

/**
 * ✨ NOUVEAU : Calcule le centre d'un polygone (centroïde)
 */
function getPolygonCenter(path: { lat: number; lng: number }[]): { lat: number; lng: number } | null {
  if (path.length === 0) return null
  
  const sum = path.reduce(
    (acc, p) => ({
      lat: acc.lat + p.lat,
      lng: acc.lng + p.lng,
    }),
    { lat: 0, lng: 0 }
  )
  
  return {
    lat: sum.lat / path.length,
    lng: sum.lng / path.length,
  }
}

export default function BatimentBassinsMap(props: BatimentBassinsMapProps) {
  const { center, bassins, onHoverBassin, onClickBassin, hoveredBassinId } = props

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'script-loader',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: GOOGLE_MAPS_LIBRARIES,
    version: 'weekly',
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [localHoveredId, setLocalHoveredId] = useState<string | null>(null)
  const enforcingRef = useRef(false)

  // ✨ NOUVEAU : Combine hover local (carte) et externe (liste)
  const effectiveHoveredId = hoveredBassinId ?? localHoveredId

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

    map.setOptions({ rotateControl: false, tilt: 0, heading: 0 })
    map.setTilt(0)
    map.setHeading(0)

    const l1 = map.addListener('idle', enforceFlat)
    const l2 = map.addListener('maptypeid_changed', enforceFlat)

    return () => {
      l1.remove()
      l2.remove()
    }
  }, [map])

  const polygons = useMemo(
    () =>
      bassins.map((b) => {
        const path = geoJsonToLatLngPath(b.polygon)
        const center = getPolygonCenter(path)  // ✨ NOUVEAU : calcul du centre
        
        return {
          id: b.id,
          name: b.name,
          path,
          center,  // ✨ NOUVEAU
          color: b.color || '#22c55e',
        }
      }),
    [bassins]
  )

  // ✨ NOUVEAU : Gestion du hover local
  const handleMouseOver = (id: string) => {
    setLocalHoveredId(id)
    onHoverBassin?.(id)
  }

  const handleMouseOut = () => {
    setLocalHoveredId(null)
    onHoverBassin?.(null)
  }

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

        /* ✨ NOUVEAU : Animation pour les labels */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
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
        {polygons.map((poly) => {
          const isHovered = effectiveHoveredId === poly.id  // ✨ MODIFIÉ

          return (
            <Polygon
              key={poly.id}
              path={poly.path}
              options={{
                fillColor: poly.color,
                fillOpacity: isHovered ? 0.7 : 0.4,  // ✨ MODIFIÉ : plus visible au hover
                strokeColor: poly.color,
                strokeOpacity: isHovered ? 1 : 0.9,  // ✨ MODIFIÉ
                strokeWeight: isHovered ? 4 : 2,     // ✨ MODIFIÉ : bordure plus épaisse
                clickable: true,
              }}
              onMouseOver={() => handleMouseOver(poly.id)}  // ✨ MODIFIÉ
              onMouseOut={handleMouseOut}                    // ✨ MODIFIÉ
              onClick={() => onClickBassin?.(poly.id)}
            />
          )
        })}

        {/* ✨ NOUVEAU : Labels au hover */}
        {polygons.map((poly) => {
          const isHovered = effectiveHoveredId === poly.id
          
          if (!isHovered || !poly.center) return null

          return (
            <OverlayView
              key={`label-${poly.id}`}
              position={poly.center}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div
                className="pointer-events-none"
                style={{
                  transform: 'translate(-50%, -50%)',
                  animation: 'fadeIn 0.2s ease-in-out',
                }}
              >
                <div className="rounded-lg bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-lg border-2 border-ct-primary">
                  <p className="text-sm font-semibold text-ct-grayDark whitespace-nowrap">
                    {poly.name}
                  </p>
                </div>
              </div>
            </OverlayView>
          )
        })}
      </GoogleMap>
    </div>
  )
}
