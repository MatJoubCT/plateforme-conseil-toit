'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card'
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
} from '@/components/ui/DataTable'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import { GoogleMap, Polygon, useLoadScript } from '@react-google-maps/api'

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  client_id: string | null
  client_name: string | null
  notes: string | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string
  couleur: string | null
}

type BassinRow = {
  id: string
  name: string | null
  membrane_type_id: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  etat_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
  notes: string | null
  polygone_geojson: GeoJSONPolygon | null
}

/** mappe un état texte en type pour StateBadge */
function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'
  const v = etat.toLowerCase()

  if (v.includes('urgent')) return 'urgent'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier') || v.includes('planification')) return 'planifier'

  return 'non_evalue'
}

export default function AdminBatimentDetailPage() {
  const params = useParams()
  const batimentId = typeof params?.id === 'string' ? params.id : ''

  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hoveredBassinId, setHoveredBassinId] = useState<string | null>(null)

  useEffect(() => {
    if (!batimentId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bâtiment + client
      const { data: batimentData, error: batimentError } = await supabaseBrowser
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
          notes,
          clients ( name )
        `
        )
        .eq('id', batimentId)
        .maybeSingle()

      if (batimentError) {
        console.error('Erreur Supabase batiment:', batimentError)
        setErrorMsg(batimentError.message)
        setLoading(false)
        return
      }

      if (!batimentData) {
        setErrorMsg('Bâtiment introuvable.')
        setLoading(false)
        return
      }

      const batimentMapped: BatimentRow = {
        id: batimentData.id,
        name: batimentData.name,
        address: batimentData.address,
        city: batimentData.city,
        postal_code: batimentData.postal_code,
        latitude: batimentData.latitude,
        longitude: batimentData.longitude,
        client_id: batimentData.client_id,
        client_name: (batimentData as any).clients?.name ?? null,
        notes: batimentData.notes ?? null,
      }
      setBatiment(batimentMapped)

      // 2) Listes de choix (membranes, états, durées de vie, etc.)
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur')

      if (listesError) {
        console.error('Erreur Supabase listes_choix:', listesError)
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }
      setListes(listesData || [])

      // 3) Bassins du bâtiment
      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select(
          `
          id,
          name,
          membrane_type_id,
          surface_m2,
          annee_installation,
          date_derniere_refection,
          etat_id,
          duree_vie_text,
          reference_interne,
          notes,
          polygone_geojson
        `
        )
        .eq('batiment_id', batimentId)
        .order('name', { ascending: true })

      if (bassinsError) {
        console.error('Erreur Supabase bassins:', bassinsError)
        setErrorMsg(bassinsError.message)
        setLoading(false)
        return
      }

      setBassins(
        (bassinsData || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          membrane_type_id: row.membrane_type_id,
          surface_m2: row.surface_m2,
          annee_installation: row.annee_installation,
          date_derniere_refection: row.date_derniere_refection,
          etat_id: row.etat_id,
          duree_vie_text: row.duree_vie_text,
          reference_interne: row.reference_interne,
          notes: row.notes,
          polygone_geojson: row.polygone_geojson,
        }))
      )

      setLoading(false)
    }

    fetchData()
  }, [batimentId])

  if (!batimentId) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Bâtiment</h1>
        <p className="text-sm text-red-600">
          Identifiant du bâtiment manquant dans l’URL.
        </p>
      </section>
    )
  }

  const membranes = listes.filter((l) => l.categorie === 'membrane')
  const etats = listes.filter((l) => l.categorie === 'etat_bassin')
  const durees = listes.filter((l) => l.categorie === 'duree_vie')

  const mapCenter =
    batiment && batiment.latitude != null && batiment.longitude != null
      ? { lat: batiment.latitude, lng: batiment.longitude }
      : { lat: 46.0, lng: -72.0 } // fallback Québec

  if (loading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-ct-gray">Chargement des données…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </section>
    )
  }

  if (!batiment) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">Bâtiment introuvable.</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {/* En-tête + retour */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ct-primary">
            {batiment.name || 'Bâtiment'}
          </h1>
          {batiment.client_id && (
            <p className="mt-1 text-sm text-ct-gray">
              Client{' '}
              <Link
                href={`/admin/clients/${batiment.client_id}`}
                className="font-medium text-ct-primary hover:underline"
              >
                {batiment.client_name || 'Client'}
              </Link>
            </p>
          )}
        </div>

        <Link
          href="/admin/batiments"
          className="btn-secondary inline-flex items-center"
        >
          ← Retour à la liste des bâtiments
        </Link>
      </div>

      {/* Infos bâtiment */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Informations du bâtiment</CardTitle>
            <CardDescription>
              Détails administratifs et pratiques du bâtiment sélectionné.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Nom du bâtiment
              </p>
              <p className="text-sm text-ct-grayDark">
                {batiment.name || '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Client
              </p>
              <p className="text-sm text-ct-grayDark">
                {batiment.client_name || '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Adresse
              </p>
              <p className="text-sm text-ct-grayDark">
                {batiment.address || '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Ville / Code postal
              </p>
              <p className="text-sm text-ct-grayDark">
                {batiment.city || '—'}{' '}
                {batiment.postal_code ? `(${batiment.postal_code})` : ''}
              </p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs uppercase tracking-wide text-ct-gray">
                Notes internes
              </p>
              <p className="text-sm text-ct-grayDark whitespace-pre-line">
                {batiment.notes || '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bassins */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Bassins de toiture</CardTitle>
            <CardDescription>
              Liste des bassins associés à ce bâtiment, avec leur état global et
              leur durée de vie résiduelle.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {bassins.length === 0 ? (
            <p className="text-sm text-ct-gray">
              Aucun bassin n’est encore associé à ce bâtiment.
            </p>
          ) : (
            <DataTable maxHeight={600}>
              <table>
                <DataTableHeader>
                  <tr>
                    <th>Nom du bassin</th>
                    <th>État</th>
                    <th>Durée de vie résiduelle</th>
                    <th>Type de membrane</th>
                    <th>Surface (pi²)</th>
                    <th>Année installation</th>
                    <th>Dernière réfection</th>
                  </tr>
                </DataTableHeader>
                <DataTableBody>
                  {bassins.map((b) => {
                    const etatLabel =
                      etats.find((e) => e.id === b.etat_id)?.label ||
                      b.duree_vie_text ||
                      null
                    const duree =
                      durees.find((d) => d.label === b.duree_vie_text)?.label ??
                      b.duree_vie_text ??
                      null
                    const membrane =
                      membranes.find((m) => m.id === b.membrane_type_id)
                        ?.label ?? null

                    const surfaceFt2 =
                      b.surface_m2 != null ? b.surface_m2 * 10.7639 : null

                    const isHovered = hoveredBassinId === b.id

                    return (
                      <tr
                        key={b.id}
                        onMouseEnter={() => setHoveredBassinId(b.id)}
                        onMouseLeave={() => setHoveredBassinId(null)}
                        className={`transition-colors ${
                          isHovered ? 'bg-ct-primaryLight/30' : ''
                        }`}
                      >
                        <td>
                          <Link
                            href={`/admin/bassins/${b.id}`}
                            className="text-sm font-medium text-ct-primary hover:underline"
                          >
                            {b.name || '(Sans nom)'}
                          </Link>
                        </td>
                        <td>
                          <StateBadge state={mapEtatToStateBadge(etatLabel)} />
                        </td>
                        <td className="text-sm text-ct-grayDark">
                          {duree || '—'}
                        </td>
                        <td className="text-sm text-ct-grayDark">
                          {membrane || '—'}
                        </td>
                        <td className="text-sm text-ct-grayDark">
                          {surfaceFt2 != null
                            ? `${surfaceFt2.toFixed(0)} pi²`
                            : '—'}
                        </td>
                        <td className="text-sm text-ct-grayDark">
                          {b.annee_installation ?? '—'}
                        </td>
                        <td className="text-sm text-ct-grayDark">
                          {b.date_derniere_refection || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </DataTableBody>
              </table>
            </DataTable>
          )}
        </CardContent>
      </Card>

      {/* Carte Google Maps */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Carte Google Maps</CardTitle>
            <CardDescription>
              Visualisation des polygones des bassins sur l’image satellite.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <BatimentBasinsMap
            center={mapCenter}
            bassins={bassins}
            etats={etats}
            hoveredBassinId={hoveredBassinId}
            onHoverBassin={setHoveredBassinId}
          />
        </CardContent>
      </Card>
    </section>
  )
}

type BatimentBasinsMapProps = {
  center: { lat: number; lng: number }
  bassins: BassinRow[]
  etats: ListeChoix[]
  hoveredBassinId: string | null
  onHoverBassin: (id: string | null) => void
}

function BatimentBasinsMap({
  center,
  bassins,
  etats,
  hoveredBassinId,
  onHoverBassin,
}: BatimentBasinsMapProps) {
  const router = useRouter()

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: ['drawing', 'geometry'] as (
      | 'drawing'
      | 'geometry'
      | 'places'
    )[],
  })

  if (!isLoaded) {
    return (
      <div className="text-sm text-ct-gray">
        Chargement de la carte…
      </div>
    )
  }

  const polygons = bassins
    .filter(
      (b) =>
        b.polygone_geojson &&
        b.polygone_geojson.coordinates &&
        b.polygone_geojson.coordinates[0] &&
        b.polygone_geojson.coordinates[0].length > 0
    )
    .map((b) => {
      const coords = b.polygone_geojson!.coordinates[0]
      const path = coords.map(([lng, lat]) => ({ lat, lng }))
      const etat = etats.find((e) => e.id === b.etat_id)
      const color = etat?.couleur || '#22c55e'
      return {
        id: b.id,
        path,
        color,
      }
    })

  if (polygons.length === 0) {
    return (
      <div className="h-64 w-full rounded-xl bg-ct-grayLight border border-ct-gray flex items-center justify-center text-sm text-ct-gray">
        Aucun polygone de bassin n’est encore dessiné pour ce bâtiment.
      </div>
    )
  }

  return (
    <div className="h-80 w-full rounded-xl bg-ct-grayLight border border-ct-grayLight overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={19}
        options={{
          mapTypeId: 'satellite',
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          tilt: 0,
        }}
        onLoad={(map) => {
          map.setTilt(0)
        }}
      >
        {polygons.map((poly) => {
          const isHovered = hoveredBassinId === poly.id

          return (
            <Polygon
              key={poly.id}
              paths={poly.path}
              options={{
                fillColor: poly.color,
                fillOpacity: isHovered ? 0.75 : 0.4, // même couleur, plus saturée au survol
                strokeColor: poly.color,
                strokeOpacity: isHovered ? 1 : 0.9,
                strokeWeight: isHovered ? 4 : 2,
                clickable: true,
              }}
              onMouseOver={() => onHoverBassin(poly.id)}
              onMouseOut={() => onHoverBassin(null)}
              onClick={() => router.push(`/admin/bassins/${poly.id}`)}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}
