'use client'

import { useCallback, useMemo, useState } from 'react'
import { GoogleMap, Polygon, useJsApiLoader, DrawingManager } from '@react-google-maps/api'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

interface BassinMapProps {
  bassinId: string
  // centre de la carte (tu pourras plus tard brancher ça sur la position du bâtiment)
  center: {
    lat: number
    lng: number
  }
  // polygone sauvegardé en BD (optionnel)
  initialPolygon?: GeoJSONPolygon | null
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
}

const BassinMap: React.FC<BassinMapProps> = ({ bassinId, center, initialPolygon }) => {
  const supabase = createClientComponentClient()

  const [polygonPath, setPolygonPath] = useState<google.maps.LatLngLiteral[] | null>(() => {
    if (!initialPolygon) return null
    const coords = initialPolygon.coordinates?.[0] ?? []
    return coords.map(([lng, lat]) => ({ lat, lng }))
  })

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ['drawing'],
  })

  const mapCenter = useMemo(() => center, [center])

  const handlePolygonComplete = useCallback(
    async (poly: google.maps.Polygon) => {
      const path = poly.getPath()
      const points: google.maps.LatLngLiteral[] = []

      for (let i = 0; i < path.getLength(); i++) {
        const p = path.getAt(i)
        points.push({ lat: p.lat(), lng: p.lng() })
      }

      // on ferme le polygone si pas déjà fermé
      if (points.length > 0) {
        const first = points[0]
        const last = points[points.length - 1]
        if (first.lat !== last.lat || first.lng !== last.lng) {
          points.push(first)
        }
      }

      setPolygonPath(points)

      const geojson: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          points.map((p) => [p.lng, p.lat]), // GeoJSON = [lng, lat]
        ],
      }

      const { error } = await supabase
        .from('bassins')
        .update({ polygone_geojson: geojson })
        .eq('id', bassinId)

      if (error) {
        console.error('Erreur en sauvegardant le polygone :', error)
        alert("Erreur lors de l'enregistrement du polygone.")
      } else {
        // Optionnel: message visuel
        console.log('Polygone sauvegardé')
      }

      // on enlève le polygone dessiné par le DrawingManager (on garde seulement notre state)
      poly.setMap(null)
    },
    [bassinId, supabase]
  )

  if (loadError) return <div>Erreur de chargement de Google Maps.</div>
  if (!isLoaded) return <div>Chargement de la carte…</div>

    const drawingOptions = useMemo<google.maps.drawing.DrawingManagerOptions>(() => {
    return {
      drawingControl: true,
      drawingControlOptions: {
        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
      },
    }
  }, [])

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        Dessine le bassin directement sur la carte. Le polygone sera sauvegardé automatiquement.
      </div>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={18}
        options={{
          mapTypeId: 'satellite',
        }}
      >
        {/* Polygone existant (si déjà sauvegardé) */}
        {polygonPath && (
          <Polygon
            path={polygonPath}
            options={{
              fillOpacity: 0.35,
              strokeWeight: 2,
            }}
          />
        )}

        {/* Outil de dessin pour créer un nouveau polygone */}
        <DrawingManager
          options={drawingOptions}
          onPolygonComplete={handlePolygonComplete}
        />
      </GoogleMap>
    </div>
  )
}

export default BassinMap
