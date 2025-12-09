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

  const surfaceFt2 = useMemo(() => {
    if (areaM2 === null) return null
    // m² -> pi²
    return Math.round(areaM2 * 10.7639)
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
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map || !isLoaded) return

    if (path.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      path.forEach((p) => bounds.extend(p))
      map.fitBounds(bounds)
    } else {
      // Pas de polygone, on centre sur le centre fourni en props
      map.setCenter(center)
      map.setZoom(19)
    }
  }, [map, path, center, isLoaded])

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
    setIsEditing(false)
  }

  // Quand l’utilisateur termine un dessin avec le DrawingManager
  const handlePolygonComplete = useCallback(
    async (poly: google.maps.Polygon | any) => {
      if (isLocked) {
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
    [isLocked, savePolygon]
  )

  // Mise à jour lors du déplacement des sommets d’un polygone existant
  useEffect(() => {
    if (!polygonRef.current || !isLoaded) return

    const poly = polygonRef.current
    const gPath = poly.getPath()

    const updateFromPath = () => {
      if (!isEditing || isLocked) return

      const pts: LatLngLiteral[] = gPath.getArray().map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }))

      setPath(pts)
      void savePolygon(pts)
    }

    const listeners = [
      gPath.addListener('insert_at', updateFromPath),
      gPath.addListener('set_at', updateFromPath),
      gPath.addListener('remove_at', updateFromPath),
    ]

    return () => {
      listeners.forEach((l) => l.remove())
    }
  }, [isEditing, isLocked, savePolygon, isLoaded])

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
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Erreur de chargement de Google Maps. Vérifiez votre connexion ou la clé
        d&apos;API.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-ct-grayLight bg-white px-4 py-3 text-sm text-ct-grayDark">
        Chargement de la carte…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Barre d’actions au-dessus de la carte */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ct-grayLight bg-ct-grayLight/40 px-4 py-2">
        <p className="text-sm text-ct-grayDark">
          Superficie du polygone :{' '}
          <span className="font-semibold">
            {surfaceFt2 !== null ? `${surfaceFt2} pi²` : '—'}
          </span>
        </p>
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

      {/* Carte Google Maps – hauteur augmentée et responsive */}
      <div className="h-[320px] md:h-[380px] lg:h-[420px] w-full rounded-xl border border-ct-grayLight overflow-hidden">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={finalCenter}
          zoom={19}
          onLoad={handleMapLoad}
          onUnmount={handleMapUnmount}
        >
          {/* Polygone existant */}
          {path.length > 0 && (
            <Polygon
              path={path}
              options={{
                fillColor: finalColor,
                fillOpacity: 0.45,
                strokeColor: finalColor,
                strokeOpacity: 0.9,
                strokeWeight: 2,
                editable: isEditing && !isLocked,
                draggable: false,
                zIndex: 2,
              }}
              onLoad={(poly) => {
                polygonRef.current = poly
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
