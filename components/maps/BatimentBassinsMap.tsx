// components/maps/BatimentBassinsMap.tsx
'use client'

import { useMemo } from 'react'
import {
  GoogleMap,
  Polygon,
  useJsApiLoader,
} from '@react-google-maps/api'

type GeoJSONPolygon = {
  type: 'Polygon'
  // GeoJSON classique : [lng, lat]
  coordinates: number[][][]
}

type BassinPolygon = {
  id: string
  name: string
  polygon: GeoJSONPolygon | null
  color: string
}

type BatimentBassinsMapProps = {
  center: {
    lat: number
    lng: number
  }
  bassins: BassinPolygon[]
  onHoverBassin?: (id: string | null) => void
  onClickBassin?: (id: string) => void
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '420px',
  borderRadius: 8,
  overflow: 'hidden',
}

function geoJsonToLatLngPath(poly: GeoJSONPolygon | null) {
  if (!poly || !poly.coordinates || poly.coordinates.length === 0) return []
  // on prend le premier anneau
  const ring = poly.coordinates[0]
  return ring.map(([lng, lat]) => ({ lat, lng }))
}

export default function BatimentBassinsMap(props: BatimentBassinsMapProps) {
  const { center, bassins, onHoverBassin, onClickBassin } = props

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'batiment-bassins-map',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: ['geometry', 'drawing', 'places'],
  })

  const zoom = 18

  const polygons = useMemo(
    () =>
      bassins.map(b => ({
        id: b.id,
        name: b.name,
        path: geoJsonToLatLngPath(b.polygon),
        color: b.color || '#22c55e',
      })),
    [bassins]
  )

  if (loadError) {
    return (
      <p style={{ color: 'red' }}>
        Erreur de chargement de Google Maps.
      </p>
    )
  }

  if (!isLoaded) {
    return <p>Chargement de la carte…</p>
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={{
        mapTypeId: 'satellite',
        tilt: 0,
        heading: 0,
        rotateControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: true,
        zoomControl: true,
      }}
    >
      {polygons.map(poly => (
        <Polygon
          key={poly.id}
          path={poly.path}
          options={{
            fillColor: poly.color,
            fillOpacity: 0.4,
            strokeColor: poly.color,
            strokeWeight: 2,
            clickable: true,
          }}
          onMouseOver={() => onHoverBassin?.(poly.id)}
          onMouseOut={() => onHoverBassin?.(null)}
          onClick={() => onClickBassin?.(poly.id)}
        />
      ))}
    </GoogleMap>
  )
}
