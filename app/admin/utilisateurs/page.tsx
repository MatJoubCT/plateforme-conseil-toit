'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

type UserProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  role: string | null
  is_active: boolean | null
}

type ClientRow = {
  id: string
  name: string | null
}

type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
}

type UserClientRow = {
  user_id: string
  client_id: string
}

type UserBatimentAccessRow = {
  user_id: string
  batiment_id: string
}

type EditableUser = UserProfileRow & {
  clientsLabels: string[]
  batimentsLabels: string[]
}

export default function AdminUtilisateursPage() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [users, setUsers] = useState<EditableUser[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])

  // État du modal d’édition
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfileRow | null>(null)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [selectedBatimentIds, setSelectedBatimentIds] = useState<string[]>([])
  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState('client')
  const [saving, setSaving] = useState(false)

  // État du modal de création
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createFullName, setCreateFullName] = useState('')
  const [createRole, setCreateRole] = useState('client')
  const [createSaving, setCreateSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabaseBrowser
        .from('user_profiles')
        .select('id, user_id, full_name, role, is_active')
        .order('full_name', { ascending: true })

      if (profilesError) {
        setErrorMsg(profilesError.message)
        setLoading(false)
        return
      }

      const profiles = (profilesData || []) as UserProfileRow[]

      // 2) clients
      const { data: clientsData, error: clientsError } = await supabaseBrowser
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (clientsError) {
        setErrorMsg(clientsError.message)
        setLoading(false)
        return
      }

      const allClients = (clientsData || []) as ClientRow[]

      // 3) bâtiments
      const { data: batData, error: batError } = await supabaseBrowser
        .from('batiments')
        .select('id, client_id, name, address, city, postal_code')
        .order('name', { ascending: true })

      if (batError) {
        setErrorMsg(batError.message)
        setLoading(false)
        return
      }

      const allBatiments = (batData || []) as BatimentRow[]

      // 4) liens user_clients
      const { data: ucData, error: ucError } = await supabaseBrowser
        .from('user_clients')
        .select('user_id, client_id')

      if (ucError) {
        setErrorMsg(ucError.message)
        setLoading(false)
        return
      }

      const userClients = (ucData || []) as UserClientRow[]

      // 5) liens user_batiments_access
      const { data: ubaData, error: ubaError } = await supabaseBrowser
        .from('user_batiments_access')
        .select('user_id, batiment_id')

      if (ubaError) {
        setErrorMsg(ubaError.message)
        setLoading(false)
        return
      }

      const userBatiments = (ubaData || []) as UserBatimentAccessRow[]

      // 6) construire l'affichage
      const clientsByIdMap = new Map<string, ClientRow>()
      allClients.forEach((c) => clientsByIdMap.set(c.id, c))

      const batById = new Map<string, BatimentRow>()
      allBatiments.forEach((b) => batById.set(b.id, b))

      const editable: EditableUser[] = profiles.map((p) => {
        const uc = userClients.filter((x) => x.user_id === p.user_id)
        const uba = userBatiments.filter((x) => x.user_id === p.user_id)

        const clientsLabels = uc
          .map((x) => clientsByIdMap.get(x.client_id)?.name || null)
          .filter((x): x is string => !!x)

        const batimentsLabels = uba
          .map((x) => {
            const b = batById.get(x.batiment_id)
            if (!b) return null
            if (b.name && b.city) return `${b.name} — ${b.city}`
            if (b.name) return b.name
            return null
          })
          .filter((x): x is string => !!x)

        return {
          ...p,
          clientsLabels,
          batimentsLabels,
        }
      })

      setUsers(editable)
      setClients(allClients)
      setBatiments(allBatiments)
      setLoading(false)
    }

    void load()
  }, [])

  const clientsById = useMemo(() => {
    const m = new Map<string, ClientRow>()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  const batimentsParClient = useMemo(() => {
    const m = new Map<string, BatimentRow[]>()
    batiments.forEach((b) => {
      const key = b.client_id || 'sans_client'
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(b)
    })
    return m
  }, [batiments])

  // --- MODAL ÉDITION ---

  const openEditModal = async (user: EditableUser) => {
    setErrorMsg(null)
    setEditingUser(user)
    setEditFullName(user.full_name || '')
    setEditRole(user.role || 'client')

    const [ucRes, ubaRes] = await Promise.all([
      supabaseBrowser
        .from('user_clients')
        .select('user_id, client_id')
        .eq('user_id', user.user_id),
      supabaseBrowser
        .from('user_batiments_access')
        .select('user_id, batiment_id')
        .eq('user_id', user.user_id),
    ])

    if (ucRes.error) {
      setErrorMsg(ucRes.error.message)
      return
    }
    if (ubaRes.error) {
      setErrorMsg(ubaRes.error.message)
      return
    }

    const ucRows = (ucRes.data || []) as UserClientRow[]
    const ubaRows = (ubaRes.data || []) as UserBatimentAccessRow[]

    setSelectedClientIds(ucRows.map((x) => x.client_id))
    setSelectedBatimentIds(ubaRows.map((x) => x.batiment_id))

    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditingUser(null)
    setSelectedClientIds([])
    setSelectedBatimentIds([])
    setEditFullName('')
    setEditRole('client')
  }

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const toggleBatiment = (id: string) => {
    setSelectedBatimentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    setErrorMsg(null)

    const userId = editingUser.user_id

    // 1) update user_profiles
    const { error: upError } = await supabaseBrowser
      .from('user_profiles')
      .update({
        full_name: editFullName || null,
        role: editRole || null,
      })
      .eq('id', editingUser.id)

    if (upError) {
      setErrorMsg(`Erreur mise à jour profil : ${upError.message}`)
      setSaving(false)
      return
    }

    // 2) synchroniser user_clients
    const { error: delUcError } = await supabaseBrowser
      .from('user_clients')
      .delete()
      .eq('user_id', userId)

    if (delUcError) {
      setErrorMsg(`Erreur suppression clients associés : ${delUcError.message}`)
      setSaving(false)
      return
    }

    if (selectedClientIds.length > 0) {
      const insertUcRows = selectedClientIds.map((clientId) => ({
        user_id: userId,
        client_id: clientId,
      }))
      const { error: insUcError } = await supabaseBrowser
        .from('user_clients')
        .insert(insertUcRows)

      if (insUcError) {
        setErrorMsg(`Erreur ajout clients associés : ${insUcError.message}`)
        setSaving(false)
        return
      }
    }

    // 3) synchroniser user_batiments_access
    const { error: delUbaError } = await supabaseBrowser
      .from('user_batiments_access')
      .delete()
      .eq('user_id', userId)

    if (delUbaError) {
      setErrorMsg(
        `Erreur suppression bâtiments autorisés : ${delUbaError.message}`,
      )
      setSaving(false)
      return
    }

    if (selectedBatimentIds.length > 0) {
      const insertUbaRows = selectedBatimentIds.map((batimentId) => ({
        user_id: userId,
        batiment_id: batimentId,
      }))
      const { error: insUbaError } = await supabaseBrowser
        .from('user_batiments_access')
        .insert(insertUbaRows)

      if (insUbaError) {
        setErrorMsg(
          `Erreur ajout bâtiments autorisés : ${insUbaError.message}`,
        )
        setSaving(false)
        return
      }
    }

    // 4) mettre à jour l'affichage local
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== editingUser.id) return u

        const clientsLabels = selectedClientIds
          .map((id) => clientsById.get(id)?.name || null)
          .filter((x): x is string => !!x)

        const batimentsLabels = selectedBatimentIds
          .map((id) => {
            const b = batiments.find((bb) => bb.id === id)
            if (!b) return null
            if (b.name && b.city) return `${b.name} — ${b.city}`
            if (b.name) return b.name
            return null
          })
          .filter((x): x is string => !!x)

        return {
          ...u,
          full_name: editFullName || null,
          role: editRole || null,
          clientsLabels,
          batimentsLabels,
        }
      }),
    )

    setSaving(false)
    closeModal()
  }

  // --- SUSPENSION / RÉACTIVATION ---

  const toggleUserActive = async (
    profileId: string,
    userId: string,
    currentActive: boolean | null,
  ) => {
    const nextActive = currentActive === false ? true : false

    try {
      const res = await fetch('/api/admin/users/toggle-active', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId,
          isActive: nextActive,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Erreur API toggle-active')
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === profileId ? { ...u, is_active: nextActive } : u,
        ),
      )
    } catch (err: any) {
      alert(
        "Erreur lors de la mise à jour du statut de l'utilisateur : " +
          (err?.message ?? 'Erreur inconnue'),
      )
    }
  }

  // --- CRÉATION D’UN NOUVEL UTILISATEUR ---

  const openCreateModal = () => {
    setErrorMsg(null)
    setCreateEmail('')
    setCreateFullName('')
    setCreateRole('client')
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    if (createSaving) return
    setShowCreateModal(false)
  }

  const handleCreateUser = async () => {
    const email = createEmail.trim()
    const fullName = createFullName.trim()

    if (!email) {
      alert('Le courriel est obligatoire pour créer un utilisateur.')
      return
    }

    setCreateSaving(true)

    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          fullName: fullName || null,
          role: createRole,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || "Erreur lors de la création de l'utilisateur.")
      }

      const profile = json.profile as UserProfileRow

      const newUser: EditableUser = {
        ...profile,
        clientsLabels: [],
        batimentsLabels: [],
      }

      setUsers((prev) => [...prev, newUser])

      setShowCreateModal(false)
      setCreateEmail('')
      setCreateFullName('')
      setCreateRole('client')
    } catch (err: any) {
      alert(
        "Erreur lors de la création de l'utilisateur : " +
          (err?.message ?? 'Erreur inconnue'),
      )
    } finally {
      setCreateSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">
          Utilisateurs
        </h1>
        <p className="text-sm text-ct-gray">Chargement des utilisateurs…</p>
      </section>
    )
  }

  if (errorMsg) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">
          Utilisateurs
        </h1>
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ct-primary">
            Utilisateurs
          </h1>
          <p className="text-sm text-ct-gray">
            Gestion des comptes, rôles, statut actif/suspendu et accès aux
            clients / bâtiments pour le portail client.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={openCreateModal}
        >
          Ajouter un utilisateur
        </button>
      </header>

      {/* Tableau des utilisateurs */}
      <div className="overflow-x-auto rounded-2xl border border-ct-grayLight bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ct-grayLight/60 text-left">
              <th className="border border-ct-grayLight px-3 py-2">
                Nom complet
              </th>
              <th className="border border-ct-grayLight px-3 py-2">Rôle</th>
              <th className="border border-ct-grayLight px-3 py-2">
                Clients associés
              </th>
              <th className="border border-ct-grayLight px-3 py-2">
                Bâtiments autorisés
              </th>
              <th className="border border-ct-grayLight px-3 py-2">Statut</th>
              <th className="border border-ct-grayLight px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isActive = u.is_active !== false

              return (
                <tr
                  key={u.id}
                  className="hover:bg-ct-primaryLight/10 transition-colors"
                >
                  <td className="border border-ct-grayLight px-3 py-2">
                    {u.full_name || '(Sans nom)'}
                  </td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    {u.role || '—'}
                  </td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    {u.clientsLabels.length > 0
                      ? u.clientsLabels.join(', ')
                      : 'Aucun'}
                  </td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    {u.batimentsLabels.length > 0
                      ? u.batimentsLabels.join(', ')
                      : 'Tous les bâtiments des clients associés'}
                  </td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    <span
                      className={
                        isActive
                          ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                          : 'inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700'
                      }
                    >
                      {isActive ? 'Actif' : 'Suspendu'}
                    </span>
                  </td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => openEditModal(u)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={isActive ? 'btn-danger' : 'btn-secondary'}
                        onClick={() =>
                          toggleUserActive(u.id, u.user_id, u.is_active)
                        }
                      >
                        {isActive ? 'Suspendre' : 'Réactiver'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal création utilisateur */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg mx-4 max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-ct-grayDark">
                Ajouter un utilisateur
              </h2>
              <p className="text-sm text-ct-gray">
                Un courriel d&apos;invitation sera envoyé à cette adresse. Le
                profil sera créé avec le rôle sélectionné.
              </p>
            </header>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Courriel (identifiant de connexion)
                </label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Nom complet (optionnel)
                </label>
                <input
                  type="text"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Rôle
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                >
                  <option value="client">client</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeCreateModal}
                disabled={createSaving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreateUser}
                disabled={createSaving}
              >
                {createSaving ? 'Création…' : 'Créer et inviter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition utilisateur */}
      {showModal && editingUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl mx-4 max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-ct-grayDark">
                Modifier l&apos;utilisateur
              </h2>
              <p className="text-sm text-ct-gray">
                Configurez le rôle, les clients associés et les bâtiments
                autorisés pour cet utilisateur.
              </p>
            </header>

            {/* Nom + rôle */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Nom complet
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">
                  Rôle
                </label>
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

            {/* Clients associés */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ct-grayDark">
                Clients associés (multi-sélection)
              </p>
              <p className="text-xs text-ct-gray mb-1">
                Si aucun client n&apos;est sélectionné, l&apos;utilisateur ne
                verra aucun bâtiment dans le portail client.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClient(c.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
                      selectedClientIds.includes(c.id)
                        ? 'border-ct-primary bg-ct-primaryLight/10'
                        : 'border-ct-grayLight bg-white'
                    }`}
                  >
                    <span className="font-medium">
                      {c.name || '(Client sans nom)'}
                    </span>
                    <input
                      type="checkbox"
                      readOnly
                      checked={selectedClientIds.includes(c.id)}
                      className="h-4 w-4 rounded border-ct-grayLight text-ct-primary focus:ring-ct-primary"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Bâtiments autorisés */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ct-grayDark">
                Bâtiments autorisés (optionnel)
              </p>
              <p className="text-xs text-ct-gray mb-1">
                Si aucun bâtiment n&apos;est coché, l&apos;utilisateur verra{' '}
                <strong>tous</strong> les bâtiments de ses clients associés. Si
                au moins un bâtiment est coché, l&apos;accès sera limité
                uniquement à ces bâtiments.
              </p>

              <div className="space-y-4">
                {/* Groupe "Bâtiments sans client" */}
                {batimentsParClient.get('sans_client') &&
                  batimentsParClient.get('sans_client')!.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-ct-grayDark">
                        Bâtiments sans client
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {batimentsParClient.get('sans_client')!.map((b) => (
                          <label
                            key={b.id}
                            className="flex cursor-pointer items-start gap-2 rounded-xl border border-ct-grayLight bg-white px-3 py-2 text-sm hover:border-ct-primary/70"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBatimentIds.includes(b.id)}
                              onChange={() => toggleBatiment(b.id)}
                              className="mt-1 h-4 w-4 rounded border-ct-grayLight text-ct-primary focus:ring-ct-primary"
                            />
                            <div>
                              <p className="font-medium">
                                {b.name || '(Sans nom)'}
                              </p>
                              <p className="text-xs text-ct-gray">
                                {b.address && <>{b.address} · </>}
                                {b.city}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Groupes par client */}
                {Array.from(batimentsParClient.entries())
                  .filter(([clientId]) => clientId !== 'sans_client')
                  .map(([clientId, bats]) => {
                    const client = clientsById.get(clientId)
                    return (
                      <div key={clientId} className="space-y-2">
                        <p className="text-xs font-semibold text-ct-grayDark">
                          {client?.name || 'Client'}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {bats.map((b) => (
                            <label
                              key={b.id}
                              className="flex cursor-pointer items-start gap-2 rounded-xl border border-ct-grayLight bg-white px-3 py-2 text-sm hover:border-ct-primary/70"
                            >
                              <input
                                type="checkbox"
                                checked={selectedBatimentIds.includes(b.id)}
                                onChange={() => toggleBatiment(b.id)}
                                className="mt-1 h-4 w-4 rounded border-ct-grayLight text-ct-primary focus:ring-ct-primary"
                              />
                              <div>
                                <p className="font-medium">
                                  {b.name || '(Sans nom)'}
                                </p>
                                <p className="text-xs text-ct-gray">
                                  {b.address && <>{b.address} · </>}
                                  {b.city}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Footer modal édition */}
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
