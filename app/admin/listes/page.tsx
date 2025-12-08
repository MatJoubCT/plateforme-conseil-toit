'use client'

import { useEffect, useState, ChangeEvent, FormEvent } from 'react'
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

type ListeChoixRow = {
  id: string
  categorie: string
  code: string | null
  label: string | null
  couleur: string | null
  ordre: number | null
}

type IconProps = {
  className?: string
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PencilIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M15.232 5.232a2.5 2.5 0 0 1 3.536 3.536L9.75 17.786 6 18.75l.964-3.75 8.268-9.768Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

function TrashIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 7h14M10 11v6M14 11v6M9 7l1-2h4l1 2M8 7h8l-1 12H9L8 7Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

export default function AdminListesPage() {
  const [listes, setListes] = useState<ListeChoixRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [selectedCategorie, setSelectedCategorie] = useState<string>('')
  const [search, setSearch] = useState('')

  // Création
  const [createOpen, setCreateOpen] = useState(false)
  const [createLabel, setCreateLabel] = useState('')
  const [createCode, setCreateCode] = useState('')
  const [createCouleur, setCreateCouleur] = useState('')
  const [createOrdre, setCreateOrdre] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Édition
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState<ListeChoixRow | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editCouleur, setEditCouleur] = useState('')
  const [editOrdre, setEditOrdre] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Suppression
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteItem, setDeleteItem] = useState<ListeChoixRow | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const fetchListes = async () => {
    setLoading(true)
    setErrorMsg(null)

    const { data, error } = await supabaseBrowser
      .from('listes_choix')
      .select('id, categorie, code, label, couleur, ordre')
      .order('categorie', { ascending: true })
      .order('ordre', { ascending: true, nullsFirst: true })

    if (error) {
      console.error('Erreur Supabase listes_choix:', error)
      setErrorMsg(error.message ?? 'Erreur lors du chargement des listes.')
      setLoading(false)
      return
    }

    setListes((data || []) as ListeChoixRow[])
    setLoading(false)
  }

  useEffect(() => {
    void fetchListes()
  }, [])

  // Si aucune catégorie sélectionnée, prendre la première disponible
  useEffect(() => {
    if (!loading && listes.length > 0 && !selectedCategorie) {
      setSelectedCategorie(listes[0].categorie)
    }
  }, [loading, listes, selectedCategorie])

  const handleCategorieChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategorie(e.target.value)
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  const categories = Array.from(new Set(listes.map((l) => l.categorie))).sort(
    (a, b) => a.localeCompare(b),
  )

  const filteredListes = listes.filter((item) => {
    if (selectedCategorie && item.categorie !== selectedCategorie) {
      return false
    }

    if (!search.trim()) {
      return true
    }

    const term = search.toLowerCase()
    return (
      (item.label ?? '').toLowerCase().includes(term) ||
      (item.code ?? '').toLowerCase().includes(term)
    )
  })

  const openCreateModal = () => {
    if (!selectedCategorie) {
      setErrorMsg(
        "Veuillez d'abord choisir une catégorie dans la liste déroulante avant d'ajouter une entrée.",
      )
      return
    }
    setCreateLabel('')
    setCreateCode('')
    setCreateCouleur('')
    setCreateOrdre('')
    setCreateError(null)
    setCreateOpen(true)
  }

  const closeCreateModal = () => {
    if (createSaving) return
    setCreateOpen(false)
  }

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedCategorie) {
      setCreateError('Une catégorie doit être sélectionnée.')
      return
    }

    const label = createLabel.trim()
    const code = createCode.trim()
    const couleur = createCouleur.trim()
    const ordreRaw = createOrdre.trim()

    if (!label) {
      setCreateError('Le libellé est obligatoire.')
      return
    }

    let ordre: number | null = null
    if (ordreRaw) {
      const parsed = Number(ordreRaw)
      if (Number.isNaN(parsed)) {
        setCreateError("L'ordre doit être un nombre.")
        return
      }
      ordre = parsed
    }

    try {
      setCreateSaving(true)
      setCreateError(null)

      const { error } = await supabaseBrowser.from('listes_choix').insert([
        {
          categorie: selectedCategorie,
          label,
          code: code || null,
          couleur: couleur || null,
          ordre,
          actif: true, // Étape 5 : on force la valeur à actif=true à la création
        },
      ])

      if (error) {
        console.error('Erreur création liste_choix:', error)
        setCreateError(error.message ?? 'Erreur lors de la création de la valeur.')
        setCreateSaving(false)
        return
      }

      await fetchListes()
      setCreateSaving(false)
      setCreateOpen(false)
    } catch (err: any) {
      console.error('Erreur inattendue création liste_choix:', err)
      setCreateError(
        err?.message ?? 'Erreur inattendue lors de la création de la valeur.',
      )
      setCreateSaving(false)
    }
  }

  const openEditModal = (item: ListeChoixRow) => {
    setEditItem(item)
    setEditLabel(item.label ?? '')
    setEditCode(item.code ?? '')
    setEditCouleur(item.couleur ?? '')
    setEditOrdre(
      item.ordre !== null && item.ordre !== undefined ? String(item.ordre) : '',
    )
    setEditError(null)
    setEditOpen(true)
  }

  const closeEditModal = () => {
    if (editSaving) return
    setEditOpen(false)
  }

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editItem) return

    const label = editLabel.trim()
    const code = editCode.trim()
    const couleur = editCouleur.trim()
    const ordreRaw = editOrdre.trim()

    if (!label) {
      setEditError('Le libellé est obligatoire.')
      return
    }

    let ordre: number | null = null
    if (ordreRaw) {
      const parsed = Number(ordreRaw)
      if (Number.isNaN(parsed)) {
        setEditError("L'ordre doit être un nombre.")
        return
      }
      ordre = parsed
    }

    try {
      setEditSaving(true)
      setEditError(null)

      const { error } = await supabaseBrowser
        .from('listes_choix')
        .update({
          label,
          code: code || null,
          couleur: couleur || null,
          ordre,
        })
        .eq('id', editItem.id)

      if (error) {
        console.error('Erreur mise à jour liste_choix:', error)
        setEditError(error.message ?? 'Erreur lors de la mise à jour de la valeur.')
        setEditSaving(false)
        return
      }

      await fetchListes()
      setEditSaving(false)
      setEditOpen(false)
    } catch (err: any) {
      console.error('Erreur inattendue mise à jour liste_choix:', err)
      setEditError(
        err?.message ?? 'Erreur inattendue lors de la mise à jour de la valeur.',
      )
      setEditSaving(false)
    }
  }

  const openDeleteModal = (item: ListeChoixRow) => {
    setDeleteItem(item)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  const closeDeleteModal = () => {
    if (deleteSaving) return
    setDeleteOpen(false)
  }

  const handleDeleteSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!deleteItem) return

    try {
      setDeleteSaving(true)
      setDeleteError(null)

      const { error } = await supabaseBrowser
        .from('listes_choix')
        .delete()
        .eq('id', deleteItem.id)

      if (error) {
        console.error('Erreur suppression liste_choix:', error)
        setDeleteError(
          error.message ??
            'Erreur lors de la suppression de la valeur. Vérifiez si elle est référencée ailleurs.',
        )
        setDeleteSaving(false)
        return
      }

      await fetchListes()
      setDeleteSaving(false)
      setDeleteOpen(false)
    } catch (err: any) {
      console.error('Erreur inattendue suppression liste_choix:', err)
      setDeleteError(
        err?.message ?? 'Erreur inattendue lors de la suppression de la valeur.',
      )
      setDeleteSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Listes de choix</h1>
        <p className="text-sm text-ct-gray">Chargement des listes…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Listes de choix</h1>
        <p className="text-sm text-red-600">
          Erreur lors du chargement des données : {errorMsg}
        </p>
      </section>
    )
  }

  const selectedCategoryLabel =
    selectedCategorie || (categories.length > 0 ? categories[0] : '')

  return (
    <>
      <section className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-ct-primary">Listes de choix</h1>
            <p className="text-sm text-ct-gray">
              Gestion des types de membranes, états, durées de vie, types de rapports,
              garanties, etc.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary inline-flex items-center gap-2"
            onClick={openCreateModal}
          >
            <PlusIcon className="h-4 w-4" />
            <span>Nouvelle entrée</span>
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestion des listes</CardTitle>
            <CardDescription>
              Sélectionnez une catégorie puis ajoutez, modifiez ou supprimez les valeurs
              disponibles.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-4 grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Catégorie
                </label>
                <select
                  value={selectedCategorie}
                  onChange={handleCategorieChange}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                >
                  <option value="">Choisir une catégorie…</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-ct-grayDark">
                  Recherche (libellé ou code)
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Ex.: Élastomère, Bon, Garantie 20 ans…"
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>
            </div>

            {selectedCategoryLabel === '' ? (
              <p className="text-sm text-ct-gray">
                Aucune catégorie définie dans la table <code>listes_choix</code>.
              </p>
            ) : filteredListes.length === 0 ? (
              <p className="text-sm text-ct-gray">
                Aucune valeur trouvée pour cette catégorie.
              </p>
            ) : (
              <DataTable maxHeight={540}>
                <table>
                  <DataTableHeader>
                    <tr>
                      <th className="w-1/3">Libellé</th>
                      <th className="w-1/6">Code</th>
                      <th className="w-1/4">Couleur</th>
                      <th className="w-16 text-center">Ordre</th>
                      <th className="w-1/4">Actions</th>
                    </tr>
                  </DataTableHeader>

                  <DataTableBody>
                    {filteredListes.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-ct-grayLight/70"
                      >
                        <td className="text-sm text-ct-grayDark">
                          {item.label || '(Sans libellé)'}
                        </td>
                        <td className="text-sm text-ct-grayDark">
                          <span className="font-mono text-xs">
                            {item.code || '—'}
                          </span>
                        </td>
                        <td className="text-sm text-ct-grayDark">
                          <div className="flex items-center gap-2">
                            {item.couleur && (
                              <span
                                className="inline-flex h-4 w-4 rounded-full border border-ct-grayLight"
                                style={{ backgroundColor: item.couleur }}
                              />
                            )}
                            <span className="font-mono text-xs">
                              {item.couleur || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center text-sm text-ct-grayDark">
                          {item.ordre ?? '—'}
                        </td>
                        <td className="text-sm">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-xs"
                              onClick={() => openEditModal(item)}
                            >
                              <PencilIcon className="h-4 w-4" />
                              <span>Modifier</span>
                            </button>

                            <button
                              type="button"
                              className="btn-danger inline-flex items-center gap-1 px-2 py-1 text-xs"
                              onClick={() => openDeleteModal(item)}
                            >
                              <TrashIcon className="h-4 w-4" />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </DataTableBody>
                </table>
              </DataTable>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Modal création */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeCreateModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-ct-white p-5 shadow-ct-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 space-y-1">
              <h2 className="text-lg font-semibold text-ct-primary">
                Nouvelle valeur – {selectedCategorie}
              </h2>
              <p className="text-xs text-ct-gray">
                Ajoutez une nouvelle entrée dans la catégorie sélectionnée.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {createError && (
                <p className="text-xs text-red-600">{createError}</p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Libellé
                </label>
                <input
                  type="text"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  placeholder="Ex.: Membrane élastomère, Bon, Urgent…"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Code interne (optionnel)
                  </label>
                  <input
                    type="text"
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                    placeholder="Ex.: MEM_ELASTO, ETAT_BON…"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Couleur (hex, optionnel)
                  </label>
                  <input
                    type="text"
                    value={createCouleur}
                    onChange={(e) => setCreateCouleur(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                    placeholder="#28A745"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Ordre d&apos;affichage (optionnel)
                </label>
                <input
                  type="number"
                  value={createOrdre}
                  onChange={(e) => setCreateOrdre(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  placeholder="Ex.: 1, 2, 10…"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  disabled={createSaving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={createSaving}
                >
                  {createSaving ? 'Enregistrement…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal édition */}
      {editOpen && editItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeEditModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-ct-white p-5 shadow-ct-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 space-y-1">
              <h2 className="text-lg font-semibold text-ct-primary">
                Modifier la valeur
              </h2>
              <p className="text-xs text-ct-gray">
                Ajustez le libellé, le code, la couleur ou l&apos;ordre d&apos;affichage.
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && <p className="text-xs text-red-600">{editError}</p>}

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Libellé
                </label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Code interne (optionnel)
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-ct-grayDark">
                    Couleur (hex, optionnel)
                  </label>
                  <input
                    type="text"
                    value={editCouleur}
                    onChange={(e) => setEditCouleur(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-ct-grayDark">
                  Ordre d&apos;affichage (optionnel)
                </label>
                <input
                  type="number"
                  value={editOrdre}
                  onChange={(e) => setEditOrdre(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight bg-ct-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
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

      {/* Modal suppression */}
      {deleteOpen && deleteItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-ct-white p-5 shadow-ct-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 space-y-2">
              <h2 className="text-lg font-semibold text-red-600">
                Supprimer cette valeur?
              </h2>
              <p className="text-xs text-ct-gray">
                Cette action est permanente. La suppression peut échouer si cette valeur
                est utilisée dans des bassins, garanties ou autres enregistrements.
              </p>
            </div>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              {deleteError && (
                <p className="text-xs text-red-600">{deleteError}</p>
              )}

              <p className="text-sm text-ct-grayDark">
                Voulez-vous vraiment supprimer la valeur{' '}
                <span className="font-semibold">
                  {deleteItem.label || '(Sans libellé)'}
                </span>{' '}
                de la catégorie{' '}
                <span className="font-semibold">{deleteItem.categorie}</span> ?
              </p>

              <div className="mt-4 flex justify-end gap-2">
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
                  {deleteSaving ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
