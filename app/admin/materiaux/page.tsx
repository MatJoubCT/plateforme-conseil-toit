'use client'

import { useEffect, useMemo, useState, FormEvent } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { useApiMutation } from '@/lib/hooks/useApiMutation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Tag,
  Ruler,
  Factory,
  CheckCircle2,
  Ban,
  AlertTriangle,
  Save,
} from 'lucide-react'
import { Toast } from '@/components/ui/Toast'

type MateriauRow = {
  id: string
  nom: string
  description: string | null
  categorie_id: string | null
  unite_id: string | null
  prix_cad: number
  manufacturier_entreprise_id: string | null
  actif: boolean
  created_at: string
}

type ListeChoixRow = {
  id: string
  categorie: string
  code: string | null
  label: string | null
  ordre: number | null
  actif: boolean | null
}

type EntrepriseRow = {
  id: string
  type: string
  nom: string
  actif: boolean
}

type ModalMode = 'create' | 'edit'

const CAT_CATEGORIE = 'materiaux_categorie'
const CAT_UNITE = 'materiaux_unite'

export default function AdminMateriauxPage() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [materiaux, setMateriaux] = useState<MateriauRow[]>([])
  const [categories, setCategories] = useState<ListeChoixRow[]>([])
  const [unites, setUnites] = useState<ListeChoixRow[]>([])
  const [entreprises, setEntreprises] = useState<EntrepriseRow[]>([])

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // filtres
  const [q, setQ] = useState('')
  const [filtreActif, setFiltreActif] = useState<'all' | 'actif' | 'inactif'>('all')
  const [filtreCategorieId, setFiltreCategorieId] = useState<string>('')
  const [filtreUniteId, setFiltreUniteId] = useState<string>('')

  // modal create/edit
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editing, setEditing] = useState<MateriauRow | null>(null)

  const [formNom, setFormNom] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategorieId, setFormCategorieId] = useState<string>('')
  const [formUniteId, setFormUniteId] = useState<string>('')
  const [formPrix, setFormPrix] = useState<string>('0.00')
  const [formEntrepriseId, setFormEntrepriseId] = useState<string>('')
  const [formActif, setFormActif] = useState(true)

  // suppression
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // API Mutations
  const {
    mutate: createMateriau,
    isLoading: isCreating,
    error: createError,
    resetError: resetCreateError,
  } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/materiaux/create',
    defaultErrorMessage: 'Erreur lors de la création du matériau',
    onSuccess: async () => {
      await fetchAll()
      setShowModal(false)
      resetForm()
    },
  })

  const {
    mutate: updateMateriau,
    isLoading: isUpdating,
    error: updateError,
    resetError: resetUpdateError,
  } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/materiaux/update',
    defaultErrorMessage: 'Erreur lors de la modification du matériau',
    onSuccess: async () => {
      await fetchAll()
      setShowModal(false)
      setEditing(null)
    },
  })

  const {
    mutate: deleteMateriau,
    isLoading: isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/materiaux/delete',
    defaultErrorMessage: 'Erreur lors de la suppression du matériau',
    onSuccess: async () => {
      await fetchAll()
      setConfirmDeleteId(null)
    },
  })

  const fetchAll = async () => {
    setLoading(true)
    setErrorMsg(null)

    const [mRes, lcRes, entRes] = await Promise.all([
      supabaseBrowser
        .from('materiaux')
        .select(
          'id, nom, description, categorie_id, unite_id, prix_cad, manufacturier_entreprise_id, actif, created_at'
        )
        .order('nom', { ascending: true }),
      supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, code, label, ordre, actif')
        .in('categorie', [CAT_CATEGORIE, CAT_UNITE])
        .order('categorie', { ascending: true })
        .order('ordre', { ascending: true })
        .order('label', { ascending: true }),
      supabaseBrowser
        .from('entreprises')
        .select('id, type, nom, actif')
        .order('nom', { ascending: true }),
    ])

    if (mRes.error) {
      setErrorMsg(mRes.error.message)
      setLoading(false)
      return
    }
    if (lcRes.error) {
      setErrorMsg(lcRes.error.message)
      setLoading(false)
      return
    }
    if (entRes.error) {
      setErrorMsg(entRes.error.message)
      setLoading(false)
      return
    }

    const lc = (lcRes.data || []) as ListeChoixRow[]
    setCategories(lc.filter((x) => x.categorie === CAT_CATEGORIE))
    setUnites(lc.filter((x) => x.categorie === CAT_UNITE))

    setEntreprises((entRes.data || []) as EntrepriseRow[])
    setMateriaux((mRes.data || []) as MateriauRow[])
    setLoading(false)
  }

  useEffect(() => {
    void fetchAll()
  }, [])

  const mapCategorie = useMemo(() => {
    const m = new Map<string, string>()
    categories.forEach((c) => m.set(c.id, c.label || c.code || ''))
    return m
  }, [categories])

  const mapUnite = useMemo(() => {
    const m = new Map<string, string>()
    unites.forEach((u) => m.set(u.id, u.label || u.code || ''))
    return m
  }, [unites])

  const mapEntreprise = useMemo(() => {
    const m = new Map<string, string>()
    entreprises.forEach((e) => m.set(e.id, e.nom))
    return m
  }, [entreprises])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()

    return materiaux.filter((m) => {
      if (filtreActif === 'actif' && !m.actif) return false
      if (filtreActif === 'inactif' && m.actif) return false
      if (filtreCategorieId && m.categorie_id !== filtreCategorieId) return false
      if (filtreUniteId && m.unite_id !== filtreUniteId) return false

      if (!qq) return true

      const cat = m.categorie_id ? mapCategorie.get(m.categorie_id) || '' : ''
      const un = m.unite_id ? mapUnite.get(m.unite_id) || '' : ''
      const ent = m.manufacturier_entreprise_id
        ? mapEntreprise.get(m.manufacturier_entreprise_id) || ''
        : ''

      const hay = [
        m.nom,
        m.description || '',
        cat,
        un,
        ent,
        String(m.prix_cad ?? ''),
      ]
        .join(' ')
        .toLowerCase()

      return hay.includes(qq)
    })
  }, [materiaux, q, filtreActif, filtreCategorieId, filtreUniteId, mapCategorie, mapUnite, mapEntreprise])

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

  const resetForm = () => {
    setFormNom('')
    setFormDescription('')
    setFormCategorieId('')
    setFormUniteId('')
    setFormPrix('0.00')
    setFormEntrepriseId('')
    setFormActif(true)
  }

  const openCreate = () => {
    setModalMode('create')
    setEditing(null)
    resetForm()
    resetCreateError()
    setShowModal(true)
  }

  const openEdit = (row: MateriauRow) => {
    setModalMode('edit')
    setEditing(row)
    setFormNom(row.nom || '')
    setFormDescription(row.description || '')
    setFormCategorieId(row.categorie_id || '')
    setFormUniteId(row.unite_id || '')
    setFormPrix(Number(row.prix_cad ?? 0).toFixed(2))
    setFormEntrepriseId(row.manufacturier_entreprise_id || '')
    setFormActif(!!row.actif)
    resetUpdateError()
    setShowModal(true)
  }

  const handleModalOpenChange = (open: boolean) => {
    if (!open && !isCreating && !isUpdating) {
      setShowModal(false)
      setEditing(null)
      resetCreateError()
      resetUpdateError()
    }
  }

  const handleDeleteOpenChange = (open: boolean) => {
    if (!open && !isDeleting) {
      setConfirmDeleteId(null)
      resetDeleteError()
    }
  }

  const normalizePrix = (s: string) => {
    const cleaned = s.replace(',', '.').replace(/[^0-9.]/g, '')
    if (!cleaned) return 0
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : 0
  }

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const nom = formNom.trim()
    if (!nom) {
      setToast({ type: 'error', message: 'Le nom du matériau est obligatoire.' })
      return
    }

    const prix = normalizePrix(formPrix)

    const payload = {
      nom,
      description: formDescription.trim() || null,
      categorie_id: formCategorieId || null,
      unite_id: formUniteId || null,
      prix_cad: prix,
      manufacturier_entreprise_id: formEntrepriseId || null,
      actif: formActif,
    }

    if (modalMode === 'create') {
      await createMateriau(payload)
    } else {
      if (!editing?.id) {
        setToast({ type: 'error', message: 'ID matériau introuvable.' })
        return
      }
      await updateMateriau({ ...payload, id: editing.id })
    }
  }

  const askDelete = (id: string) => {
    setConfirmDeleteId(id)
    resetDeleteError()
  }

  const doDelete = async () => {
    if (!confirmDeleteId) return
    await deleteMateriau({ id: confirmDeleteId })
  }

  const renderForm = () => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Nom *
        </label>
        <input
          value={formNom}
          onChange={(e) => setFormNom(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
          placeholder="Ex. Sopralène Flam 250 granulé"
        />
      </div>

      <div className="md:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Description
        </label>
        <textarea
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
          className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
          placeholder="Notes utiles (optionnel)"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Catégorie
        </label>
        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={formCategorieId}
            onChange={(e) => setFormCategorieId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 !pl-10 pr-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">—</option>
            {categories
              .filter((c) => c.actif !== false)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || c.code}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Unité
        </label>
        <div className="relative">
          <Ruler className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={formUniteId}
            onChange={(e) => setFormUniteId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 !pl-10 pr-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">—</option>
            {unites
              .filter((u) => u.actif !== false)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label || u.code}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Prix (CAD)
        </label>
        <input
          value={formPrix}
          onChange={(e) => setFormPrix(e.target.value)}
          inputMode="decimal"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-600">
          Manufacturier (entreprise)
        </label>
        <div className="relative">
          <Factory className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={formEntrepriseId}
            onChange={(e) => setFormEntrepriseId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 !pl-10 pr-3 text-sm outline-none focus:border-slate-300"
          >
            <option value="">—</option>
            {entreprises
              .filter(
                (e) =>
                  e.actif &&
                  ['manufacturier', 'distributeur', 'fournisseur'].includes(
                    (e.type || '').toLowerCase(),
                  ),
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="md:col-span-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={formActif}
            onChange={(e) => setFormActif(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Actif
        </label>
      </div>
    </div>
  )

  const isLoading = isCreating || isUpdating
  const modalError = modalMode === 'create' ? createError : updateError

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-base font-bold uppercase tracking-wide text-slate-800">
                  Matériaux
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">
                  Catalogue de matériaux (composition de toiture)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Nouveau matériau
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="px-6 py-4">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Recherche</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nom, description, catégorie, unité, manufacturier, prix…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 !pl-10 pr-3 text-sm outline-none focus:border-slate-300"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Statut</label>
              <select
                value={filtreActif}
                onChange={(e) => setFiltreActif(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
              >
                <option value="all">Tous</option>
                <option value="actif">Actifs</option>
                <option value="inactif">Inactifs</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Catégorie</label>
              <select
                value={filtreCategorieId}
                onChange={(e) => setFiltreCategorieId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
              >
                <option value="">Toutes</option>
                {categories
                  .filter((c) => c.actif !== false)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || c.code}
                    </option>
                  ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600">Unité</label>
              <select
                value={filtreUniteId}
                onChange={(e) => setFiltreUniteId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-300"
              >
                <option value="">Toutes</option>
                {unites
                  .filter((u) => u.actif !== false)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label || u.code}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-600">
            {loading ? 'Chargement…' : `${filtered.length} matériau(x)`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-6 py-3">Nom</th>
                <th className="px-6 py-3">Catégorie</th>
                <th className="px-6 py-3">Unité</th>
                <th className="px-6 py-3">Manufacturier</th>
                <th className="px-6 py-3 text-right">Prix (CAD)</th>
                <th className="px-6 py-3 text-right">Statut</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-slate-500">
                    Chargement…
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Aucun résultat.
                  </td>
                </tr>
              ) : (
                currentItems.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3">
                      <div className="font-semibold text-slate-800">{m.nom}</div>
                      {m.description && (
                        <div className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                          {m.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {m.categorie_id ? mapCategorie.get(m.categorie_id) || '—' : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {m.unite_id ? mapUnite.get(m.unite_id) || '—' : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      {m.manufacturier_entreprise_id
                        ? mapEntreprise.get(m.manufacturier_entreprise_id) || '—'
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-slate-800">
                      {(m.prix_cad ?? 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {m.actif ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          <CheckCircle2 className="h-4 w-4" /> Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          <Ban className="h-4 w-4" /> Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(m.id)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination info */}
        {filtered.length > 0 && (
          <div className="mt-4 text-sm text-ct-gray text-center">
            Affichage de {startIndex} à {endIndex} sur {totalItems} matériau{totalItems > 1 ? 'x' : ''}
          </div>
        )}

        {/* Pagination controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL Create/Edit */}
      <Dialog open={showModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Nouveau matériau' : 'Modifier le matériau'}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Catalogue (prix CAD avant taxes)
            </p>
          </DialogHeader>

          <form onSubmit={handleModalSubmit} className="space-y-5">
            {renderForm()}

            {modalError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{modalError}</p>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Catégories et unités proviennent de <b>listes_choix</b> ({CAT_CATEGORIE} / {CAT_UNITE}).
            </p>

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleModalOpenChange(false)}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Annuler
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL Delete */}
      <Dialog open={!!confirmDeleteId} onOpenChange={handleDeleteOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>

            <div className="min-w-0 flex-1">
              <DialogHeader>
                <DialogTitle>Confirmer la suppression</DialogTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Cette action est irréversible.
                </p>
              </DialogHeader>

              <div className="mt-4">
                <p className="text-sm text-slate-700">
                  Supprimer ce matériau du catalogue?
                </p>

                {deleteError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm text-red-700">{deleteError}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <button
                  type="button"
                  onClick={() => handleDeleteOpenChange(false)}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={doDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Suppression…' : 'Supprimer'}
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
    </div>
  )
}
