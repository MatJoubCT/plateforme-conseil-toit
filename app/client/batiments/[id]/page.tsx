'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useValidatedId } from '@/lib/hooks/useValidatedId'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import type { GeoJSONPolygon } from '@/types/maps'
import type { BatimentRow, ListeChoix, BassinRow, UserProfileRow, UserClientRow } from '@/types/database'
import { mapEtatToStateBadge } from '@/lib/utils/bassin-utils'
import { GoogleMap, Polygon, useLoadScript } from '@react-google-maps/api'
import {
  AlertTriangle,
  Building2,
  Calendar,
  ChevronLeft,
  FileText,
  Layers,
  Map,
  MapPin,
  Ruler,
  ShieldCheck,
  User,
  Clock,
  Hash,
} from 'lucide-react'

type BatimentBasinsMapProps = {
  center: { lat: number; lng: number }
  bassins: BassinRow[]
  etats: ListeChoix[]
  hoveredBassinId: string | null
  onHoverBassin: (id: string | null) => void
}

export default function ClientBatimentDetailPage() {
  const router = useRouter()
  const batimentId = useValidatedId('/client/batiments')

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [bassinsWithRapport, setBassinsWithRapport] = useState<Set<string>>(new Set())
  const [bassinsWithGarantie, setBassinsWithGarantie] = useState<Set<string>>(new Set())
  const [hoveredBassinId, setHoveredBassinId] = useState<string | null>(null)
  const bassinsListRef = useRef<HTMLDivElement>(null)
  const [clientName, setClientName] = useState<string>('Client non défini')

  useEffect(() => {
    if (!batimentId) return

    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      const {
        data: { user },
        error: userError,
      } = await supabaseBrowser.auth.getUser()

      if (userError || !user) {
        setErrorMsg("Impossible de récupérer l'utilisateur connecté.")
        setLoading(false)
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } =
        await supabaseBrowser
          .from('user_profiles')
          .select('id, user_id, role, client_id, full_name')
          .eq('user_id', user.id)
          .maybeSingle()

      if (profileError || !profileData) {
        setErrorMsg('Profil utilisateur introuvable.')
        setLoading(false)
        return
      }

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

      const authorizedClientIds = new Set<string>()
      const profile = profileData as UserProfileRow
      if (profile.client_id) {
        authorizedClientIds.add(profile.client_id)
      }

      const extraClients = (userClientsData || []) as UserClientRow[]
      extraClients.forEach((uc) => {
        if (uc.client_id) authorizedClientIds.add(uc.client_id)
      })

      const clientIdsArray = Array.from(authorizedClientIds)

      if (clientIdsArray.length === 0) {
        setErrorMsg('Aucun client associé à ce compte.')
        setLoading(false)
        return
      }

      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select(
          `
          id,
          client_id,
          name,
          address,
          city,
          postal_code,
          latitude,
          longitude,
          clients (
            id,
            name
          )
        `
        )
        .eq('id', batimentId)
        .in('client_id', clientIdsArray)
        .maybeSingle()

      if (batError) {
        setErrorMsg(batError.message)
        setLoading(false)
        return
      }
      if (!batData) {
        setErrorMsg('Bâtiment introuvable ou non accessible.')
        setLoading(false)
        return
      }
      setBatiment(batData as unknown as BatimentRow)
      setClientName(
        (batData as any).clients?.name ?? 'Client non défini'
      )

      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, batiment_id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, polygone_geojson'
        )
        .eq('batiment_id', batimentId)
        .order('name', { ascending: true })

      if (bassinsError) {
        setErrorMsg(bassinsError.message)
        setLoading(false)
        return
      }
      setBassins((bassinsData || []) as BassinRow[])

      // Charger les indicateurs rapports & garanties par bassin
      const bassinIds = (bassinsData || []).map((b: any) => b.id as string)
      if (bassinIds.length > 0) {
        const [rapportsRes, garantiesRes] = await Promise.all([
          supabaseBrowser
            .from('rapports')
            .select('bassin_id')
            .in('bassin_id', bassinIds),
          supabaseBrowser
            .from('garanties')
            .select('bassin_id')
            .in('bassin_id', bassinIds),
        ])
        setBassinsWithRapport(new Set((rapportsRes.data || []).map((r: any) => r.bassin_id as string)))
        setBassinsWithGarantie(new Set((garantiesRes.data || []).map((g: any) => g.bassin_id as string)))
      }

      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur, ordre')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }
      setListes((listesData || []) as ListeChoix[])

      setLoading(false)
    }

    void load()
  }, [batimentId])

  // Scroll automatique vers le bassin survolé sur la carte
  useEffect(() => {
    if (!hoveredBassinId || !bassinsListRef.current) return
    const el = bassinsListRef.current.querySelector(`[data-bassin-id="${hoveredBassinId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [hoveredBassinId])

  if (!batimentId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <p className="text-sm font-medium text-red-700">
            Identifiant du bâtiment manquant dans l'URL.
          </p>
        </div>
      </div>
    )
  }

  const membranes = useMemo(() =>
    listes
      .filter((l) => l.categorie === 'membrane')
      .slice()
      .sort(
        (a, b) =>
          (a.ordre ?? 999999) - (b.ordre ?? 999999) ||
          (a.label || '').localeCompare(b.label || '', 'fr-CA')
      ), [listes])

  const etats = useMemo(() =>
    listes
      .filter((l) => l.categorie === 'etat_bassin')
      .slice()
      .sort(
        (a, b) =>
          (a.ordre ?? 999999) - (b.ordre ?? 999999) ||
          (a.label || '').localeCompare(b.label || '', 'fr-CA')
      ), [listes])

  const durees = useMemo(() =>
    listes
      .filter((l) => l.categorie === 'duree_vie')
      .slice()
      .sort(
        (a, b) =>
          (a.ordre ?? 999999) - (b.ordre ?? 999999) ||
          (a.label || '').localeCompare(b.label || '', 'fr-CA')
      ), [listes])

  const mapCenter =
    batiment && batiment.latitude != null && batiment.longitude != null
      ? { lat: batiment.latitude, lng: batiment.longitude }
      : { lat: 46.0, lng: -72.0 }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Chargement du bâtiment…
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
          <p className="text-sm font-medium text-red-700 mb-4">
            Erreur : {errorMsg}
          </p>
          <button
            onClick={() => router.push('/client/carte')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour aux bâtiments
          </button>
        </div>
      </div>
    )
  }

  if (!batiment) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
          <Building2 className="mx-auto h-10 w-10 text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-4">
            Le bâtiment demandé est introuvable.
          </p>
          <button
            onClick={() => router.push('/client/carte')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour aux bâtiments
          </button>
        </div>
      </div>
    )
  }

  const totalSurface = bassins.reduce((acc, b) => {
    if (b.surface_m2 != null) {
      return acc + Math.round(b.surface_m2 * 10.7639)
    }
    return acc
  }, 0)

  const bassinsAvecPolygone = bassins.filter(
    (b) =>
      b.polygone_geojson &&
      b.polygone_geojson.coordinates &&
      b.polygone_geojson.coordinates[0]?.length > 0
  ).length

  // Validation UUID en cours
  if (!batimentId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">Validation…</p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F4E79] via-[#1a4168] to-[#163555] p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Link
              href="/client/carte"
              className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
            >
              <Building2 className="h-4 w-4" />
              <span>Bâtiments</span>
            </Link>
            <span className="text-white/40">/</span>
            <span className="font-medium text-white">
              {batiment.name || 'Sans nom'}
            </span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {batiment.name || 'Bâtiment sans nom'}
                  </h1>
                  <p className="mt-0.5 text-sm text-white/70">
                    {batiment.address && <>{batiment.address}, </>}
                    {batiment.city && <>{batiment.city}, </>}
                    {batiment.postal_code}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <User className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">{clientName}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Layers className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {bassins.length} bassin{bassins.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Ruler className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {totalSurface > 0
                      ? `${totalSurface.toLocaleString('fr-CA')} pi²`
                      : 'N/D'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/client/carte"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50"
              >
                <ChevronLeft className="h-4 w-4" />
                Bâtiments
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========== LAYOUT 2 COLONNES ========== */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)] lg:items-start">
        {/* ===== COLONNE GAUCHE : LISTE DES BASSINS ===== */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                  <Layers className="h-5 w-5 text-[#1F4E79]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Bassins de toiture
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bassins.length} bassin{bassins.length !== 1 ? 's' : ''}{' '}
                    associé{bassins.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5">
            {bassins.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p className="text-sm font-medium text-slate-600 mb-2">
                  Aucun bassin pour ce bâtiment
                </p>
                <p className="text-xs text-slate-500">
                  Les bassins seront visibles une fois ajoutés par
                  l'administrateur.
                </p>
              </div>
            ) : (
              <div ref={bassinsListRef} className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {bassins.map((b) => {
                  const membraneLabel =
                    membranes.find((m) => m.id === b.membrane_type_id)?.label ??
                    'N/D'

                  const etatLabel =
                    etats.find((e) => e.id === b.etat_id)?.label ?? 'Non évalué'

                  const dureeLabel =
                    b.duree_vie_text ??
                    durees.find((d) => d.id === b.duree_vie_id)?.label ??
                    'Non définie'

                  const surfaceFt2 =
                    b.surface_m2 != null
                      ? Math.round(b.surface_m2 * 10.7639)
                      : null

                  const stateBadge = mapEtatToStateBadge(etatLabel)
                  const isHovered = hoveredBassinId === b.id
                  const hasPolygon =
                    b.polygone_geojson &&
                    b.polygone_geojson.coordinates &&
                    b.polygone_geojson.coordinates[0]?.length > 0

                  return (
                    <div
                      key={b.id}
                      data-bassin-id={b.id}
                      onMouseEnter={() => setHoveredBassinId(b.id)}
                      onMouseLeave={() => setHoveredBassinId(null)}
                      onClick={() => router.push(`/client/bassins/${b.id}`)}
                      className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                        isHovered
                          ? 'border-[#1F4E79] bg-[#1F4E79]/5 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-sm font-semibold ${
                                isHovered
                                  ? 'text-[#1F4E79]'
                                  : 'text-slate-800'
                              }`}
                            >
                              {b.name || 'Bassin sans nom'}
                            </span>
                            <StateBadge
                              state={stateBadge}
                              color={
                                etats.find((e) => e.id === b.etat_id)?.couleur ??
                                null
                              }
                              label={
                                etats.find((e) => e.id === b.etat_id)?.label ??
                                null
                              }
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5 text-slate-400" />
                              <span>{membraneLabel}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Ruler className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {surfaceFt2 != null
                                  ? `${surfaceFt2.toLocaleString(
                                      'fr-CA'
                                    )} pi²`
                                  : 'N/D'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              <span>{dureeLabel}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>{b.date_derniere_refection || '—'}</span>
                            </div>
                          </div>

                          {b.reference_interne && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                              <Hash className="h-3.5 w-3.5" />
                              <span>Réf. : {b.reference_interne}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {bassinsWithRapport.has(b.id) && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600" title="Rapport disponible">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                          )}
                          {bassinsWithGarantie.has(b.id) && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600" title="Garantie disponible">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                              hasPolygon
                                ? 'bg-green-100 text-green-600'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <MapPin className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== COLONNE DROITE : CARTE ===== */}
        <div className="lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Map className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Carte Google Maps
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bassinsAvecPolygone} polygone
                    {bassinsAvecPolygone !== 1 ? 's' : ''} visible
                    {bassinsAvecPolygone !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <BatimentBasinsMap
                center={mapCenter}
                bassins={bassins}
                etats={etats}
                hoveredBassinId={hoveredBassinId}
                onHoverBassin={setHoveredBassinId}
              />

              {bassinsAvecPolygone > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                  <p className="text-center">
                    Cliquez sur un polygone pour voir le détail du bassin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Carte Google Maps des bassins du bâtiment.
 * - fitBounds avec padding pour cadrer tous les polygones
 * - centre/zoom passés uniquement en "default" pour ne pas écraser fitBounds
 */
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
    libraries: ['drawing', 'geometry'] as ('drawing' | 'geometry')[],
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)

  const initialCenterRef = useRef(center)
  const lastFitKeyRef = useRef<string>('')

  const polygons = useMemo(() => {
    return bassins
      .filter(
        (b) =>
          b.polygone_geojson &&
          b.polygone_geojson.coordinates &&
          b.polygone_geojson.coordinates[0]?.length > 0
      )
      .map((b) => {
        const coords = b.polygone_geojson!.coordinates[0]
        const path = coords.map(([lng, lat]) => ({ lat, lng }))
        const etat = etats.find((e) => e.id === b.etat_id)
        const color = etat?.couleur || '#22c55e'
        return { id: b.id, path, color }
      })
  }, [bassins, etats])

  const polygonsKey = useMemo(() => {
    return JSON.stringify(
      polygons.map((p) => ({
        id: p.id,
        path: p.path.map((pt) => [pt.lat, pt.lng]),
      }))
    )
  }, [polygons])

  useEffect(() => {
    if (!isLoaded || !map) return

    if (polygons.length === 0) {
      lastFitKeyRef.current = ''
      return
    }

    if (lastFitKeyRef.current === polygonsKey) return
    lastFitKeyRef.current = polygonsKey

    const bounds = new google.maps.LatLngBounds()
    polygons.forEach((poly) => poly.path.forEach((p) => bounds.extend(p)))

    const padding: google.maps.Padding = {
      top: 60,
      right: 60,
      bottom: 60,
      left: 60,
    }

    map.fitBounds(bounds, padding)

    google.maps.event.addListenerOnce(map, 'idle', () => {
      const z = map.getZoom()
      if (z && z > 21) map.setZoom(21)
    })
  }, [isLoaded, map, polygons, polygonsKey])

  if (!isLoaded) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-slate-200 animate-pulse" />
          <p className="text-sm text-slate-500">Chargement de la carte…</p>
        </div>
      </div>
    )
  }

  if (polygons.length === 0) {
    return (
      <div className="flex h-[480px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
        <MapPin className="h-12 w-12 text-slate-300 mb-4" />
        <p className="text-sm font-medium text-slate-600 mb-1">
          Aucun polygone à afficher
        </p>
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Les polygones seront visibles une fois dessinés dans les fiches des
          bassins
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-slate-200">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={initialCenterRef.current}
        zoom={18}
        options={{
          mapTypeId: 'satellite',
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          tilt: 0,
          gestureHandling: 'greedy',
          scrollwheel: true,
        }}
        onLoad={(m) => {
          setMap(m)
          m.setTilt(0)
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
                fillOpacity: isHovered ? 0.75 : 0.4,
                strokeColor: poly.color,
                strokeOpacity: isHovered ? 1 : 0.9,
                strokeWeight: isHovered ? 4 : 2,
                clickable: true,
              }}
              onMouseOver={() => onHoverBassin(poly.id)}
              onMouseOut={() => onHoverBassin(null)}
              onClick={() => router.push(`/client/bassins/${poly.id}`)}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}
