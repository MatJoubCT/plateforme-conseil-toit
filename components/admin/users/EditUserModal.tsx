'use client'

import { useEffect, useMemo, useState } from 'react'

export type ClientRow = {
  id: string
  name: string | null
}

export type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

type EditUserModalProps = {
  open: boolean
  saving: boolean

  editFullName: string
  setEditFullName: (v: string) => void

  editRole: string
  setEditRole: (v: string) => void

  clients: ClientRow[]
  batiments: BatimentRow[]

  selectedClientIds: string[]
  toggleClient: (id: string) => void

  selectedBatimentIds: string[]
  // IMPORTANT: signature modifiée pour pouvoir auto-cocher le client côté parent
  toggleBatiment: (batimentId: string, clientId: string | null) => void

  onClose: () => void
  onSave: () => void

  errorMsg?: string | null
  successMsg?: string | null

  debugLabel?: string
}

export default function EditUserModal({
  open,
  saving,
  editFullName,
  setEditFullName,
  editRole,
  setEditRole,
  clients,
  batiments,
  selectedClientIds,
  toggleClient,
  selectedBatimentIds,
  toggleBatiment,
  onClose,
  onSave,
  errorMsg,
  successMsg,
  debugLabel,
}: EditUserModalProps) {
  const [clientQuery, setClientQuery] = useState('')
  const [batimentQuery, setBatimentQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setClientQuery('')
    setBatimentQuery('')
  }, [open])

  const norm = (v: string | null | undefined) => (v || '').toLowerCase()

  const clientsById = useMemo(() => {
    const m = new Map<string, ClientRow>()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  const batimentsById = useMemo(() => {
    const m = new Map<string, BatimentRow>()
    batiments.forEach((b) => m.set(b.id, b))
    return m
  }, [batiments])

  const batimentsParClient = useMemo(() => {
    const m = new Map<string, BatimentRow[]>()
    batiments.forEach((b) => {
      const key = b.client_id || 'sans_client'
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(b)
    })
    return m
  }, [batiments])

  const batimentCountsByClient = useMemo(() => {
    const m = new Map<string, number>()
    batiments.forEach((b) => {
      const key = b.client_id || 'sans_client'
      m.set(key, (m.get(key) || 0) + 1)
    })
    return m
  }, [batiments])

  const selectedBatimentCountsByClient = useMemo(() => {
    const m = new Map<string, number>()
    selectedBatimentIds.forEach((id) => {
      const b = batimentsById.get(id)
      if (!b) return
      const key = b.client_id || 'sans_client'
      m.set(key, (m.get(key) || 0) + 1)
    })
    return m
  }, [selectedBatimentIds, batimentsById])

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => norm(c.name).includes(q))
  }, [clients, clientQuery])

  const buildBatimentLabel = (b: BatimentRow) => {
    const name = b.name || '(Sans nom)'
    const addr = [b.address, b.city].filter(Boolean).join(' · ')
    return { name, addr }
  }

  const batimentMatchesQuery = (b: BatimentRow, q: string) => {
    if (!q) return true
    const hay = [b.name, b.address, b.city, b.postal_code, clientsById.get(b.client_id || '')?.name || '']
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  }

  const orderedBatimentGroups = useMemo(() => {
    const q = batimentQuery.trim().toLowerCase()
    const groups: Array<{ clientKey: string; clientName: string; bats: BatimentRow[] }> = []

    const sans = batimentsParClient.get('sans_client') || []
    const sansFiltered = sans.filter((b) => batimentMatchesQuery(b, q))
    if (q) {
      const hasSelectedInside = sans.some((b) => selectedBatimentIds.includes(b.id))
      if (sansFiltered.length > 0 || hasSelectedInside) {
        groups.push({
          clientKey: 'sans_client',
          clientName: 'Bâtiments sans client',
          bats: sansFiltered.length > 0 ? sansFiltered : sans,
        })
      }
    } else if (sans.length > 0) {
      groups.push({ clientKey: 'sans_client', clientName: 'Bâtiments sans client', bats: sans })
    }

    clients.forEach((c) => {
      const key = c.id
      const list = batimentsParClient.get(key) || []
      if (list.length === 0) return

      const filtered = list.filter((b) => batimentMatchesQuery(b, q))
      const hasSelectedInside = list.some((b) => selectedBatimentIds.includes(b.id))

      if (q) {
        if (filtered.length > 0 || hasSelectedInside) {
          groups.push({
            clientKey: key,
            clientName: c.name || 'Client',
            bats: filtered.length > 0 ? filtered : list,
          })
        }
      } else {
        groups.push({ clientKey: key, clientName: c.name || 'Client', bats: list })
      }
    })

    return groups
  }, [batimentsParClient, batimentQuery, clients, selectedBatimentIds, clientsById])

  const countSelectedInGroup = (bats: BatimentRow[]) =>
    bats.reduce((acc, b) => acc + (selectedBatimentIds.includes(b.id) ? 1 : 0), 0)

  // ---- ACCÈS EFFECTIF ----
  const selectedClientSet = useMemo(() => new Set(selectedClientIds), [selectedClientIds])

  const effectiveBatimentIds = useMemo(() => {
    if (selectedClientIds.length === 0) return []

    if (selectedBatimentIds.length > 0) {
      return selectedBatimentIds.filter((id) => {
        const b = batimentsById.get(id)
        if (!b?.client_id) return false
        return selectedClientSet.has(b.client_id)
      })
    }

    return batiments
      .filter((b) => !!b.client_id && selectedClientSet.has(b.client_id))
      .map((b) => b.id)
  }, [selectedClientIds.length, selectedBatimentIds, batiments, batimentsById, selectedClientSet])

  const ignoredSelectedBatimentIds = useMemo(() => {
    if (selectedBatimentIds.length === 0) return []
    if (selectedClientIds.length === 0) return [...selectedBatimentIds]

    return selectedBatimentIds.filter((id) => {
      const b = batimentsById.get(id)
      if (!b?.client_id) return true
      return !selectedClientSet.has(b.client_id)
    })
  }, [selectedBatimentIds, selectedClientIds.length, batimentsById, selectedClientSet])

  const effectiveModeLabel = useMemo(() => {
    if (selectedClientIds.length === 0) return 'Aucun accès (0 client associé)'
    if (selectedBatimentIds.length > 0) return 'Accès restreint (bâtiments cochés)'
    return 'Accès complet (tous les bâtiments des clients associés)'
  }, [selectedClientIds.length, selectedBatimentIds.length])

  const effectiveBatimentPreview = useMemo(() => {
    const rows = effectiveBatimentIds
      .map((id) => batimentsById.get(id))
      .filter((b): b is BatimentRow => !!b)
      .map((b) => {
        const { name, addr } = buildBatimentLabel(b)
        const clientName = b.client_id ? clientsById.get(b.client_id)?.name || 'Client' : 'Sans client'
        return { id: b.id, title: name, subtitle: addr || clientName }
      })

    rows.sort((a, b) => a.title.localeCompare(b.title))
    return rows
  }, [effectiveBatimentIds, batimentsById, clientsById])

  const selectedClientsPreview = useMemo(() => {
    return selectedClientIds
      .map((id) => ({ id, name: clientsById.get(id)?.name || 'Client' }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedClientIds, clientsById])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      {/* IMPORTANT: flex-col + max-h + footer toujours visible */}
      <div className="w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-ct-grayLight px-6 py-5">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-ct-grayDark">Modifier l&apos;utilisateur</h2>
            {debugLabel && <p className="text-[11px] font-mono text-rose-600">{debugLabel}</p>}
            <p className="text-sm text-ct-gray">
              Configurez le rôle, les clients associés et les bâtiments autorisés pour cet utilisateur.
            </p>
          </header>
        </div>

        {/* Content scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <div className="font-semibold">Erreur d’enregistrement</div>
              <div className="mt-1">{errorMsg}</div>
            </div>
          )}
          {successMsg && !errorMsg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMsg}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">Nom complet</label>
              <input
                type="text"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">Rôle</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              >
                <option value="client">client</option>
                <option value="admin">admin</option>
              </select>
            </div>
          </div>

          {/* Accès effectif */}
          <div className="mt-4 rounded-2xl border border-ct-grayLight bg-ct-primaryLight/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ct-grayDark">Accès effectif</p>
                <p className="text-xs text-ct-gray">{effectiveModeLabel}</p>

                {ignoredSelectedBatimentIds.length > 0 && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span className="font-semibold">Attention :</span> {ignoredSelectedBatimentIds.length} bâtiment(s)
                    cochés ne font pas partie des clients associés et seront ignorés côté accès.
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white px-3 py-2 border border-ct-grayLight">
                  <p className="text-[11px] uppercase tracking-wide text-ct-gray">Clients sélectionnés</p>
                  <p className="mt-1 text-sm font-semibold text-ct-grayDark">
                    {selectedClientIds.length}
                    <span className="ml-1 text-xs font-normal text-ct-gray">/ {clients.length}</span>
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 border border-ct-grayLight">
                  <p className="text-[11px] uppercase tracking-wide text-ct-gray">Bâtiments visibles</p>
                  <p className="mt-1 text-sm font-semibold text-ct-grayDark">
                    {effectiveBatimentIds.length}
                    <span className="ml-1 text-xs font-normal text-ct-gray">
                      {selectedClientIds.length === 0
                        ? ''
                        : selectedBatimentIds.length > 0
                          ? '(restreint)'
                          : '(tous)'}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl bg-white px-3 py-2 border border-ct-grayLight">
                  <p className="text-[11px] uppercase tracking-wide text-ct-gray">Bâtiments cochés</p>
                  <p className="mt-1 text-sm font-semibold text-ct-grayDark">{selectedBatimentIds.length}</p>
                </div>
              </div>
            </div>

            <details className="mt-3 rounded-xl border border-ct-grayLight bg-white">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-ct-grayDark hover:bg-ct-primaryLight/10 rounded-xl">
                Voir le détail (clients et bâtiments)
              </summary>

              <div className="px-3 pb-3 pt-2 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ct-grayDark">Clients</p>
                  {selectedClientsPreview.length === 0 ? (
                    <p className="mt-1 text-xs text-ct-gray">Aucun client associé.</p>
                  ) : (
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedClientsPreview.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-lg border border-ct-grayLight bg-white px-3 py-2 text-xs text-ct-grayDark"
                        >
                          {c.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ct-grayDark">Bâtiments visibles</p>
                  {effectiveBatimentPreview.length === 0 ? (
                    <p className="mt-1 text-xs text-ct-gray">Aucun bâtiment accessible selon la configuration actuelle.</p>
                  ) : (
                    <ul className="mt-2 grid gap-2 md:grid-cols-2">
                      {effectiveBatimentPreview.slice(0, 10).map((b) => (
                        <li key={b.id} className="rounded-lg border border-ct-grayLight bg-white px-3 py-2">
                          <p className="truncate text-xs font-medium text-ct-grayDark">{b.title}</p>
                          <p className="truncate text-[11px] text-ct-gray">{b.subtitle}</p>
                        </li>
                      ))}
                    </ul>
                  )}

                  {effectiveBatimentPreview.length > 10 && (
                    <p className="mt-2 text-[11px] text-ct-gray">
                      + {effectiveBatimentPreview.length - 10} autre(s) bâtiment(s)…
                    </p>
                  )}
                </div>
              </div>
            </details>
          </div>

          {/* Listes */}
          <div className="mt-5 grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-ct-grayLight bg-white">
                <div className="border-b border-ct-grayLight p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ct-grayDark">Clients associés</p>
                    <span className="inline-flex items-center rounded-full bg-ct-primaryLight/20 px-2 py-0.5 text-[11px] font-medium text-ct-primary">
                      {selectedClientIds.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ct-gray">
                    Si aucun client n&apos;est sélectionné, l&apos;utilisateur ne verra aucun bâtiment dans le portail client.
                  </p>
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                    placeholder="Rechercher…"
                  />
                </div>

                <div className="max-h-[42vh] overflow-y-auto overflow-x-hidden p-2">
                  <ul className="space-y-1">
                    {filteredClients.map((c) => {
                      const checked = selectedClientIds.includes(c.id)
                      const label = c.name || '(Client sans nom)'

                      const totalBats = batimentCountsByClient.get(c.id) || 0
                      const selectedCount = selectedBatimentCountsByClient.get(c.id) || 0
                      const badgeText =
                        totalBats === 0 ? '0' : selectedCount > 0 ? `${selectedCount}/${totalBats}` : `${totalBats}`

                      return (
                        <li key={c.id}>
                          <label
                            className={[
                              'grid w-full grid-cols-[18px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2 text-xs transition-colors',
                              checked
                                ? 'border-ct-primary bg-ct-primaryLight/10'
                                : 'border-ct-grayLight bg-white hover:border-ct-primary/50 hover:bg-ct-primaryLight/10',
                            ].join(' ')}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleClient(c.id)}
                              className="h-4 w-4 rounded border-ct-grayLight text-ct-primary focus:ring-ct-primary"
                            />
                            <span className="min-w-0 truncate text-ct-grayDark">{label}</span>
                            <span className="inline-flex items-center justify-center rounded-full bg-ct-grayLight/60 px-2 py-0.5 text-[11px] font-medium text-ct-grayDark">
                              {badgeText}
                            </span>
                          </label>
                        </li>
                      )
                    })}

                    {filteredClients.length === 0 && (
                      <li className="px-3 py-6 text-center text-sm text-ct-gray">Aucun résultat.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className="rounded-2xl border border-ct-grayLight bg-white">
                <div className="border-b border-ct-grayLight p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ct-grayDark">
                      Bâtiments autorisés (optionnel)
                    </p>
                    <span className="inline-flex items-center rounded-full bg-ct-primaryLight/20 px-2 py-0.5 text-[11px] font-medium text-ct-primary">
                      {selectedBatimentIds.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ct-gray">
                    Si aucun bâtiment n&apos;est coché, l&apos;utilisateur verra <strong>tous</strong> les bâtiments de ses clients associés.
                    Si au moins un bâtiment est coché, l&apos;accès sera limité uniquement à ces bâtiments.
                  </p>
                  <input
                    type="text"
                    value={batimentQuery}
                    onChange={(e) => setBatimentQuery(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                    placeholder="Rechercher…"
                  />
                </div>

                <div className="max-h-[42vh] overflow-y-auto p-2">
                  <div className="space-y-2">
                    {orderedBatimentGroups.map((g) => {
                      const selectedCount = countSelectedInGroup(g.bats)
                      const totalCount = batimentCountsByClient.get(g.clientKey) || 0
                      const badgeText =
                        totalCount === 0 ? '0' : selectedCount > 0 ? `${selectedCount}/${totalCount}` : `${totalCount}`
                      const openGroup = selectedCount > 0 || batimentQuery.trim().length > 0

                      return (
                        <details
                          key={g.clientKey}
                          className="rounded-xl border border-ct-grayLight bg-white"
                          open={openGroup}
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-ct-primaryLight/10">
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ct-grayDark">
                              {g.clientKey === 'sans_client' ? 'Bâtiments sans client' : g.clientName}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-ct-grayLight/60 px-2 py-0.5 text-[11px] font-medium text-ct-grayDark">
                              {badgeText}
                            </span>
                          </summary>

                          <div className="px-2 pb-2">
                            <div className="grid gap-2 md:grid-cols-2">
                              {g.bats.map((b) => {
                                const checked = selectedBatimentIds.includes(b.id)
                                const { name, addr } = buildBatimentLabel(b)
                                const cityBadge = b.city || '—'

                                return (
                                  <label
                                    key={b.id}
                                    className={[
                                      'grid cursor-pointer grid-cols-[18px_1fr_auto] items-start gap-3 rounded-xl border px-3 py-2 text-xs transition-colors',
                                      checked
                                        ? 'border-ct-primary bg-ct-primaryLight/10'
                                        : 'border-ct-grayLight bg-white hover:border-ct-primary/70',
                                    ].join(' ')}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleBatiment(b.id, b.client_id)}
                                      className="mt-0.5 h-4 w-4 rounded border-ct-grayLight text-ct-primary focus:ring-ct-primary"
                                    />

                                    <div className="min-w-0">
                                      <p className="truncate font-medium text-ct-grayDark">{name}</p>
                                      {addr && <p className="truncate text-[11px] text-ct-gray">{addr}</p>}
                                    </div>

                                    <span className="mt-0.5 inline-flex items-center justify-center rounded-full bg-ct-grayLight/60 px-2 py-0.5 text-[11px] font-medium text-ct-grayDark">
                                      {cityBadge}
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixe */}
        <div className="shrink-0 border-t border-ct-grayLight px-6 py-4 bg-white">
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
