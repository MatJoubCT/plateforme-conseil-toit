'use client'

import {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from 'react'
import {
  GoogleMap,
  Polygon,
  useJsApiLoader,
  DrawingManager,
} from '@react-google-maps/api'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type LatLngLiteral = {
  lat: number
  lng: number
}

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

interface BassinMapProps {
  bassinId: string
  center: LatLngLiteral
  initialPolygon?: GeoJSONPolygon | null
  couleurPolygon?: string
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
}

const libraries: ('drawing' | 'geometry')[] = ['drawing', 'geometry']

export default function BassinMap({
  bassinId,
  center,
  initialPolygon,
  couleurPolygon,
}: BassinMapProps) {
  const [polygonPath, setPolygonPath] = useState<LatLngLiteral[] | null>(() => {
    if (!initialPolygon) return null
    const coords = initialPolygon.coordinates?.[0] ?? []
    return coords.map(([lng, lat]) => ({ lat, lng }))
  })

  const [areaM2, setAreaM2] = useState<number | null>(null)
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const [polygonInstance, setPolygonInstance] =
    useState<google.maps.Polygon | null>(null)
  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const listenersRef = useRef<google.maps.MapsEventListener[]>([])

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  })

  const mapCenter = useMemo(() => center, [center])
  const finalColor = couleurPolygon || '#00aaff'

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    map.setTilt(0)
    map.setHeading(0)
    setMapInstance(map)
  }, [])

  const computeArea = useCallback(
    (points: LatLngLiteral[]): number | null => {
      if (!isLoaded) return null
      if (typeof google === 'undefined') return null
      if (!google.maps?.geometry?.spherical) return null
      if (!points || points.length < 3) return null

      const path = points.map(
        (p) => new google.maps.LatLng(p.lat, p.lng)
      )
      const area = google.maps.geometry.spherical.computeArea(path)
      return area
    },
    [isLoaded]
  )

  const savePolygon = useCallback(
    async (points: LatLngLiteral[]) => {
      if (!points || points.length < 3) {
        console.warn('savePolygon appelé avec moins de 3 points')
        return
      }

      const closedPoints = [...points]
      const first = closedPoints[0]
      const last = closedPoints[closedPoints.length - 1]
      if (first.lat !== last.lat || first.lng !== last.lng) {
        closedPoints.push(first)
      }

      const geojson: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          closedPoints.map((p) => [p.lng, p.lat]),
        ],
      }

      const area = computeArea(closedPoints)
      const updateData: any = { polygone_geojson: geojson }

      if (area !== null) {
        updateData.surface_m2 = Math.round(area)
      }

      const { data, error } = await supabaseBrowser
        .from('bassins')
        .update(updateData)
        .eq('id', bassinId)
        .select('id, polygone_geojson, surface_m2')
        .single()

      if (error) {
        console.error('Erreur Supabase en sauvegardant le polygone :', error)
        alert("Erreur lors de l'enregistrement du polygone (voir console).")
      } else {
        console.log('Polygone sauvegardé avec succès :', data)
        if (area !== null) setAreaM2(area)
      }
    },
    [bassinId, computeArea]
  )

  const handlePolygonComplete = useCallback(
    async (poly: google.maps.Polygon | any) => {
      if (isLocked) {
        poly.setMap(null)
        if (drawingManager) drawingManager.setDrawingMode(null)
        return
      }

      const path = poly.getPath()
      const points: LatLngLiteral[] = []

      for (let i = 0; i < path.getLength(); i++) {
        const p = path.getAt(i)
        points.push({ lat: p.lat(), lng: p.lng() })
      }

      setPolygonPath(points)
      await savePolygon(points)

      poly.setMap(null)
      if (drawingManager) drawingManager.setDrawingMode(null)
    },
    [isLocked, drawingManager, savePolygon]
  )

  useEffect(() => {
    if (!polygonPath) {
      setAreaM2(null)
      return
    }

    const area = computeArea(polygonPath)
    if (area !== null) setAreaM2(area)
  }, [polygonPath, computeArea])

  useEffect(() => {
    if (!polygonInstance) return

    polygonInstance.setEditable(editMode)
    polygonInstance.setDraggable(editMode)

    listenersRef.current.forEach((l) => l.remove())
    listenersRef.current = []

    if (editMode) {
      const path = polygonInstance.getPath()

      const handler = () => {
        const newPoints: LatLngLiteral[] = []
        for (let i = 0; i < path.getLength(); i++) {
          const p = path.getAt(i)
          newPoints.push({ lat: p.lat(), lng: p.lng() })
        }
        setPolygonPath(newPoints)
      }

      listenersRef.current.push(
        google.maps.event.addListener(path, 'set_at', handler),
        google.maps.event.addListener(path, 'insert_at', handler),
        google.maps.event.addListener(path, 'remove_at', handler)
      )
    }

    return () => {
      listenersRef.current.forEach((l) => l.remove())
      listenersRef.current = []
    }
  }, [editMode, polygonInstance])

  const handleResetPolygon = useCallback(async () => {
    if (!polygonPath) return

    const ok = window.confirm(
      'Voulez-vous vraiment supprimer le polygone de ce bassin ?'
    )
    if (!ok) return

    setPolygonPath(null)
    setAreaM2(null)
    setEditMode(false)
    if (polygonInstance) {
      polygonInstance.setMap(null)
    }

    const { error } = await supabaseBrowser
      .from('bassins')
      .update({ polygone_geojson: null, surface_m2: null })
      .eq('id', bassinId)

    if (error) {
      console.error('Erreur Supabase lors de la réinitialisation :', error)
      alert(
        "Erreur lors de la réinitialisation du polygone (voir console)."
      )
    } else {
      console.log('Polygone réinitialisé avec succès')
    }
  }, [polygonPath, polygonInstance, bassinId])

  const handleToggleEdit = useCallback(async () => {
    if (!polygonPath) {
      alert('Aucun polygone à modifier.')
      return
    }
    if (isLocked) {
      alert('Le polygone est verrouillé. Déverrouille-le avant de modifier.')
      return
    }

    if (editMode) {
      // on quitte le mode édition → on lit directement le path actuel du polygon
      if (polygonInstance) {
        const path = polygonInstance.getPath()
        const pts: LatLngLiteral[] = []
        for (let i = 0; i < path.getLength(); i++) {
          const p = path.getAt(i)
          pts.push({ lat: p.lat(), lng: p.lng() })
        }
        setPolygonPath(pts)
        await savePolygon(pts)
      } else {
        await savePolygon(polygonPath)
      }
    }

    setEditMode(prev => !prev)
  }, [polygonPath, editMode, isLocked, polygonInstance, savePolygon])

  const handleToggleLock = useCallback(() => {
    const newLocked = !isLocked

    if (newLocked) {
      if (editMode) {
        setEditMode(false)
      }
      if (drawingManager) {
        drawingManager.setDrawingMode(null)
      }
    }

    setIsLocked(newLocked)
  }, [isLocked, editMode, drawingManager])

  const handleStartDrawing = useCallback(() => {
    if (isLocked) return
    if (!drawingManager) return
    drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON)
  }, [isLocked, drawingManager])

  if (loadError) return <div>Erreur de chargement de Google Maps.</div>
  if (!isLoaded) return <div>Chargement de la carte…</div>

  const areaFt2 = areaM2 !== null ? areaM2 * 10.7639 : null

  return (
    <div className="space-y-2">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 4,
          fontSize: 13,
        }}
      >
        <span style={{ color: '#555' }}>
          Superficie du polygone :{' '}
          {areaFt2 !== null ? `${areaFt2.toFixed(0)} pi²` : '—'}
        </span>

        {!polygonPath && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleStartDrawing}
            disabled={isLocked || !drawingManager}
          >
            Dessiner un polygone
          </button>
        )}

        {polygonPath && (
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleToggleEdit}
              disabled={isLocked}
            >
              {editMode ? 'Terminer la modification' : 'Modifier le polygone'}
            </button>

            <button
              type="button"
              className="btn-secondary btn-danger"
              onClick={handleResetPolygon}
            >
              Réinitialiser le polygone
            </button>
          </>
        )}

        <button
          type="button"
          className="btn-secondary"
          onClick={handleToggleLock}
        >
          {isLocked ? 'Déverrouiller' : 'Verrouiller'}
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Dessine le bassin directement sur la carte. Le polygone sera sauvegardé
        automatiquement.
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={18}
        onLoad={handleMapLoad}
        options={{
          mapTypeId: 'satellite',
          tilt: 0,
          heading: 0,
          rotateControl: false,
        }}
      >
        {polygonPath && (
          <Polygon
            path={polygonPath}
            onLoad={setPolygonInstance}
            options={{
              fillColor: finalColor,
              strokeColor: finalColor,
              fillOpacity: 0.35,
              strokeWeight: 2,
            }}
          />
        )}

        <DrawingManager
          onLoad={setDrawingManager}
          options={
            {
              drawingControl: false, // plus de toolbar Google, on contrôle via le bouton
            } as any
          }
          onPolygonComplete={handlePolygonComplete}
        />
      </GoogleMap>
    </div>
  )
}
