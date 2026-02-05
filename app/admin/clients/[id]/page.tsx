'use client'

import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { useValidatedId } from '@/lib/hooks/useValidatedId'
import { useApiMutation } from '@/lib/hooks/useApiMutation'
import { validateCoordinates } from '@/lib/utils/validation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Users,
  Building2,
  ChevronLeft,
  Pencil,
  Plus,
  Trash2,
  MapPin,
  User,
  Mail,
  Phone,
  StickyNote,
  Home,
  X,
  AlertTriangle,
} from 'lucide-react'

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
  const router = useRouter()
  const clientId = useValidatedId('/admin/clients')

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [client, setClient] = useState<ClientRecord | null>(null)
  const [batiments, setBatiments] = useState<BatimentRecord[]>([])
  const [batimentsSearch, setBatimentsSearch] = useState('')

  // Modal édition client
  const [editOpen, setEditOpen] = useState(false)

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

  // Modal ajout bâtiment
  const [addOpen, setAddOpen] = useState(false)

  const [addName, setAddName] = useState('')
  const [addAddress, setAddAddress] = useState('')
  const [addCity, setAddCity] = useState('')
  const [addPostalCode, setAddPostalCode] = useState('')
  const [addLatitude, setAddLatitude] = useState('')
  const [addLongitude, setAddLongitude] = useState('')
  const [addNotes, setAddNotes] = useState('')

  // --- Chargement des données ---

  const reloadClient = async () => {
    if (!clientId) return

    const { data: clientData, error: clientError } = await supabaseBrowser
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .maybeSingle()

    if (clientError || !clientData) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur rechargement client:', clientError)
      }
      return
    }

    setClient(clientData as ClientRecord)
  }

  const reloadBatiments = async () => {
    if (!clientId) return
    const { data, error } = await supabaseBrowser
      .from('batiments')
      .select('*')
      .eq('client_id', clientId)
      .order('name', { ascending: true })

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur chargement bâtiments:', error)
      }
      setBatiments([])
      return
    }

    setBatiments((data || []) as BatimentRecord[])
  }

  // Hooks de mutation
  const { mutate: updateClient, isLoading: editSaving, error: editError, resetError: resetEditError } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/clients/update',
    defaultErrorMessage: 'Erreur lors de la modification du client',
    onSuccess: async () => {
      await reloadClient()
      setEditOpen(false)
    }
  })

  const { mutate: deleteClient, isLoading: deleteSaving, error: deleteError, resetError: resetDeleteError } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/clients/delete',
    defaultErrorMessage: 'Erreur lors de la suppression du client',
    onSuccess: () => {
      setDeleteOpen(false)
      router.push('/admin/clients')
    }
  })

  const { mutate: createBatiment, isLoading: addSaving, error: addError, resetError: resetAddError } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/batiments/create',
    defaultErrorMessage: 'Erreur lors de l\'ajout du bâtiment',
    onSuccess: async () => {
      await reloadBatiments()
      setAddOpen(false)
    }
  })

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
        if (process.env.NODE_ENV === 'development') {
          console.error('Erreur chargement client:', clientError)
        }
        setErrorMsg(
          clientError?.message ||
            "Impossible de charger les informations du client."
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
    resetEditError()
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
    if (!clientId) return

    if (!editName.trim()) {
      return
    }

    const payload = {
      id: clientId,
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

    await updateClient(payload)
  }

  // --- Modal suppression client ---

  const openDeleteModal = () => {
    setDeleteConfirmText('')
    resetDeleteError()
    setDeleteOpen(true)
  }

  const handleDeleteOpenChange = (open: boolean) => {
    if (deleteSaving) return
    setDeleteOpen(open)
    if (!open) {
      setDeleteConfirmText('')
      resetDeleteError()
    }
  }

  const handleDeleteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    // 1) Bloquer si des bâtiments sont encore liés (UI + sécurité)
    if (batiments.length > 0) {
      return
    }

    // 2) Confirmation texte
    if (deleteConfirmText.trim().toUpperCase() !== 'SUPPRIMER') {
      return
    }

    await deleteClient({ id: clientId })
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
    resetAddError()
    setAddOpen(true)
  }

  const handleAddOpenChange = (open: boolean) => {
    if (addSaving) return
    setAddOpen(open)
    if (!open) {
      resetAddError()
    }
  }

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!clientId) return

    if (!addName.trim()) {
      return
    }

    const { latitude, longitude, error: coordError } = validateCoordinates(addLatitude, addLongitude)

    if (coordError) {
      return
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

    await createBatiment(payload)
  }

  // --- Rendus ---

  if (!clientId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="text-sm font-medium text-red-700">
            Identifiant du client manquant dans l'URL.
          </p>
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
          <p className="text-sm font-medium text-slate-600">
            Chargement du client…
          </p>
        </div>
      </div>
    )
  }

  if (errorMsg || !client) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
          <p className="text-sm font-medium text-red-700 mb-4">
            {errorMsg ?? 'Client introuvable.'}
          </p>
          <button
            onClick={() => router.push('/admin/clients')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour aux clients
          </button>
        </div>
      </div>
    )
  }

  const clientName = client.name ?? '(Sans nom)'
  const fullAddress = [
    client.address ?? null,
    client.city ?? null,
    client.postal_code ?? null,
  ]
    .filter(Boolean)
    .join(', ')

  // Validation UUID en cours
  if (!clientId) {
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
    <>
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
                href="/admin/clients"
                className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
              >
                <Users className="h-4 w-4" />
                <span>Clients</span>
              </Link>
              <span className="text-white/40">/</span>
              <span className="font-medium text-white">{clientName}</span>
            </div>

            {/* Titre + actions */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{clientName}</h1>
                    <p className="mt-0.5 text-sm text-white/70">
                      {fullAddress || 'Adresse non définie'}
                    </p>
                  </div>
                </div>

                {/* Stats rapides */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {client.type && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                      <Home className="h-4 w-4 text-white/70" />
                      <span className="text-sm text-white/90">{client.type}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                    <Building2 className="h-4 w-4 text-white/70" />
                    <span className="text-sm text-white/90">
                      {batiments.length} bâtiment{batiments.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {client.contact_name && (
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                      <User className="h-4 w-4 text-white/70" />
                      <span className="text-sm text-white/90">{client.contact_name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/clients"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:border-white/50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Clients
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
          {/* ===== COLONNE GAUCHE : BÂTIMENTS ===== */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                    <Building2 className="h-5 w-5 text-[#1F4E79]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Bâtiments associés
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {batiments.length} bâtiment{batiments.length !== 1 ? 's' : ''} lié
                      {batiments.length !== 1 ? 's' : ''} à ce client
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end md:w-auto">
                  <div className="w-full sm:w-72 space-y-1.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      Recherche
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        value={batimentsSearch}
                        onChange={handleBatimentsSearchChange}
                        placeholder="Nom, adresse, ville…"
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                        style={{ paddingLeft: '1rem' }}
                      />

                      {batimentsSearch && (
                        <button
                          type="button"
                          onClick={() => setBatimentsSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                          aria-label="Effacer la recherche"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F4E79] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#163555] sm:self-end"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5">
              {filteredBatiments.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                  <Building2 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p className="mb-2 text-sm font-medium text-slate-600">
                    Aucun bâtiment associé
                  </p>
                  <p className="mb-4 text-xs text-slate-500">
                    Ajoutez un bâtiment pour commencer.
                  </p>
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1F4E79] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#163555]"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un bâtiment
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBatiments.map((b) => {
                    const bName = b.name ?? '(Sans nom)'
                    const bAddr = [b.address, b.city, b.postal_code]
                      .filter(Boolean)
                      .join(', ')

                    return (
                      <Link
                        key={b.id}
                        href={`/admin/batiments/${b.id}`}
                        className="group block rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-800 transition-colors group-hover:text-[#1F4E79]">
                                {bName}
                              </span>
                            </div>

                            {bAddr && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span className="truncate">{bAddr}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F4E79]/10 text-[#1F4E79]">
                            <Building2 className="h-4 w-4" />
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ===== COLONNE DROITE : INFOS / NOTES ===== */}
          <div className="space-y-6 lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                    <Users className="h-5 w-5 text-[#1F4E79]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Informations du client
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Coordonnées et informations internes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="grid gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nom
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {clientName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Type de client
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {client.type ?? '—'}
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Personne contact
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {client.contact_name ?? '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Courriel
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span>{client.contact_email ?? '—'}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Téléphone
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{client.contact_phone ?? '—'}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Adresse
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>{fullAddress || '—'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                    <StickyNote className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      Notes internes
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Informations internes pour ce client.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {client.notes ?? 'Aucune note pour ce client.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== MODALS ========== */}

      {/* MODAL ÉDITION CLIENT */}
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              Mettez à jour les informations générales et de contact.
            </p>
          </DialogHeader>

          {editError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{editError}</p>
            </div>
          )}

          <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Nom du client <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Type de client
                  </label>
                  <input
                    type="text"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    placeholder="Municipal, institutionnel, privé…"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Personne contact
                  </label>
                  <input
                    type="text"
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Courriel
                  </label>
                  <input
                    type="email"
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
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

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Notes internes
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleEditOpenChange(false)}
                disabled={editSaving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
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

      {/* MODAL SUPPRESSION CLIENT */}
      <Dialog open={deleteOpen} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer ce client?</DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              Cette action est permanente.
            </p>
          </DialogHeader>

          <form onSubmit={handleDeleteSubmit} className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  La suppression échouera si des bâtiments, bassins ou garanties sont encore rattachés à ce client.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Pour confirmer, écrivez exactement : <span className="font-bold">SUPPRIMER</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  placeholder="SUPPRIMER"
                />
              </div>

              {deleteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-700">{deleteError}</p>
                </div>
              )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleDeleteOpenChange(false)}
                disabled={deleteSaving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={deleteSaving}
                className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-600 hover:shadow-lg disabled:opacity-50"
              >
                {deleteSaving ? 'Suppression…' : 'Confirmer la suppression'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL AJOUT BÂTIMENT */}
      <Dialog open={addOpen} onOpenChange={handleAddOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un bâtiment</DialogTitle>
            <p className="mt-1 text-sm text-slate-500">
              Créez un nouveau bâtiment rattaché à ce client. Les bassins et polygones seront ajoutés ultérieurement.
            </p>
          </DialogHeader>

          {addError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{addError}</p>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Nom du bâtiment <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    placeholder="No, rue"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={addCity}
                    onChange={(e) => setAddCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={addPostalCode}
                    onChange={(e) => setAddPostalCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Latitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addLatitude}
                    onChange={(e) => setAddLatitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    placeholder="Ex.: 46.12345"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Longitude (optionnel)
                  </label>
                  <input
                    type="text"
                    value={addLongitude}
                    onChange={(e) => setAddLongitude(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    placeholder="-72.98765"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">
                  Notes internes
                </label>
                <textarea
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleAddOpenChange(false)}
                disabled={addSaving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={addSaving}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {addSaving ? 'Enregistrement…' : 'Créer le bâtiment'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
