'use client'

import { useEffect, useState, FormEvent } from 'react'
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

type ClientOption = {
  id: string
  name: string
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
  const router = useRouter()
  const batimentId = typeof params?.id === 'string' ? params.id : ''

  const [batiment, setBatiment] = useState<BatimentRow | null>(null)
  const [listes, setListes] = useState<ListeChoix[]>([])
  const [bassins, setBassins] = useState<BassinRow[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hoveredBassinId, setHoveredBassinId] = useState<string | null>(null)

  // Modal édition bâtiment
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
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
  const [addBassinSaving, setAddBassinSaving] = useState(false)
  const [addBassinError, setAddBassinError] = useState<string | null>(null)
  const [addBassinName, setAddBassinName] = useState('')
  const [addBassinMembraneId, setAddBassinMembraneId] = useState('')
  const [addBassinSurface, setAddBassinSurface] = useState('')
  const [addBassinAnnee, setAddBassinAnnee] = useState('')
  const [addBassinDerniereRef, setAddBassinDerniereRef] = useState('')
  const [addBassinEtatId, setAddBassinEtatId] = useState('')
  const [addBassinDureeText, setAddBassinDureeText] = useState('')
  const [addBassinReferenceInterne, setAddBassinReferenceInterne] =
    useState('')
  const [addBassinNotes, setAddBassinNotes] = useState('')

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

      // 2) Listes de choix
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

      // 3) Bassins
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

      // 4) Clients
      const { data: clientsData, error: clientsError } = await supabaseBrowser
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (clientsError) {
        console.error('Erreur Supabase clients:', clientsError)
        setClients([])
      } else {
        setClients(
          (clientsData || []).map((c: any) => ({
            id: c.id as string,
            name: (c.name as string) ?? '(Sans nom)',
          }))
        )
      }

      setLoading(false)
    }

    void fetchData()
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
      : { lat: 46.0, lng: -72.0 }

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Bâtiment</h1>
        <p className="text-sm text-ct-gray">Chargement des données…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Bâtiment</h1>
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </section>
    )
  }

  if (!batiment) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Bâtiment</h1>
        <p className="text-sm text-red-600">Bâtiment introuvable.</p>
      </section>
    )
  }

  const handleOpenEdit = () => {
    setEditName(batiment.name ?? '')
    setEditClientId(batiment.client_id ?? '')
    setEditAddress(batiment.address ?? '')
    setEditCity(batiment.city ?? '')
    setEditPostalCode(batiment.postal_code ?? '')
    setEditLatitude(
      typeof batiment.latitude === 'number' ? batiment.latitude.toString() : ''
    )
    setEditLongitude(
      typeof batiment.longitude === 'number'
        ? batiment.longitude.toString()
        : ''
    )
    setEditNotes(batiment.notes ?? '')
    setEditError(null)
    setEditOpen(true)
  }

  const closeEditModal = () => {
    if (!editSaving) setEditOpen(false)
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!batimentId) return

    if (!editName.trim()) {
      setEditError('Le nom du bâtiment est obligatoire.')
      return
    }
    if (!editClientId) {
      setEditError('Vous devez sélectionner un client associé.')
      return
    }

    setEditSaving(true)
    setEditError(null)

    let latitude: number | null = null
    let longitude: number | null = null

    if (editLatitude.trim() !== '') {
      const v = Number(editLatitude.replace(',', '.'))
      if (Number.isNaN(v)) {
        setEditError('La latitude doit être un nombre.')
        setEditSaving(false)
        return
      }
      latitude = v
    }

    if (editLongitude.trim() !== '') {
      const v = Number(editLongitude.replace(',', '.'))
      if (Number.isNaN(v)) {
        setEditError('La longitude doit être un nombre.')
        setEditSaving(false)
        return
      }
      longitude = v
    }

    const payload = {
      name: editName.trim(),
      client_id: editClientId,
      address: editAddress.trim() || null,
      city: editCity.trim() || null,
      postal_code: editPostalCode.trim() || null,
      latitude,
      longitude,
      notes: editNotes.trim() || null,
    }

    const { error } = await supabaseBrowser
      .from('batiments')
      .update(payload)
      .eq('id', batimentId)

    if (error) {
      console.error('Erreur mise à jour bâtiment:', error)
      setEditError(error.message)
      setEditSaving(false)
      return
    }

    setBatiment((prev) =>
      prev
        ? {
            ...prev,
            ...payload,
            client_name:
              clients.find((c) => c.id === editClientId)?.name ??
              prev.client_name,
          }
        : prev
    )

    setEditSaving(false)
    setEditOpen(false)
  }

  const openAddBassinModal = () => {
    setAddBassinName('')
    setAddBassinMembraneId('')
    setAddBassinSurface('')
    setAddBassinAnnee('')
    setAddBassinDerniereRef('')
    setAddBassinEtatId('')
    setAddBassinDureeText('')
    setAddBassinReferenceInterne('')
    setAddBassinNotes('')
    setAddBassinError(null)
    setAddBassinOpen(true)
  }

  const closeAddBassinModal = () => {
    if (!addBassinSaving) setAddBassinOpen(false)
  }

  const handleAddBassinSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!batimentId) return

    if (!addBassinName.trim()) {
      setAddBassinError('Le nom du bassin est obligatoire.')
      return
    }

    setAddBassinSaving(true)
    setAddBassinError(null)

    let surface_m2: number | null = null
    if (addBassinSurface.trim() !== '') {
      const v = Number(addBassinSurface.replace(',', '.'))
      if (Number.isNaN(v)) {
        setAddBassinError('La surface (m²) doit être un nombre.')
        setAddBassinSaving(false)
        return
      }
      surface_m2 = v
    }

    let annee_installation: number | null = null
    if (addBassinAnnee.trim() !== '') {
      const v = Number(addBassinAnnee)
      if (Number.isNaN(v)) {
        setAddBassinError("L'année d'installation doit être un nombre.")
        setAddBassinSaving(false)
        return
      }
      annee_installation = v
    }

    const payload = {
      batiment_id: batimentId,
      name: addBassinName.trim(),
      membrane_type_id: addBassinMembraneId || null,
      surface_m2,
      annee_installation,
      date_derniere_refection: addBassinDerniereRef.trim() || null,
      etat_id: addBassinEtatId || null,
      duree_vie_text: addBassinDureeText.trim() || null,
      reference_interne: addBassinReferenceInterne.trim() || null,
      notes: addBassinNotes.trim() || null,
      polygone_geojson: null as GeoJSONPolygon | null,
    }

    const { data, error } = await supabaseBrowser
      .from('bassins')
      .insert([payload])
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
      .single()

    if (error) {
      console.error('Erreur création bassin:', error)
      setAddBassinError(error.message)
      setAddBassinSaving(false)
      return
    }

    const newBassin: BassinRow = {
      id: data.id,
      name: data.name,
      membrane_type_id: data.membrane_type_id,
      surface_m2: data.surface_m2,
      annee_installation: data.annee_installation,
      date_derniere_refection: data.date_derniere_refection,
      etat_id: data.etat_id,
      duree_vie_text: data.duree_vie_text,
      reference_interne: data.reference_interne,
      notes: data.notes,
      polygone_geojson: data.polygone_geojson,
    }

    setBassins((prev) =>
      [...prev, newBassin].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', 'fr-CA')
      )
    )

    setAddBassinSaving(false)
    setAddBassinOpen(false)
  }

  return (
    <>
      <section className="space-y-6">
        {/* En-tête + retour */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ct-primary">
              {batiment.name || 'Bâtiment'}
            </h1>
            <p className="text-sm text-ct-gray">
              Détails du bâtiment, bassins de toiture associés et carte Google Maps.
            </p>
            {batiment.client_id && (
              <p className="text-xs text-ct-grayDark">
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="btn-secondary px-3 py-1.5 text-xs hover:border-ct-primary/70 hover:bg-ct-grayLight/80 hover:text-ct-primary transition-colors"
            >
              Modifier le bâtiment
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/batiments')}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              ← Retour à la liste des bâtiments
            </button>
          </div>
        </div>

        {/* Infos bâtiment */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Informations du bâtiment</CardTitle>
              <CardDescription>
                Coordonnées générales, lien client et notes internes.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Nom du bâtiment
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {batiment.name || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Client
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {batiment.client_name || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Adresse
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {batiment.address || '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Ville / Code postal
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {batiment.city || '—'}{' '}
                    {batiment.postal_code ? `(${batiment.postal_code})` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Coordonnées GPS
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {batiment.latitude != null && batiment.longitude != null
                      ? `${batiment.latitude.toFixed(6)}, ${batiment.longitude.toFixed(
                          6
                        )}`
                      : 'Non spécifiées'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Notes internes
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark whitespace-pre-line">
                    {batiment.notes || 'Aucune note pour ce bâtiment.'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bassins */}
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Bassins de toiture</CardTitle>
              <CardDescription>
                Liste des bassins associés à ce bâtiment, avec leur état global et
                leur durée de vie résiduelle.
              </CardDescription>
            </div>
            <button
              type="button"
              onClick={openAddBassinModal}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              + Ajouter un bassin
            </button>
          </CardHeader>
          <CardContent>
            {bassins.length === 0 ? (
              <p className="text-sm text-ct-gray">
                Aucun bassin n’est encore associé à ce bâtiment.
              </p>
            ) : (
              <DataTable maxHeight={260}>
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
                        membranes.find((m) => m.id === b.membrane_type_id)?.label ??
                        null

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

      {/* Modal édition bâtiment */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-ct-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ct-primary">
                  Modifier le bâtiment
                </h2>
                <p className="mt-1 text-xs text-ct-gray">
                  Mettez à jour les informations générales et le client associé.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full border border-ct-grayLight px-2 py-1 text-xs text-ct-gray hover:bg-ct-grayLight/70 transition-colors"
                disabled={editSaving}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Nom du bâtiment *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Client associé *
                  </label>
                  <select
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="">Sélectionnez un client…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="No civique, rue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Latitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={editLatitude}
                    onChange={(e) => setEditLatitude(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="ex.: 46.12345"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Longitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={editLongitude}
                    onChange={(e) => setEditLongitude(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="ex.: -72.98765"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Notes internes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                />
              </div>

              {editError && (
                <p className="text-xs text-red-600">{editError}</p>
              )}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={editSaving}
                >
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajout bassin */}
      {addBassinOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeAddBassinModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-ct-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ct-primary">
                  Nouveau bassin de toiture
                </h2>
                <p className="mt-1 text-xs text-ct-gray">
                  Créez un bassin pour ce bâtiment. Le polygone pourra être dessiné sur
                  la carte dans le module prévu à cet effet.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddBassinModal}
                className="rounded-full border border-ct-grayLight px-2 py-1 text-xs text-ct-gray hover:bg-ct-grayLight/70 transition-colors"
                disabled={addBassinSaving}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleAddBassinSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Nom du bassin *
                  </label>
                  <input
                    type="text"
                    value={addBassinName}
                    onChange={(e) => setAddBassinName(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Référence interne
                  </label>
                  <input
                    type="text"
                    value={addBassinReferenceInterne}
                    onChange={(e) =>
                      setAddBassinReferenceInterne(e.target.value)
                    }
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Type de membrane
                  </label>
                  <select
                    value={addBassinMembraneId}
                    onChange={(e) => setAddBassinMembraneId(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionnez…</option>
                    {membranes.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Surface (m²)
                  </label>
                  <input
                    type="text"
                    value={addBassinSurface}
                    onChange={(e) => setAddBassinSurface(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="ex.: 350"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Année d&apos;installation
                  </label>
                  <input
                    type="text"
                    value={addBassinAnnee}
                    onChange={(e) => setAddBassinAnnee(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="ex.: 2015"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Date de la dernière réfection
                  </label>
                  <input
                    type="date"
                    value={addBassinDerniereRef}
                    onChange={(e) => setAddBassinDerniereRef(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    État du bassin
                  </label>
                  <select
                    value={addBassinEtatId}
                    onChange={(e) => setAddBassinEtatId(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionnez…</option>
                    {etats.map((et) => (
                      <option key={et.id} value={et.id}>
                        {et.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Durée de vie résiduelle (texte)
                  </label>
                  <select
                    value={addBassinDureeText}
                    onChange={(e) => setAddBassinDureeText(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionnez…</option>
                    {durees.map((d) => (
                      <option key={d.id} value={d.label}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Notes internes
                </label>
                <textarea
                  value={addBassinNotes}
                  onChange={(e) => setAddBassinNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                />
              </div>

              {addBassinError && (
                <p className="text-xs text-red-600">{addBassinError}</p>
              )}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddBassinModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={addBassinSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={addBassinSaving}
                >
                  {addBassinSaving ? 'Enregistrement…' : 'Créer le bassin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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

  // Hooks toujours en haut, sans retour conditionnel entre eux
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    libraries: ['drawing', 'geometry'] as ('drawing' | 'geometry' | 'places')[],
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)

  // Polygones dérivés des bassins
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

  // Ajuste la vue pour englober tous les polygones dès que la carte et les données sont prêtes
  useEffect(() => {
    if (!isLoaded || !map || polygons.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    polygons.forEach((poly) => {
      poly.path.forEach((p) => bounds.extend(p))
    })

    map.fitBounds(bounds)

    // Limite le zoom maximal
    const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
      const currentZoom = map.getZoom()
      if (currentZoom && currentZoom > 21) {
        map.setZoom(21)
      }
    })

    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [isLoaded, map, polygons])

  // Rendu pendant le chargement du script Google Maps
  if (!isLoaded) {
    return (
      <div className="text-sm text-ct-gray">Chargement de la carte…</div>
    )
  }

  // Aucun polygone
  if (polygons.length === 0) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-xl border border-ct-gray bg-ct-grayLight text-sm text-ct-gray">
        Aucun polygone de bassin n’est encore dessiné pour ce bâtiment.
      </div>
    )
  }

  return (
    <div className="h-80 w-full overflow-hidden rounded-xl border border-ct-grayLight bg-ct-grayLight">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        // centre de départ (sera remplacé par fitBounds)
        center={center}
        zoom={19}
        options={{
          mapTypeId: 'satellite',
          streetViewControl: false,
          fullscreenControl: true,
          rotateControl: false,
          tilt: 0,
          gestureHandling: 'greedy', // zoom à la molette sans CTRL
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
