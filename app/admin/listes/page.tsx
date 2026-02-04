'use client'

import {
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
  FormEvent,
} from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  ListChecks,
  Plus,
  Save,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Palette,
  Tag,
  CheckCircle2,
  Ban,
  AlertTriangle,
} from 'lucide-react'
import { Toast } from '@/components/ui/Toast'
import { Pagination, usePagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useApiMutation } from '@/lib/hooks/useApiMutation'

type ListeChoixRow = {
  id: string
  categorie: string
  code: string | null
  label: string | null
  couleur: string | null
  ordre: number | null
  actif: boolean | null
}

type BassinRef = { id: string }
type GarantieRef = { id: string }
type RapportRef = { id: string }

type ModalMode = 'create' | 'edit'

const COLOR_REQUIRED_PREFIXES = ['etat']

function isColorRequired(categorie: string): boolean {
  return COLOR_REQUIRED_PREFIXES.some((prefix) =>
    categorie.startsWith(prefix)
  )
}

export default function AdminListesChoixPage() {
  const [allItems, setAllItems] = useState<ListeChoixRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [orderDirty, setOrderDirty] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modal état
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editingItem, setEditingItem] = useState<ListeChoixRow | null>(null)
  const [formLabel, setFormLabel] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formCouleur, setFormCouleur] = useState('')
  const [formActif, setFormActif] = useState(true)
  const [savingModal, setSavingModal] = useState(false)

  const [savingOrder, setSavingOrder] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Confirmation de suppression
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ListeChoixRow | null>(null)

  // Hooks API pour les mutations
  const {
    mutate: createItem,
    isLoading: isCreating,
    error: createError,
    resetError: resetCreateError,
  } = useApiMutation({
    method: 'POST',
    endpoint: '/api/admin/listes/create',
    defaultErrorMessage: "Erreur lors de la création de l'élément",
    onSuccess: async (data) => {
      const newItem = data as ListeChoixRow
      setAllItems((prev) => [...prev, newItem])
      setShowModal(false)
      setEditingItem(null)
      setToast({ type: 'success', message: 'Élément créé avec succès.' })
    },
  })

  const {
    mutate: updateItem,
    isLoading: isUpdating,
    error: updateError,
    resetError: resetUpdateError,
  } = useApiMutation({
    method: 'PUT',
    endpoint: '/api/admin/listes/update',
    defaultErrorMessage: "Erreur lors de la mise à jour de l'élément",
    onSuccess: async (data) => {
      const updated = data as ListeChoixRow
      setAllItems((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      )
      setShowModal(false)
      setEditingItem(null)
      setToast({ type: 'success', message: 'Élément mis à jour avec succès.' })
    },
  })

  const {
    mutate: deleteItem,
    isLoading: isDeleting,
    error: deleteError,
    resetError: resetDeleteError,
  } = useApiMutation({
    method: 'DELETE',
    endpoint: '/api/admin/listes/delete',
    defaultErrorMessage: "Erreur lors de la suppression de l'élément",
    onSuccess: async () => {
      if (itemToDelete) {
        setAllItems((prev) => prev.filter((i) => i.id !== itemToDelete.id))
        setToast({ type: 'success', message: 'Élément supprimé avec succès.' })
        setItemToDelete(null)
      }
    },
  })

  // Chargement initial
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data, error } = await supabaseBrowser
        .from('listes_choix')
        .select('id, categorie, code, label, couleur, ordre, actif')
        .order('categorie', { ascending: true })
        .order('ordre', { ascending: true })
        .order('label', { ascending: true })

      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      const rows = (data || []) as ListeChoixRow[]

      // Normalise un ordre en mémoire (ne pas enregistrer tout de suite)
      const byCat: Record<string, ListeChoixRow[]> = {}
      rows.forEach((item) => {
        if (!byCat[item.categorie]) byCat[item.categorie] = []
        byCat[item.categorie].push(item)
      })

      const normalized: ListeChoixRow[] = []
      Object.values(byCat).forEach((items) => {
        items
          .sort((a, b) => {
            const oa = a.ordre ?? 9999
            const ob = b.ordre ?? 9999
            if (oa !== ob) return oa - ob
            return (a.label ?? '').localeCompare(b.label ?? '')
          })
          .forEach((item, index) => {
            normalized.push({
              ...item,
              ordre: index + 1,
            })
          })
      })

      setAllItems(normalized)
      setLoading(false)
    }

    void fetchData()
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach((i) => set.add(i.categorie))
    return Array.from(set).sort()
  }, [allItems])

  const itemsForCategory = useMemo(() => {
    if (!selectedCategory) return []
    return allItems
      .filter((i) => i.categorie === selectedCategory)
      .sort((a, b) => {
        const oa = a.ordre ?? 9999
        const ob = b.ordre ?? 9999
        if (oa !== ob) return oa - ob
        return (a.label ?? '').localeCompare(b.label ?? '')
      })
  }, [allItems, selectedCategory])

  // Apply pagination
  const {
    currentPage,
    totalPages,
    currentItems,
    setCurrentPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination(itemsForCategory, 50) // 50 items per page

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value)
    setOrderDirty(false)
  }

  const openCreateModal = () => {
    if (!selectedCategory) {
      setToast({ type: 'error', message: "Veuillez d'abord choisir une catégorie." })
      return
    }
    setModalMode('create')
    setEditingItem(null)
    setFormLabel('')
    setFormCode('')
    setFormCouleur('')
    setFormActif(true)
    setShowModal(true)
  }

  const openEditModal = (item: ListeChoixRow) => {
    setModalMode('edit')
    setEditingItem(item)
    setFormLabel(item.label ?? '')
    setFormCode(item.code ?? '')
    setFormCouleur(item.couleur ?? '')
    setFormActif(item.actif ?? true)
    setShowModal(true)
  }

  const handleModalOpenChange = (open: boolean) => {
    if (!open && !savingModal) {
      setShowModal(false)
      setEditingItem(null)
      setFormLabel('')
      setFormCode('')
      setFormCouleur('')
      setFormActif(true)
      resetCreateError()
      resetUpdateError()
    }
  }

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) {
      setToast({ type: 'error', message: 'Aucune catégorie sélectionnée.' })
      return
    }

    const trimmedLabel = formLabel.trim()
    if (!trimmedLabel) {
      setToast({ type: 'error', message: 'Le libellé est obligatoire.' })
      return
    }

    const needColor = isColorRequired(selectedCategory)
    const trimmedColor = formCouleur.trim()
    if (needColor && !trimmedColor) {
      setToast({ type: 'error', message: 'Une couleur est obligatoire pour cette catégorie (ex. #00A3FF).' })
      return
    }

    if (trimmedColor && !/^#([0-9a-fA-F]{6})$/.test(trimmedColor)) {
      setToast({ type: 'error', message: 'La couleur doit être au format hexadécimal, ex. #00A3FF.' })
      return
    }

    setSavingModal(true)

    try {
      if (modalMode === 'create') {
        // prochain ordre dans cette catégorie
        const maxOrdre =
          itemsForCategory.reduce(
            (max, item) => Math.max(max, item.ordre ?? 0),
            0
          ) || 0
        const newOrdre = maxOrdre + 1

        const payload = {
          categorie: selectedCategory,
          code: formCode.trim() || null,
          label: trimmedLabel,
          couleur: trimmedColor || null,
          actif: formActif,
          ordre: newOrdre,
        }

        await createItem(payload)
      } else if (modalMode === 'edit' && editingItem) {
        const payload = {
          id: editingItem.id,
          categorie: selectedCategory,
          code: formCode.trim() || null,
          label: trimmedLabel,
          couleur: trimmedColor || null,
          ordre: editingItem.ordre,
          actif: formActif,
        }

        await updateItem(payload)
      }
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur inattendue listes_choix:', err)
      }
      setToast({ type: 'error', message: err.message || 'Erreur inattendue.' })
    } finally {
      setSavingModal(false)
    }
  }

  // Réordonnancement par flèches
  const moveItem = (id: string, direction: 'up' | 'down') => {
    if (!selectedCategory) return

    setAllItems((prev) => {
      const catItems = prev
        .filter((i) => i.categorie === selectedCategory)
        .sort((a, b) => {
          const oa = a.ordre ?? 9999
          const ob = b.ordre ?? 9999
          if (oa !== ob) return oa - ob
          return (a.label ?? '').localeCompare(b.label ?? '')
        })

      const index = catItems.findIndex((i) => i.id === id)
      if (index === -1) return prev

      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === catItems.length - 1) return prev

      const swapIndex = direction === 'up' ? index - 1 : index + 1
      const tmp = catItems[index]
      catItems[index] = catItems[swapIndex]
      catItems[swapIndex] = tmp

      // recalc ordre
      const updatedCat = catItems.map((item, idx) => ({
        ...item,
        ordre: idx + 1,
      }))

      const updatedMap = new Map(updatedCat.map((i) => [i.id, i]))
      const newAll = prev.map((item) =>
        item.categorie === selectedCategory && updatedMap.has(item.id)
          ? (updatedMap.get(item.id) as ListeChoixRow)
          : item
      )

      setOrderDirty(true)
      return newAll
    })
  }

  const handleSaveOrder = async () => {
    if (!selectedCategory) return
    if (!orderDirty) return

    setSavingOrder(true)
    try {
      const catItems = allItems.filter(
        (i) => i.categorie === selectedCategory
      )

      await Promise.all(
        catItems.map((item) =>
          supabaseBrowser
            .from('listes_choix')
            .update({ ordre: item.ordre })
            .eq('id', item.id)
        )
      )

      setOrderDirty(false)
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur sauvegarde ordre listes_choix', error)
      }
      setToast({ type: 'error', message: "Erreur lors de l'enregistrement de l'ordre. Vérifiez la console." })
    } finally {
      setSavingOrder(false)
    }
  }

  // Vérification d'utilisation avant suppression
  const checkItemUsed = async (
    item: ListeChoixRow
  ): Promise<{ used: boolean; message?: string }> => {
    const cat = item.categorie

    try {
      // Etats -> bassins.etat_id
      if (cat.startsWith('etat')) {
        const { data, error } = await supabaseBrowser
          .from('bassins')
          .select<'id', BassinRef>('id')
          .eq('etat_id', item.id)
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          return {
            used: true,
            message:
              'Cet état est actuellement utilisé par au moins un bassin. Vous devez d’abord modifier ces bassins.',
          }
        }
      }

      // Durées de vie -> bassins.duree_vie_id
      if (cat.startsWith('duree_vie')) {
        const { data, error } = await supabaseBrowser
          .from('bassins')
          .select<'id', BassinRef>('id')
          .eq('duree_vie_id', item.id)
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          return {
            used: true,
            message:
              'Cette durée de vie est utilisée par au moins un bassin. Vous devez d’abord ajuster ces bassins.',
          }
        }
      }

      // Types de garantie -> garanties.type_garantie_id
      if (cat === 'type_garantie') {
        const { data, error } = await supabaseBrowser
          .from('garanties')
          .select<'id', GarantieRef>('id')
          .eq('type_garantie_id', item.id)
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          return {
            used: true,
            message:
              'Ce type de garantie est utilisé par au moins une garantie. Vous devez d’abord modifier ces garanties.',
          }
        }
      }

      // Statut de garantie -> garanties.statut_id
      if (cat === 'statut_garantie') {
        const { data, error } = await supabaseBrowser
          .from('garanties')
          .select<'id', GarantieRef>('id')
          .eq('statut_id', item.id)
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          return {
            used: true,
            message:
              'Ce statut de garantie est utilisé par au moins une garantie. Vous devez d’abord modifier ces garanties.',
          }
        }
      }

      // Types de rapport -> rapports.type_id
      if (cat === 'type_rapport') {
        const { data, error } = await supabaseBrowser
          .from('rapports')
          .select<'id', RapportRef>('id')
          .eq('type_id', item.id)
          .limit(1)

        if (error) throw error
        if (data && data.length > 0) {
          return {
            used: true,
            message:
              'Ce type de rapport est utilisé par au moins un rapport. Vous devez d’abord modifier ces rapports.',
          }
        }
      }

      return { used: false }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur checkItemUsed', err)
      }
      return {
        used: true,
        message:
          'Erreur lors de la vérification des références. Suppression bloquée par sécurité.',
      }
    }
  }

  const requestDelete = (item: ListeChoixRow) => {
    setItemToDelete(item)
    setConfirmDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setConfirmDeleteOpen(false)
    setDeletingId(itemToDelete.id)

    try {
      const { used, message } = await checkItemUsed(itemToDelete)
      if (used) {
        setToast({ type: 'error', message: message || 'Cet élément est utilisé et ne peut pas être supprimé.' })
        setDeletingId(null)
        return
      }

      await deleteItem({ id: itemToDelete.id })
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Erreur inattendue delete listes_choix:', err)
      }
      setToast({ type: 'error', message: err.message || 'Erreur inattendue.' })
    } finally {
      setDeletingId(null)
    }
  }

  const needColor = selectedCategory && isColorRequired(selectedCategory)

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F4E79] via-[#1a4168] to-[#163555] p-6 shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <ListChecks className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Listes de choix</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Chargement des listes de choix…
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="p-6">
            <div className="h-10 w-10 rounded-xl bg-slate-100 animate-pulse" />
            <div className="mt-4 h-4 w-1/3 rounded bg-slate-100 animate-pulse" />
            <div className="mt-2 h-4 w-1/2 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1F4E79] via-[#1a4168] to-[#163555] p-6 shadow-xl">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <ListChecks className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Listes de choix</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Gestion centralisée des états, durées de vie, types de garantie,
                statuts, types de rapport, etc.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <div className="text-sm font-semibold text-red-700">Erreur</div>
              <div className="mt-1 text-sm text-red-700">{errorMsg}</div>
            </div>
          </div>
        </div>
      </section>
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
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <ListChecks className="h-6 w-6 text-white" />
            </div>
            <div className="max-w-3xl">
              <h1 className="text-2xl font-bold text-white">Listes de choix</h1>
              <p className="mt-0.5 text-sm text-white/70">
                Gestion centralisée des états, durées de vie, types de garantie,
                statuts, types de rapport, etc.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end sm:justify-end lg:w-auto">
            <div className="w-full sm:w-72 space-y-1.5">
              <label className="block text-sm font-semibold text-white/90">
                Catégorie
              </label>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="w-full rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur-sm transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <option value="" className="text-slate-900">
                  Sélectionner une catégorie…
                </option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="text-slate-900">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={!selectedCategory}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1F4E79] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter un élément
            </button>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F4E79]/10">
                <Tag className="h-5 w-5 text-[#1F4E79]" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                  Éléments de la catégorie
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedCategory
                    ? `Catégorie : ${selectedCategory}${
                        needColor ? ' — une couleur est requise pour chaque élément.' : ''
                      }`
                    : 'Veuillez choisir une catégorie pour afficher et modifier ses éléments.'}
                </p>
              </div>
            </div>

            {selectedCategory && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="text-xs text-slate-500">
                  Utilisez les flèches pour réordonner, puis enregistrez l’ordre.
                </div>
                <button
                  type="button"
                  onClick={handleSaveOrder}
                  disabled={!orderDirty || savingOrder}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  <Save className="h-4 w-4 text-slate-500" />
                  {savingOrder ? "Enregistrement de l'ordre…" : "Enregistrer l'ordre"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          {!selectedCategory ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
              <ListChecks className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Aucune catégorie sélectionnée.</p>
              <p className="mt-1 text-xs text-slate-500">Choisissez une catégorie pour voir ses éléments.</p>
            </div>
          ) : itemsForCategory.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
              <ListChecks className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                Aucun élément pour cette catégorie.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ajoutez un premier élément pour commencer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-white text-left">
                    <th className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Ordre
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Libellé
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Code
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Couleur
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Actif
                    </th>
                    <th className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {itemsForCategory.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="border-b border-slate-100 px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800">{item.ordre ?? '—'}</span>
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                              onClick={() => moveItem(item.id, 'up')}
                              aria-label="Monter"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                              onClick={() => moveItem(item.id, 'down')}
                              aria-label="Descendre"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-3 text-slate-800">
                        {item.label || '—'}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-3 whitespace-nowrap">
                        <span className="rounded-lg bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                          {item.code || '—'}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-3 py-3 whitespace-nowrap">
                        {item.couleur ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-4 w-4 rounded-full border border-slate-200"
                              style={{ backgroundColor: item.couleur }}
                            />
                            <span className="font-mono text-xs text-slate-700">
                              {item.couleur}
                            </span>
                            {needColor && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#1F4E79]/10 px-2 py-0.5 text-xs font-semibold text-[#1F4E79]">
                                <Palette className="h-3.5 w-3.5" />
                                requis
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-3 whitespace-nowrap">
                        {item.actif ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <Ban className="h-3.5 w-3.5 text-slate-500" />
                            Inactif
                          </span>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                            Modifier
                          </button>

                          <button
                            type="button"
                            onClick={() => requestDelete(item)}
                            disabled={deletingId === item.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-300/60 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-500/15 disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === item.id ? 'Suppression…' : 'Supprimer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL AJOUT / MODIFICATION */}
      <Dialog open={showModal} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Ajouter un élément' : 'Modifier un élément'}
            </DialogTitle>
            <p className="mt-0.5 text-sm text-slate-500">
              Catégorie : <span className="font-semibold text-slate-700">{selectedCategory}</span>
              {needColor ? ' — une couleur est requise.' : ''}
            </p>
          </DialogHeader>

          <form
            onSubmit={handleModalSubmit}
            className="space-y-5 text-sm"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Libellé <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Code interne (optionnel)
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700">
                Couleur {needColor ? '(obligatoire)' : '(optionnelle)'}
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={formCouleur}
                  onChange={(e) => setFormCouleur(e.target.value)}
                  placeholder="#00A3FF"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-mono transition-colors focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />

                <div
                  className="h-10 w-10 rounded-full border border-slate-200"
                  style={{
                    backgroundColor:
                      formCouleur && /^#([0-9a-fA-F]{6})$/.test(formCouleur)
                        ? formCouleur
                        : '#ffffff',
                  }}
                  aria-label="Aperçu couleur"
                  title="Aperçu couleur"
                />
              </div>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                id="actif-checkbox"
                type="checkbox"
                checked={formActif}
                onChange={(e) => setFormActif(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1F4E79] focus:ring-[#1F4E79]/30"
              />
              <label
                htmlFor="actif-checkbox"
                className="text-sm text-slate-600"
              >
                Élément actif (disponible dans les listes de sélection)
              </label>
            </div>

            {/* Affichage des erreurs */}
            {(createError || updateError) && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{createError || updateError}</p>
              </div>
            )}

            <DialogFooter>
              <button
                type="button"
                onClick={() => handleModalOpenChange(false)}
                disabled={savingModal}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={savingModal}
                className="rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
              >
                {savingModal ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        onConfirm={handleConfirmDelete}
        title="Supprimer cet élément ?"
        description={`Voulez-vous vraiment supprimer « ${itemToDelete?.label ?? ''} » ?`}
        confirmText="Supprimer"
        confirmVariant="danger"
        loading={deletingId !== null}
      />

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
