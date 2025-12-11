'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  GoogleMap,
  Polygon,
  useJsApiLoader,
  DrawingManager,
} from '@react-google-maps/api'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type LatLngLiteral = google.maps.LatLngLiteral

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type BassinMapProps = {
  bassinId: string
  center: LatLngLiteral
  initialPolygon: GeoJSONPolygon | null
  couleurPolygon?: string
}

const libraries: ('drawing' | 'geometry')[] = ['drawing', 'geometry']

export default function BassinMap({
  bassinId,
  center,
  initialPolygon,
  couleurPolygon,
}: BassinMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [path, setPath] = useState<LatLngLiteral[]>([])
  const [areaM2, setAreaM2] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [drawingManager, setDrawingManager] =
    useState<google.maps.drawing.DrawingManager | null>(null)

  const polygonRef = useRef<google.maps.Polygon | null>(null)

  const hasFittedRef = useRef(false)
  const lastBassinIdRef = useRef<string | null>(null)

  // ---------------------------------------------------------------------------
  // Initialisation du polygone à partir du GeoJSON initial
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      initialPolygon &&
      Array.isArray(initialPolygon.coordinates) &&
      initialPolygon.coordinates[0] &&
      initialPolygon.coordinates[0].length > 0
    ) {
      const ring = initialPolygon.coordinates[0]
      const pts: LatLngLiteral[] = ring.map(([lng, lat]) => ({
        lat,
        lng,
      }))
      setPath(pts)
    } else {
      setPath([])
      setAreaM2(null)
    }
  }, [initialPolygon])

  // ---------------------------------------------------------------------------
  // Calcul de la surface (m²) puis conversion en pi² pour l'affichage
  // ---------------------------------------------------------------------------
  const computeArea = useCallback(
    (points: LatLngLiteral[]): number | null => {
      if (!isLoaded) return null
      if (typeof google === 'undefined') return null
      if (!google.maps?.geometry?.spherical) return null
      if (!points || points.length < 3) return null

      const gPath = points.map(
        (p) => new google.maps.LatLng(p.lat, p.lng)
      )
      const area = google.maps.geometry.spherical.computeArea(gPath)
      return area // en m²
    },
    [isLoaded]
  )

  useEffect(() => {
    if (!isLoaded) return
    if (!path || path.length < 3) {
      setAreaM2(null)
      return
    }
    const a = computeArea(path)
    if (a !== null) setAreaM2(a)
  }, [path, computeArea, isLoaded])

  const areaFt2 = useMemo(() => {
    if (areaM2 == null) return null
    return areaM2 * 10.7639
  }, [areaM2])

  // ---------------------------------------------------------------------------
  // Sauvegarde du polygone dans Supabase
  // ---------------------------------------------------------------------------
  const savePolygon = useCallback(
    async (points: LatLngLiteral[]) => {
      if (!bassinId) return

      // Aucun point : on efface le polygone
      if (!points.length) {
        const { error } = await supabaseBrowser
          .from('bassins')
          .update({
            polygone_geojson: null,
            surface_m2: null,
          })
          .eq('id', bassinId)

        if (error) {
          console.error(
            'Erreur Supabase en réinitialisant le polygone :',
            error
          )
          alert(
            "Erreur lors de la réinitialisation du polygone (voir console)."
          )
        } else {
          setAreaM2(null)
        }
        return
      }

      const area = computeArea(points)

      // On ferme le polygone si ce n'est pas déjà le cas
      const closed = [...points]
      const first = closed[0]
      const last = closed[closed.length - 1]
      if (first.lat !== last.lat || first.lng !== last.lng) {
        closed.push(first)
      }

      const geojson: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          closed.map((p) => [p.lng, p.lat]), // GeoJSON = [lng, lat]
        ],
      }

      const { error } = await supabaseBrowser
        .from('bassins')
        .update({
          polygone_geojson: geojson,
          surface_m2: area ?? null, // BD en m²
        })
        .eq('id', bassinId)

      if (error) {
        console.error(
          'Erreur Supabase en sauvegardant le polygone :',
          error
        )
        alert(
          "Erreur lors de l'enregistrement du polygone (voir console)."
        )
      } else if (area !== null) {
        setAreaM2(area)
      }
    },
    [bassinId, computeArea]
  )

  // ---------------------------------------------------------------------------
  // Centrage automatique sur le polygone (fitBounds)
  // -> Optimisé: on ne recentre qu'une fois par bassin
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map || !isLoaded) return

    // Réinitialiser le centrage lorsqu'on change de bassin
    if (lastBassinIdRef.current !== bassinId) {
      lastBassinIdRef.current = bassinId
      hasFittedRef.current = false
    }

    // On ne centre qu'une seule fois par bassin pour éviter les "sauts" visuels
    if (hasFittedRef.current) return

    if (path.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds)
    } else {
      // Pas de polygone, on centre sur le centre fourni en props
      map.setCenter(center)
      map.setZoom(19)
    }

    hasFittedRef.current = true
  }, [map, isLoaded, path, center, bassinId])

  // ---------------------------------------------------------------------------
  // Gestion de la carte
  // ---------------------------------------------------------------------------
  const handleMapLoad = useCallback((m: google.maps.Map) => {
    setMap(m)
    m.setTilt(0)
    m.setHeading(0)
    m.setOptions({
      mapTypeId: google.maps.MapTypeId.SATELLITE,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy', // zoom à la molette sans CTRL
      scrollwheel: true,
    })
  }, [])

  const handleMapUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const finalCenter = useMemo(() => center, [center])
  const finalColor = couleurPolygon || '#ffb020'

  // ---------------------------------------------------------------------------
  // Gestion de l’édition
  // ---------------------------------------------------------------------------
  const handleToggleEdit = () => {
    if (isLocked) return
    setIsEditing((prev) => !prev)
  }

  const handleResetPolygon = async () => {
    const ok = window.confirm(
      'Voulez-vous vraiment réinitialiser le polygone de ce bassin ?'
    )
    if (!ok) return

    setPath([])
    await savePolygon([])
  }

  const handleToggleLock = () => {
    setIsLocked((prev) => !prev)
    // Si on verrouille, on sort du mode édition
    if (!isLocked) {
      setIsEditing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Sync des modifications du polygone (drag/resize) via l'API Google
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isLoaded) return
    if (!polygonRef.current) return

    const poly = polygonRef.current
    const gPath = poly.getPath()

    const updateFromPath = () => {
      const newPoints: LatLngLiteral[] = gPath.getArray().map(
        (latLng: google.maps.LatLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        })
      )
      setPath(newPoints)
    }

    const listeners = [
      gPath.addListener('insert_at', updateFromPath),
      gPath.addListener('set_at', updateFromPath),
      gPath.addListener('remove_at', updateFromPath),
    ]

    return () => {
      listeners.forEach((l) => l.remove())
    }
  }, [isLoaded])

  // ---------------------------------------------------------------------------
  // DrawingManager – création d'un nouveau polygone
  // ---------------------------------------------------------------------------
  const handlePolygonComplete = useCallback(
    async (poly: google.maps.Polygon) => {
      if (!isEditing || isLocked) {
        poly.setMap(null)
        return
      }

      const newPoints: LatLngLiteral[] = poly
        .getPath()
        .getArray()
        .map((latLng: google.maps.LatLng) => ({
          lat: latLng.lat(),
          lng: latLng.lng(),
        }))

      poly.setMap(null) // on laisse le Polygon contrôlé par React faire l’affichage

      setPath(newPoints)
      await savePolygon(newPoints)
      setIsEditing(false)
    },
    [isEditing, isLocked, savePolygon]
  )

  const drawingOptions = useMemo(() => {
    if (!isLoaded || typeof google === 'undefined') {
      return {
        drawingControl: false,
      } as google.maps.drawing.DrawingManagerOptions
    }

    return {
      drawingControl: false,
      drawingMode:
        isEditing && !isLocked && path.length === 0
          ? google.maps.drawing.OverlayType.POLYGON
          : null,
    } as google.maps.drawing.DrawingManagerOptions
  }, [isLoaded, isEditing, isLocked, path.length])

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------
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
      {/* Barre d’info au-dessus de la carte */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ct-primaryLight/10 px-3 py-2">
        <div className="space-y-0.5 text-xs">
          <p className="font-medium text-ct-grayDark">
            Surface approximative
          </p>
          <p className="text-ct-gray">
            {areaM2 != null && areaFt2 != null ? (
              <>
                {areaM2.toFixed(0)} m² · {areaFt2.toFixed(0)} pi²
              </>
            ) : (
              'Aucun polygone défini'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleToggleEdit}
            disabled={isLocked}
          >
            {isEditing ? 'Terminer la modification' : 'Modifier le polygone'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleResetPolygon}
          >
            Réinitialiser le polygone
          </button>
          <button
            type="button"
            className={`btn-secondary ${
              isLocked ? 'bg-ct-grayLight text-ct-grayDark' : ''
            }`}
            onClick={handleToggleLock}
          >
            {isLocked ? 'Déverrouiller' : 'Verrouiller'}
          </button>
        </div>
      </div>

      {/* Carte */}
      <div className="h-full min-h-[320px] w-full overflow-hidden rounded-xl border border-ct-grayLight">
        <GoogleMap
          center={finalCenter}
          zoom={18}
          mapContainerClassName="h-full w-full"
          onLoad={handleMapLoad}
          onUnmount={handleMapUnmount}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
          }}
        >
          {/* Polygone contrôlé par React */}
          {path.length > 0 && (
            <Polygon
              path={path}
              onLoad={(poly) => {
                polygonRef.current = poly
              }}
              options={{
                strokeColor: finalColor,
                strokeOpacity: 0.9,
                strokeWeight: 2,
                fillColor: finalColor,
                fillOpacity: 0.35,
                editable: isEditing && !isLocked,
                draggable: isEditing && !isLocked,
                zIndex: 2,
              }}
            />
          )}

          {/* DrawingManager pour dessiner un nouveau polygone */}
          <DrawingManager
            onLoad={(dm) => setDrawingManager(dm)}
            options={drawingOptions as any}
            onPolygonComplete={handlePolygonComplete}
          />
        </GoogleMap>
      </div>
    </div>
  )
}
