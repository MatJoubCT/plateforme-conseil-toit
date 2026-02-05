'use client'

import { useEffect, useState, FormEvent, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useValidatedId } from '@/lib/hooks/useValidatedId'
import { useApiMutation } from '@/lib/hooks/useApiMutation'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import { validateCoordinates } from '@/lib/utils/validation'
import { GoogleMap, Polygon, useLoadScript } from '@react-google-maps/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Building2,
  ChevronLeft,
  Pencil,
  Trash2,
  Plus,
  Layers,
  MapPin,
  User,
  Clock,
  Hash,
  StickyNote,
  X,
  AlertTriangle,
  Map,
  Calendar,
  Ruler,
} from 'lucide-react'

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
  notes: string | null
}

type ClientOption = {
  id: string
  name: string | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string
  couleur: string | null
  ordre: number | null
}

type BassinRow = {
  id: string
  name: string | null
  membrane_type_id: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
  notes: string | null
  polygone_geojson: GeoJSONPolygon | null
}

type BatimentBasinsMapProps = {
  center: { lat: number; lng: number }
  bassins: BassinRow[]
  etats: ListeChoix[]
  hoveredBassinId: string | null
  onHoverBassin: (id: string | null) => void
}

/** mappe un libellé d'état en type pour StateBadge */
function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'

  // Normaliser pour gérer accents (très -> tres)
  const v = etat
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // IMPORTANT: traiter "tres bon" AVANT "bon"
  if (v.includes('urgent')) return 'urgent'
  if (v.includes('tres bon') || v.includes('excellent')) return 'tres_bon'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier') || v.includes('planification')) return 'planifier'

  return 'non_evalue'
}

