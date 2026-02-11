'use client'

import { useEffect, useMemo, useState, FormEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useValidatedId } from '@/lib/hooks/useValidatedId'
import { useApiMutation } from '@/lib/hooks/useApiMutation'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import BassinMap, { InterventionMarker } from '@/components/maps/BassinMap'
import BassinCompositionCard from '@/components/bassins/BassinCompositionCard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Info,
  Wrench,
  FileText,
  ChevronLeft,
  Pencil,
  Trash2,
  Plus,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Shield,
  FileCheck,
  X,
  AlertTriangle,
  Building2,
  Upload,
  Eye,
  Download,
  StickyNote,
  Hash,
} from 'lucide-react'

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

type GeoJSONPoint = {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  membrane_type_id: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  couvreur_id: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
  notes: string | null
  polygone_geojson: GeoJSONPolygon | null
}

type BatimentRow = {
  id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
}

type ListeChoix = {
  id: string
  categorie: string
  label: string | null
  couleur: string | null
  ordre?: number | null
}

type GarantieRow = {
  id: string
  bassin_id: string | null
  type_garantie_id: string | null
  fournisseur: string | null
  numero_garantie: string | null
  date_debut: string | null
  date_fin: string | null
  statut_id: string | null
  couverture: string | null
  commentaire: string | null
  fichier_pdf_url: string | null
}

type EntrepriseRow = {
  id: string
  type: string | null
  nom: string | null
}

type RapportRow = {
  id: string
  bassin_id: string | null
  type_id: string | null
  date_rapport: string | null
  numero_ct: string | null
  titre: string | null
  description: string | null
  file_url: string | null
}

type InterventionRow = {
  id: string
  bassin_id: string
  date_intervention: string
  type_intervention_id: string | null
  commentaire: string | null
  location_geojson: GeoJSONPoint | null
  created_at: string
}

type InterventionFichierRow = {
  id: string
  intervention_id: string
  file_path: string
  file_name: string | null
  mime_type: string | null
  created_at: string
}

