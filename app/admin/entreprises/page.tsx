'use client'

import { useEffect, useMemo, useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { useApiMutation } from '@/lib/hooks/useApiMutation'
import { ENTREPRISE_TYPES } from '@/lib/schemas/entreprise.schema'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Briefcase,
  Search,
  X,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Toast } from '@/components/ui/Toast'

type EntrepriseRow = {
  id: string
  type: string
  nom: string
  amcq_membre: boolean | null
  source: string | null
  site_web: string | null
  telephone: string | null
  adresse: string | null
  ville: string | null
  province: string | null
  code_postal: string | null
  notes: string | null
  actif: boolean
  created_at: string
}

export default function AdminEntreprisesPage() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [entreprises, setEntreprises] = useState<EntrepriseRow[]>([])
  const [search, setSearch] = useState('')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal ajout
  const [showAddModal, setShowAddModal] = useState(false)

  // Modal édition
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEntreprise, setEditingEntreprise] = useState<EntrepriseRow | null>(null)

  // Modal suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingEntreprise, setDeletingEntreprise] = useState<EntrepriseRow | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Form fields (colonnes de la table entreprises)
  const [fType, setFType] = useState('')
  const [fNom, setFNom] = useState('')
  const [fAmcq, setFAmcq] = useState<boolean>(false)
  const [fSource, setFSource] = useState('')
  const [fSiteWeb, setFSiteWeb] = useState('')
  const [fTelephone, setFTelephone] = useState('')
  const [fAdresse, setFAdresse] = useState('')
  const [fVille, setFVille] = useState('')
  const [fProvince, setFProvince] = useState('')
  const [fCodePostal, setFCodePostal] = useState('')
  const [fNotes, setFNotes] = useState('')
  const [fActif, setFActif] = useState(true)

  // API Mutations avec useApiMutation
  const {
    mutate: createEntreprise,
    isLoading: isCreating,
    error: createError,
    resetError: resetCreateError,
  } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/entreprises/create',
    defaultErrorMessage: "Erreur lors de l'ajout de l'entreprise",
    onSuccess: async () => {
      await fetchEntreprises()
      setShowAddModal(false)
      resetForm()
    },
  })

  const {
    mutate: updateEntreprise,
    isLoading: isUpdating,
    error: updateError,
    resetError: resetUpdateError,
  } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/entreprises/update',
    defaultErrorMessage: "Erreur lors de la modification de l'entreprise",
    onSuccess: async () => {
      await fetchEntreprises()
      setShowEditModal(false)
      setEditingEntreprise(null)
    },
  })

  const {
    mutate: deleteEntreprise,
    isLoading: isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/entreprises/delete',
    defaultErrorMessage: "Erreur lors de la suppression de l'entreprise",
    onSuccess: async () => {
      await fetchEntreprises()
      setShowDeleteModal(false)
      setDeletingEntreprise(null)
      setDeleteConfirmText('')
    },
  })

  const resetForm = () => {
    setFType('')
    setFNom('')
    setFAmcq(false)
    setFSource('')
    setFSiteWeb('')
    setFTelephone('')
    setFAdresse('')
    setFVille('')
    setFProvince('')
    setFCodePostal('')
    setFNotes('')
    setFActif(true)
  }

  const setFormFromEntreprise = (e: EntrepriseRow) => {
    setFType(e.type ?? '')
    setFNom(e.nom ?? '')
    setFAmcq(!!e.amcq_membre)
    setFSource(e.source ?? '')
    setFSiteWeb(e.site_web ?? '')
    setFTelephone(e.telephone ?? '')
    setFAdresse(e.adresse ?? '')
    setFVille(e.ville ?? '')
    setFProvince(e.province ?? '')
    setFCodePostal(e.code_postal ?? '')
    setFNotes(e.notes ?? '')
    setFActif(!!e.actif)
  }

  const fetchEntreprises = async () => {
    setLoading(true)
    setErrorMsg(null)

    const { data, error } = await supabaseBrowser
      .from('entreprises')
      .select(
        'id, type, nom, amcq_membre, source, site_web, telephone, adresse, ville, province, code_postal, notes, actif, created_at'
      )
      .order('nom', { ascending: true })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    setEntreprises((data || []) as EntrepriseRow[])
    setLoading(false)
  }

  useEffect(() => {
    void fetchEntreprises()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entreprises

    return entreprises.filter((e) => {
      const hay = [
        e.nom,
        e.type,
        e.ville ?? '',
        e.province ?? '',
        e.telephone ?? '',
        e.site_web ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [entreprises, search])

  // Apply pagination to filtered results
  const {
    currentPage,
    totalPages,
    currentItems,
    setCurrentPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(filtered, 50) // 50 items per page

  const openAdd = () => {
    resetForm()
    resetCreateError()
    setShowAddModal(true)
  }

  const handleAddOpenChange = (open: boolean) => {
    if (!open && !isCreating) {
      setShowAddModal(false)
      resetCreateError()
    }
  }

  const openEdit = (e: EntrepriseRow) => {
    if (isUpdating || isDeleting) return
    setEditingEntreprise(e)
    setFormFromEntreprise(e)
    resetUpdateError()
    setShowEditModal(true)
  }

  const handleEditOpenChange = (open: boolean) => {
    if (!open && !isUpdating) {
      setShowEditModal(false)
      setEditingEntreprise(null)
      resetUpdateError()
    }
  }

  const openDelete = (e: EntrepriseRow) => {
    if (isUpdating || isDeleting) return
    setDeletingEntreprise(e)
    setDeleteConfirmText('')
    resetDeleteError()
    setShowDeleteModal(true)
  }

  const handleDeleteOpenChange = (open: boolean) => {
    if (!open && !isDeleting) {
      setShowDeleteModal(false)
      setDeletingEntreprise(null)
      setDeleteConfirmText('')
      resetDeleteError()
    }
  }

  const buildPayload = () => ({
    type: fType.trim(),
    nom: fNom.trim(),
    amcq_membre: fAmcq ? true : null,
    source: fSource.trim() !== '' ? fSource.trim() : null,
    site_web: fSiteWeb.trim() !== '' ? fSiteWeb.trim() : null,
    telephone: fTelephone.trim() !== '' ? fTelephone.trim() : null,
    adresse: fAdresse.trim() !== '' ? fAdresse.trim() : null,
    ville: fVille.trim() !== '' ? fVille.trim() : null,
    province: fProvince.trim() !== '' ? fProvince.trim() : null,
    code_postal: fCodePostal.trim() !== '' ? fCodePostal.trim() : null,
    notes: fNotes.trim() !== '' ? fNotes.trim() : null,
    actif: fActif,
  })

  const handleSubmitAdd = async (e: FormEvent) => {
    e.preventDefault()

    // Champs non nullable : type, nom
    if (!fType.trim() || !fNom.trim()) {
      setToast({ type: 'error', message: 'Les champs "Type" et "Nom" sont obligatoires.' })
      return
    }

    await createEntreprise(buildPayload())
  }

  const handleSubmitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingEntreprise) return

    if (!fType.trim() || !fNom.trim()) {
      setToast({ type: 'error', message: 'Les champs "Type" et "Nom" sont obligatoires.' })
      return
    }

    await updateEntreprise({ ...buildPayload(), id: editingEntreprise.id })
  }

  const confirmDelete = async () => {
    if (!deletingEntreprise) return
    if (deleteConfirmText.trim().toUpperCase() !== 'SUPPRIMER') return

    await deleteEntreprise({ id: deletingEntreprise.id })
  }

  // Formulaire partagé entre ajout et édition
  const renderForm = () => (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Type <span className="text-red-500">*</span>
          </label>
          <select
            value={fType}
            onChange={(e) => setFType(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          >
            <option value="">-- Sélectionner un type --</option>
            {ENTREPRISE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            value={fNom}
            onChange={(e) => setFNom(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={fAmcq}
            onChange={(e) => setFAmcq(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Membre AMCQ
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={fActif}
            onChange={(e) => setFActif(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Actif
        </label>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">Source</label>
        <input
          value={fSource}
          onChange={(e) => setFSource(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Site web</label>
          <input
            value={fSiteWeb}
            onChange={(e) => setFSiteWeb(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Téléphone</label>
          <input
            value={fTelephone}
            onChange={(e) => setFTelephone(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">Adresse</label>
        <input
          value={fAdresse}
          onChange={(e) => setFAdresse(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Ville</label>
          <input
            value={fVille}
            onChange={(e) => setFVille(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Province</label>
          <input
            value={fProvince}
            onChange={(e) => setFProvince(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Code postal</label>
          <input
            value={fCodePostal}
            onChange={(e) => setFCodePostal(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">Notes</label>
        <textarea
          rows={3}
          value={fNotes}
          onChange={(e) => setFNotes(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
        />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#2d6ba8] shadow-lg animate-pulse" />
          <p className="text-sm font-medium text-slate-600">Chargement des entreprises…</p>
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

  return (
    <section className="space-y-6">
      {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F4E79] via-[#1a4168] to-[#163555] p-6 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Entreprises</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Gestion du répertoire (couvreurs, fournisseurs, etc.)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1F4E79] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* BARRE RECHERCHE + LISTE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                Liste des entreprises
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="w-full md:max-w-md">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher une entreprise…"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 !pl-10"
                />

                {search.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Effacer la recherche"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          {currentItems.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
              <Briefcase className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">Aucune entreprise trouvée</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentItems.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 truncate">{e.nom}</p>
                        {e.actif ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Inactif
                          </span>
                        )}
                        {e.amcq_membre ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            AMCQ
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-sm text-slate-500">
                        <span className="font-medium text-slate-600">Type :</span> {e.type}
                        {(e.ville || e.province) && (
                          <>
                            <span className="mx-2 text-slate-300">•</span>
                            <span>
                              {e.ville ?? ''}
                              {e.ville && e.province ? ', ' : ''}
                              {e.province ?? ''}
                            </span>
                          </>
                        )}
                      </div>

                      {(e.telephone || e.site_web) && (
                        <div className="mt-1 text-xs text-slate-400">
                          {e.telephone ? <span>Tél. : {e.telephone}</span> : null}
                          {e.telephone && e.site_web ? <span className="mx-2">•</span> : null}
                          {e.site_web ? <span>Web : {e.site_web}</span> : null}
                        </div>
                      )}
                    </div>

                    {/* Actions (droite complètement) */}
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Modifier l'entreprise"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openDelete(e)}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Supprimer l'entreprise"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination info */}
          {filtered.length > 0 && (
            <div className="mt-4 text-sm text-ct-gray text-center">
              Affichage de {startIndex} à {endIndex} sur {totalItems} entreprise{totalItems > 1 ? 's' : ''}
            </div>
          )}

          {/* Pagination controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* MODAL AJOUT */}
      <Dialog open={showAddModal} onOpenChange={handleAddOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une entreprise</DialogTitle>
            <p className="text-sm text-slate-500 mt-0.5">Remplissez les informations</p>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-5">
            {renderForm()}

            {createError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{createError}</p>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleAddOpenChange(false)}
                disabled={isCreating}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isCreating ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ÉDITION */}
      <Dialog open={showEditModal} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier une entreprise</DialogTitle>
            {editingEntreprise && (
              <p className="text-sm text-slate-500 mt-0.5">{editingEntreprise.nom}</p>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-5">
            {renderForm()}

            {updateError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{updateError}</p>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleEditOpenChange(false)}
                disabled={isUpdating}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {isUpdating ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL SUPPRESSION */}
      <Dialog open={showDeleteModal} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogHeader>
                <DialogTitle>Supprimer cette entreprise ?</DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">Cette action est irréversible</p>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Cette entreprise sera définitivement supprimée :{' '}
                  <span className="font-semibold">{deletingEntreprise?.nom}</span>.
                </div>

                <div>
                  <p className="text-sm text-slate-600">
                    Pour confirmer, écrivez <span className="font-bold text-red-600">SUPPRIMER</span>
                  </p>

                  <input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="SUPPRIMER"
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>

                {deleteError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{deleteError}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <button
                  type="button"
                  onClick={() => handleDeleteOpenChange(false)}
                  disabled={isDeleting}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'SUPPRIMER'}
                  className="rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  )
}
