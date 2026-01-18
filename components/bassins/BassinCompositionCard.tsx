'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import {
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Layers,
  X,
} from 'lucide-react'

type MateriauRow = {
  id: string
  nom: string
  prix_cad: number
  actif: boolean
  manufacturier_entreprise_id: string | null
}

type CompositionRow = {
  id: string
  bassin_id: string
  materiau_id: string
  position: number
  quantite: number | null
  notes: string | null
  created_at: string
}

type CompositionJoined = CompositionRow & {
  materiau: Pick<MateriauRow, 'id' | 'nom' | 'prix_cad' | 'actif'> | Pick<MateriauRow, 'id' | 'nom' | 'prix_cad' | 'actif'>[] | null
}

export default function BassinCompositionCard(props: { bassinId: string }) {
  const { bassinId } = props

  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [catalogue, setCatalogue] = useState<MateriauRow[]>([])
  const [lignes, setLignes] = useState<CompositionJoined[]>([])
  const [materiauSearch, setMateriauSearch] = useState('')
  const [selectedMateriauId, setSelectedMateriauId] = useState('')

  // Modal confirmation suppression (ligne de composition)
  const [confirmDeleteLine, setConfirmDeleteLine] = useState<CompositionJoined | null>(null)
  const [deletingLine, setDeletingLine] = useState(false)

  const catalogueActif = useMemo(
    () => (catalogue || []).filter((m) => m.actif),
    [catalogue],
  )

  const catalogueFiltre = useMemo(() => {
    const s = materiauSearch.trim().toLowerCase()
    if (!s) return catalogueActif
    return catalogueActif.filter((m) => m.nom.toLowerCase().includes(s))
  }, [catalogueActif, materiauSearch])

  const loadAll = async () => {
    setLoading(true)
    setErrorMsg(null)

    const [catRes, compRes] = await Promise.all([
      supabaseBrowser
        .from('materiaux')
        .select('id, nom, prix_cad, actif, manufacturier_entreprise_id')
        .order('nom', { ascending: true }),
      supabaseBrowser
        .from('bassin_composition_lignes')
        .select(
          `
            id, bassin_id, materiau_id, position, quantite, notes, created_at,
            materiau:materiaux ( id, nom, prix_cad, actif )
          `,
        )
        .eq('bassin_id', bassinId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (catRes.error) {
      setErrorMsg(catRes.error.message)
      setLoading(false)
      return
    }
    if (compRes.error) {
      setErrorMsg(compRes.error.message)
      setLoading(false)
      return
    }

    setCatalogue((catRes.data || []) as MateriauRow[])
    setLignes((compRes.data || []) as CompositionJoined[])
    setLoading(false)
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bassinId])

  const clearSearch = () => setMateriauSearch('')

  const handleAddLine = async () => {
    if (!selectedMateriauId) return
    setErrorMsg(null)

    const maxPos = lignes.reduce((acc, x) => Math.max(acc, x.position || 0), 0)
    const newPos = (maxPos || 0) + 10

    const ins = await supabaseBrowser.from('bassin_composition_lignes').insert({
      bassin_id: bassinId,
      materiau_id: selectedMateriauId,
      position: newPos,
      quantite: null,
      notes: null,
    })

    if (ins.error) {
      setErrorMsg(ins.error.message)
      return
    }

    setSelectedMateriauId('')
    setMateriauSearch('')
    await loadAll()
  }

  // Au lieu de supprimer direct, on ouvre le modal
  const askDeleteLine = (row: CompositionJoined) => setConfirmDeleteLine(row)

  // Suppression réelle (appelée par le modal)
  const doDeleteLine = async () => {
    const row = confirmDeleteLine
    if (!row) return

    setErrorMsg(null)
    setDeletingLine(true)

    const del = await supabaseBrowser
      .from('bassin_composition_lignes')
      .delete()
      .eq('id', row.id)

    if (del.error) {
      setErrorMsg(del.error.message)
      setDeletingLine(false)
      return
    }

    setConfirmDeleteLine(null)
    setDeletingLine(false)
    await loadAll()
  }

  const swapPositions = async (a: CompositionJoined, b: CompositionJoined) => {
    const aPos = a.position
    const bPos = b.position

    const up1 = await supabaseBrowser
      .from('bassin_composition_lignes')
      .update({ position: bPos })
      .eq('id', a.id)

    if (up1.error) {
      setErrorMsg(up1.error.message)
      return
    }

    const up2 = await supabaseBrowser
      .from('bassin_composition_lignes')
      .update({ position: aPos })
      .eq('id', b.id)

    if (up2.error) {
      await supabaseBrowser
        .from('bassin_composition_lignes')
        .update({ position: aPos })
        .eq('id', a.id)

      setErrorMsg(up2.error.message)
      return
    }

    await loadAll()
  }

  const handleMoveUp = async (idx: number) => {
    if (idx <= 0) return
    await swapPositions(lignes[idx], lignes[idx - 1])
  }

  const handleMoveDown = async (idx: number) => {
    if (idx >= lignes.length - 1) return
    await swapPositions(lignes[idx], lignes[idx + 1])
  }

  const showResultLine = materiauSearch.trim().length > 0
  const resultText = showResultLine ? `${catalogueFiltre.length} résultat(s)` : '\u00A0'

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            <Layers className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Composition de toiture
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Matériaux associés à ce bassin (ordre personnalisable)
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Ajouter un matériau
          </label>

          {/* Desktop: 3 colonnes (recherche / select / bouton). Mobile: pile. */}
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            {/* Recherche + X */}
            <div className="relative">
              <input
                value={materiauSearch}
                onChange={(e) => setMateriauSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-800 outline-none focus:border-slate-300"
              />

              {materiauSearch.trim() !== '' && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Effacer"
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Select */}
            <div>
              <select
                value={selectedMateriauId}
                onChange={(e) => setSelectedMateriauId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-300"
              >
                <option value="">Sélectionner…</option>
                {catalogueFiltre.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Bouton */}
            <div className="sm:pl-1">
              <button
                type="button"
                onClick={handleAddLine}
                disabled={!selectedMateriauId || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1F4E79] to-[#2d6ba8] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </div>
          </div>

          {/* Ligne résultats (hauteur réservée -> pas de jump) */}
          <p className={`mt-2 text-xs text-slate-500 ${showResultLine ? '' : 'opacity-0'}`}>
            {resultText}
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-3 py-2 w-[64px]">Ordre</th>
                <th className="px-3 py-2">Matériau</th>
                <th className="px-3 py-2 w-[120px] text-right">Prix (CAD)</th>
                <th className="px-3 py-2 w-[120px] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>
                    Chargement…
                  </td>
                </tr>
              ) : lignes.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                    Aucune composition enregistrée.
                  </td>
                </tr>
              ) : (
                lignes.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                          title="Monter"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleMoveDown(idx)}
                          disabled={idx === lignes.length - 1}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                          title="Descendre"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2 align-middle">
                      <div className="font-semibold text-slate-800">
                        {(() => {
                          const mat = row.materiau
                          return mat
                            ? Array.isArray(mat)
                              ? mat[0]?.nom || 'Matériau'
                              : mat.nom || 'Matériau'
                            : 'Matériau'
                        })()}
                      </div>
                    </td>

                    <td className="px-3 py-2 align-middle text-right tabular-nums text-slate-700">
                      {(() => {
                        const mat = row.materiau
                        const prix = mat
                          ? Array.isArray(mat)
                            ? mat[0]?.prix_cad ?? 0
                            : mat.prix_cad ?? 0
                          : 0
                        return prix.toFixed(2)
                      })()}
                    </td>

                    <td className="px-3 py-2 align-middle">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => askDeleteLine(row)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Supprimer la ligne"
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

        <p className="mt-3 text-xs text-slate-500">
          Quantité prévue au modèle (sera ajoutée à l’UI dans une étape suivante).
        </p>
      </div>

      {/* Modal confirmation suppression (même pattern que les autres pages) */}
      {confirmDeleteLine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !deletingLine && setConfirmDeleteLine(null)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                    Confirmer la suppression
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">Cette action est irréversible.</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-700">
                Supprimer ce matériau du bassin?
                {(() => {
                  const mat = confirmDeleteLine.materiau
                  const nom = mat
                    ? Array.isArray(mat)
                      ? mat[0]?.nom
                      : mat.nom
                    : null
                  return nom ? (
                    <>
                      {' '}
                      <span className="font-semibold text-slate-900">{nom}</span>
                    </>
                  ) : null
                })()}
              </p>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteLine(null)}
                  disabled={deletingLine}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={() => void doDeleteLine()}
                  disabled={deletingLine}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingLine ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
