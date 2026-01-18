'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GoogleMap,
  Polygon,
  useJsApiLoader,
  DrawingManager,
  MarkerF,
} from '@react-google-maps/api'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type LatLngLiteral = google.maps.LatLngLiteral

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

export type InterventionMarker = {
  id: string
  position: LatLngLiteral
  title?: string | null
}

export type PointPickerProps = {
  enabled: boolean
  value: LatLngLiteral | null
  onChange: (pos: LatLngLiteral | null) => void
  onPicked?: () => void
}

type BassinMapProps = {
  bassinId: string
  center: LatLngLiteral
  initialPolygon: GeoJSONPolygon | null
  couleurPolygon?: string

  readonly?: boolean

  interventionMarkers?: InterventionMarker[]
  selectedInterventionId?: string | null
  onInterventionMarkerClick?: (id: string) => void

  pointPicker?: PointPickerProps
}

const libraries: ('drawing' | 'geometry')[] = ['drawing', 'geometry']

function samePoint(a: LatLngLiteral, b: LatLngLiteral, eps = 1e-10) {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps
}

export default function BassinMap({
  bassinId,
  center,
  initialPolygon,
  couleurPolygon,
  readonly = false,
  interventionMarkers = [],
  selectedInterventionId = null,
  onInterventionMarkerClick,
  pointPicker,
}: BassinMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [path, setPath] = useState<LatLngLiteral[]>([])
  const pathRef = useRef<LatLngLiteral[]>([]) // SOURCE DE VÉRITÉ pour la sauvegarde

  const [areaM2, setAreaM2] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const [polygonInstance, setPolygonInstance] = useState<google.maps.Polygon | null>(null)

  const hasFittedRef = useRef(false)
  const lastBassinIdRef = useRef<string | null>(null)

  // Sync ref <-> state
  const setPathSafe = useCallback((pts: LatLngLiteral[]) => {
    pathRef.current = pts
    setPath(pts)
  }, [])

  // Charger le GeoJSON, MAIS enlever le point de fermeture si présent (dernier == premier)
  useEffect(() => {
    if (
      initialPolygon &&
      Array.isArray(initialPolygon.coordinates) &&
      initialPolygon.coordinates[0] &&
      initialPolygon.coordinates[0].length > 0
    ) {
      const ring = initialPolygon.coordinates[0]
      let pts: LatLngLiteral[] = ring.map(([lng, lat]) => ({ lat, lng }))

      if (pts.length >= 2 && samePoint(pts[0], pts[pts.length - 1])) {
        pts = pts.slice(0, -1)
      }

      setPathSafe(pts)
    } else {
      setPathSafe([])
      setAreaM2(null)
    }
  }, [initialPolygon, setPathSafe])

  const computeArea = useCallback(
    (points: LatLngLiteral[]): number | null => {
      if (!isLoaded) return null
      if (typeof google === 'undefined') return null
      if (!google.maps?.geometry?.spherical) return null
      if (!points || points.length < 3) return null

      const gPath = points.map((p) => new google.maps.LatLng(p.lat, p.lng))
      return google.maps.geometry.spherical.computeArea(gPath)
    },
    [isLoaded]
  )

  useEffect(() => {
    if (!isLoaded) return
    if (!pathRef.current || pathRef.current.length < 3) {
      setAreaM2(null)
      return
    }
    const a = computeArea(pathRef.current)
    if (a !== null) setAreaM2(a)
  }, [computeArea, isLoaded, path])

  const areaFt2 = useMemo(() => {
    if (areaM2 == null) return null
    return areaM2 * 10.7639
  }, [areaM2])

  const savePolygon = useCallback(
    async (points: LatLngLiteral[]) => {
      if (readonly) return
      if (!bassinId) return

      // IMPORTANT: points ici doivent être "ouverts" (pas de point de fermeture)
      if (!points.length) {
        const { error } = await supabaseBrowser
          .from('bassins')
          .update({ polygone_geojson: null, surface_m2: null })
          .eq('id', bassinId)

        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Erreur Supabase reset polygone :', error)
          }
          alert('Erreur lors de la réinitialisation du polygone (voir console).')
        } else {
          setAreaM2(null)
        }
        return
      }

      const area = computeArea(points)

      // fermer le ring au moment de sauver
      const closed = [...points]
      if (closed.length >= 2 && !samePoint(closed[0], closed[closed.length - 1])) {
        closed.push(closed[0])
      }

      const geojson: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [closed.map((p) => [p.lng, p.lat])],
      }

      const { error } = await supabaseBrowser
        .from('bassins')
        .update({ polygone_geojson: geojson, surface_m2: area ?? null })
        .eq('id', bassinId)

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur Supabase save polygone :', error)
        }
        alert("Erreur lors de l'enregistrement du polygone (voir console).")
      } else if (area !== null) {
        setAreaM2(area)
      }
    },
    [bassinId, computeArea, readonly]
  )

  // Fit bounds une seule fois par bassin
  useEffect(() => {
    if (!map || !isLoaded) return

    if (lastBassinIdRef.current !== bassinId) {
      lastBassinIdRef.current = bassinId
      hasFittedRef.current = false
    }

    if (hasFittedRef.current) return

    if (pathRef.current.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      pathRef.current.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds)
    } else {
      map.setCenter(center)
      map.setZoom(19)
    }

    hasFittedRef.current = true
  }, [map, isLoaded, center, bassinId, path])

  // Pan vers le marker intervention sélectionné
  useEffect(() => {
    if (!map) return
    if (!selectedInterventionId) return
    const m = interventionMarkers.find((x) => x.id === selectedInterventionId)
    if (!m) return
    map.panTo(m.position)
    const z = map.getZoom()
    if (typeof z === 'number' && z < 19) map.setZoom(19)
  }, [map, selectedInterventionId, interventionMarkers])

  const handleMapLoad = useCallback((m: google.maps.Map) => {
    setMap(m)
    m.setTilt(0)
    m.setHeading(0)
    m.setOptions({
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
      scrollwheel: true,
    })
  }, [])

  const handleMapUnmount = useCallback(() => setMap(null), [])

  // Curseur crosshair quand on pick un point
  useEffect(() => {
    if (!map) return
    const enabled = !!pointPicker?.enabled
    map.setOptions({ draggableCursor: enabled ? 'crosshair' : undefined })
  }, [map, pointPicker?.enabled])

  const finalCenter = useMemo(() => center, [center])
  const finalColor = couleurPolygon || '#ffb020'

  // Sauvegarder en utilisant pathRef (pas le state) quand on termine
  const handleToggleEdit = useCallback(async () => {
    if (readonly) return
    if (isLocked) return

    if (isEditing) {
      setIsEditing(false)
      await savePolygon(pathRef.current)
      return
    }

    setIsEditing(true)
  }, [readonly, isLocked, isEditing, savePolygon])

  const handleResetPolygon = useCallback(async () => {
    if (readonly) return
    const ok = window.confirm('Voulez-vous vraiment réinitialiser le polygone de ce bassin ?')
    if (!ok) return
    setPathSafe([])
    await savePolygon([])
    setPolygonInstance(null)
  }, [readonly, savePolygon, setPathSafe])

  const handleToggleLock = useCallback(() => {
    if (readonly) return
    setIsLocked((prev) => {
      const next = !prev
      if (!prev) setIsEditing(false)
      return next
    })
  }, [readonly])

  // Listeners sur le path Google -> met à jour state + ref
  useEffect(() => {
    if (!isLoaded) return
    if (!polygonInstance) return

    const gPath = polygonInstance.getPath()

    const updateFromPath = () => {
      const newPoints: LatLngLiteral[] = gPath.getArray().map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }))
      setPathSafe(newPoints)
    }

    const listeners = [
      gPath.addListener('insert_at', updateFromPath),
      gPath.addListener('set_at', updateFromPath),
      gPath.addListener('remove_at', updateFromPath),
    ]

    return () => listeners.forEach((l) => l.remove())
  }, [isLoaded, polygonInstance, setPathSafe])

  const handlePolygonComplete = useCallback(
    async (poly: google.maps.Polygon) => {
      if (readonly || !isEditing || isLocked) {
        poly.setMap(null)
        return
      }

      const newPoints: LatLngLiteral[] = poly
        .getPath()
        .getArray()
        .map((latLng) => ({ lat: latLng.lat(), lng: latLng.lng() }))

      poly.setMap(null)

      setPathSafe(newPoints)
      await savePolygon(newPoints)
      setIsEditing(false)
    },
    [isEditing, isLocked, savePolygon, readonly, setPathSafe]
  )

  const drawingOptions = useMemo(() => {
    if (readonly) {
      return { drawingControl: false, drawingMode: null } as google.maps.drawing.DrawingManagerOptions
    }

    if (!isLoaded || typeof google === 'undefined') {
      return { drawingControl: false } as google.maps.drawing.DrawingManagerOptions
    }

    return {
      drawingControl: false,
      drawingMode:
        isEditing && !isLocked && pathRef.current.length === 0
          ? google.maps.drawing.OverlayType.POLYGON
          : null,
    } as google.maps.drawing.DrawingManagerOptions
  }, [isLoaded, isEditing, isLocked, readonly])

  // -----
  // POINT PICKER: fonctionne sur la carte ET sur le polygone
  // -----
  const pickFromEvent = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!pointPicker?.enabled) return
      if (!e.latLng) return

      // Évite de mélanger "édition polygone" et "picker"
      if (!readonly && isEditing && !isLocked) {
        // Si tu veux permettre quand même pendant l'édition, enlève ce bloc.
        return
      }

      const pos: LatLngLiteral = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      pointPicker.onChange(pos)
      pointPicker.onPicked?.()
    },
    [pointPicker, readonly, isEditing, isLocked]
  )

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      pickFromEvent(e)
    },
    [pickFromEvent]
  )

  const handlePolygonClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      pickFromEvent(e)
    },
    [pickFromEvent]
  )

  const pickerMarkerIcon = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') return undefined
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: '#0A84FF',
      fillOpacity: 0.95,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    } as google.maps.Symbol
  }, [isLoaded])

  const markerIcon = useCallback(
    (selected: boolean) => {
      if (!isLoaded || typeof google === 'undefined') return undefined
      return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: selected ? 8 : 6,
        fillColor: selected ? '#FF3B30' : '#111827',
        fillOpacity: 0.95,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      } as google.maps.Symbol
    },
    [isLoaded]
  )

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-ct-grayLight/40 text-sm text-red-600">
        Erreur de chargement de Google Maps.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-ct-grayLight/40 text-sm text-ct-gray">
        Chargement de la carte…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ct-primaryLight/10 px-3 py-2">
        <div className="space-y-0.5 text-xs">
          <p className="font-medium text-ct-grayDark">Surface approximative</p>
          <p className="text-ct-gray">
            {areaM2 != null && areaFt2 != null ? (
              <>
                {areaM2.toFixed(0)} m² · {areaFt2.toFixed(0)} pi²
              </>
            ) : (
              'Aucun polygone défini'
            )}
          </p>

          {pointPicker?.enabled && (
            <p className="mt-1 text-xs font-medium text-ct-primary">
              Mode localisation actif : cliquez sur la carte OU sur le polygone pour placer le point.
            </p>
          )}
        </div>

        {!readonly && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleToggleEdit()}
              disabled={isLocked}
            >
              {isEditing ? 'Terminer la modification' : 'Modifier le polygone'}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleResetPolygon()}
            >
              Réinitialiser le polygone
            </button>

            <button
              type="button"
              className={`btn-secondary ${isLocked ? 'bg-ct-grayLight text-ct-grayDark' : ''}`}
              onClick={handleToggleLock}
            >
              {isLocked ? 'Déverrouiller' : 'Verrouiller'}
            </button>
          </div>
        )}
      </div>

      <div className="h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-ct-grayLight">
        <GoogleMap
          center={finalCenter}
          zoom={18}
          mapContainerClassName="h-full w-full"
          onLoad={handleMapLoad}
          onUnmount={handleMapUnmount}
          onClick={handleMapClick}
          options={{ disableDefaultUI: false, zoomControl: true, mapTypeControl: true }}
        >
          {path.length > 0 && (
            <Polygon
              path={path}
              onLoad={(poly) => setPolygonInstance(poly)}
              onUnmount={() => setPolygonInstance(null)}
              onClick={handlePolygonClick}
              options={{
                strokeColor: finalColor,
                strokeOpacity: 0.9,
                strokeWeight: 2,
                fillColor: finalColor,
                fillOpacity: 0.35,
                editable: !readonly && isEditing && !isLocked,
                draggable: !readonly && isEditing && !isLocked,
                zIndex: 2,
              }}
            />
          )}

          {interventionMarkers.map((m) => {
            const selected = selectedInterventionId === m.id
            return (
              <MarkerF
                key={m.id}
                position={m.position}
                title={m.title ?? undefined}
                icon={markerIcon(selected)}
                zIndex={selected ? 50 : 10}
                onClick={() => onInterventionMarkerClick?.(m.id)}
              />
            )
          })}

          {pointPicker?.value && (
            <MarkerF
              position={pointPicker.value}
              draggable={true}
              icon={pickerMarkerIcon}
              zIndex={60}
              onDragEnd={(e) => {
                if (!e.latLng) return
                pointPicker.onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() })
              }}
            />
          )}

          {!readonly && (
            <DrawingManager options={drawingOptions as any} onPolygonComplete={handlePolygonComplete} />
          )}
        </GoogleMap>
      </div>
    </div>
  )
}
