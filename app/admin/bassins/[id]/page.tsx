'use client'

import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { StateBadge, BassinState } from '@/components/ui/StateBadge'
import BassinMap from '@/components/maps/BassinMap'

type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
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

export default function AdminBassinDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bassinId = params?.id as string

  const [bassin, setBassin] = useState<BassinRow | null>(null)
  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [garanties, setGaranties] = useState<GarantieRow[]>([])
  const [rapports, setRapports] = useState<RapportRow[]>([])
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

  // Modal édition bassin
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

  // Modal confirmation suppression bassin (modèle identique à Clients)
  const [showDeleteBassinModal, setShowDeleteBassinModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletingBassin, setDeletingBassin] = useState(false)

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
        .select('id, categorie, label, couleur')

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

      setBassin(bassinData as BassinRow)
      setBatiment(batData)
      setListes(listesData || [])
      setGaranties(garantiesData || [])
      setRapports(rapportsData || [])
      setLoading(false)
    }

    void fetchData()
  }, [bassinId])

  // Listes de choix garanties / rapports
  const typesGarantie = listes.filter((l) => l.categorie === 'type_garantie')
  const statutsGarantie = listes.filter((l) => l.categorie === 'statut_garantie')
  const typesRapport = listes.filter((l) => l.categorie === 'type_rapport')

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
        'Erreur lors de l’enregistrement de la garantie : ' +
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
        'Erreur lors de l’enregistrement du rapport : ' +
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

  // Ouverture du modal d’édition de bassin
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

  if (loading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-ct-gray">Chargement…</p>
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

  if (!bassin) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">Bassin introuvable.</p>
      </section>
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
      {/* En-tête + navigation */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          {batiment && (
            <p className="text-xs uppercase tracking-wide text-ct-gray mb-1">
              Bâtiment{' '}
              <Link
                href={`/admin/batiments/${batiment.id}`}
                className="font-medium text-ct-primary hover:underline"
              >
                {batiment.name || 'Sans nom'}
              </Link>
            </p>
          )}
          <h1 className="text-2xl font-semibold text-ct-primary">
            Bassin : {bassin.name || '(Sans nom)'}
          </h1>
          <p className="mt-1 text-sm text-ct-gray">
            Surface :{' '}
            <span className="font-medium text-ct-grayDark">
              {surfaceFt2 != null ? `${surfaceFt2} pi²` : 'n/d'}
            </span>{' '}
            · Année installation :{' '}
            <span className="font-medium text-ct-grayDark">
              {bassin.annee_installation ?? 'n/d'}
            </span>{' '}
            · Dernière réfection :{' '}
            <span className="font-medium text-ct-grayDark">
              {bassin.date_derniere_refection ?? 'n/d'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {batiment && (
            <Link
              href={`/admin/batiments/${batiment.id}`}
              className="btn-secondary inline-flex items-center justify-center"
            >
              ← Retour au bâtiment
            </Link>
          )}
          <button type="button" className="btn-secondary" onClick={openEditBassinModal}>
            Modifier
          </button>
          <button type="button" className="btn-danger" onClick={openDeleteBassinModal}>
            Supprimer
          </button>
        </div>
      </div>

      {/* Layout 2 colonnes : gauche = résumé + documents, droite = carte */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)] lg:items-start">
        {/* Colonne gauche : résumé + documents */}
        <div className="space-y-6">
            {/* Résumé du bassin */}
            <div className="rounded-2xl border border-ct-grayLight bg-white p-4 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
                Résumé du bassin
              </h2>
              <div className="space-y-2 text-sm text-ct-grayDark">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-ct-gray">État global</span>
                  <StateBadge state={mapEtatToStateBadge(etatLabel)} />
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ct-gray">Durée de vie résiduelle</span>
                  <span className="font-medium">{typeDuree || 'Non définie'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ct-gray">Type de membrane</span>
                  <span className="font-medium">{membraneLabel || 'Non défini'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-ct-gray">Référence interne</span>
                  <span className="font-medium">{bassin.reference_interne || '—'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-ct-grayLight space-y-1">
                <p className="text-xs uppercase tracking-wide text-ct-gray">Notes internes</p>
                <p className="text-sm text-ct-grayDark whitespace-pre-line">
                  {bassin.notes || 'Aucune note pour ce bassin.'}
                </p>
              </div>
            </div>

          {/* Documents du bassin (Garanties / Rapports) */}
          <div className="rounded-2xl border border-ct-grayLight bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
                  Documents du bassin
                </h2>
                <p className="text-xs text-ct-gray mt-1">
                  Gérez les garanties et les rapports PDF associés à ce bassin.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    activeDocTab === 'garanties'
                      ? 'border-ct-primary bg-ct-primary text-white'
                      : 'border-ct-grayLight bg-white text-ct-gray hover:bg-ct-grayLight/40'
                  }`}
                  onClick={() => setActiveDocTab('garanties')}
                >
                  Garanties
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    activeDocTab === 'rapports'
                      ? 'border-ct-primary bg-ct-primary text-white'
                      : 'border-ct-grayLight bg-white text-ct-gray hover:bg-ct-grayLight/40'
                  }`}
                  onClick={() => setActiveDocTab('rapports')}
                >
                  Rapports
                </button>
              </div>
            </div>

            {/* Contenu onglet Garanties */}
            {activeDocTab === 'garanties' && (
              <>
                <div className="flex justify-end mb-3">
                  <button type="button" className="btn-primary" onClick={() => openModal()}>
                    Ajouter une garantie
                  </button>
                </div>

                {garanties.length === 0 ? (
                  <p className="text-sm text-ct-gray">
                    Aucune garantie pour ce bassin pour le moment.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-ct-grayLight/60 text-left">
                          <th className="border border-ct-grayLight px-3 py-2">Type</th>
                          <th className="border border-ct-grayLight px-3 py-2">Fournisseur</th>
                          <th className="border border-ct-grayLight px-3 py-2">No garantie</th>
                          <th className="border border-ct-grayLight px-3 py-2">Début</th>
                          <th className="border border-ct-grayLight px-3 py-2">Fin</th>
                          <th className="border border-ct-grayLight px-3 py-2">Statut</th>
                          <th className="border border-ct-grayLight px-3 py-2">Couverture</th>
                          <th className="border border-ct-grayLight px-3 py-2">PDF</th>
                          <th className="border border-ct-grayLight px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {garanties.map((g) => {
                          const typeLabel = labelFromId('type_garantie', g.type_garantie_id)
                          const statutLabel = labelFromId('statut_garantie', g.statut_id)

                          return (
                            <tr
                              key={g.id}
                              className="hover:bg-ct-primaryLight/10 transition-colors"
                            >
                              <td className="border border-ct-grayLight px-3 py-2">
                                {typeLabel || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {g.fournisseur || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {g.numero_garantie || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {g.date_debut || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {g.date_fin || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {statutLabel || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {g.couverture || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {g.fichier_pdf_url ? (
                                  <a
                                    href={g.fichier_pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-ct-primary hover:underline"
                                  >
                                    Ouvrir
                                  </a>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => openModal(g)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={() => handleDeleteGarantie(g)}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* Contenu onglet Rapports */}
            {activeDocTab === 'rapports' && (
              <>
                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => openRapportModal()}
                  >
                    Ajouter un rapport
                  </button>
                </div>

                {rapports.length === 0 ? (
                  <p className="text-sm text-ct-gray">
                    Aucun rapport n’est enregistré pour ce bassin pour le moment.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-ct-grayLight/60 text-left">
                          <th className="border border-ct-grayLight px-3 py-2">Date</th>
                          <th className="border border-ct-grayLight px-3 py-2">Type</th>
                          <th className="border border-ct-grayLight px-3 py-2">No rapport (CT)</th>
                          <th className="border border-ct-grayLight px-3 py-2">Commentaire</th>
                          <th className="border border-ct-grayLight px-3 py-2">PDF</th>
                          <th className="border border-ct-grayLight px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rapports.map((r) => {
                          const typeLabel = labelFromId('type_rapport', r.type_id)

                          return (
                            <tr
                              key={r.id}
                              className="hover:bg-ct-primaryLight/10 transition-colors"
                            >
                              <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                                {r.date_rapport || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {typeLabel || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                                {r.numero_ct || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {r.description || '—'}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                {r.file_url ? (
                                  <a
                                    href={r.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-ct-primary hover:underline"
                                  >
                                    Ouvrir
                                  </a>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="border border-ct-grayLight px-3 py-2">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => openRapportModal(r)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-danger"
                                    onClick={() => handleDeleteRapport(r)}
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Colonne droite : carte + polygone */}
        <div className="rounded-2xl border border-ct-grayLight bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-ct-grayDark uppercase tracking-wide">
                Polygone de toiture
              </h2>
              <p className="text-xs text-ct-gray mt-1">
                Utilisez la vue satellite et les outils de dessin pour ajuster
                le contour du bassin. Le polygone est sauvegardé dans Supabase.
              </p>
            </div>
          </div>

          <div className="h-[480px] w-full rounded-xl border border-ct-grayLight overflow-hidden">
            <BassinMap
              bassinId={bassin.id}
              center={mapCenter}
              initialPolygon={bassin.polygone_geojson}
              couleurPolygon={couleurEtat}
            />
          </div>
        </div>
      </div>

      {/* Modal édition bassin */}
      {showEditBassinModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-ct-grayDark">
              Modifier le bassin
            </h3>
            <p className="mt-1 text-sm text-ct-gray">
              Ajustez les informations administratives de ce bassin. La
              superficie reste calculée automatiquement à partir du polygone.
            </p>

            <form onSubmit={handleSubmitBassin} className="mt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Nom du bassin
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Type de membrane
                </label>
                <select
                  value={editMembraneId}
                  onChange={(e) => setEditMembraneId(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
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
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    Année d&apos;installation
                  </label>
                  <input
                    type="number"
                    value={editAnnee}
                    onChange={(e) => setEditAnnee(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    Date de la dernière réfection
                  </label>
                  <input
                    type="date"
                    value={editDateDerniere}
                    onChange={(e) => setEditDateDerniere(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    État du bassin
                  </label>
                  <select
                    value={editEtatId}
                    onChange={(e) => setEditEtatId(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  >
                    <option value="">Non défini</option>
                    {etatsBassin.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    Durée de vie
                  </label>
                  <select
                    value={editDureeId}
                    onChange={(e) => setEditDureeId(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
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

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Référence interne
                </label>
                <input
                  type="text"
                  value={editReference}
                  onChange={(e) => setEditReference(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Notes internes
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeEditBassinModal}
                  disabled={savingBassin}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={savingBassin}>
                  {savingBassin ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajout / modification garantie */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-ct-grayDark">{modalTitle}</h3>
            <p className="mt-1 text-sm text-ct-gray">Bassin : {bassin.name || '(Sans nom)'}</p>

            <form onSubmit={handleSubmitGarantie} className="mt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Type de garantie
                </label>
                <select
                  value={formTypeGarantieId}
                  onChange={(e) => setFormTypeGarantieId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                >
                  <option value="">Sélectionner…</option>
                  {typesGarantie.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={formFournisseur}
                  onChange={(e) => setFormFournisseur(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Numéro de garantie
                </label>
                <input
                  type="text"
                  value={formNumero}
                  onChange={(e) => setFormNumero(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={formDateDebut}
                    onChange={(e) => setFormDateDebut(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={formDateFin}
                    onChange={(e) => setFormDateFin(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Statut
                </label>
                <select
                  value={formStatutId}
                  onChange={(e) => setFormStatutId(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                >
                  <option value="">Sélectionner…</option>
                  {statutsGarantie.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Couverture (résumé)
                </label>
                <input
                  type="text"
                  value={formCouverture}
                  onChange={(e) => setFormCouverture(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Commentaire
                </label>
                <textarea
                  rows={3}
                  value={formCommentaire}
                  onChange={(e) => setFormCommentaire(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Fichier PDF de la garantie
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-ct-gray file:mr-3 file:rounded-md file:border-0 file:bg-ct-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ct-primary hover:file:bg-ct-primary/20"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajout / modification rapport */}
      {showRapportModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-ct-grayDark">
              {rapportModalTitle}
            </h3>
            <p className="mt-1 text-sm text-ct-gray">
              Bassin : {bassin.name || '(Sans nom)'}
            </p>

            <form onSubmit={handleSubmitRapport} className="mt-4 space-y-4 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Type de rapport
                </label>
                <select
                  value={formTypeRapportId}
                  onChange={(e) => setFormTypeRapportId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
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
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    Date du rapport
                  </label>
                  <input
                    type="date"
                    value={formDateRapport}
                    onChange={(e) => setFormDateRapport(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">
                    Numéro de rapport (CT)
                  </label>
                  <input
                    type="text"
                    value={formNumeroRapport}
                    onChange={(e) => setFormNumeroRapport(e.target.value)}
                    placeholder="Ex.: CT-25-0001"
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Commentaire
                </label>
                <textarea
                  rows={3}
                  value={formCommentaireRapport}
                  onChange={(e) => setFormCommentaireRapport(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Fichier PDF du rapport
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleRapportFileChange}
                  className="block w-full text-xs text-ct-gray file:mr-3 file:rounded-md file:border-0 file:bg-ct-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ct-primary hover:file:bg-ct-primary/20"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeRapportModal}
                  disabled={savingRapport}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={savingRapport}>
                  {savingRapport ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
              {/* Modal confirmation suppression bassin (même modèle que Clients) */}
        {showDeleteBassinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-xl mx-4 rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-red-600">Supprimer ce bassin?</h3>

              <p className="mt-2 text-sm text-ct-gray">
                Cette action est permanente.
              </p>

              <p className="mt-4 text-sm font-medium text-ct-grayDark">
                Pour confirmer, écrivez exactement :{' '}
                <span className="font-semibold">SUPPRIMER</span>
              </p>

              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="mt-2 w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeDeleteBassinModal}
                  disabled={deletingBassin}
                >
                  Annuler
                </button>

                <button
                  type="button"
                  className={`btn-danger ${
                    deleteConfirmText !== 'SUPPRIMER' || deletingBassin
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                  onClick={handleDeleteBassin}
                  disabled={deleteConfirmText !== 'SUPPRIMER' || deletingBassin}
                >
                  {deletingBassin ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          </div>
        )}
    </section>
  )
}
