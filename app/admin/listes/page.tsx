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
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card'

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

const COLOR_REQUIRED_PREFIXES = ['etat', 'duree_vie']

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

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value)
    setOrderDirty(false)
  }

  const openCreateModal = () => {
    if (!selectedCategory) {
      alert('Veuillez d’abord choisir une catégorie.')
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

  const closeModal = () => {
    if (savingModal) return
    setShowModal(false)
    setEditingItem(null)
  }

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) {
      alert('Aucune catégorie sélectionnée.')
      return
    }

    const trimmedLabel = formLabel.trim()
    if (!trimmedLabel) {
      alert('Le libellé est obligatoire.')
      return
    }

    const needColor = isColorRequired(selectedCategory)
    const trimmedColor = formCouleur.trim()
    if (needColor && !trimmedColor) {
      alert(
        'Une couleur est obligatoire pour cette catégorie (ex. #00A3FF).'
      )
      return
    }

    if (trimmedColor && !/^#([0-9a-fA-F]{6})$/.test(trimmedColor)) {
      alert('La couleur doit être au format hexadécimal, ex. #00A3FF.')
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

        const { data, error } = await supabaseBrowser
          .from('listes_choix')
          .insert(payload)
          .select('id, categorie, code, label, couleur, ordre, actif')
          .single()

        if (error) {
          console.error('Erreur insert listes_choix', error)
          alert(
            'Erreur lors de la création de l’élément : ' +
              (error.message ?? 'Erreur inconnue')
          )
          return
        }

        const newItem = data as ListeChoixRow
        setAllItems((prev) => [...prev, newItem])
      } else if (modalMode === 'edit' && editingItem) {
        const payload = {
          code: formCode.trim() || null,
          label: trimmedLabel,
          couleur: trimmedColor || null,
          actif: formActif,
        }

        const { data, error } = await supabaseBrowser
          .from('listes_choix')
          .update(payload)
          .eq('id', editingItem.id)
          .select('id, categorie, code, label, couleur, ordre, actif')
          .single()

        if (error) {
          console.error('Erreur update listes_choix', error)
          alert(
            'Erreur lors de la mise à jour de l’élément : ' +
              (error.message ?? 'Erreur inconnue')
          )
          return
        }

        const updated = data as ListeChoixRow
        setAllItems((prev) =>
          prev.map((i) => (i.id === updated.id ? updated : i))
        )
      }

      setShowModal(false)
      setEditingItem(null)
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
      console.error('Erreur sauvegarde ordre listes_choix', error)
      alert(
        "Erreur lors de l'enregistrement de l'ordre. Vérifiez la console."
      )
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
      console.error('Erreur checkItemUsed', err)
      return {
        used: true,
        message:
          'Erreur lors de la vérification des références. Suppression bloquée par sécurité.',
      }
    }
  }

  const handleDelete = async (item: ListeChoixRow) => {
    const confirm = window.confirm(
      `Voulez-vous vraiment supprimer « ${item.label ?? ''} » ?`
    )
    if (!confirm) return

    setDeletingId(item.id)

    try {
      const { used, message } = await checkItemUsed(item)
      if (used) {
        alert(message || 'Cet élément est utilisé et ne peut pas être supprimé.')
        return
      }

      const { error } = await supabaseBrowser
        .from('listes_choix')
        .delete()
        .eq('id', item.id)

      if (error) {
        console.error('Erreur delete listes_choix', error)
        alert(
          'Erreur lors de la suppression de l’élément : ' +
            (error.message ?? 'Erreur inconnue')
        )
        return
      }

      setAllItems((prev) => prev.filter((i) => i.id !== item.id))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-ct-gray">
          Chargement des listes de choix…
        </p>
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

  const needColor = selectedCategory && isColorRequired(selectedCategory)

  return (
    <section className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ct-primary">
            Listes de choix
          </h1>
          <p className="mt-1 text-sm text-ct-gray">
            Gestion centralisée des états, durées de vie, types de garantie,
            statuts, types de rapport, etc.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-end">
          <div className="w-full md:w-64">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ct-grayDark">
              Catégorie
            </label>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
            >
              <option value="">Sélectionner une catégorie…</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn-primary md:ml-4"
            onClick={openCreateModal}
            disabled={!selectedCategory}
          >
            Ajouter un élément
          </button>
        </div>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle>Éléments de la catégorie</CardTitle>
          <CardDescription>
            {selectedCategory
              ? `Catégorie : ${selectedCategory}${
                  needColor
                    ? ' — une couleur est requise pour chaque élément.'
                    : ''
                }`
              : 'Veuillez choisir une catégorie pour afficher et modifier ses éléments.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedCategory ? (
            <p className="text-sm text-ct-gray">
              Aucune catégorie sélectionnée.
            </p>
          ) : itemsForCategory.length === 0 ? (
            <p className="text-sm text-ct-gray">
              Aucun élément pour cette catégorie. Ajoutez un premier élément.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs text-ct-gray">
                  Utilisez les flèches pour réordonner les éléments, puis
                  cliquez sur « Enregistrer l&apos;ordre ».
                </p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSaveOrder}
                  disabled={!orderDirty || savingOrder}
                >
                  {savingOrder
                    ? "Enregistrement de l'ordre…"
                    : "Enregistrer l'ordre"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-ct-grayLight/60 text-left">
                      <th className="border border-ct-grayLight px-3 py-2">
                        Ordre
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        Libellé
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        Code
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        Couleur
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        Actif
                      </th>
                      <th className="border border-ct-grayLight px-3 py-2">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsForCategory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-ct-primaryLight/10 transition-colors"
                      >
                        <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{item.ordre ?? '—'}</span>
                            <div className="flex flex-col gap-1">
                              <button
                                type="button"
                                className="rounded border border-ct-grayLight px-1 text-[10px] leading-none"
                                onClick={() => moveItem(item.id, 'up')}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="rounded border border-ct-grayLight px-1 text-[10px] leading-none"
                                onClick={() => moveItem(item.id, 'down')}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2">
                          {item.label || '—'}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                          <span className="font-mono text-xs">
                            {item.code || '—'}
                          </span>
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                          {item.couleur ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block h-4 w-4 rounded-full border border-ct-grayLight"
                                style={{ backgroundColor: item.couleur }}
                              />
                              <span className="font-mono text-xs">
                                {item.couleur}
                              </span>
                            </div>
                          ) : (
                            <span className="text-ct-gray">—</span>
                          )}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                          {item.actif ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Actif
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-ct-grayLight px-2 py-0.5 text-xs font-medium text-ct-grayDark">
                              Inactif
                            </span>
                          )}
                        </td>
                        <td className="border border-ct-grayLight px-3 py-2 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => openEditModal(item)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id
                                ? 'Suppression…'
                                : 'Supprimer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal ajout / modification */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-ct-grayDark">
              {modalMode === 'create'
                ? 'Ajouter un élément'
                : 'Modifier un élément'}
            </h3>
            <p className="mt-1 text-sm text-ct-gray">
              Catégorie :{' '}
              <span className="font-medium">{selectedCategory}</span>
              {needColor && (
                <>
                  {' — '}
                  <span className="text-ct-primary">
                    Une couleur est requise pour cette catégorie.
                  </span>
                </>
              )}
            </p>

            <form
              onSubmit={handleModalSubmit}
              className="mt-4 space-y-4 text-sm"
            >
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Libellé
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Code interne (optionnel)
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Couleur {needColor ? '(obligatoire)' : '(optionnelle)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formCouleur}
                    onChange={(e) => setFormCouleur(e.target.value)}
                    placeholder="#00A3FF"
                    className="flex-1 rounded-lg border border-ct-grayLight px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                  <div
                    className="h-8 w-8 rounded-full border border-ct-grayLight"
                    style={{
                      backgroundColor:
                        formCouleur && /^#([0-9a-fA-F]{6})$/.test(formCouleur)
                          ? formCouleur
                          : '#ffffff',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="actif-checkbox"
                  type="checkbox"
                  checked={formActif}
                  onChange={(e) => setFormActif(e.target.checked)}
                  className="h-4 w-4 rounded border-ct-grayLight text-ct-primary focus:ring-ct-primary/60"
                />
                <label
                  htmlFor="actif-checkbox"
                  className="text-xs font-medium text-ct-grayDark"
                >
                  Élément actif (disponible dans les listes de sélection)
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={savingModal}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingModal}
                >
                  {savingModal ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
