'use client'

import { useEffect, useMemo, useState, FormEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import BassinMap, { InterventionMarker } from '@/components/maps/BassinMap'
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
  Download,
  X,
  AlertTriangle,
  Building2,
  Upload,
  Eye,
  StickyNote,
  Hash,
  ExternalLink,
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
  const v = etat.toLowerCase()

  if (v.includes('urgent')) return 'urgent'
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
    .normalize('NFD') // sépare accents
    .replace(/[\u0300-\u036f]/g, '') // enlève accents
    .replace(/[/\\]/g, '_') // enlève slash/backslash
    .replace(/\s+/g, '_') // espaces -> _
    .replace(/[^A-Za-z0-9._-]/g, '_') // garde seulement safe
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return n.length ? n : 'fichier'
}

export default function AdminBassinDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bassinId = params?.id as string

  const [bassin, setBassin] = useState<BassinRow | null>(null)
  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [garanties, setGaranties] = useState<GarantieRow[]>([])
  const [rapports, setRapports] = useState<RapportRow[]>([])
  const [interventions, setInterventions] = useState<InterventionWithFiles[]>([])
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Onglets documents
  const [activeDocTab, setActiveDocTab] = useState<'garanties' | 'rapports'>(
    'garanties'
  )

  // Modal ajout/modif garantie
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingGarantie, setEditingGarantie] = useState<GarantieRow | null>(
    null
  )
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
  const [savingRapport, setSavingRapport] = useState(false)
  const [editingRapport, setEditingRapport] = useState<RapportRow | null>(null)
  const [rapportModalTitle, setRapportModalTitle] = useState('Nouveau rapport')
  const [formTypeRapportId, setFormTypeRapportId] = useState('')
  const [formDateRapport, setFormDateRapport] = useState('')
  const [formNumeroRapport, setFormNumeroRapport] = useState('')
  const [formCommentaireRapport, setFormCommentaireRapport] = useState('')
  const [rapportPdfFile, setRapportPdfFile] = useState<File | null>(null)

  // Édition bassin
  const [showEditBassinModal, setShowEditBassinModal] = useState(false)
  const [savingBassin, setSavingBassin] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMembraneId, setEditMembraneId] = useState('')
  const [editAnnee, setEditAnnee] = useState('')
  const [editDateDerniere, setEditDateDerniere] = useState('')
  const [editEtatId, setEditEtatId] = useState('')
  const [editDureeId, setEditDureeId] = useState('')
  const [editReference, setEditReference] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Modal confirmation suppression bassin
  const [showDeleteBassinModal, setShowDeleteBassinModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingBassin, setDeletingBassin] = useState(false)

  // Interventions — éditeur inline (pour garder la carte cliquable)
  const [showInterventionEditor, setShowInterventionEditor] = useState(false)
  const [savingIntervention, setSavingIntervention] = useState(false)
  const [editingIntervention, setEditingIntervention] = useState<InterventionWithFiles | null>(null)
  const [intDate, setIntDate] = useState('')
  const [intTypeId, setIntTypeId] = useState('')
  const [intCommentaire, setIntCommentaire] = useState('')
  const [intLocation, setIntLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [intPickEnabled, setIntPickEnabled] = useState(false)
  const [intNewFiles, setIntNewFiles] = useState<File[]>([])
  const [busyFileIds, setBusyFileIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!bassinId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Bassin
      const { data: bassinData, error: bassinError } = await supabaseBrowser
        .from('bassins')
        .select(
          'id, batiment_id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
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

      // 5) Rapports du bassin
      const { data: rapportsData, error: rapportsError } = await supabaseBrowser
        .from('rapports')
        .select(
          'id, bassin_id, type_id, date_rapport, numero_ct, titre, description, file_url'
        )
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
      setGaranties((garantiesData || []) as GarantieRow[])
      setRapports((rapportsData || []) as RapportRow[])
      setInterventions(combined)
      setLoading(false)
    }

    void fetchData()
  }, [bassinId])

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
  const etatsBassin = listes.filter((l) =>
    ['etat_bassin', 'etat_toiture', 'etat'].includes(l.categorie)
  )
  const dureesBassin = listes.filter((l) =>
    ['duree_vie_bassin', 'duree_vie_toiture', 'duree_vie'].includes(l.categorie)
  )
  const membranesBassin = listes.filter((l) => l.categorie === 'membrane')

  // Couleur du polygone selon l'état / durée de vie
  const couleurEtat: string | undefined = (() => {
    if (!bassin) return undefined

    const etatId = bassin.etat_id
    const dureeId = bassin.duree_vie_id

    const preferEtatCategories = ['etat_bassin', 'etat_toiture', 'etat']
    const preferDureeCategories = [
      'duree_vie_bassin',
      'duree_vie_toiture',
      'duree_vie',
    ]

    if (etatId) {
      const match =
        listes.find(
          (l) => l.id === etatId && preferEtatCategories.includes(l.categorie)
        ) || listes.find((l) => l.id === etatId)

      if (match?.couleur) return match.couleur
    }

    if (dureeId) {
      const match =
        listes.find(
          (l) => l.id === dureeId && preferDureeCategories.includes(l.categorie)
        ) || listes.find((l) => l.id === dureeId)

      if (match?.couleur) return match.couleur
    }

    return undefined
  })()

  // Centre de la carte : priorité au centre du polygone, puis coords du bâtiment, puis fallback
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
        return {
          id: i.id,
          position: pos,
          title,
        } as InterventionMarker
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
      // MODE ÉDITION
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
      // MODE CRÉATION
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
    if (saving) return
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
    if (savingRapport) return
    setShowRapportModal(false)
    setEditingRapport(null)
  }

  const handleSubmitGarantie = async (e: FormEvent) => {
    e.preventDefault()

    if (!bassin || !bassin.id) {
      alert('Bassin introuvable (id manquant).')
      return
    }

    setSaving(true)

    // 1) Gestion du PDF
    let fichierUrl: string | null = editingGarantie?.fichier_pdf_url ?? null

    if (pdfFile) {
      const ext = pdfFile.name.split('.').pop() || 'pdf'
      const path = `${bassin.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabaseBrowser.storage
        .from('garanties')
        .upload(path, pdfFile, {
          upsert: false,
        })

      if (uploadError) {
        setSaving(false)
        alert('Erreur lors du téléversement du PDF : ' + uploadError.message)
        return
      }

      const { data: publicData } = supabaseBrowser.storage
        .from('garanties')
        .getPublicUrl(path)

      fichierUrl = publicData?.publicUrl ?? null
    }

    // 2) Champs UUID sécurisés
    const safeTypeGarantieId =
      formTypeGarantieId && formTypeGarantieId.trim() !== ''
        ? formTypeGarantieId
        : null

    const safeStatutId =
      formStatutId && formStatutId.trim() !== '' ? formStatutId : null

    // 3) Payload
    const payload = {
      bassin_id: bassin.id,
      type_garantie_id: safeTypeGarantieId,
      fournisseur: formFournisseur || null,
      numero_garantie: formNumero || null,
      date_debut: formDateDebut || null,
      date_fin: formDateFin || null,
      statut_id: safeStatutId,
      couverture: formCouverture || null,
      commentaire: formCommentaire || null,
      fichier_pdf_url: fichierUrl,
    }

    const badUuidFields: string[] = []
    if ((payload.bassin_id as any) === 'undefined')
      badUuidFields.push('bassin_id')
    if ((payload.type_garantie_id as any) === 'undefined')
      badUuidFields.push('type_garantie_id')
    if ((payload.statut_id as any) === 'undefined')
      badUuidFields.push('statut_id')

    if (badUuidFields.length > 0) {
      console.error('BUG: champs uuid = "undefined" dans payload', {
        payload,
        badUuidFields,
      })
      alert('BUG interne: un champ uuid vaut "undefined" (voir console).')
      setSaving(false)
      return
    }

    let data: GarantieRow | null = null
    let error: any = null

    if (editingGarantie && editingGarantie.id) {
      const res = await supabaseBrowser
        .from('garanties')
        .update(payload)
        .eq('id', editingGarantie.id)
        .select(
          'id, bassin_id, type_garantie_id, fournisseur, numero_garantie, date_debut, date_fin, statut_id, couverture, commentaire, fichier_pdf_url'
        )
        .single()

      data = res.data as GarantieRow | null
      error = res.error
    } else {
      const res = await supabaseBrowser
        .from('garanties')
        .insert(payload)
        .select(
          'id, bassin_id, type_garantie_id, fournisseur, numero_garantie, date_debut, date_fin, statut_id, couverture, commentaire, fichier_pdf_url'
        )
        .single()

      data = res.data as GarantieRow | null
      error = res.error
    }

    setSaving(false)

    if (error) {
      console.error('Erreur Supabase insert/update garantie', error)
      alert(
        'Erreur lors de l\'enregistrement de la garantie : ' +
          ((error as any)?.message ?? 'Erreur inconnue')
      )
      return
    }

    if (data) {
      if (editingGarantie) {
        setGaranties((prev) => prev.map((g) => (g.id === data!.id ? data! : g)))
      } else {
        setGaranties((prev) => [...prev, data])
      }
      closeModal()
    }
  }

  const handleDeleteGarantie = async (garantie: GarantieRow) => {
    const ok = window.confirm('Voulez-vous vraiment supprimer cette garantie ?')
    if (!ok) return

    const { error } = await supabaseBrowser
      .from('garanties')
      .delete()
      .eq('id', garantie.id)

    if (error) {
      alert('Erreur lors de la suppression : ' + error.message)
      return
    }

    setGaranties((prev) => prev.filter((g) => g.id !== garantie.id))
  }

  const handleSubmitRapport = async (e: FormEvent) => {
    e.preventDefault()

    if (!bassin || !bassin.id) {
      alert('Bassin introuvable (id manquant).')
      return
    }

    setSavingRapport(true)

    // 1) Gestion du PDF
    let fichierUrl: string | null = editingRapport?.file_url ?? null

    if (rapportPdfFile) {
      const ext = rapportPdfFile.name.split('.').pop() || 'pdf'
      const baseNumero =
        formNumeroRapport && formNumeroRapport.trim() !== ''
          ? formNumeroRapport.trim()
          : 'rapport'
      const path = `${bassin.id}/${baseNumero}-${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabaseBrowser.storage
        .from('rapports')
        .upload(path, rapportPdfFile, {
          upsert: false,
        })

      if (uploadError) {
        setSavingRapport(false)
        alert('Erreur lors du téléversement du PDF : ' + uploadError.message)
        return
      }

      const { data: publicData } = supabaseBrowser.storage
        .from('rapports')
        .getPublicUrl(path)

      fichierUrl = publicData?.publicUrl ?? null
    }

    const safeTypeRapportId =
      formTypeRapportId && formTypeRapportId.trim() !== ''
        ? formTypeRapportId
        : null

    const payload = {
      bassin_id: bassin.id,
      type_id: safeTypeRapportId,
      date_rapport: formDateRapport || null,
      numero_ct: formNumeroRapport || null,
      description: formCommentaireRapport || null,
      file_url: fichierUrl,
    }

    const badUuidFields: string[] = []
    if ((payload.bassin_id as any) === 'undefined') badUuidFields.push('bassin_id')
    if ((payload.type_id as any) === 'undefined') badUuidFields.push('type_id')

    if (badUuidFields.length > 0) {
      console.error('BUG: champs uuid = "undefined" dans payload rapport', {
        payload,
        badUuidFields,
      })
      alert('BUG interne: un champ uuid vaut "undefined" (voir console).')
      setSavingRapport(false)
      return
    }

    let data: RapportRow | null = null
    let error: any = null

    if (editingRapport && editingRapport.id) {
      const res = await supabaseBrowser
        .from('rapports')
        .update(payload)
        .eq('id', editingRapport.id)
        .select(
          'id, bassin_id, type_id, date_rapport, numero_ct, titre, description, file_url'
        )
        .single()

      data = res.data as RapportRow | null
      error = res.error
    } else {
      const res = await supabaseBrowser
        .from('rapports')
        .insert(payload)
        .select(
          'id, bassin_id, type_id, date_rapport, numero_ct, titre, description, file_url'
        )
        .single()

      data = res.data as RapportRow | null
      error = res.error
    }

    setSavingRapport(false)

    if (error) {
      console.error('Erreur Supabase insert/update rapport', error)
      alert(
        'Erreur lors de l\'enregistrement du rapport : ' +
          ((error as any)?.message ?? 'Erreur inconnue')
      )
      return
    }

    if (data) {
      if (editingRapport) {
        setRapports((prev) => prev.map((r) => (r.id === data!.id ? data! : r)))
      } else {
        setRapports((prev) => [data, ...prev])
      }
      closeRapportModal()
    }
  }

  const handleDeleteRapport = async (rapport: RapportRow) => {
    const ok = window.confirm('Voulez-vous vraiment supprimer ce rapport ?')
    if (!ok) return

    const { error } = await supabaseBrowser
      .from('rapports')
      .delete()
      .eq('id', rapport.id)

    if (error) {
      alert('Erreur lors de la suppression : ' + error.message)
      return
    }

    setRapports((prev) => prev.filter((r) => r.id !== rapport.id))
  }

  // Ouverture du modal d'édition de bassin
  const openEditBassinModal = () => {
    if (!bassin) return
    setEditName(bassin.name || '')
    setEditMembraneId(bassin.membrane_type_id || '')
    setEditAnnee(
      bassin.annee_installation != null ? String(bassin.annee_installation) : ''
    )
    setEditDateDerniere(bassin.date_derniere_refection || '')
    setEditEtatId(bassin.etat_id || '')
    setEditDureeId(bassin.duree_vie_id || '')
    setEditReference(bassin.reference_interne || '')
    setEditNotes(bassin.notes || '')
    setShowEditBassinModal(true)
  }

  const closeEditBassinModal = () => {
    if (savingBassin) return
    setShowEditBassinModal(false)
  }

  const openDeleteBassinModal = () => {
    setDeleteConfirmText('')
    setShowDeleteBassinModal(true)
  }

  const closeDeleteBassinModal = () => {
    if (deletingBassin) return
    setShowDeleteBassinModal(false)
  }

  const handleSubmitBassin = async (e: FormEvent) => {
    e.preventDefault()
    if (!bassin) return

    setSavingBassin(true)

    const safeEtatId = editEtatId && editEtatId.trim() !== '' ? editEtatId : null
    const safeDureeId =
      editDureeId && editDureeId.trim() !== '' ? editDureeId : null
    const safeMembraneId =
      editMembraneId && editMembraneId.trim() !== '' ? editMembraneId : null

    const annee =
      editAnnee && editAnnee.trim() !== '' ? Number(editAnnee.trim()) : null

    const selectedDuree =
      safeDureeId != null
        ? dureesBassin.find((d) => d.id === safeDureeId)
        : undefined
    const dureeText = selectedDuree?.label ?? null

    const payload = {
      name: editName || null,
      membrane_type_id: safeMembraneId,
      annee_installation: annee,
      date_derniere_refection:
        editDateDerniere && editDateDerniere.trim() !== '' ? editDateDerniere : null,
      etat_id: safeEtatId,
      duree_vie_id: safeDureeId,
      duree_vie_text: dureeText,
      reference_interne:
        editReference && editReference.trim() !== '' ? editReference : null,
      notes: editNotes && editNotes.trim() !== '' ? editNotes : null,
    }

    const { data, error } = await supabaseBrowser
      .from('bassins')
      .update(payload)
      .eq('id', bassin.id)
      .select(
        'id, batiment_id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
      )
      .single()

    setSavingBassin(false)

    if (error) {
      console.error('Erreur Supabase update bassin', error)
      alert(
        'Erreur lors de la mise à jour du bassin : ' +
          (error.message ?? 'Erreur inconnue')
      )
      return
    }

    if (data) {
      setBassin(data as BassinRow)
      setShowEditBassinModal(false)
    }
  }

  const handleDeleteBassin = async () => {
    if (!bassin) return

    setDeletingBassin(true)

    const { error } = await supabaseBrowser.from('bassins').delete().eq('id', bassin.id)

    setDeletingBassin(false)

    if (error) {
      console.error('Erreur Supabase delete bassin', error)
      alert(
        'Erreur lors de la suppression du bassin : ' +
          (error.message ?? 'Erreur inconnue')
      )
      return
    }

    setShowDeleteBassinModal(false)

    if (batiment?.id) {
      router.push(`/admin/batiments/${batiment.id}`)
    } else {
      router.push('/admin/bassins')
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
    if (savingIntervention) return
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
      console.error('Erreur refresh interventions', intError)
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
        console.error('Erreur refresh intervention_fichiers', filesError)
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

    // si l'éditeur est ouvert sur une intervention, on garde l'objet à jour (fichiers, etc.)
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
      alert('La date de l\'intervention est obligatoire.')
      return
    }

    setSavingIntervention(true)

    const safeTypeId =
      intTypeId && intTypeId.trim() !== '' ? intTypeId : null

    const payload = {
      bassin_id: bassin.id,
      date_intervention: intDate,
      type_intervention_id: safeTypeId,
      commentaire: intCommentaire && intCommentaire.trim() !== '' ? intCommentaire : null,
      location_geojson: toGeoJSONPoint(intLocation),
    }

    let saved: InterventionRow | null = null
    let err: any = null

    if (editingIntervention?.id) {
      const res = await supabaseBrowser
        .from('interventions')
        .update(payload)
        .eq('id', editingIntervention.id)
        .select('id, bassin_id, date_intervention, type_intervention_id, commentaire, location_geojson, created_at')
        .single()

      saved = res.data as any
      err = res.error
    } else {
      const res = await supabaseBrowser
        .from('interventions')
        .insert(payload)
        .select('id, bassin_id, date_intervention, type_intervention_id, commentaire, location_geojson, created_at')
        .single()

      saved = res.data as any
      err = res.error
    }

    if (err) {
      setSavingIntervention(false)
      console.error('Erreur save intervention', err)
      alert('Erreur enregistrement intervention : ' + (err.message ?? 'Erreur inconnue'))
      return
    }

    // Upload fichiers (si ajoutés)
    if (saved && intNewFiles.length > 0) {
      for (const f of intNewFiles) {
        const safeName = sanitizeStorageKey(f.name || 'fichier.pdf')
        const filePath = `${bassin.id}/${saved.id}/${crypto.randomUUID()}-${safeName}`

        const { error: upErr } = await supabaseBrowser.storage
          .from('interventions')
          .upload(filePath, f, { upsert: false })

        if (upErr) {
          console.error('Erreur upload fichier intervention', upErr)
          alert('Erreur upload fichier : ' + upErr.message)
          // on continue avec les autres fichiers
          continue
        }

        const { error: insErr } = await supabaseBrowser
          .from('intervention_fichiers')
          .insert({
            intervention_id: saved.id,
            file_path: filePath,
            file_name: f.name || null,
            mime_type: f.type || null,
          })

        if (insErr) {
          console.error('Erreur insert intervention_fichiers', insErr)
          alert('Erreur indexation fichier : ' + insErr.message)
        }
      }
    }

    setSavingIntervention(false)
    setIntNewFiles([])
    setIntPickEnabled(false)
    setSelectedInterventionId(saved?.id ?? null)

    await refreshInterventions()
    setShowInterventionEditor(false)
    setEditingIntervention(null)
  }

  const handleDeleteIntervention = async (it: InterventionWithFiles) => {
    const ok = window.confirm('Voulez-vous vraiment supprimer cette intervention ?')
    if (!ok) return

    // 1) supprimer fichiers storage + lignes
    if (it.files && it.files.length > 0) {
      const paths = it.files.map((f) => f.file_path).filter(Boolean)
      if (paths.length > 0) {
        const { error: rmErr } = await supabaseBrowser.storage
          .from('interventions')
          .remove(paths)

        if (rmErr) {
          console.error('Erreur suppression storage interventions', rmErr)
          alert('Erreur suppression fichiers (storage) : ' + rmErr.message)
          return
        }
      }

      const { error: delFilesErr } = await supabaseBrowser
        .from('intervention_fichiers')
        .delete()
        .eq('intervention_id', it.id)

      if (delFilesErr) {
        console.error('Erreur suppression intervention_fichiers', delFilesErr)
        alert('Erreur suppression fichiers (DB) : ' + delFilesErr.message)
        return
      }
    }

    // 2) supprimer l'intervention
    const { error: delErr } = await supabaseBrowser
      .from('interventions')
      .delete()
      .eq('id', it.id)

    if (delErr) {
      console.error('Erreur suppression intervention', delErr)
      alert('Erreur suppression intervention : ' + delErr.message)
      return
    }

    setInterventions((prev) => prev.filter((x) => x.id !== it.id))
    if (selectedInterventionId === it.id) setSelectedInterventionId(null)
    if (editingIntervention?.id === it.id) {
      closeInterventionEditor()
    }
  }

  const openFileSignedUrl = async (file: InterventionFichierRow) => {
    try {
      setBusyFileIds((p) => ({ ...p, [file.id]: true }))
      const { data, error } = await supabaseBrowser.storage
        .from('interventions')
        .createSignedUrl(file.file_path, 60 * 10)

      if (error) {
        console.error('Erreur signed url', error)
        alert('Erreur accès fichier : ' + error.message)
        return
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setBusyFileIds((p) => ({ ...p, [file.id]: false }))
    }
  }

  const handleDeleteFile = async (file: InterventionFichierRow) => {
    const ok = window.confirm('Supprimer ce fichier ?')
    if (!ok) return

    setBusyFileIds((p) => ({ ...p, [file.id]: true }))

    const { error: rmErr } = await supabaseBrowser.storage
      .from('interventions')
      .remove([file.file_path])

    if (rmErr) {
      setBusyFileIds((p) => ({ ...p, [file.id]: false }))
      console.error('Erreur suppression storage file', rmErr)
      alert('Erreur suppression fichier (storage) : ' + rmErr.message)
      return
    }

    const { error: delErr } = await supabaseBrowser
      .from('intervention_fichiers')
      .delete()
      .eq('id', file.id)

    setBusyFileIds((p) => ({ ...p, [file.id]: false }))

    if (delErr) {
      console.error('Erreur suppression DB file', delErr)
      alert('Erreur suppression fichier (DB) : ' + delErr.message)
      return
    }

    // update state
    setInterventions((prev) =>
      prev.map((it) => {
        if (it.id !== file.intervention_id) return it
        return { ...it, files: it.files.filter((f) => f.id !== file.id) }
      })
    )

    setEditingIntervention((cur) => {
  if (!cur) return cur
  if (cur.id !== file.intervention_id) return cur
  return { ...cur, files: cur.files.filter((f) => f.id !== file.id) }
    })

  }

  // =====================================================
  // RENDER
  // =====================================================

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

  // Surface affichée en pi² (BD reste en m²)
  const surfaceFt2 =
    bassin.surface_m2 != null ? Math.round(bassin.surface_m2 * 10.7639) : null

  const typeDuree =
    dureesBassin.find((l) => l.id === bassin.duree_vie_id)?.label ?? null

  const etatLabel = etatsBassin.find((l) => l.id === bassin.etat_id)?.label || null

  const membraneLabel =
    membranesBassin.find((l) => l.id === bassin.membrane_type_id)?.label ?? null

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

          {/* Titre + actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {bassin.name || '(Sans nom)'}
                  </h1>
                  {batiment && (
                    <p className="mt-0.5 text-sm text-white/70">
                      {batiment.address}{batiment.city ? `, ${batiment.city}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats rapides */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Calendar className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {bassin.annee_installation ?? 'N/D'}
                  </span>
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
                    Réfection : {bassin.date_derniere_refection ?? 'N/D'}
                  </span>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
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
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Résumé du bassin
                </h2>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* État global */}
              <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50/80 px-4 py-3">
                <span className="text-sm font-medium text-slate-600">État global</span>
                <StateBadge state={mapEtatToStateBadge(etatLabel)} />
              </div>

              {/* Autres infos */}
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

              {/* Notes */}
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
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Interventions
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {interventions.length} intervention{interventions.length !== 1 ? 's' : ''} enregistrée{interventions.length !== 1 ? 's' : ''}
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
                        className={`group cursor-pointer rounded-xl border p-4 transition-all ${
                          selected
                            ? 'border-[#1F4E79] bg-[#1F4E79]/5 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-semibold ${selected ? 'text-[#1F4E79]' : 'text-slate-800'}`}>
                                {it.date_intervention}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                {typeLabel}
                              </span>
                              {hasLoc && (
                                <MapPin className="h-3.5 w-3.5 text-green-500" />
                              )}
                            </div>
                            {it.commentaire && (
                              <p className="text-sm text-slate-500 truncate">
                                {it.commentaire}
                              </p>
                            )}
                            {it.files && it.files.length > 0 && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                                <FileText className="h-3.5 w-3.5" />
                                <span>{it.files.length} fichier{it.files.length !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                void handleDeleteIntervention(it)
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

              {/* Éditeur inline intervention */}
              {showInterventionEditor && (
                <div className="mt-4 rounded-xl border-2 border-[#1F4E79]/30 bg-[#1F4E79]/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">
                        {editingIntervention ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Activez « Choisir sur la carte » pour localiser l'intervention
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={closeInterventionEditor}
                        disabled={savingIntervention}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <X className="h-4 w-4" />
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveIntervention()}
                        disabled={savingIntervention}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F4E79] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#163555]"
                      >
                        {savingIntervention ? 'Enregistrement…' : 'Enregistrer'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">
                        Date de l'intervention <span className="text-red-500">*</span>
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
                      <label className="block text-xs font-semibold text-slate-600">
                        Type d'intervention
                      </label>
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
                      <label className="block text-xs font-semibold text-slate-600">
                        Commentaire
                      </label>
                      <textarea
                        rows={3}
                        value={intCommentaire}
                        onChange={(e) => setIntCommentaire(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setIntPickEnabled((v) => !v)}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          intPickEnabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        {intPickEnabled ? 'Mode sélection actif' : 'Choisir sur la carte'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIntLocation(null)}
                        disabled={intLocation == null}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Effacer
                      </button>

                      <div className="flex-1 text-xs text-slate-500">
                        {intLocation ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Position : {intLocation.lat.toFixed(6)}, {intLocation.lng.toFixed(6)}
                          </span>
                        ) : (
                          'Aucune localisation définie'
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-600">
                        Ajouter des fichiers / photos
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          multiple
                          onChange={handleInterventionFilesChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition-colors hover:border-[#1F4E79]/50 hover:bg-[#1F4E79]/5">
                          <Upload className="h-5 w-5 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            Cliquez ou glissez des fichiers ici
                          </span>
                        </div>
                      </div>
                      {intNewFiles.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          {intNewFiles.length} fichier(s) prêt(s) à téléverser
                        </p>
                      )}
                    </div>

                    {/* Fichiers existants */}
                    {editingIntervention && editingIntervention.files.length > 0 && (
                      <div className="md:col-span-2 space-y-2">
                        <p className="text-xs font-semibold text-slate-600">
                          Fichiers existants
                        </p>
                        <div className="space-y-2">
                          {editingIntervention.files.map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5"
                            >
                              <div className="flex items-center gap-2 text-sm text-slate-700 min-w-0">
                                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="truncate font-medium">
                                  {f.file_name || f.file_path.split('/').pop() || 'Fichier'}
                                </span>
                                {f.mime_type && (
                                  <span className="text-xs text-slate-400">({f.mime_type})</span>
                                )}
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
                                  onClick={() => void handleDeleteFile(f)}
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
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Documents
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Garanties et rapports associés
                    </p>
                  </div>
                </div>

                {/* Tabs */}
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
                    <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">
                      {garanties.length}
                    </span>
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
                    <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">
                      {rapports.length}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5">
              {/* ONGLET GARANTIES */}
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

                              <div className="flex items-center gap-1">
                                {g.fichier_pdf_url && (
                                  <a
                                    href={g.fichier_pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1F4E79]"
                                  >
                                    <ExternalLink className="h-4 w-4" />
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
                                  onClick={() => handleDeleteGarantie(g)}
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

              {/* ONGLET RAPPORTS */}
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

                              <div className="flex items-center gap-1">
                                {r.file_url && (
                                  <a
                                    href={r.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1F4E79]"
                                  >
                                    <ExternalLink className="h-4 w-4" />
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
                                  onClick={() => handleDeleteRapport(r)}
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
        <div className="lg:sticky lg:top-6">
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
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Modal édition bassin */}
      {showEditBassinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Modifier le bassin</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Ajustez les informations de ce bassin
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditBassinModal}
                disabled={savingBassin}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBassin} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Nom du bassin
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
                  Type de membrane
                </label>
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
                  <label className="block text-sm font-semibold text-slate-700">
                    Année d'installation
                  </label>
                  <input
                    type="number"
                    value={editAnnee}
                    onChange={(e) => setEditAnnee(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Date dernière réfection
                  </label>
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
                  <label className="block text-sm font-semibold text-slate-700">
                    État du bassin
                  </label>
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
                  <label className="block text-sm font-semibold text-slate-700">
                    Durée de vie
                  </label>
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
                <label className="block text-sm font-semibold text-slate-700">
                  Référence interne
                </label>
                <input
                  type="text"
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeEditBassinModal}
                  disabled={savingBassin}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingBassin}
                  className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {savingBassin ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajout / modification garantie */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{modalTitle}</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Bassin : {bassin.name || '(Sans nom)'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGarantie} className="p-6 space-y-5">
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
                <label className="block text-sm font-semibold text-slate-700">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={formFournisseur}
                  onChange={(e) => setFormFournisseur(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Numéro de garantie
                </label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={formDateDebut}
                    onChange={(e) => setFormDateDebut(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formDateFin}
                    onChange={(e) => setFormDateFin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Statut
                </label>
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
                <label className="block text-sm font-semibold text-slate-700">
                  Couverture (résumé)
                </label>
                <input
                  type="text"
                  value={formCouverture}
                  onChange={(e) => setFormCouverture(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Commentaire
                </label>
                <textarea
                  rows={3}
                  value={formCommentaire}
                  onChange={(e) => setFormCommentaire(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Fichier PDF de la garantie
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition-colors hover:border-[#1F4E79]/50 hover:bg-[#1F4E79]/5">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {pdfFile ? pdfFile.name : 'Cliquez pour sélectionner un PDF'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajout / modification rapport */}
      {showRapportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{rapportModalTitle}</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Bassin : {bassin.name || '(Sans nom)'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRapportModal}
                disabled={savingRapport}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRapport} className="p-6 space-y-5">
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
                  <label className="block text-sm font-semibold text-slate-700">
                    Date du rapport
                  </label>
                  <input
                    type="date"
                    value={formDateRapport}
                    onChange={(e) => setFormDateRapport(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Numéro de rapport (CT)
                  </label>
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
                <label className="block text-sm font-semibold text-slate-700">
                  Commentaire
                </label>
                <textarea
                  rows={3}
                  value={formCommentaireRapport}
                  onChange={(e) => setFormCommentaireRapport(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Fichier PDF du rapport
                </label>
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeRapportModal}
                  disabled={savingRapport}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingRapport}
                  className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
                  {savingRapport ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression bassin */}
      {showDeleteBassinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Supprimer ce bassin ?</h3>
                  <p className="text-sm text-slate-500">Cette action est irréversible</p>
                </div>
              </div>

              <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-4">
                <p className="text-sm text-red-700">
                  Toutes les données associées à ce bassin seront définitivement supprimées :
                  interventions, garanties, rapports et fichiers.
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

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeDeleteBassinModal}
                  disabled={deletingBassin}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBassin}
                  disabled={deleteConfirmText !== 'SUPPRIMER' || deletingBassin}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingBassin ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
