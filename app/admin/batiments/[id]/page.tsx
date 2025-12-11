'use client'

import { useEffect, useState, FormEvent, useRef } from 'react'
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
        .select('id, categorie, label, couleur')

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
        <button
          onClick={() => router.push('/admin/batiments')}
          className="btn-secondary"
        >
          Retour à la liste des bâtiments
        </button>
      </section>
    )
  }

  if (!batiment) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Bâtiment</h1>
        <p className="text-sm text-red-600">
          Le bâtiment demandé est introuvable.
        </p>
        <button
          onClick={() => router.push('/admin/batiments')}
          className="btn-secondary"
        >
          Retour à la liste des bâtiments
        </button>
      </section>
    )
  }

  const clientName =
    (batiment as any).clients?.name ??
    clients.find((c) => c.id === batiment.client_id)?.name ??
    'Client non défini'

  const openEditModal = () => {
    setEditError(null)
    setEditName(batiment.name || '')
    setEditClientId(batiment.client_id || '')
    setEditAddress(batiment.address || '')
    setEditCity(batiment.city || '')
    setEditPostalCode(batiment.postal_code || '')
    setEditLatitude(
      batiment.latitude != null ? String(batiment.latitude) : ''
    )
    setEditLongitude(
      batiment.longitude != null ? String(batiment.longitude) : ''
    )
    setEditNotes(batiment.notes || '')
    setEditOpen(true)
  }

  const closeEditModal = () => {
    if (!editSaving) setEditOpen(false)
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setEditError(null)
    setEditSaving(true)

    const lat =
      editLatitude.trim() !== '' ? Number(editLatitude.trim()) : null
    const lng =
      editLongitude.trim() !== '' ? Number(editLongitude.trim()) : null

    const { data, error } = await supabaseBrowser
      .from('batiments')
      .update({
        name: editName || null,
        client_id: editClientId || null,
        address: editAddress || null,
        city: editCity || null,
        postal_code: editPostalCode || null,
        latitude: lat,
        longitude: lng,
        notes: editNotes || null,
      })
      .eq('id', batiment.id)
      .select(
        'id, name, address, city, postal_code, latitude, longitude, client_id, notes, clients (id, name)'
      )
      .single()

    setEditSaving(false)

    if (error) {
      console.error('Erreur mise à jour bâtiment :', error)
      setEditError(error.message ?? 'Erreur inconnue')
      return
    }

    if (data) {
      setBatiment(data as BatimentRow)
      setEditOpen(false)
    }
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

    const surface =
      addBassinSurface.trim() !== ''
        ? Number(addBassinSurface.trim())
        : null
    const annee =
      addBassinAnnee.trim() !== ''
        ? Number(addBassinAnnee.trim())
        : null

    const payload = {
      batiment_id: batimentId,
      name: addBassinName || null,
      membrane_type_id:
        addBassinMembraneId.trim() !== ''
          ? addBassinMembraneId.trim()
          : null,
      surface_m2: surface,
      annee_installation: annee,
      date_derniere_refection:
        addBassinDerniereRef.trim() !== ''
          ? addBassinDerniereRef.trim()
          : null,
      etat_id:
        addBassinEtatId.trim() !== '' ? addBassinEtatId.trim() : null,
      duree_vie_id: null,
      duree_vie_text:
        addBassinDureeText.trim() !== ''
          ? addBassinDureeText.trim()
          : null,
      reference_interne:
        addBassinReferenceInterne.trim() !== ''
          ? addBassinReferenceInterne.trim()
          : null,
      notes: addBassinNotes.trim() !== '' ? addBassinNotes.trim() : null,
      polygone_geojson: null,
    }

    const { data, error } = await supabaseBrowser
      .from('bassins')
      .insert(payload)
      .select(
        'id, name, membrane_type_id, surface_m2, annee_installation, date_derniere_refection, etat_id, duree_vie_id, duree_vie_text, reference_interne, notes, polygone_geojson'
      )
      .single()

    setAddBassinSaving(false)

    if (error) {
      console.error('Erreur ajout bassin :', error)
      setAddBassinError(error.message ?? 'Erreur inconnue')
      return
    }

    if (data) {
      setBassins((prev) => [...prev, data as BassinRow])
      setAddBassinOpen(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-ct-gray mb-1">
            Client
          </p>
          <p className="text-sm font-medium text-ct-grayDark">
            {clientName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ct-primary">
            {batiment.name || 'Bâtiment sans nom'}
          </h1>
          <p className="mt-1 text-sm text-ct-gray">
            {batiment.address && (
              <>
                {batiment.address}
                {', '}
              </>
            )}
            {batiment.city && (
              <>
                {batiment.city}
                {', '}
              </>
            )}
            {batiment.postal_code}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/batiments" className="btn-secondary">
            ← Retour aux bâtiments
          </Link>
          <button
            type="button"
            className="btn-secondary"
            onClick={openEditModal}
          >
            Modifier le bâtiment
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={openAddBassinModal}
          >
            Ajouter un bassin
          </button>
        </div>
      </div>

      {/* Grille principale : table bassins + carte */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)]">
        {/* Colonne gauche : table des bassins */}
        <Card>
          <CardHeader>
            <CardTitle>Bassins de toiture</CardTitle>
            <CardDescription>
              Liste des bassins associés à ce bâtiment avec leur état,
              membrane et durée de vie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bassins.length === 0 ? (
              <p className="text-sm text-ct-gray">
                Aucun bassin n’est encore associé à ce bâtiment.
              </p>
            ) : (
              <DataTable maxHeight={420}>
                <table className="w-full table-fixed">
                  <DataTableHeader>
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                        Nom du bassin
                      </th>
                      <th className="w-[130px] px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                        État
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                        Durée de vie résiduelle
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                        Type de membrane
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                        Surface (pi²)
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                        Dernière réfection
                      </th>
                      <th className="w-[90px] px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-ct-grayDark">
                        Actions
                      </th>
                    </tr>
                  </DataTableHeader>

                  <DataTableBody>
                    {bassins.map((b) => {
                      const membraneLabel =
                        membranes.find((m) => m.id === b.membrane_type_id)
                          ?.label ?? 'N/D'

                      const etatLabel =
                        etats.find((e) => e.id === b.etat_id)?.label ??
                        'Non évalué'

                      const dureeLabel =
                        b.duree_vie_text ??
                        durees.find((d) => d.id === b.duree_vie_id)?.label ??
                        'Non définie'

                      const surfaceFt2 =
                        b.surface_m2 != null
                          ? Math.round(b.surface_m2 * 10.7639)
                          : null

                      const stateBadge = mapEtatToStateBadge(etatLabel)

                      return (
                        <tr
                          key={b.id}
                          onMouseEnter={() => setHoveredBassinId(b.id)}
                          onMouseLeave={() => setHoveredBassinId(null)}
                          className="cursor-pointer hover:bg-ct-primaryLight/10"
                          onClick={() => router.push(`/admin/bassins/${b.id}`)}
                        >
                          <td className="px-3 py-2 align-middle">
                            <div className="flex flex-col">
                              <span className="font-medium text-ct-grayDark">
                                {b.name || 'Bassin sans nom'}
                              </span>
                              {b.reference_interne && (
                                <span className="text-xs text-ct-gray">
                                  Réf. interne : {b.reference_interne}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-middle whitespace-nowrap">
                            <StateBadge state={stateBadge} />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {dureeLabel}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {membraneLabel}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {surfaceFt2 != null ? `${surfaceFt2} pi²` : 'n/d'}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            {b.date_derniere_refection || '—'}
                          </td>
                          <td className="px-3 py-2 align-middle text-right">
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/admin/bassins/${b.id}`)
                              }}
                            >
                              Voir
                            </button>
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
                  Mettez à jour les informations générales et le client
                  associé.
                </p>
              </div>
            </div>

            {editError && (
              <p className="mb-3 text-sm text-red-600">{editError}</p>
            )}

            <form
              onSubmit={handleEditSubmit}
              className="grid gap-4 text-sm md:grid-cols-2"
            >
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Nom du bâtiment
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Client
                </label>
                <select
                  value={editClientId}
                  onChange={(e) => setEditClientId(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                >
                  <option value="">Aucun client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Adresse
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Ville
                </label>
                <input
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Code postal
                </label>
                <input
                  type="text"
                  value={editPostalCode}
                  onChange={(e) => setEditPostalCode(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={editLatitude}
                  onChange={(e) => setEditLatitude(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  value={editLongitude}
                  onChange={(e) => setEditLongitude(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
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

              <div className="mt-4 md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeEditModal}
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
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
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-ct-primary">
                Ajouter un bassin
              </h2>
              <p className="mt-1 text-xs text-ct-gray">
                Créez un nouveau bassin pour ce bâtiment. Le polygone sera
                dessiné par la suite dans la fiche du bassin.
              </p>
            </div>

            {addBassinError && (
              <p className="mb-3 text-sm text-red-600">{addBassinError}</p>
            )}

            <form
              onSubmit={handleAddBassinSubmit}
              className="grid gap-4 text-sm md:grid-cols-2"
            >
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Nom du bassin
                </label>
                <input
                  type="text"
                  value={addBassinName}
                  onChange={(e) => setAddBassinName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Type de membrane
                </label>
                <select
                  value={addBassinMembraneId}
                  onChange={(e) => setAddBassinMembraneId(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                >
                  <option value="">Non défini</option>
                  {membranes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Surface (m²)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={addBassinSurface}
                  onChange={(e) => setAddBassinSurface(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Année d&apos;installation
                </label>
                <input
                  type="number"
                  value={addBassinAnnee}
                  onChange={(e) => setAddBassinAnnee(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Date de la dernière réfection
                </label>
                <input
                  type="date"
                  value={addBassinDerniereRef}
                  onChange={(e) => setAddBassinDerniereRef(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  État du bassin
                </label>
                <select
                  value={addBassinEtatId}
                  onChange={(e) => setAddBassinEtatId(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                >
                  <option value="">Non défini</option>
                  {etats.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Durée de vie (texte libre)
                </label>
                <input
                  type="text"
                  value={addBassinDureeText}
                  onChange={(e) => setAddBassinDureeText(e.target.value)}
                  placeholder="Ex.: ± 5 à 7 ans"
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Référence interne
                </label>
                <input
                  type="text"
                  value={addBassinReferenceInterne}
                  onChange={(e) =>
                    setAddBassinReferenceInterne(e.target.value)
                  }
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Notes internes
                </label>
                <textarea
                  rows={3}
                  value={addBassinNotes}
                  onChange={(e) => setAddBassinNotes(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="mt-4 md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeAddBassinModal}
                  disabled={addBassinSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={addBassinSaving}
                >
                  {addBassinSaving ? 'Ajout en cours…' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  const polygonsCountRef = useRef(0)

  const polygons = bassins
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

  useEffect(() => {
    if (!isLoaded || !map) return

    if (polygons.length === 0) {
      polygonsCountRef.current = 0
      return
    }

    if (
      polygonsCountRef.current === polygons.length &&
      polygonsCountRef.current !== 0
    ) {
      return
    }

    polygonsCountRef.current = polygons.length

    const bounds = new google.maps.LatLngBounds()
    polygons.forEach((poly) => {
      poly.path.forEach((p) => bounds.extend(p))
    })

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
  }, [isLoaded, map, polygons])

  if (!isLoaded) {
    return (
      <div className="flex h-[480px] items-center justify-center text-sm text-ct-gray">
        Chargement de la carte…
      </div>
    )
  }

  if (polygons.length === 0) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl border border-ct-gray bg-ct-grayLight text-sm text-ct-gray">
        Aucun polygone n’est encore dessiné pour ce bâtiment.
      </div>
    )
  }

  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-ct-grayLight bg-ct-grayLight">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        defaultCenter={center}
        defaultZoom={18}
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