type InterventionWithFiles = InterventionRow & {
  files: InterventionFichierRow[]
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

function safePointFromGeoJSON(p: any): { lat: number; lng: number } | null {
  if (!p) return null
  if (typeof p !== 'object') return null
  if (p.type !== 'Point') return null
  if (!Array.isArray(p.coordinates) || p.coordinates.length < 2) return null
  const [lng, lat] = p.coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return { lat, lng }
}

function toGeoJSONPoint(pos: { lat: number; lng: number } | null): GeoJSONPoint | null {
  if (!pos) return null
  return { type: 'Point', coordinates: [pos.lng, pos.lat] }
}

function sanitizeStorageKey(name: string) {
  const n = (name || 'fichier')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[/\\]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return n.length ? n : 'fichier'
}

export default function AdminBassinDetailPage() {
  const router = useRouter()
  const bassinId = useValidatedId('/admin/bassins')

  const [bassin, setBassin] = useState<BassinRow | null>(null)
  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [garanties, setGaranties] = useState<GarantieRow[]>([])
  const [couvreurs, setCouvreurs] = useState<EntrepriseRow[]>([])
  const [rapports, setRapports] = useState<RapportRow[]>([])
  const [interventions, setInterventions] = useState<InterventionWithFiles[]>([])
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null)
  const [garantieProche, setGarantieProche] = useState<GarantieRow | null>(null)

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Onglets documents
  const [activeDocTab, setActiveDocTab] = useState<'garanties' | 'rapports'>('garanties')

  // Modal ajout/modif garantie
  const [showModal, setShowModal] = useState(false)
  const [editingGarantie, setEditingGarantie] = useState<GarantieRow | null>(null)
  const [modalTitle, setModalTitle] = useState('Nouvelle garantie')
  const [formTypeGarantieId, setFormTypeGarantieId] = useState('')
  const [formFournisseur, setFormFournisseur] = useState('')
  const [formNumero, setFormNumero] = useState('')
  const [formDateDebut, setFormDateDebut] = useState('')
  const [formDateFin, setFormDateFin] = useState('')
  const [formStatutId, setFormStatutId] = useState('')
  const [formCouverture, setFormCouverture] = useState('')
  const [formCommentaire, setFormCommentaire] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  // Modal rapports
  const [showRapportModal, setShowRapportModal] = useState(false)
  const [editingRapport, setEditingRapport] = useState<RapportRow | null>(null)
  const [rapportModalTitle, setRapportModalTitle] = useState('Nouveau rapport')
  const [formTypeRapportId, setFormTypeRapportId] = useState('')
  const [formDateRapport, setFormDateRapport] = useState('')
  const [formNumeroRapport, setFormNumeroRapport] = useState('')
  const [formCommentaireRapport, setFormCommentaireRapport] = useState('')
  const [rapportPdfFile, setRapportPdfFile] = useState<File | null>(null)

  // Édition bassin
  const [showEditBassinModal, setShowEditBassinModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMembraneId, setEditMembraneId] = useState('')
  const [editCouvreurId, setEditCouvreurId] = useState('')
  const [editAnnee, setEditAnnee] = useState('')
  const [editDateDerniere, setEditDateDerniere] = useState('')
  const [editEtatId, setEditEtatId] = useState('')
  const [editDureeId, setEditDureeId] = useState('')
  const [editReference, setEditReference] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Modal confirmation suppression bassin
  const [showDeleteBassinModal, setShowDeleteBassinModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Modals confirmation suppression (même pattern que page-materiaux.tsx)
  const [confirmDeleteIntervention, setConfirmDeleteIntervention] =
    useState<InterventionWithFiles | null>(null)

  const [confirmDeleteGarantie, setConfirmDeleteGarantie] = useState<GarantieRow | null>(null)

  const [confirmDeleteRapport, setConfirmDeleteRapport] = useState<RapportRow | null>(null)

  const [confirmDeleteFile, setConfirmDeleteFile] = useState<InterventionFichierRow | null>(null)

  // Interventions — éditeur inline
  const [showInterventionEditor, setShowInterventionEditor] = useState(false)
  const [editingIntervention, setEditingIntervention] = useState<InterventionWithFiles | null>(
    null
  )
  const [intDate, setIntDate] = useState('')
  const [intTypeId, setIntTypeId] = useState('')
  const [intCommentaire, setIntCommentaire] = useState('')
  const [intLocation, setIntLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [intPickEnabled, setIntPickEnabled] = useState(false)
  const [intNewFiles, setIntNewFiles] = useState<File[]>([])
  const [busyFileIds, setBusyFileIds] = useState<Record<string, boolean>>({})

  // Modal images
  const [modalImagesOpen, setModalImagesOpen] = useState(false)
  const [selectedInterventionForImages, setSelectedInterventionForImages] =
    useState<InterventionWithFiles | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  // ==================== HOOKS useApiMutation ====================

  // Bassin mutations
  const { mutate: updateBassinApi, isLoading: isUpdatingBassin } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/bassins/update',
    defaultErrorMessage: 'Erreur lors de la modification du bassin',
  })

  const { mutate: deleteBassinApi, isLoading: isDeletingBassin } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/bassins/delete',
    defaultErrorMessage: 'Erreur lors de la suppression du bassin',
  })

  // Garantie mutations
  const { mutate: createGarantieApi, isLoading: isCreatingGarantie } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/garanties/create',
    defaultErrorMessage: 'Erreur lors de la création de la garantie',
  })

  const { mutate: updateGarantieApi, isLoading: isUpdatingGarantie } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/garanties/update',
    defaultErrorMessage: 'Erreur lors de la modification de la garantie',
  })

  const { mutate: deleteGarantieApi, isLoading: isDeletingGarantie } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/garanties/delete',
    defaultErrorMessage: 'Erreur lors de la suppression de la garantie',
  })

  // Intervention mutations
  const { mutate: createInterventionApi, isLoading: isCreatingIntervention } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/interventions/create',
    defaultErrorMessage: 'Erreur lors de la création de l\'intervention',
  })

  const { mutate: updateInterventionApi, isLoading: isUpdatingIntervention } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/interventions/update',
    defaultErrorMessage: 'Erreur lors de la modification de l\'intervention',
  })

  const { mutate: deleteInterventionApi, isLoading: isDeletingIntervention } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/interventions/delete',
    defaultErrorMessage: 'Erreur lors de la suppression de l\'intervention',
  })

  const { mutate: deleteFileApi, isLoading: isDeletingFile } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/interventions/delete-file',
    defaultErrorMessage: 'Erreur lors de la suppression du fichier',
  })

  // Rapport mutations
  const { mutate: createRapportApi, isLoading: isCreatingRapport } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/rapports/create',
    defaultErrorMessage: 'Erreur lors de la création du rapport',
  })

  const { mutate: updateRapportApi, isLoading: isUpdatingRapport } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/rapports/update',
    defaultErrorMessage: 'Erreur lors de la modification du rapport',
  })

  const { mutate: deleteRapportApi, isLoading: isDeletingRapport } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/rapports/delete',
    defaultErrorMessage: 'Erreur lors de la suppression du rapport',
  })

  // ==================== FIN HOOKS ====================

  useEffect(() => {
    if (!bassinId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bassin
      const { data: bassinData, error: bassinError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, batiment_id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson, couvreur_id'
        )
        .eq('id', bassinId)
        .single()

      if (bassinError) {
        setErrorMsg(bassinError.message)
        setLoading(false)
        return
      }

      // 2) Bâtiment
      let batData: BatimentRow | null = null
      if (bassinData?.batiment_id) {
        const { data, error } = await supabaseBrowser
          .from('batiments')
          .select('id, name, address, city, postal_code, latitude, longitude')
          .eq('id', bassinData.batiment_id)
          .single()
        if (!error && data) {
          batData = data as BatimentRow
        }
      }

      // 3) Listes de choix
      const { data: listesData, error: listesError } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, label, couleur, ordre')

      if (listesError) {
        setErrorMsg(listesError.message)
        setLoading(false)
        return
      }

      // 3.1) Entreprises (couvreurs)
      const { data: couvreursData, error: couvreursError } = await supabaseBrowser
        .from('entreprises')
        .select('id, type, nom')
        .eq('type', 'couvreur')
        .order('nom', { ascending: true })

      if (couvreursError) {
        setErrorMsg(couvreursError.message)
        setLoading(false)
        return
      }

      // 4) Garanties du bassin
      const { data: garantiesData, error: garantiesError } = await supabaseBrowser
        .from('garanties')
        .select(
          'id, bassin_id, type_garantie_id, fournisseur, numero_garantie, date_debut, date_fin, statut_id, couverture, commentaire, fichier_pdf_url'
        )
        .eq('bassin_id', bassinId)
        .order('date_debut', { ascending: true })

      if (garantiesError) {
        setErrorMsg(garantiesError.message)
        setLoading(false)
        return
      }

      // Trouver la garantie avec date de fin la plus proche
      if (garantiesData && garantiesData.length > 0) {
        const garantiesAvecDate = (garantiesData as GarantieRow[])
          .filter((g) => g.date_fin)
          .sort((a, b) => {
            if (!a.date_fin || !b.date_fin) return 0
            return (
              new Date(a.date_fin + 'T00:00:00').getTime() -
              new Date(b.date_fin + 'T00:00:00').getTime()
            )
          })

        setGarantieProche(garantiesAvecDate.length > 0 ? garantiesAvecDate[0] : null)
      } else {
        setGarantieProche(null)
      }

      // 5) Rapports du bassin
      const { data: rapportsData, error: rapportsError } = await supabaseBrowser
        .from('rapports')
        .select('id, bassin_id, type_id, date_rapport, numero_ct, titre, description, file_url')
        .eq('bassin_id', bassinId)
        .order('date_rapport', { ascending: false })

      if (rapportsError) {
        setErrorMsg(rapportsError.message)
        setLoading(false)
        return
      }

      // 6) Interventions + fichiers
      const { data: intData, error: intError } = await supabaseBrowser
        .from('interventions')
        .select('id, bassin_id, date_intervention, type_intervention_id, commentaire, location_geojson, created_at')
        .eq('bassin_id', bassinId)
        .order('date_intervention', { ascending: false })
        .order('created_at', { ascending: false })

      if (intError) {
        setErrorMsg(intError.message)
        setLoading(false)
        return
      }

      const intRows = (intData || []) as InterventionRow[]
      const ids = intRows.map((i) => i.id)

      let filesRows: InterventionFichierRow[] = []
      if (ids.length > 0) {
        const { data: filesData, error: filesError } = await supabaseBrowser
          .from('intervention_fichiers')
          .select('id, intervention_id, file_path, file_name, mime_type, created_at')
          .in('intervention_id', ids)
          .order('created_at', { ascending: true })

        if (filesError) {
          setErrorMsg(filesError.message)
          setLoading(false)
          return
        }
        filesRows = (filesData || []) as InterventionFichierRow[]
      }

      const filesByIntervention: Record<string, InterventionFichierRow[]> = {}
      filesRows.forEach((f) => {
        if (!filesByIntervention[f.intervention_id]) filesByIntervention[f.intervention_id] = []
        filesByIntervention[f.intervention_id].push(f)
      })

      const combined: InterventionWithFiles[] = intRows.map((i) => ({
        ...i,
        location_geojson: (i.location_geojson as any) ?? null,
        files: filesByIntervention[i.id] || [],
      }))

      setBassin(bassinData as BassinRow)
      setBatiment(batData)
      setListes((listesData || []) as ListeChoix[])
      setCouvreurs((couvreursData || []) as EntrepriseRow[])
      setGaranties((garantiesData || []) as GarantieRow[])
      setRapports((rapportsData || []) as RapportRow[])
      setInterventions(combined)
      setLoading(false)
    }

    void fetchData()
  }, [bassinId])

  // Charger les URLs signées des images lorsque le modal s'ouvre
  useEffect(() => {
    if (!modalImagesOpen || !selectedInterventionForImages) {
      setImageUrls({})
      return
    }

    const imageFiles = (selectedInterventionForImages.files || []).filter((f) =>
      f.mime_type?.startsWith('image/')
    )

    if (imageFiles.length === 0) {
      return
    }

    // Fonction pour obtenir l'URL signée d'une image
    const getImageThumbnailUrl = async (filePath: string): Promise<string> => {
      try {
        const { data, error } = await supabaseBrowser.storage
          .from('interventions')
          .createSignedUrl(filePath, 3600) // URL valide pour 1 heure

        if (error) throw error
        return data.signedUrl
      } catch (err) {
        console.error('Erreur création URL signée:', err)
        return ''
      }
    }

    // Charger les URLs signées pour toutes les images
    Promise.all(
      imageFiles.map(async (file) => {
        const url = await getImageThumbnailUrl(file.file_path)
        return { id: file.id, url }
      })
    )
      .then((results) => {
        const urlMap = results.reduce((acc, { id, url }) => {
          acc[id] = url
          return acc
        }, {} as Record<string, string>)
        setImageUrls(urlMap)
      })
      .catch((err) => {
        console.error('Erreur chargement URLs images:', err)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalImagesOpen, selectedInterventionForImages])

  // Listes de choix garanties / rapports
  const typesGarantie = listes.filter((l) => l.categorie === 'type_garantie')
  const statutsGarantie = listes.filter((l) => l.categorie === 'statut_garantie')
  const typesRapport = listes.filter((l) => l.categorie === 'type_rapport')

  // Interventions - type_interventions
  const typesInterventions = useMemo(() => {
    const arr = listes.filter((l) => l.categorie === 'type_interventions')
    return arr.slice().sort((a, b) => (a.label || '').localeCompare(b.label || '', 'fr-CA'))
  }, [listes])

  const labelFromId = (
    category: 'type_garantie' | 'statut_garantie' | 'type_rapport',
    id: string | null
  ) => {
    if (!id) return ''
    let arr: ListeChoix[]
    if (category === 'type_garantie') arr = typesGarantie
    else if (category === 'statut_garantie') arr = statutsGarantie
    else arr = typesRapport
    return arr.find((l) => l.id === id)?.label ?? ''
  }

  const typeInterventionLabel = (id: string | null) => {
    if (!id) return ''
    return typesInterventions.find((t) => t.id === id)?.label ?? ''
  }

  // Listes de choix pour état / durée de vie du bassin
  const etatsBassin = useMemo(() => {
    const arr = listes.filter((l) => ['etat_bassin', 'etat_toiture', 'etat'].includes(l.categorie))
    return arr
      .slice()
      .sort((a, b) => (a.ordre ?? 999999) - (b.ordre ?? 999999) || (a.label || '').localeCompare(b.label || '', 'fr-CA'))
  }, [listes])

  const dureesBassin = useMemo(() => {
    const arr = listes.filter((l) =>
      ['duree_vie_bassin', 'duree_vie_toiture', 'duree_vie'].includes(l.categorie)
    )
    return arr
      .slice()
      .sort((a, b) => (a.ordre ?? 999999) - (b.ordre ?? 999999) || (a.label || '').localeCompare(b.label || '', 'fr-CA'))
  }, [listes])

  const membranesBassin = useMemo(() => {
    const arr = listes.filter((l) => l.categorie === 'membrane')
    return arr
      .slice()
      .sort((a, b) => (a.ordre ?? 999999) - (b.ordre ?? 999999) || (a.label || '').localeCompare(b.label || '', 'fr-CA'))
  }, [listes])

  // Couleur du polygone selon l'état / durée de vie
  const couleurEtat: string | undefined = (() => {
    if (!bassin) return undefined

    const etatId = bassin.etat_id
    const dureeId = bassin.duree_vie_id

    const preferEtatCategories = ['etat_bassin', 'etat_toiture', 'etat']
    const preferDureeCategories = ['duree_vie_bassin', 'duree_vie_toiture', 'duree_vie']

    if (etatId) {
      const match =
        listes.find((l) => l.id === etatId && preferEtatCategories.includes(l.categorie)) ||
        listes.find((l) => l.id === etatId)

      if (match?.couleur) return match.couleur
    }

    if (dureeId) {
      const match =
        listes.find((l) => l.id === dureeId && preferDureeCategories.includes(l.categorie)) ||
        listes.find((l) => l.id === dureeId)

      if (match?.couleur) return match.couleur
    }

    return undefined
  })()

  // Centre de la carte
  const mapCenter = (() => {
    if (
      bassin?.polygone_geojson &&
      Array.isArray(bassin.polygone_geojson.coordinates) &&
      bassin.polygone_geojson.coordinates[0] &&
      bassin.polygone_geojson.coordinates[0].length > 0
    ) {
      const ring = bassin.polygone_geojson.coordinates[0]
      let sumLat = 0
      let sumLng = 0

      ring.forEach(([lng, lat]) => {
        sumLat += lat
        sumLng += lng
      })

      const count = ring.length || 1
      return { lat: sumLat / count, lng: sumLng / count }
    }

    if (batiment?.latitude != null && batiment?.longitude != null) {
      return { lat: batiment.latitude, lng: batiment.longitude }
    }

    return { lat: 46.35, lng: -72.55 }
  })()

  // Markers interventions
  const interventionMarkers: InterventionMarker[] = useMemo(() => {
    return interventions
      .map((i) => {
        const pos = safePointFromGeoJSON(i.location_geojson as any)
        if (!pos) return null
        const typeLabel = typeInterventionLabel(i.type_intervention_id)
        const title = `${i.date_intervention}${typeLabel ? ' — ' + typeLabel : ''}`
        return { id: i.id, position: pos, title } as InterventionMarker
      })
      .filter(Boolean) as InterventionMarker[]
  }, [interventions, typesInterventions])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPdfFile(file)
  }

  const handleRapportFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setRapportPdfFile(file)
  }

  const openModal = (garantie?: GarantieRow) => {
    if (garantie) {
      setEditingGarantie(garantie)
      setModalTitle('Modifier la garantie')

      setFormTypeGarantieId(garantie.type_garantie_id || '')
      setFormFournisseur(garantie.fournisseur || '')
      setFormNumero(garantie.numero_garantie || '')
      setFormDateDebut(garantie.date_debut || '')
      setFormDateFin(garantie.date_fin || '')
      setFormStatutId(garantie.statut_id || '')
      setFormCouverture(garantie.couverture || '')
      setFormCommentaire(garantie.commentaire || '')
      setPdfFile(null)
    } else {
      setEditingGarantie(null)
      setModalTitle('Nouvelle garantie')

      setFormTypeGarantieId('')
      setFormFournisseur('')
      setFormNumero('')
      setFormDateDebut('')
      setFormDateFin('')
      setFormStatutId('')
      setFormCouverture('')
      setFormCommentaire('')
      setPdfFile(null)
    }

    setShowModal(true)
  }

  const closeModal = () => {
    if (isCreatingGarantie || isUpdatingGarantie) return
    setShowModal(false)
    setEditingGarantie(null)
  }

  const openRapportModal = (rapport?: RapportRow) => {
    if (rapport) {
      setEditingRapport(rapport)
      setRapportModalTitle('Modifier le rapport')

      setFormTypeRapportId(rapport.type_id || '')
      setFormDateRapport(rapport.date_rapport || '')
      setFormNumeroRapport(rapport.numero_ct || '')
      setFormCommentaireRapport(rapport.description || '')
      setRapportPdfFile(null)
    } else {
      setEditingRapport(null)
      setRapportModalTitle('Nouveau rapport')

      setFormTypeRapportId('')
      setFormDateRapport('')
      setFormNumeroRapport('')
      setFormCommentaireRapport('')
      setRapportPdfFile(null)
    }

    setShowRapportModal(true)
  }

  const closeRapportModal = () => {
    if (isCreatingRapport || isUpdatingRapport) return
    setShowRapportModal(false)
    setEditingRapport(null)
  }

  const handleSubmitGarantie = async (e: FormEvent) => {
    e.preventDefault()

    if (!bassin || !bassin.id) {
      alert('Bassin introuvable (id manquant).')
      return
    }

    // 1) Gestion du PDF
    let fichierUrl: string | null = editingGarantie?.fichier_pdf_url ?? null

    if (pdfFile) {
      const ext = pdfFile.name.split('.').pop() || 'pdf'
      const safeName = sanitizeStorageKey(pdfFile.name)
      const path = `${bassin.id}/${crypto.randomUUID()}-${safeName}.${ext}`

      const { error: uploadError } = await supabaseBrowser.storage.from('garanties').upload(path, pdfFile, {
        upsert: false,
      })

      if (uploadError) {
        alert('Erreur lors du téléversement du PDF : ' + uploadError.message)
        return
      }

      const { data: publicData } = supabaseBrowser.storage.from('garanties').getPublicUrl(path)
      // S'assurer que l'URL n'est pas une chaîne vide
      fichierUrl = publicData?.publicUrl && publicData.publicUrl.trim() !== '' ? publicData.publicUrl : null
    }

    // 2) Champs UUID sécurisés
    const safeTypeGarantieId = formTypeGarantieId && formTypeGarantieId.trim() !== '' ? formTypeGarantieId : null
    const safeStatutId = formStatutId && formStatutId.trim() !== '' ? formStatutId : null

    // 3) Payload (camelCase for API)
    const payload = {
      bassinId: bassin.id,
      typeGarantieId: safeTypeGarantieId,
      fournisseur: formFournisseur || null,
      numeroGarantie: formNumero || null,
      dateDebut: formDateDebut || null,
      dateFin: formDateFin || null,
      statutId: safeStatutId,
      couverture: formCouverture || null,
      commentaire: formCommentaire || null,
      fichierPdfUrl: fichierUrl,
    }

    const badUuidFields: string[] = []
    if ((payload.bassinId as any) === 'undefined') badUuidFields.push('bassinId')
    if ((payload.typeGarantieId as any) === 'undefined') badUuidFields.push('typeGarantieId')
    if ((payload.statutId as any) === 'undefined') badUuidFields.push('statutId')

    if (badUuidFields.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.error('BUG: champs uuid = "undefined" dans payload', { payload, badUuidFields })
      }
      alert('BUG interne: un champ uuid vaut "undefined" (voir console).')
      return
    }

    if (editingGarantie && editingGarantie.id) {
      // Update existing garantie
      const result = await updateGarantieApi({ ...payload, id: editingGarantie.id })

      if (result.success && result.data) {
        setGaranties((prev) => prev.map((g) => (g.id === result.data!.id ? result.data! : g)))

        const newGaranties = garanties.map((g) => (g.id === result.data!.id ? result.data! : g))

        const garantiesAvecDate = newGaranties
          .filter((g) => g.date_fin)
          .sort((a, b) => {
            if (!a.date_fin || !b.date_fin) return 0
            return new Date(a.date_fin + 'T00:00:00').getTime() - new Date(b.date_fin + 'T00:00:00').getTime()
          })

        setGarantieProche(garantiesAvecDate.length > 0 ? garantiesAvecDate[0] : null)

        closeModal()
      }
    } else {
      // Create new garantie
      const result = await createGarantieApi(payload)

      if (result.success && result.data) {
        setGaranties((prev) => [...prev, result.data])

        const newGaranties = [...garanties, result.data]

        const garantiesAvecDate = newGaranties
          .filter((g) => g.date_fin)
          .sort((a, b) => {
            if (!a.date_fin || !b.date_fin) return 0
            return new Date(a.date_fin + 'T00:00:00').getTime() - new Date(b.date_fin + 'T00:00:00').getTime()
          })

        setGarantieProche(garantiesAvecDate.length > 0 ? garantiesAvecDate[0] : null)

        closeModal()
      }
    }
  }

  const askDeleteGarantie = (g: GarantieRow) => setConfirmDeleteGarantie(g)

  const doDeleteGarantie = async () => {
    const garantie = confirmDeleteGarantie
    if (!garantie) return

    const result = await deleteGarantieApi({ id: garantie.id })

    if (result.success) {
      const newGaranties = garanties.filter((g) => g.id !== garantie.id)
      setGaranties(newGaranties)

      const garantiesAvecDate = newGaranties
        .filter((g) => g.date_fin)
        .sort((a, b) => {
          if (!a.date_fin || !b.date_fin) return 0
          return new Date(a.date_fin + 'T00:00:00').getTime() - new Date(b.date_fin + 'T00:00:00').getTime()
        })

      setGarantieProche(garantiesAvecDate.length > 0 ? garantiesAvecDate[0] : null)

      setConfirmDeleteGarantie(null)
    }
  }

  const handleSubmitRapport = async (e: FormEvent) => {
    e.preventDefault()

    if (!bassin || !bassin.id) {
      alert('Bassin introuvable (id manquant).')
      return
    }

    // 1) Gestion du PDF
    let fichierUrl: string | null = editingRapport?.file_url ?? null

    if (rapportPdfFile) {
      const ext = rapportPdfFile.name.split('.').pop() || 'pdf'
      const baseNumero =
        formNumeroRapport && formNumeroRapport.trim() !== '' ? formNumeroRapport.trim() : 'rapport'
      const safeName = sanitizeStorageKey(rapportPdfFile.name)
      const path = `${bassin.id}/${baseNumero}-${crypto.randomUUID()}-${safeName}.${ext}`

      const { error: uploadError } = await supabaseBrowser.storage.from('rapports').upload(path, rapportPdfFile, {
        upsert: false,
      })

      if (uploadError) {
        alert('Erreur lors du téléversement du PDF : ' + uploadError.message)
        return
      }

      const { data: publicData } = supabaseBrowser.storage.from('rapports').getPublicUrl(path)
      // S'assurer que l'URL n'est pas une chaîne vide
      fichierUrl = publicData?.publicUrl && publicData.publicUrl.trim() !== '' ? publicData.publicUrl : null
    }

    const safeTypeRapportId = formTypeRapportId && formTypeRapportId.trim() !== '' ? formTypeRapportId : null

    const payload = {
      bassin_id: bassin.id,
      type_id: safeTypeRapportId,
      date_rapport: formDateRapport || null,
      numero_ct: formNumeroRapport || null,
      titre: null, // Champ requis par le schéma, mais pas encore dans le formulaire
      description: formCommentaireRapport || null,
      file_url: fichierUrl || null, // S'assurer que c'est null et non une chaîne vide
    }

    const badUuidFields: string[] = []
    if ((payload.bassin_id as any) === 'undefined') badUuidFields.push('bassin_id')
    if ((payload.type_id as any) === 'undefined') badUuidFields.push('type_id')

    if (badUuidFields.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.error('BUG: champs uuid = "undefined" dans payload rapport', { payload, badUuidFields })
      }
      alert('BUG interne: un champ uuid vaut "undefined" (voir console).')
      return
    }

    // Utiliser useApiMutation au lieu d'appels Supabase directs
    if (editingRapport && editingRapport.id) {
      const result = await updateRapportApi({ ...payload, id: editingRapport.id })
      if (result.success && result.data) {
        setRapports((prev) => prev.map((r) => (r.id === result.data!.id ? result.data! : r)))
        closeRapportModal()
      }
    } else {
      const result = await createRapportApi(payload)
      if (result.success && result.data) {
        setRapports((prev) => [result.data!, ...prev])
        closeRapportModal()
      }
    }
  }

  const askDeleteRapport = (r: RapportRow) => setConfirmDeleteRapport(r)

  const doDeleteRapport = async () => {
    const rapport = confirmDeleteRapport
    if (!rapport) return

    const result = await deleteRapportApi({ id: rapport.id })
    if (result.success) {
      setRapports((prev) => prev.filter((r) => r.id !== rapport.id))
      setConfirmDeleteRapport(null)
    }
  }

  // Fonctions pour gérer les images
  const handleOpenImagesModal = (intervention: InterventionWithFiles) => {
    setSelectedInterventionForImages(intervention)
    setModalImagesOpen(true)
  }

  const handleDownloadImage = async (file: InterventionFichierRow) => {
    try {
      const { data, error } = await supabaseBrowser.storage
        .from('interventions')
        .download(file.file_path)

      if (error) throw error

      // Créer un URL pour l'image et l'ouvrir dans un nouvel onglet
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = file.file_name || 'image.jpg'
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erreur téléchargement fichier:', err)
      alert('Erreur lors du téléchargement du fichier.')
    }
  }

  const openEditBassinModal = () => {
    if (!bassin) return
    setEditName(bassin.name || '')
    setEditMembraneId(bassin.membrane_type_id || '')
    setEditAnnee(bassin.annee_installation != null ? String(bassin.annee_installation) : '')
    setEditDateDerniere(bassin.date_derniere_refection || '')
    setEditEtatId(bassin.etat_id || '')
    setEditDureeId(bassin.duree_vie_id || '')
    setEditReference(bassin.reference_interne || '')
    setEditNotes(bassin.notes || '')
    setEditCouvreurId(bassin.couvreur_id || '')
    setShowEditBassinModal(true)
  }

  const closeEditBassinModal = () => {
    if (isUpdatingBassin) return
    setShowEditBassinModal(false)
  }

  const openDeleteBassinModal = () => {
    setDeleteConfirmText('')
    setShowDeleteBassinModal(true)
  }

  const closeDeleteBassinModal = () => {
    if (isDeletingBassin) return
    setShowDeleteBassinModal(false)
  }

  const handleSubmitBassin = async (e: FormEvent) => {
    e.preventDefault()
    if (!bassin) return

    const safeEtatId = editEtatId && editEtatId.trim() !== '' ? editEtatId : null
    const safeDureeId = editDureeId && editDureeId.trim() !== '' ? editDureeId : null
    const safeMembraneId = editMembraneId && editMembraneId.trim() !== '' ? editMembraneId : null

    const annee = editAnnee && editAnnee.trim() !== '' ? Number(editAnnee.trim()) : null

    const selectedDuree = safeDureeId != null ? dureesBassin.find((d) => d.id === safeDureeId) : undefined
    const dureeText = selectedDuree?.label ?? null
    const safeCouvreurId = editCouvreurId && editCouvreurId.trim() !== '' ? editCouvreurId : null

    const payload = {
      id: bassin.id,
      batimentId: bassin.batiment_id!, // Requis par le schéma
      name: editName || null,
      surfaceM2: bassin.surface_m2, // Inclure la surface actuelle
      membraneTypeId: safeMembraneId,
      anneeInstallation: annee,
      dateDerniereRefection: editDateDerniere && editDateDerniere.trim() !== '' ? editDateDerniere : null,
      couvreurId: safeCouvreurId,
      etatId: safeEtatId,
      dureeVieId: safeDureeId,
      dureeVieText: dureeText,
      referenceInterne: editReference && editReference.trim() !== '' ? editReference : null,
      notes: editNotes && editNotes.trim() !== '' ? editNotes : null,
    }

    const result = await updateBassinApi(payload)

    if (result.success && result.data) {
      setBassin(result.data as BassinRow)
      setShowEditBassinModal(false)
    }
  }

  const handleDeleteBassin = async () => {
    if (!bassin) return

    const result = await deleteBassinApi({ id: bassin.id })

    if (result.success) {
      setShowDeleteBassinModal(false)
      if (batiment?.id) router.push(`/admin/batiments/${batiment.id}`)
      else router.push('/admin/bassins')
    }
  }

  // -----------------------------
  // Interventions — UI + CRUD
  // -----------------------------
  const openNewIntervention = () => {
    setEditingIntervention(null)
    setSelectedInterventionId(null)
    setIntDate('')
    setIntTypeId('')
    setIntCommentaire('')
    setIntLocation(null)
    setIntPickEnabled(false)
    setIntNewFiles([])
    setShowInterventionEditor(true)
  }

  const openEditIntervention = (it: InterventionWithFiles) => {
    setEditingIntervention(it)
    setSelectedInterventionId(it.id)
    setIntDate(it.date_intervention || '')
    setIntTypeId(it.type_intervention_id || '')
    setIntCommentaire(it.commentaire || '')
    setIntLocation(safePointFromGeoJSON(it.location_geojson as any))
    setIntPickEnabled(false)
    setIntNewFiles([])
    setShowInterventionEditor(true)
  }

  const closeInterventionEditor = () => {
    if (isCreatingIntervention || isUpdatingIntervention) return
    setShowInterventionEditor(false)
    setEditingIntervention(null)
    setIntPickEnabled(false)
    setIntNewFiles([])
  }

  const handleInterventionFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setIntNewFiles(files)
  }

  const refreshInterventions = async () => {
    if (!bassinId) return

    const { data: intData, error: intError } = await supabaseBrowser
      .from('interventions')
      .select('id, bassin_id, date_intervention, type_intervention_id, commentaire, location_geojson, created_at')
      .eq('bassin_id', bassinId)
      .order('date_intervention', { ascending: false })
      .order('created_at', { ascending: false })

    if (intError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur refresh interventions', intError)
      }
      alert('Erreur chargement interventions : ' + intError.message)
      return
    }

    const intRows = (intData || []) as InterventionRow[]
    const ids = intRows.map((i) => i.id)

    let filesRows: InterventionFichierRow[] = []
    if (ids.length > 0) {
      const { data: filesData, error: filesError } = await supabaseBrowser
        .from('intervention_fichiers')
        .select('id, intervention_id, file_path, file_name, mime_type, created_at')
        .in('intervention_id', ids)
        .order('created_at', { ascending: true })

      if (filesError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur refresh intervention_fichiers', filesError)
        }
        alert('Erreur chargement fichiers interventions : ' + filesError.message)
        return
      }
      filesRows = (filesData || []) as InterventionFichierRow[]
    }

    const filesByIntervention: Record<string, InterventionFichierRow[]> = {}
    filesRows.forEach((f) => {
      if (!filesByIntervention[f.intervention_id]) filesByIntervention[f.intervention_id] = []
      filesByIntervention[f.intervention_id].push(f)
    })

    const next = intRows.map((i) => ({
      ...i,
      location_geojson: (i.location_geojson as any) ?? null,
      files: filesByIntervention[i.id] || [],
    })) as InterventionWithFiles[]

    setInterventions(next)

    setEditingIntervention((cur) => {
      if (!cur) return cur
      return next.find((x) => x.id === cur.id) ?? cur
    })
  }

  const handleSaveIntervention = async () => {
    if (!bassin?.id) {
      alert('Bassin introuvable (id manquant).')
      return
    }

    if (!intDate || intDate.trim() === '') {
      alert("La date de l'intervention est obligatoire.")
      return
    }

    const safeTypeId = intTypeId && intTypeId.trim() !== '' ? intTypeId : null

    const payload = {
      bassinId: bassin.id,
      dateIntervention: intDate,
      typeInterventionId: safeTypeId,
      commentaire: intCommentaire && intCommentaire.trim() !== '' ? intCommentaire : null,
      locationGeojson: toGeoJSONPoint(intLocation),
    }

    let result
    let saved: InterventionRow | null = null

    if (editingIntervention?.id) {
      result = await updateInterventionApi({ ...payload, id: editingIntervention.id })
    } else {
      result = await createInterventionApi(payload)
    }

    if (!result.success || !result.data) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur save intervention', result.error)
      }
      alert('Erreur enregistrement intervention : ' + (result.error ?? 'Erreur inconnue'))
      return
    }

    saved = result.data as InterventionRow

    // Upload fichiers (si ajoutés)
    if (saved && intNewFiles.length > 0) {
      for (const f of intNewFiles) {
        const safeName = sanitizeStorageKey(f.name || 'fichier')
        const filePath = `${bassin.id}/${saved.id}/${crypto.randomUUID()}-${safeName}`

        const { error: upErr } = await supabaseBrowser.storage.from('interventions').upload(filePath, f, { upsert: false })

        if (upErr) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Erreur upload fichier intervention', upErr)
          }
          alert('Erreur upload fichier : ' + upErr.message)
          continue
        }

        const { error: insErr } = await supabaseBrowser.from('intervention_fichiers').insert({
          intervention_id: saved.id,
          file_path: filePath,
          file_name: f.name || null,
          mime_type: f.type || null,
        })

        if (insErr) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Erreur insert intervention_fichiers', insErr)
          }
          alert('Erreur indexation fichier : ' + insErr.message)
        }
      }
    }

    setIntNewFiles([])
    setIntPickEnabled(false)
    setSelectedInterventionId(saved?.id ?? null)

    await refreshInterventions()
    setShowInterventionEditor(false)
    setEditingIntervention(null)
  }

  const askDeleteIntervention = (it: InterventionWithFiles) => setConfirmDeleteIntervention(it)

  const doDeleteIntervention = async () => {
    const it = confirmDeleteIntervention
    if (!it) return

    // 1) supprimer fichiers storage + lignes
    if (it.files && it.files.length > 0) {
      const paths = it.files.map((f) => f.file_path).filter(Boolean)
      if (paths.length > 0) {
        const { error: rmErr } = await supabaseBrowser.storage.from('interventions').remove(paths)

        if (rmErr) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Erreur suppression storage interventions', rmErr)
          }
          alert('Erreur suppression fichiers (storage) : ' + rmErr.message)
          return
        }
      }

      const { error: delFilesErr } = await supabaseBrowser
        .from('intervention_fichiers')
        .delete()
        .eq('intervention_id', it.id)

      if (delFilesErr) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur suppression intervention_fichiers', delFilesErr)
        }
        alert('Erreur suppression fichiers (DB) : ' + delFilesErr.message)
        return
      }
    }

    // 2) supprimer l'intervention
    const result = await deleteInterventionApi({ id: it.id })

    if (!result.success) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur suppression intervention', result.error)
      }
      alert('Erreur suppression intervention : ' + (result.error ?? 'Erreur inconnue'))
      return
    }

    setInterventions((prev) => prev.filter((x) => x.id !== it.id))
    if (selectedInterventionId === it.id) setSelectedInterventionId(null)
    if (editingIntervention?.id === it.id) closeInterventionEditor()

    setConfirmDeleteIntervention(null)
  }

  const openFileSignedUrl = async (file: InterventionFichierRow) => {
    try {
      setBusyFileIds((p) => ({ ...p, [file.id]: true }))
      const { data, error } = await supabaseBrowser.storage.from('interventions').createSignedUrl(file.file_path, 60 * 10)

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur signed url', error)
        }
        alert('Erreur accès fichier : ' + error.message)
        return
      }

      if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setBusyFileIds((p) => ({ ...p, [file.id]: false }))
    }
  }

  const requestDeleteFile = (file: InterventionFichierRow) => {
    setConfirmDeleteFile(file)
  }

  const handleConfirmDeleteFile = async () => {
    if (!confirmDeleteFile) return

    const fileToDelete = confirmDeleteFile
    setConfirmDeleteFile(null)
    setBusyFileIds((p) => ({ ...p, [fileToDelete.id]: true }))

    const { error: rmErr } = await supabaseBrowser.storage.from('interventions').remove([fileToDelete.file_path])

    if (rmErr) {
      setBusyFileIds((p) => ({ ...p, [fileToDelete.id]: false }))
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur suppression storage file', rmErr)
      }
      alert('Erreur suppression fichier (storage) : ' + rmErr.message)
      return
    }

    const result = await deleteFileApi({ id: fileToDelete.id })

    setBusyFileIds((p) => ({ ...p, [fileToDelete.id]: false }))

    if (!result.success) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur suppression DB file', result.error)
      }
      alert('Erreur suppression fichier (DB) : ' + (result.error ?? 'Erreur inconnue'))
      return
    }

    setInterventions((prev) =>
      prev.map((it) => {
        if (it.id !== fileToDelete.intervention_id) return it
        return { ...it, files: it.files.filter((f) => f.id !== fileToDelete.id) }
      })
    )

    setEditingIntervention((cur) => {
      if (!cur) return cur
      if (cur.id !== fileToDelete.intervention_id) return cur
      return { ...cur, files: cur.files.filter((f) => f.id !== fileToDelete.id) }
    })
  }

  // Fonctions pour le badge de garantie
  const formatDateEcheance = (dateStr: string | null): string => {
    if (!dateStr) return 'Non définie'
    const date = new Date(dateStr + 'T00:00:00')
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Toronto',
    }
    return date.toLocaleDateString('fr-CA', options)
  }

  const getBadgeColorGarantie = (dateStr: string | null): string => {
    if (!dateStr) return 'bg-slate-100/90 text-slate-600 border-slate-200'
    const dateFin = new Date(dateStr + 'T00:00:00')
    const aujourdhui = new Date()
    const diffTime = dateFin.getTime() - aujourdhui.getTime()
    const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffJours < 0) return 'bg-red-100/90 text-red-700 border-red-200'
    if (diffJours <= 90) return 'bg-orange-100/90 text-orange-700 border-orange-200'
    if (diffJours <= 180) return 'bg-yellow-100/90 text-yellow-700 border-yellow-200'
    return 'bg-green-100/90 text-green-700 border-green-200'
  }

  // Validation UUID en cours
  if (!bassinId) {
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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">Chargement du bassin…</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500 mb-3" />
          <p className="text-sm font-medium text-red-700">Erreur : {errorMsg}</p>
        </div>
      </div>
    )
  }

  if (!bassin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
          <Layers className="mx-auto h-10 w-10 text-slate-400 mb-3" />
          <p className="text-sm font-medium text-slate-600">Bassin introuvable.</p>
        </div>
      </div>
    )
  }

  const surfaceFt2 = bassin.surface_m2 != null ? Math.round(bassin.surface_m2 * 10.7639) : null
  const typeDuree = dureesBassin.find((l) => l.id === bassin.duree_vie_id)?.label ?? null

  const etatObj = etatsBassin.find((l) => l.id === bassin.etat_id) ?? null
  const etatLabel = etatObj?.label ?? null

  const couvreurNom = bassin.couvreur_id
    ? (couvreurs.find((c) => c.id === bassin.couvreur_id)?.nom ?? null)
    : null

  const membraneLabel = membranesBassin.find((l) => l.id === bassin.membrane_type_id)?.label ?? null

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
              href="/admin/bassins"
              className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
            >
              <Layers className="h-4 w-4" />
              <span>Bassins</span>
            </Link>
            {batiment && (
              <>
                <span className="text-white/40">/</span>
                <Link
                  href={`/admin/batiments/${batiment.id}`}
                  className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
                >
                  <Building2 className="h-4 w-4" />
                  <span>{batiment.name || 'Bâtiment'}</span>
                </Link>
              </>
            )}
            <span className="text-white/40">/</span>
            <span className="font-medium text-white">{bassin.name || 'Sans nom'}</span>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{bassin.name || '(Sans nom)'}</h1>
                  {batiment && (
                    <p className="mt-0.5 text-sm text-white/70">
                      {batiment.address}
                      {batiment.city ? `, ${batiment.city}` : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Calendar className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">{bassin.annee_installation ?? 'N/D'}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Layers className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {surfaceFt2 != null ? `${surfaceFt2.toLocaleString('fr-CA')} pi²` : 'N/D'}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Clock className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    Dernière réfection : {bassin.date_derniere_refection ?? 'N/D'}
                    {bassin.date_derniere_refection && couvreurNom ? ` par ${couvreurNom}` : ''}
                  </span>
                </div>

                {garantieProche && garantieProche.date_fin && (
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 backdrop-blur-sm ${getBadgeColorGarantie(
                      garantieProche.date_fin
                    )}`}
                  >
                    <Shield className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      {(() => {
                        const dateFin = new Date(garantieProche.date_fin + 'T00:00:00')
                        const aujourdhui = new Date()
                        const diffTime = dateFin.getTime() - aujourdhui.getTime()
                        const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                        if (diffJours < 0) {
                          return `Garantie échue: ${formatDateEcheance(garantieProche.date_fin)}`
                        }
                        return `Échéance de la garantie: ${formatDateEcheance(garantieProche.date_fin)}`
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {batiment && (
                <Link
                  href={`/admin/batiments/${batiment.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Bâtiment
                </Link>
              )}
              <button
                type="button"
                onClick={openEditBassinModal}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1F4E79] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                type="button"
                onClick={openDeleteBassinModal}
                className="inline-flex items-center gap-2 rounded-xl border border-red-400/50 bg-red-500/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-red-500/30"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== LAYOUT 2 COLONNES ========== */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] lg:items-start">
        {/* ===== COLONNE GAUCHE ===== */}
        <div className="space-y-6">
          {/* ----- RÉSUMÉ DU BASSIN ----- */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                  <Info className="h-5 w-5 text-[#1F4E79]" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Résumé du bassin</h2>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50/80 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">État global</span>
                  <StateBadge
                    state={mapEtatToStateBadge(etatLabel)}
                    color={etatObj?.couleur ?? null}
                    label={etatObj?.label ?? null}
                  />
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    <span>Durée de vie résiduelle</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{typeDuree || 'Non définie'}</span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Layers className="h-4 w-4" />
                    <span>Type de membrane</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{membraneLabel || 'Non défini'}</span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Hash className="h-4 w-4" />
                    <span>Référence interne</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{bassin.reference_interne || '—'}</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes internes</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                  {bassin.notes || 'Aucune note pour ce bassin.'}
                </p>
              </div>
            </div>
          </div>

          {/* ----- INTERVENTIONS ----- */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <Wrench className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Interventions</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {interventions.length} intervention{interventions.length !== 1 ? 's' : ''} enregistrée
                      {interventions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openNewIntervention}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02]"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </div>
            </div>

            <div className="p-5">
              {interventions.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                  <Wrench className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">Aucune intervention enregistrée</p>
                  <button
                    type="button"
                    onClick={openNewIntervention}
                    className="mt-3 text-sm font-medium text-[#1F4E79] hover:underline"
                  >
                    Ajouter la première intervention
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {interventions.map((it) => {
                    const selected = selectedInterventionId === it.id
                    const typeLabel = typeInterventionLabel(it.type_intervention_id) || 'Non spécifié'
                    const hasLoc = !!safePointFromGeoJSON(it.location_geojson as any)

                    return (
                      <div
                        key={it.id}
                        onClick={() => setSelectedInterventionId(it.id)}
                        className={
                          selected
                            ? 'group cursor-pointer rounded-xl border p-4 transition-all border-[#1F4E79] bg-[#1F4E79]/5 shadow-sm'
                            : 'group cursor-pointer rounded-xl border p-4 transition-all border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-sm font-semibold ${
                                  selected ? 'text-[#1F4E79]' : 'text-slate-800'
                                }`}
                              >
                                {it.date_intervention}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {typeLabel}
                              </span>
                              {hasLoc && <MapPin className="h-3.5 w-3.5 text-green-500" />}
                            </div>
                            {it.commentaire && <p className="text-sm text-slate-500 truncate">{it.commentaire}</p>}
                            {it.files && it.files.length > 0 && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                                <FileText className="h-3.5 w-3.5" />
                                <span>
                                  {it.files.length} fichier{it.files.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="table-action-icon flex items-center gap-1">
                            {(() => {
                              const imageFiles = (it.files || []).filter((f) =>
                                f.mime_type?.startsWith('image/')
                              )
                              if (imageFiles.length > 0) {
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenImagesModal(it)
                                    }}
                                    className="rounded-lg p-2 text-slate-400 hover:bg-ct-primary/10 hover:text-ct-primary"
                                    title={`Voir les images (${imageFiles.length})`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )
                              }
                              return null
                            })()}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditIntervention(it)
                              }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  askDeleteIntervention(it)
                                }}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ----- ÉDITEUR INLINE INTERVENTION ----- */}
              {showInterventionEditor && (
                <div className="mt-4 rounded-xl border-2 border-[#1F4E79]/30 bg-[#1F4E79]/5 p-3 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-3 mb-4">
                    <div className="w-full sm:w-auto">
                      <h3 className="text-sm font-bold text-slate-800">
                        {editingIntervention ? "Modifier l'intervention" : 'Nouvelle intervention'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Activez « Choisir sur la carte » pour localiser l&apos;intervention
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={closeInterventionEditor}
                        disabled={isCreatingIntervention || isUpdatingIntervention}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <X className="h-4 w-4" />
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveIntervention()}
                        disabled={isCreatingIntervention || isUpdatingIntervention}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1F4E79] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#163555]"
                      >
                        {isCreatingIntervention || isUpdatingIntervention ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">
                        Date de l&apos;intervention <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={intDate}
                        onChange={(e) => setIntDate(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Type d&apos;intervention</label>
                      <select
                        value={intTypeId}
                        onChange={(e) => setIntTypeId(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                      >
                        <option value="">Sélectionner…</option>
                        {typesInterventions.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Commentaire</label>
                      <textarea
                        rows={3}
                        value={intCommentaire}
                        onChange={(e) => setIntCommentaire(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setIntPickEnabled((v) => !v)}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          intPickEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        {intPickEnabled ? 'Mode sélection actif' : 'Choisir sur la carte'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIntLocation(null)}
                        disabled={intLocation == null}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Effacer
                      </button>

                      <div className="flex-1 text-xs text-slate-500 min-w-0">
                        {intLocation ? (
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                            Position : {intLocation.lat.toFixed(6)}, {intLocation.lng.toFixed(6)}
                          </span>
                        ) : (
                          'Aucune localisation définie'
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">Ajouter des fichiers / photos</label>
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          onChange={handleInterventionFilesChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition-colors hover:border-[#1F4E79]/50 hover:bg-[#1F4E79]/5">
                          <Upload className="h-5 w-5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-600">Cliquez ou glissez des fichiers ici</span>
                        </div>
                      </div>
                      {intNewFiles.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">{intNewFiles.length} fichier(s) prêt(s) à téléverser</p>
                      )}
                    </div>

                    {editingIntervention && editingIntervention.files.length > 0 && (
                      <div className="md:col-span-2 space-y-2">
                        <p className="text-xs font-semibold text-slate-600">Fichiers existants</p>
                        <div className="space-y-2">
                          {editingIntervention.files.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 sm:px-4 py-2 sm:py-2.5"
                            >
                              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="truncate font-medium">
                                  {f.file_name || f.file_path.split('/').pop() || 'Fichier'}
                                </span>
                                {f.mime_type && <span className="hidden sm:inline text-xs text-slate-400">({f.mime_type})</span>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={!!busyFileIds[f.id]}
                                  onClick={() => void openFileSignedUrl(f)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#1F4E79]"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={!!busyFileIds[f.id]}
                                  onClick={() => void requestDeleteFile(f)}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ----- DOCUMENTS (GARANTIES / RAPPORTS) ----- */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Documents</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Garanties et rapports associés</p>
                  </div>
                </div>

                <div className="flex items-center rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveDocTab('garanties')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      activeDocTab === 'garanties'
                        ? 'bg-white text-[#1F4E79] shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    Garanties
                    <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">{garanties.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDocTab('rapports')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                      activeDocTab === 'rapports'
                        ? 'bg-white text-[#1F4E79] shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <FileCheck className="h-4 w-4" />
                    Rapports
                    <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">{rapports.length}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5">
              {activeDocTab === 'garanties' && (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={() => openModal()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter une garantie
                    </button>
                  </div>

                  {garanties.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                      <Shield className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Aucune garantie enregistrée</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {garanties.map((g) => {
                        const typeLabel = labelFromId('type_garantie', g.type_garantie_id)
                        const statutLabel = labelFromId('statut_garantie', g.statut_id)

                        return (
                          <div
                            key={g.id}
                            className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-slate-800">
                                    {typeLabel || 'Type non spécifié'}
                                  </span>
                                  {statutLabel && (
                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                      {statutLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-500 space-y-0.5">
                                  {g.fournisseur && <p>Fournisseur : {g.fournisseur}</p>}
                                  {g.numero_garantie && <p>N° : {g.numero_garantie}</p>}
                                  {(g.date_debut || g.date_fin) && (
                                    <p>
                                      Période : {g.date_debut || '—'} → {g.date_fin || '—'}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="table-action-icon flex items-center gap-1">
                                {g.fichier_pdf_url && (
                                  <a
                                    href={g.fichier_pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Consulter le PDF"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1F4E79]"
                                  >
                                    <Eye className="h-4 w-4" />

                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openModal(g)}
                                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => askDeleteGarantie(g)}
                                  title="Supprimer"
                                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {activeDocTab === 'rapports' && (
                <>
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={() => openRapportModal()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un rapport
                    </button>
                  </div>

                  {rapports.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                      <FileCheck className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">Aucun rapport enregistré</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rapports.map((r) => {
                        const typeLabel = labelFromId('type_rapport', r.type_id)

                        return (
                          <div
                            key={r.id}
                            className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-slate-800">
                                    {r.date_rapport || 'Date non spécifiée'}
                                  </span>
                                  {typeLabel && (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                      {typeLabel}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-slate-500 space-y-0.5">
                                  {r.numero_ct && <p>N° CT : {r.numero_ct}</p>}
                                  {r.description && <p className="truncate">{r.description}</p>}
                                </div>
                              </div>

                              <div className="table-action-icon flex items-center gap-1">
                                {r.file_url && (
                                  <a
                                    href={r.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Consulter le PDF"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1F4E79]"
                                  >
                                    <Eye className="h-4 w-4" />

                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openRapportModal(r)}
                                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => askDeleteRapport(r)}
                                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ===== COLONNE DROITE : CARTE ===== */}
        <div className="lg:sticky lg:top-6 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    Polygone de toiture
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visualisation du bassin et des interventions
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="h-[520px] w-full overflow-hidden rounded-xl border border-slate-200">
                <BassinMap
                  bassinId={bassin.id}
                  center={mapCenter}
                  initialPolygon={bassin.polygone_geojson}
                  couleurPolygon={couleurEtat}
                  interventionMarkers={interventionMarkers}
                  selectedInterventionId={selectedInterventionId}
                  onInterventionMarkerClick={(id) => setSelectedInterventionId(id)}
                  pointPicker={{
                    enabled: intPickEnabled,
                    value: intLocation,
                    onChange: (pos) => setIntLocation(pos),
                  }}
                />
              </div>

              {/* Légende */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: couleurEtat || '#6C757D' }} />
                  <span>Polygone bassin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span>Interventions</span>
                </div>
                {intPickEnabled && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                    <span>Mode sélection actif</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* NOUVELLE CARD — Composition */}
          <BassinCompositionCard bassinId={bassin.id} />
        </div>
      </div>

      {/* ========== MODALS ========== */}
      {/* Modal édition bassin */}
      <Dialog open={showEditBassinModal} onOpenChange={(open) => !open && !isUpdatingBassin && closeEditBassinModal()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">Modifier le bassin</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Ajustez les informations de ce bassin
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitBassin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Nom du bassin</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Type de membrane</label>
                <select
                  value={editMembraneId}
                  onChange={(e) => setEditMembraneId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="">Non défini</option>
                  {membranesBassin.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Année de construction</label>
                  <input
                    type="number"
                    value={editAnnee}
                    onChange={(e) => setEditAnnee(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Date dernière réfection</label>
                  <input
                    type="date"
                    value={editDateDerniere}
                    onChange={(e) => setEditDateDerniere(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Réfection par</label>
                  <select
                    value={editCouvreurId}
                    onChange={(e) => setEditCouvreurId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="">Non défini</option>
                    {couvreurs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom || '(Sans nom)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">État du bassin</label>
                  <select
                    value={editEtatId}
                    onChange={(e) => setEditEtatId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="">Non défini</option>
                    {etatsBassin.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Durée de vie</label>
                  <select
                    value={editDureeId}
                    onChange={(e) => setEditDureeId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="">Non définie</option>
                    {dureesBassin.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Référence interne</label>
                <input
                  type="text"
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Notes internes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

            <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={closeEditBassinModal}
                disabled={isUpdatingBassin}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isUpdatingBassin}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isUpdatingBassin ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal ajout / modification garantie */}
      <Dialog open={showModal} onOpenChange={(open) => !open && !(isCreatingGarantie || isUpdatingGarantie) && closeModal()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">{modalTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Bassin : {bassin?.name || '(Sans nom)'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitGarantie} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Type de garantie <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTypeGarantieId}
                  onChange={(e) => setFormTypeGarantieId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="">Sélectionner…</option>
                  {typesGarantie.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Fournisseur</label>
                <input
                  type="text"
                  value={formFournisseur}
                  onChange={(e) => setFormFournisseur(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Numéro de garantie</label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Date de début</label>
                  <input
                    type="date"
                    value={formDateDebut}
                    onChange={(e) => setFormDateDebut(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Date de fin</label>
                  <input
                    type="date"
                    value={formDateFin}
                    onChange={(e) => setFormDateFin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Statut</label>
                <select
                  value={formStatutId}
                  onChange={(e) => setFormStatutId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="">Sélectionner…</option>
                  {statutsGarantie.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Couverture (résumé)</label>
                <input
                  type="text"
                  value={formCouverture}
                  onChange={(e) => setFormCouverture(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Commentaire</label>
                <textarea
                  rows={3}
                  value={formCommentaire}
                  onChange={(e) => setFormCommentaire(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Fichier PDF de la garantie</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition-colors hover:border-[#1F4E79]/50 hover:bg-[#1F4E79]/5">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-600">{pdfFile ? pdfFile.name : 'Cliquez pour sélectionner un PDF'}</span>
                  </div>
                </div>
              </div>

            <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={closeModal}
                disabled={isCreatingGarantie || isUpdatingGarantie}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isCreatingGarantie || isUpdatingGarantie}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isCreatingGarantie || isUpdatingGarantie ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal ajout / modification rapport */}
      <Dialog open={showRapportModal} onOpenChange={(open) => !open && !(isCreatingRapport || isUpdatingRapport) && closeRapportModal()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">{rapportModalTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Bassin : {bassin?.name || '(Sans nom)'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRapport} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Type de rapport <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTypeRapportId}
                  onChange={(e) => setFormTypeRapportId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="">Sélectionner…</option>
                  {typesRapport.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Date du rapport</label>
                  <input
                    type="date"
                    value={formDateRapport}
                    onChange={(e) => setFormDateRapport(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Numéro de rapport (CT)</label>
                  <input
                    type="text"
                    value={formNumeroRapport}
                    onChange={(e) => setFormNumeroRapport(e.target.value)}
                    placeholder="Ex.: CT-25-0001"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Commentaire</label>
                <textarea
                  rows={3}
                  value={formCommentaireRapport}
                  onChange={(e) => setFormCommentaireRapport(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Fichier PDF du rapport</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleRapportFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition-colors hover:border-[#1F4E79]/50 hover:bg-[#1F4E79]/5">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {rapportPdfFile ? rapportPdfFile.name : 'Cliquez pour sélectionner un PDF'}
                    </span>
                  </div>
                </div>
              </div>

            <DialogFooter>
              <button
                type="button"
                onClick={closeRapportModal}
                disabled={isCreatingRapport || isUpdatingRapport}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isCreatingRapport || isUpdatingRapport}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {(isCreatingRapport || isUpdatingRapport) ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal confirmation suppression intervention */}
      {confirmDeleteIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isDeletingIntervention && setConfirmDeleteIntervention(null)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Confirmer la suppression
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">Cette action est irréversible.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-700">Supprimer cette intervention?</p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteIntervention(null)}
                  disabled={isDeletingIntervention}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => void doDeleteIntervention()}
                  disabled={isDeletingIntervention}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression garantie */}
      {confirmDeleteGarantie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isDeletingGarantie && setConfirmDeleteGarantie(null)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Confirmer la suppression
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">Cette action est irréversible.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-700">Supprimer cette garantie?</p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteGarantie(null)}
                  disabled={isDeletingGarantie}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => void doDeleteGarantie()}
                  disabled={isDeletingGarantie}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression rapport */}
      {confirmDeleteRapport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !isDeletingRapport && setConfirmDeleteRapport(null)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Confirmer la suppression
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">Cette action est irréversible.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-700">Supprimer ce rapport?</p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteRapport(null)}
                  disabled={isDeletingRapport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => void doDeleteRapport()}
                  disabled={isDeletingRapport}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression bassin */}
      <Dialog open={showDeleteBassinModal} onOpenChange={(open) => !open && !isDeletingBassin && closeDeleteBassinModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800">Supprimer ce bassin ?</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">Cette action est irréversible</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">
                Toutes les données associées à ce bassin seront définitivement supprimées : interventions, garanties,
                rapports et fichiers.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Pour confirmer, écrivez <span className="font-bold text-red-600">SUPPRIMER</span>
              </label>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeDeleteBassinModal}
              disabled={isDeletingBassin}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteBassin}
              disabled={deleteConfirmText !== 'SUPPRIMER' || isDeletingBassin}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeletingBassin ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal images */}
      <Dialog open={modalImagesOpen} onOpenChange={setModalImagesOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto p-0">
          <DialogHeader className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
            <DialogTitle>Images de l&apos;intervention</DialogTitle>
            {selectedInterventionForImages && (
              <DialogDescription className="text-sm text-slate-600 mt-1">
                {new Date(selectedInterventionForImages.date_intervention).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                {selectedInterventionForImages.commentaire && (
                  <>
                    {' — '}
                    {selectedInterventionForImages.commentaire}
                  </>
                )}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Contenu du modal */}
          <div className="p-6">
            {selectedInterventionForImages && (() => {
              const imageFiles = (selectedInterventionForImages.files || []).filter((f) =>
                f.mime_type?.startsWith('image/')
              )

              if (imageFiles.length === 0) {
                return (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">
                      Aucune image disponible pour cette intervention.
                    </p>
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {imageFiles.map((file) => {
                    const imageUrl = imageUrls[file.id]

                    return (
                      <div
                        key={file.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border-2 border-slate-200 hover:border-ct-primary transition-all cursor-pointer bg-slate-50"
                        onClick={() => handleDownloadImage(file)}
                      >
                        {imageUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageUrl}
                              alt={file.file_name || 'Image'}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <div className="transition-opacity sm:opacity-0 group-hover:opacity-100">
                                <Download className="h-8 w-8 text-white drop-shadow-lg" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-ct-primary to-[#2d6ba8] shadow-lg animate-pulse" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                          <p className="text-xs text-white truncate">
                            {file.file_name || 'Image'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Footer du modal */}
          <DialogFooter className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <p className="text-xs text-slate-600 text-center w-full">
              Cliquez sur une image pour la télécharger et l&apos;ouvrir
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteFile}
        onOpenChange={(open) => !open && setConfirmDeleteFile(null)}
        onConfirm={handleConfirmDeleteFile}
        title="Supprimer ce fichier ?"
        description={`Voulez-vous vraiment supprimer « ${confirmDeleteFile?.file_name ?? 'ce fichier'} » ?`}
        confirmText="Supprimer"
        confirmVariant="danger"
        loading={confirmDeleteFile ? !!busyFileIds[confirmDeleteFile.id] : false}
      />
    </section>
  )
}
