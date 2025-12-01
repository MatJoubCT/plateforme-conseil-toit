'use client'

import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card'

type ClientRecord = {
  id: string
  name: string | null
  type: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
}

type BatimentRecord = {
  id: string
  client_id: string
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
}

export default function AdminClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = (params?.id as string) ?? ''

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [client, setClient] = useState<ClientRecord | null>(null)
  const [batiments, setBatiments] = useState<BatimentRecord[]>([])
  const [batimentsSearch, setBatimentsSearch] = useState('')

  // Modal édition client
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editPostalCode, setEditPostalCode] = useState('')
  const [editContactName, setEditContactName] = useState('')
  const [editContactEmail, setEditContactEmail] = useState('')
  const [editContactPhone, setEditContactPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Modal suppression client
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Modal ajout bâtiment
  const [addOpen, setAddOpen] = useState(false)
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [addName, setAddName] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [addCity, setAddCity] = useState('')
  const [addPostalCode, setAddPostalCode] = useState('')
  const [addLatitude, setAddLatitude] = useState('')
  const [addLongitude, setAddLongitude] = useState('')
  const [addNotes, setAddNotes] = useState('')

  // --- Chargement des données ---

  const reloadBatiments = async () => {
    if (!clientId) return
    const { data, error } = await supabaseBrowser
      .from('batiments')
      .select('*')
      .eq('client_id', clientId)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erreur chargement bâtiments:', error)
      setBatiments([])
      return
    }

    setBatiments((data || []) as BatimentRecord[])
  }

  useEffect(() => {
    if (!clientId) return

    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data: clientData, error: clientError } = await supabaseBrowser
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle()

      if (clientError || !clientData) {
        console.error('Erreur chargement client:', clientError)
        setErrorMsg(
          clientError?.message || "Impossible de charger les informations du client."
        )
        setLoading(false)
        return
      }

      setClient(clientData as ClientRecord)

      await reloadBatiments()

      setLoading(false)
    }

    void fetchData()
  }, [clientId])

  // --- Recherche dans les bâtiments ---

  const handleBatimentsSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBatimentsSearch(e.target.value)
  }

  const filteredBatiments = batiments.filter((b) => {
    const q = batimentsSearch.trim().toLowerCase()
    if (!q) return true

    const name = (b.name ?? '').toLowerCase()
    const adr = (b.address ?? '').toLowerCase()
    const city = (b.city ?? '').toLowerCase()
    const pc = (b.postal_code ?? '').toLowerCase()

    return (
      name.includes(q) || adr.includes(q) || city.includes(q) || pc.includes(q)
    )
  })

  // --- Modal édition client ---

  const openEditModal = () => {
    if (!client) return
    setEditName(client.name ?? '')
    setEditType(client.type ?? '')
    setEditAddress(client.address ?? '')
    setEditCity(client.city ?? '')
    setEditPostalCode(client.postal_code ?? '')
    setEditContactName(client.contact_name ?? '')
    setEditContactEmail(client.contact_email ?? '')
    setEditContactPhone(client.contact_phone ?? '')
    setEditNotes(client.notes ?? '')
    setEditError(null)
    setEditOpen(true)
  }

  const closeEditModal = () => {
    if (!editSaving) setEditOpen(false)
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    if (!editName.trim()) {
      setEditError('Le nom du client est obligatoire.')
      return
    }

    setEditSaving(true)

    const payload = {
      name: editName.trim(),
      type: editType.trim() || null,
      address: editAddress.trim() || null,
      city: editCity.trim() || null,
      postal_code: editPostalCode.trim() || null,
      contact_name: editContactName.trim() || null,
      contact_email: editContactEmail.trim() || null,
      contact_phone: editContactPhone.trim() || null,
      notes: editNotes.trim() || null,
    }

    const { error } = await supabaseBrowser
      .from('clients')
      .update(payload)
      .eq('id', clientId)

    if (error) {
      console.error('Erreur mise à jour client:', error)
      setEditError(error.message)
      setEditSaving(false)
      return
    }

    setClient((prev) => (prev ? { ...prev, ...payload } : prev))
    setEditSaving(false)
    setEditOpen(false)
  }

  // --- Modal suppression client ---

  const openDeleteModal = () => {
    setDeleteConfirmText('')
    setDeleteError(null)
    setDeleteOpen(true)
  }

  const closeDeleteModal = () => {
    if (!deleteSaving) setDeleteOpen(false)
  }

  const handleDeleteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    if (deleteConfirmText !== 'SUPPRIMER') {
      setDeleteError('Vous devez écrire exactement « SUPPRIMER » pour confirmer.')
      return
    }

    setDeleteSaving(true)

    const { error } = await supabaseBrowser
      .from('clients')
      .delete()
      .eq('id', clientId)

    if (error) {
      console.error('Erreur suppression client:', error)
      setDeleteError(
        error.message ??
          'Impossible de supprimer ce client. Vérifiez les bâtiments ou bassins associés.'
      )
      setDeleteSaving(false)
      return
    }

    setDeleteSaving(false)
    setDeleteOpen(false)
    router.push('/admin/clients')
  }

  // --- Modal ajout bâtiment ---

  const openAddModal = () => {
    setAddName('')
    setAddAddress('')
    setAddCity('')
    setAddPostalCode('')
    setAddLatitude('')
    setAddLongitude('')
    setAddNotes('')
    setAddError(null)
    setAddOpen(true)
  }

  const closeAddModal = () => {
    if (!addSaving) setAddOpen(false)
  }

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    if (!addName.trim()) {
      setAddError('Le nom du bâtiment est obligatoire.')
      return
    }

    setAddSaving(true)
    setAddError(null)

    let latitude: number | null = null
    let longitude: number | null = null

    if (addLatitude.trim() !== '') {
      const val = Number(addLatitude.replace(',', '.'))
      if (Number.isNaN(val)) {
        setAddError('La latitude doit être un nombre.')
        setAddSaving(false)
        return
      }
      latitude = val
    }

    if (addLongitude.trim() !== '') {
      const val = Number(addLongitude.replace(',', '.'))
      if (Number.isNaN(val)) {
        setAddError('La longitude doit être un nombre.')
        setAddSaving(false)
        return
      }
      longitude = val
    }

    const payload = {
      client_id: clientId,
      name: addName.trim(),
      address: addAddress.trim() || null,
      city: addCity.trim() || null,
      postal_code: addPostalCode.trim() || null,
      latitude,
      longitude,
      notes: addNotes.trim() || null,
    }

    const { error } = await supabaseBrowser
      .from('batiments')
      .insert([payload])

    if (error) {
      console.error('Erreur ajout bâtiment:', error)
      setAddError(error.message)
      setAddSaving(false)
      return
    }

    await reloadBatiments()
    setAddSaving(false)
    setAddOpen(false)
  }

  // --- Rendus ---

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Client</h1>
        <p className="text-sm text-ct-gray">Chargement des informations…</p>
      </section>
    )
  }

  if (errorMsg || !client) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Client</h1>
        <p className="text-sm text-red-600">
          {errorMsg ?? 'Client introuvable.'}
        </p>
      </section>
    )
  }

  const clientName = client.name ?? '(Sans nom)'

  return (
    <>
      <section className="space-y-6">
        {/* ENTÊTE PAGE */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ct-gray">
              Client
            </p>
            <h1 className="text-2xl font-semibold text-ct-primary">{clientName}</h1>
            <p className="text-sm text-ct-gray">Coordonnées à compléter.</p>
          </div>

          <button
            type="button"
            className="btn-secondary hover:border-ct-primary/70 hover:bg-ct-grayLight/80 hover:text-ct-primary transition-colors"
            onClick={() => router.push('/admin/clients')}
          >
            ← Retour à la liste des clients
          </button>
        </div>

        {/* INFOS CLIENT */}
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Informations du client</CardTitle>
              <CardDescription>
                Coordonnées générales et informations internes pour ce client.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-xs hover:border-ct-primary/70 hover:bg-ct-grayLight/80 hover:text-ct-primary transition-colors"
                onClick={openEditModal}
              >
                Modifier
              </button>
              <button
                type="button"
                className="btn-danger px-3 py-1.5 text-xs hover:bg-red-600/90 hover:text-white transition-colors"
                onClick={openDeleteModal}
              >
                Supprimer
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Nom
                  </p>
                  <p className="mt-1 text-sm font-medium text-ct-primary">
                    {clientName}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Type de client
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {client.type ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Notes internes
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark whitespace-pre-line">
                    {client.notes ?? 'Aucune note pour ce client.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Personne contact
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {client.contact_name ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Courriel
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {client.contact_email ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Téléphone
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {client.contact_phone ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Adresse
                  </p>
                  <p className="mt-1 text-sm text-ct-grayDark">
                    {client.address ?? '—'}
                    {client.city ? `, ${client.city}` : ''}
                    {client.postal_code ? `, ${client.postal_code}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BÂTIMENTS ASSOCIÉS */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              {/* Bloc titre + compteur */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <CardTitle>Bâtiments associés</CardTitle>
                  <span className="text-xs font-semibold text-ct-gray">
                    {batiments.length} bâtiment
                    {batiments.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-ct-gray">
                  Vue d’ensemble des bâtiments liés à ce client.
                </p>
              </div>

              {/* Recherche + bouton ajout */}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:w-auto">
                <div className="w-full sm:w-64 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ct-gray">
                    Recherche
                  </p>
                  <input
                    type="text"
                    value={batimentsSearch}
                    onChange={handleBatimentsSearchChange}
                    placeholder="Nom, adresse, ville…"
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary px-3 py-1.5 text-xs sm:self-end"
                  onClick={openAddModal}
                >
                  + Ajouter un bâtiment
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-ct-grayLight" />
          </CardHeader>

          <CardContent className="pt-4">
            {filteredBatiments.length === 0 ? (
              <p className="text-sm text-ct-gray">
                Aucun bâtiment n’est encore associé à ce client.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredBatiments.map((b) => {
                  const bName = b.name ?? '(Sans nom)'
                  const bAddress =
                    b.address ??
                    [b.city, b.postal_code].filter(Boolean).join(', ') ??
                    ''

                  return (
                    <Link
                      key={b.id}
                      href={`/admin/batiments/${b.id}`}
                      className="flex flex-col gap-1 rounded-xl border border-ct-grayLight bg-ct-white px-4 py-3 text-sm text-ct-grayDark shadow-sm transition-colors hover:border-ct-primary/60 hover:bg-ct-grayLight/60"
                    >
                      <span className="font-medium text-ct-primary">{bName}</span>
                      {bAddress && (
                        <span className="text-xs text-ct-gray">{bAddress}</span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* MODAL ÉDITION CLIENT */}
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
                  Modifier le client
                </h2>
                <p className="mt-1 text-xs text-ct-gray">
                  Mettez à jour les informations générales et de contact.
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
                    Nom du client *
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
                    Type de client
                  </label>
                  <input
                    type="text"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="Municipal, institutionnel, privé…"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Personne contact
                  </label>
                  <input
                    type="text"
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Courriel
                  </label>
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
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

      {/* MODAL SUPPRESSION CLIENT */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-ct-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 space-y-2">
              <h2 className="text-lg font-semibold text-red-600">
                Supprimer ce client?
              </h2>
              <p className="text-xs text-ct-gray">
                Cette action est permanente. La suppression échouera si des
                bâtiments, bassins ou garanties sont encore rattachés à ce client.
              </p>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Pour confirmer, écrivez exactement&nbsp;: <b>SUPPRIMER</b>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  placeholder="SUPPRIMER"
                />
              </div>

              {deleteError && (
                <p className="text-xs text-red-600">{deleteError}</p>
              )}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={deleteSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-danger px-3 py-1.5 text-xs hover:bg-red-600/90 hover:text-white transition-colors"
                  disabled={deleteSaving}
                >
                  {deleteSaving ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUT BÂTIMENT */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeAddModal}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-ct-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ct-primary">
                  Ajouter un bâtiment
                </h2>
                <p className="mt-1 text-xs text-ct-gray">
                  Créez un nouveau bâtiment rattaché à ce client. Les bassins et
                  polygones seront ajoutés ultérieurement.
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="rounded-full border border-ct-grayLight px-2 py-1 text-xs text-ct-gray hover:bg-ct-grayLight/70 transition-colors"
                disabled={addSaving}
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Nom du bâtiment *
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="No, rue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={addCity}
                    onChange={(e) => setAddCity(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={addPostalCode}
                    onChange={(e) => setAddPostalCode(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Latitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addLatitude}
                    onChange={(e) => setAddLatitude(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="Ex.: 46.12345"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Longitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addLongitude}
                    onChange={(e) => setAddLongitude(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                    placeholder="-72.98765"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Notes internes
                </label>
                <textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm"
                />
              </div>

              {addError && (
                <p className="text-xs text-red-600">{addError}</p>
              )}

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={addSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={addSaving}
                >
                  {addSaving ? 'Enregistrement…' : 'Créer le bâtiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