export default function AdminBatimentDetailPage() {
  const router = useRouter()
  const batimentId = useValidatedId('/admin/batiments')

  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hoveredBassinId, setHoveredBassinId] = useState<string | null>(null)

  // Modal édition bâtiment
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editClientId, setEditClientId] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editPostalCode, setEditPostalCode] = useState('')
  const [editLatitude, setEditLatitude] = useState('')
  const [editLongitude, setEditLongitude] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Modal ajout bassin
  const [addBassinOpen, setAddBassinOpen] = useState(false)
  const [addBassinName, setAddBassinName] = useState('')
  const [addBassinMembraneId, setAddBassinMembraneId] = useState('')
  const [addBassinSurface, setAddBassinSurface] = useState('')
  const [addBassinAnnee, setAddBassinAnnee] = useState('')
  const [addBassinDerniereRef, setAddBassinDerniereRef] = useState('')
  const [addBassinEtatId, setAddBassinEtatId] = useState('')
  const [addBassinDureeId, setAddBassinDureeId] = useState('')
  const [addBassinReferenceInterne, setAddBassinReferenceInterne] =
    useState('')
  const [addBassinNotes, setAddBassinNotes] = useState('')

  // Modal suppression bâtiment
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Fonctions de refresh des données
  const fetchData = async () => {
    if (!batimentId) return

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
          clients (
            id,
            name
          )
        `
      )
      .eq('id', batimentId)
      .single()

    if (batimentError) {
      setErrorMsg(batimentError.message)
      setLoading(false)
      return
    }

    // 2) Listes de choix
    const { data: listesData, error: listesError } = await supabaseBrowser
      .from('listes_choix')
      .select('id, categorie, label, couleur, ordre')

    if (listesError) {
      setErrorMsg(listesError.message)
      setLoading(false)
      return
    }

    // 3) Bassins du bâtiment
    const { data: bassinsData, error: bassinsError } = await supabaseBrowser
      .from('bassins')
      .select(
        'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
      )
      .eq('batiment_id', batimentId)
      .order('name', { ascending: true })

    if (bassinsError) {
      setErrorMsg(bassinsError.message)
      setLoading(false)
      return
    }

    // 4) Clients
    const { data: clientsData, error: clientsError } = await supabaseBrowser
      .from('clients')
      .select('id, name')
      .order('name', { ascending: true })

    if (clientsError) {
      setErrorMsg(clientsError.message)
      setLoading(false)
      return
    }

    setBatiment(batimentData as BatimentRow)
    setListes(listesData || [])
    setBassins((bassinsData || []) as BassinRow[])
    setClients((clientsData || []) as ClientOption[])
    setLoading(false)
  }

  // Hooks de mutation
  const { mutate: updateBatiment, isLoading: editSaving, error: editError, resetError: resetEditError } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/batiments/update',
    defaultErrorMessage: 'Erreur lors de la modification du bâtiment',
    onSuccess: async (data) => {
      if (data.data) {
        setBatiment(data.data as BatimentRow)
      } else {
        await fetchData()
      }
      setEditOpen(false)
    }
  })

  const { mutate: createBassin, isLoading: addBassinSaving, error: addBassinError, resetError: resetAddBassinError } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/bassins/create',
    defaultErrorMessage: 'Erreur lors de l\'ajout du bassin',
    onSuccess: async () => {
      await fetchData()
      setAddBassinOpen(false)
    }
  })

  const { mutate: deleteBatiment, isLoading: deleteSaving, error: deleteError, resetError: resetDeleteError } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/batiments/delete',
    defaultErrorMessage: 'Erreur lors de la suppression du bâtiment',
    onSuccess: () => {
      setDeleteOpen(false)
      router.push('/admin/batiments')
    }
  })

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
          clients (
            id,
            name
          )
        `
        )
        .eq('id', batimentId)
        .single()

      if (batimentError) {
        setErrorMsg(batimentError.message)
        setLoading(false)
        return
      }

      // 2) Listes de choix
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur, ordre')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      // 3) Bassins du bâtiment
      const { data: bassinsData, error: bassinsError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
        )
        .eq('batiment_id', batimentId)
        .order('name', { ascending: true })

      if (bassinsError) {
        setErrorMsg(bassinsError.message)
        setLoading(false)
        return
      }

      // 4) Clients
      const { data: clientsData, error: clientsError } = await supabaseBrowser
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (clientsError) {
        setErrorMsg(clientsError.message)
        setLoading(false)
        return
      }

      setBatiment(batimentData as BatimentRow)
      setListes(listesData || [])
      setBassins((bassinsData || []) as BassinRow[])
      setClients((clientsData || []) as ClientOption[])
      setLoading(false)
    }

    void fetchData()
  }, [batimentId])

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

  const membranes = listes
    .filter((l) => l.categorie === 'membrane')
    .slice()
    .sort(
      (a, b) =>
        (a.ordre ?? 999999) - (b.ordre ?? 999999) ||
        (a.label || '').localeCompare(b.label || '', 'fr-CA')
    )

  const etats = listes
    .filter((l) => l.categorie === 'etat_bassin')
    .slice()
    .sort(
      (a, b) =>
        (a.ordre ?? 999999) - (b.ordre ?? 999999) ||
        (a.label || '').localeCompare(b.label || '', 'fr-CA')
    )

  const durees = listes
    .filter((l) => l.categorie === 'duree_vie')
    .slice()
    .sort(
      (a, b) =>
        (a.ordre ?? 999999) - (b.ordre ?? 999999) ||
        (a.label || '').localeCompare(b.label || '', 'fr-CA')
    )

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
            onClick={() => router.push('/admin/batiments')}
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
            onClick={() => router.push('/admin/batiments')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour aux bâtiments
          </button>
        </div>
      </div>
    )
  }

  const clientName =
    (batiment as any).clients?.name ??
    clients.find((c) => c.id === batiment.client_id)?.name ??
    'Client non défini'

  const openEditModal = () => {
    resetEditError()
    setEditName(batiment.name || '')
    setEditClientId(batiment.client_id || '')
    setEditAddress(batiment.address || '')
    setEditCity(batiment.city || '')
    setEditPostalCode(batiment.postal_code || '')
    setEditLatitude(batiment.latitude != null ? String(batiment.latitude) : '')
    setEditLongitude(
      batiment.longitude != null ? String(batiment.longitude) : ''
    )
    setEditNotes(batiment.notes || '')
    setEditOpen(true)
  }

  const handleEditOpenChange = (open: boolean) => {
    if (editSaving) return
    setEditOpen(open)
    if (!open) {
      resetEditError()
    }
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const { latitude, longitude, error: coordError } = validateCoordinates(editLatitude, editLongitude)

    if (coordError) {
      // On pourrait gérer ça autrement, mais pour l'instant on laisse comme ça
      return
    }

    await updateBatiment({
      id: batiment.id,
      name: editName || null,
      clientId: editClientId || null,
      address: editAddress || null,
      city: editCity || null,
      postalCode: editPostalCode || null,
      latitude,
      longitude,
      notes: editNotes || null,
    })
  }

  const openAddBassinModal = () => {
    setAddBassinName('')
    setAddBassinMembraneId('')
    setAddBassinSurface('')
    setAddBassinAnnee('')
    setAddBassinDerniereRef('')
    setAddBassinEtatId('')
    setAddBassinDureeId('')
    setAddBassinReferenceInterne('')
    setAddBassinNotes('')
    resetAddBassinError()
    setAddBassinOpen(true)
  }

  const handleAddBassinOpenChange = (open: boolean) => {
    if (addBassinSaving) return
    setAddBassinOpen(open)
    if (!open) {
      resetAddBassinError()
    }
  }

  const openDeleteModal = () => {
    resetDeleteError()
    setDeleteConfirmText('')
    setDeleteOpen(true)
  }

  const handleDeleteOpenChange = (open: boolean) => {
    if (deleteSaving) return
    setDeleteOpen(open)
    if (!open) {
      resetDeleteError()
      setDeleteConfirmText('')
    }
  }

  const handleConfirmDelete = async () => {
    if (!batimentId) return

    // 1) Bloquer si des bassins sont encore liés (UI + sécurité)
    if (bassins.length > 0) {
      // On pourrait utiliser un toast ici ou juste laisser le deleteError du hook
      return
    }

    // 2) Confirmation texte
    if (deleteConfirmText.trim().toUpperCase() !== 'SUPPRIMER') {
      // On pourrait gérer ça avec un état local ou ignorer
      return
    }

    // 3) Re-vérification côté BD pour éviter tout contournement (optionnel, l'API le fait aussi)
    const { count, error: countError } = await supabaseBrowser
      .from('bassins')
      .select('id', { count: 'exact', head: true })
      .eq('batiment_id', batimentId)

    if (countError || (count ?? 0) > 0) {
      // L'API fera également cette vérification
      return
    }

    await deleteBatiment({ id: batimentId })
  }

  const handleAddBassinSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!batimentId) return

    if (!addBassinName.trim()) {
      // On pourrait utiliser une validation Zod ici
      return
    }

    const surface =
      addBassinSurface.trim() !== '' ? Number(addBassinSurface.trim()) : null
    const annee =
      addBassinAnnee.trim() !== '' ? Number(addBassinAnnee.trim()) : null

    const payload = {
      batimentId: batimentId,
      name: addBassinName || null,
      membraneTypeId:
        addBassinMembraneId.trim() !== ''
          ? addBassinMembraneId.trim()
          : null,
      surfaceM2: surface,
      anneeInstallation: annee,
      dateDerniereRefection:
        addBassinDerniereRef.trim() !== ''
          ? addBassinDerniereRef.trim()
          : null,
      etatId: addBassinEtatId.trim() !== '' ? addBassinEtatId.trim() : null,
      dureeVieId:
        addBassinDureeId.trim() !== '' ? addBassinDureeId.trim() : null,
      dureeVieText: null,
      referenceInterne:
        addBassinReferenceInterne.trim() !== ''
          ? addBassinReferenceInterne.trim()
          : null,
      notes: addBassinNotes.trim() !== '' ? addBassinNotes.trim() : null,
      polygoneGeojson: null,
    }

    await createBassin(payload)
  }

  // Calcul des stats
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

  return (
    <section className="space-y-6">
      {/* ========== HEADER ========== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F4E79] via-[#1a4168] to-[#163555] p-6 shadow-xl">
        {/* Décoration background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10">
          {/* Breadcrumb */}
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Link
              href="/admin/batiments"
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

          {/* Titre + actions */}
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

              {/* Stats rapides */}
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

            {/* Boutons d'action */}
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/batiments"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50"
              >
                <ChevronLeft className="h-4 w-4" />
                Bâtiments
              </Link>
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1F4E79] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={deleteSaving}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/50 bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-red-500/30 disabled:opacity-60"
                title={
                  bassins.length > 0
                    ? 'Impossible de supprimer : des bassins sont reliés à ce bâtiment.'
                    : 'Supprimer ce bâtiment'
                }
              >
                <Trash2 className="h-4 w-4 text-white" />
                Supprimer
              </button>
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
              <button
                type="button"
                onClick={openAddBassinModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F4E79] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#163555]"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>
          </div>

          <div className="p-5">
            {bassins.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                <Layers className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                <p className="text-sm font-medium text-slate-600 mb-2">
                  Aucun bassin pour ce bâtiment
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Commencez par ajouter un premier bassin de toiture
                </p>
                <button
                  type="button"
                  onClick={openAddBassinModal}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1F4E79] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#163555]"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter un bassin
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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
                      onMouseEnter={() => setHoveredBassinId(b.id)}
                      onMouseLeave={() => setHoveredBassinId(null)}
                      onClick={() => router.push(`/admin/bassins/${b.id}`)}
                      className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                        isHovered
                          ? 'border-[#1F4E79] bg-[#1F4E79]/5 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Nom + état */}
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
                              color={etats.find((e) => e.id === b.etat_id)?.couleur ?? null}
                              label={etats.find((e) => e.id === b.etat_id)?.label ?? null}
                            />
                          </div>

                          {/* Infos secondaires */}
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

                          {/* Référence interne */}
                          {b.reference_interne && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                              <Hash className="h-3.5 w-3.5" />
                              <span>Réf. : {b.reference_interne}</span>
                            </div>
                          )}
                        </div>

                        {/* Indicateur polygone */}
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

              {/* Légende */}
              {bassinsAvecPolygone > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                  <p className="text-center">
                    Cliquez sur un polygone pour voir le détail du bassin
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes du bâtiment */}
          {batiment.notes && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <StickyNote className="h-5 w-5 text-amber-600" />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Notes du bâtiment
                  </h2>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                  {batiment.notes}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Modal suppression bâtiment */}
      <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <DialogTitle>Supprimer ce bâtiment ?</DialogTitle>
                <p className="mt-1 text-sm text-slate-500">
                  Cette action est irréversible
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              {bassins.length > 0 ? (
                <p className="text-sm text-red-700">
                  Suppression impossible : ce bâtiment contient encore{' '}
                  <span className="font-semibold">
                    {bassins.length} bassin{bassins.length !== 1 ? 's' : ''}
                  </span>
                  . Vous devez d'abord supprimer ou déplacer les bassins.
                </p>
              ) : (
                <p className="text-sm text-red-700">
                  Le bâtiment sera définitivement supprimé.
                </p>
              )}
            </div>

            {deleteError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}

            {bassins.length === 0 && (
              <>
                <p className="text-sm font-medium text-slate-700">
                  Pour confirmer, écrivez{' '}
                  <span className="font-bold text-red-600">SUPPRIMER</span>
                </p>

                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm uppercase tracking-wide transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </>
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={deleteSaving}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={
                deleteSaving ||
                bassins.length > 0 ||
                deleteConfirmText.trim().toUpperCase() !== 'SUPPRIMER'
              }
              className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-600 hover:shadow-lg disabled:opacity-50"
            >
              {deleteSaving ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal édition bâtiment */}
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le bâtiment</DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              Mettez à jour les informations générales et le client associé
            </p>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5">
            {editError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{editError}</p>
              </div>
            )}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Nom du bâtiment <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Client
                </label>
                <select
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="">Aucun client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Adresse
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLatitude}
                    onChange={(e) => setEditLatitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={editLongitude}
                    onChange={(e) => setEditLongitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Notes internes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleEditOpenChange(false)}
                disabled={editSaving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {editSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal ajout bassin */}
      <Dialog open={addBassinOpen} onOpenChange={handleAddBassinOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un bassin</DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              Le polygone sera dessiné par la suite dans la fiche du bassin
            </p>
          </DialogHeader>

          <form onSubmit={handleAddBassinSubmit} className="space-y-5">
            {addBassinError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{addBassinError}</p>
              </div>
            )}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Nom du bassin <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addBassinName}
                  onChange={(e) => setAddBassinName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Type de membrane
                  </label>
                  <select
                    value={addBassinMembraneId}
                    onChange={(e) => setAddBassinMembraneId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="">Non défini</option>
                    {membranes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Surface (pi²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addBassinSurface}
                    onChange={(e) => setAddBassinSurface(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Année d'installation
                  </label>
                  <input
                    type="number"
                    value={addBassinAnnee}
                    onChange={(e) => setAddBassinAnnee(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Date de la dernière réfection
                  </label>
                  <input
                    type="date"
                    value={addBassinDerniereRef}
                    onChange={(e) => setAddBassinDerniereRef(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    État du bassin
                  </label>
                  <select
                    value={addBassinEtatId}
                    onChange={(e) => setAddBassinEtatId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="">Non défini</option>
                    {etats.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Durée de vie
                  </label>
                  <select
                    value={addBassinDureeId}
                    onChange={(e) => setAddBassinDureeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="">Ex.: ± 5 à 7 ans</option>
                    {durees.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Référence interne
                </label>
                <input
                  type="text"
                  value={addBassinReferenceInterne}
                  onChange={(e) => setAddBassinReferenceInterne(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Notes internes
                </label>
                <textarea
                  rows={3}
                  value={addBassinNotes}
                  onChange={(e) => setAddBassinNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleAddBassinOpenChange(false)}
                disabled={addBassinSaving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={addBassinSaving}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {addBassinSaving ? 'Ajout en cours…' : 'Ajouter'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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

  // IMPORTANT: garder le center initial pour éviter tout "recenter" sur re-render (hover, etc.)
  const initialCenterRef = useRef(center)

  // IMPORTANT: refaire fitBounds seulement si les polygones changent (ajout/modif/suppression)
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

  // "signature" stable des polygones pour savoir si on doit refit
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

    // Ne refit pas si rien n'a changé (ex: hover)
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
        // IMPORTANT: center/zoom => contrôlé pour éviter les re-renders inutiles
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
              onClick={() => router.push(`/admin/bassins/${poly.id}`)}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}


