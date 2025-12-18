'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import EditUserModal, { BatimentRow, ClientRow } from '@/components/admin/users/EditUserModal'

type UserProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  role: string | null
  client_id: string | null
  is_active: boolean | null
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

  // messages (utilisés par le modal Modifier)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [users, setUsers] = useState<EditableUser[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])

  // Modal édition
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfileRow | null>(null)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [selectedBatimentIds, setSelectedBatimentIds] = useState<string[]>([])
  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState('client')
  const [saving, setSaving] = useState(false)

  // Modal création (inline)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createFullName, setCreateFullName] = useState('')
  const [createRole, setCreateRole] = useState('client')
  const [createClientId, setCreateClientId] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createErrorMsg, setCreateErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      const { data: profilesData, error: profilesError } = await supabaseBrowser
        .from('user_profiles')
        .select('id, user_id, full_name, role, client_id, is_active')
        .order('full_name', { ascending: true })

      if (profilesError) {
        setErrorMsg(profilesError.message)
        setLoading(false)
        return
      }

      const profiles = (profilesData || []) as UserProfileRow[]

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

      const { data: ucData, error: ucError } = await supabaseBrowser
        .from('user_clients')
        .select('user_id, client_id')

      if (ucError) {
        setErrorMsg(ucError.message)
        setLoading(false)
        return
      }

      const userClients = (ucData || []) as UserClientRow[]

      const { data: ubaData, error: ubaError } = await supabaseBrowser
        .from('user_batiments_access')
        .select('user_id, batiment_id')

      if (ubaError) {
        setErrorMsg(ubaError.message)
        setLoading(false)
        return
      }

      const userBatiments = (ubaData || []) as UserBatimentAccessRow[]

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

        return { ...p, clientsLabels, batimentsLabels }
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

  // --- MODAL ÉDITION ---
  const openEditModal = async (user: EditableUser) => {
    setErrorMsg(null)
    setSuccessMsg(null)

    setEditingUser(user)
    setEditFullName(user.full_name || '')
    setEditRole(user.role || 'client')

    const [ucRes, ubaRes] = await Promise.all([
      supabaseBrowser.from('user_clients').select('user_id, client_id').eq('user_id', user.user_id),
      supabaseBrowser.from('user_batiments_access').select('user_id, batiment_id').eq('user_id', user.user_id),
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
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const toggleClient = (id: string) => {
    setSelectedClientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleBatiment = (id: string) => {
    setSelectedBatimentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!editingUser) return

    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const { data: authUserRes, error: authErr } = await supabaseBrowser.auth.getUser()
    if (authErr) {
      setErrorMsg(`Auth.getUser() a échoué : ${authErr.message}`)
      setSaving(false)
      return
    }
    if (!authUserRes?.user) {
      setErrorMsg('Aucun utilisateur connecté (session absente).')
      setSaving(false)
      return
    }

    const targetUserId = editingUser.user_id

    const { data: updatedProfile, error: upError } = await supabaseBrowser
      .from('user_profiles')
      .update({
        full_name: editFullName || null,
        role: editRole || null,
      })
      .eq('id', editingUser.id)
      .select('id, user_id, full_name, role, client_id, is_active')
      .maybeSingle()

    if (upError) {
      setErrorMsg(`user_profiles.update() refusé : ${upError.message}`)
      setSaving(false)
      return
    }

    if (!updatedProfile) {
      setErrorMsg("0 ligne mise à jour dans user_profiles. Policy RLS ou filtre qui ne matche pas.")
      setSaving(false)
      return
    }

    const { error: delUcError } = await supabaseBrowser.from('user_clients').delete().eq('user_id', targetUserId)
    if (delUcError) {
      setErrorMsg(`Suppression user_clients refusée : ${delUcError.message}`)
      setSaving(false)
      return
    }

    if (selectedClientIds.length > 0) {
      const insertUcRows = selectedClientIds.map((clientId) => ({ user_id: targetUserId, client_id: clientId }))
      const { error: insUcError } = await supabaseBrowser.from('user_clients').insert(insertUcRows)
      if (insUcError) {
        setErrorMsg(`Insertion user_clients refusée : ${insUcError.message}`)
        setSaving(false)
        return
      }
    }

    const { error: delUbaError } = await supabaseBrowser.from('user_batiments_access').delete().eq('user_id', targetUserId)
    if (delUbaError) {
      setErrorMsg(`Suppression user_batiments_access refusée : ${delUbaError.message}`)
      setSaving(false)
      return
    }

    if (selectedBatimentIds.length > 0) {
      const insertUbaRows = selectedBatimentIds.map((batimentId) => ({ user_id: targetUserId, batiment_id: batimentId }))
      const { error: insUbaError } = await supabaseBrowser.from('user_batiments_access').insert(insertUbaRows)
      if (insUbaError) {
        setErrorMsg(`Insertion user_batiments_access refusée : ${insUbaError.message}`)
        setSaving(false)
        return
      }
    }

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
          full_name: updatedProfile.full_name,
          role: updatedProfile.role,
          client_id: updatedProfile.client_id,
          is_active: (updatedProfile as any).is_active ?? u.is_active,
          clientsLabels,
          batimentsLabels,
        }
      }),
    )

    setSaving(false)
    closeModal()
  }

  // --- SUSPENDRE / RÉACTIVER ---
  const toggleUserActive = async (profileId: string, _userId: string, currentActive: boolean | null) => {
    const nextActive = currentActive === false ? true : false
    try {
      const res = await fetch('/api/admin/users/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, isActive: nextActive }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur API toggle-active')

      setUsers((prev) => prev.map((u) => (u.id === profileId ? { ...u, is_active: nextActive } : u)))
    } catch (err: any) {
      alert("Erreur lors de la mise à jour du statut de l'utilisateur : " + (err?.message ?? 'Erreur inconnue'))
    }
  }

  // --- MODAL CRÉATION (inline) ---
  const openCreateModal = () => {
    setCreateErrorMsg(null)
    setCreateEmail('')
    setCreateFullName('')
    setCreateRole('client')
    setCreateClientId('')
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    if (createSaving) return
    setShowCreateModal(false)
    setCreateErrorMsg(null)
  }

  const handleCreateUser = async () => {
    const email = createEmail.trim().toLowerCase()
    const fullName = createFullName.trim()

    if (!email) {
      setCreateErrorMsg('Le courriel est obligatoire pour créer un utilisateur.')
      return
    }

    setCreateSaving(true)
    setCreateErrorMsg(null)

    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName: fullName || null,
          role: createRole,
          clientId: createClientId || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Erreur lors de la création de l'utilisateur.")

      const profile = json.profile as UserProfileRow

      const clientLabel =
        createClientId ? (clientsById.get(createClientId)?.name || 'Client') : null

      const newUser: EditableUser = {
        ...profile,
        clientsLabels: clientLabel ? [clientLabel] : [],
        batimentsLabels: [],
      }

      setUsers((prev) => [...prev, newUser])

      setShowCreateModal(false)
      setCreateEmail('')
      setCreateFullName('')
      setCreateRole('client')
      setCreateClientId('')
    } catch (err: any) {
      setCreateErrorMsg(err?.message ?? 'Erreur inconnue')
    } finally {
      setCreateSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Utilisateurs</h1>
        <p className="text-sm text-ct-gray">Chargement des utilisateurs…</p>
      </section>
    )
  }

  if (errorMsg && !showModal && !showCreateModal) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Utilisateurs</h1>
        <p className="text-sm text-red-600">Erreur : {errorMsg}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ct-primary">Utilisateurs</h1>
          <p className="text-sm text-ct-gray">
            Gestion des comptes, rôles, statut actif/suspendu et accès aux clients / bâtiments pour le portail client.
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateModal}>
          Ajouter un utilisateur
        </button>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-ct-grayLight bg-white shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-ct-grayLight/60 text-left">
              <th className="border border-ct-grayLight px-3 py-2">Nom complet</th>
              <th className="border border-ct-grayLight px-3 py-2">Rôle</th>
              <th className="border border-ct-grayLight px-3 py-2">Clients associés</th>
              <th className="border border-ct-grayLight px-3 py-2">Bâtiments autorisés</th>
              <th className="border border-ct-grayLight px-3 py-2">Statut</th>
              <th className="border border-ct-grayLight px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isActive = u.is_active !== false
              return (
                <tr key={u.id} className="transition-colors hover:bg-ct-primaryLight/10">
                  <td className="border border-ct-grayLight px-3 py-2">{u.full_name || '(Sans nom)'}</td>
                  <td className="border border-ct-grayLight px-3 py-2">{u.role || '—'}</td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    {u.clientsLabels.length > 0 ? u.clientsLabels.join(', ') : 'Aucun'}
                  </td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    {u.batimentsLabels.length > 0 ? u.batimentsLabels.join(', ') : 'Tous les bâtiments des clients associés'}
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
                      <button type="button" className="btn-secondary" onClick={() => openEditModal(u)}>
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={isActive ? 'btn-danger' : 'btn-secondary'}
                        onClick={() => toggleUserActive(u.id, u.user_id, u.is_active)}
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

      {/* MODAL AJOUTER UTILISATEUR (inline) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl mx-4 rounded-2xl bg-white shadow-xl">
            <div className="border-b border-ct-grayLight px-6 py-5">
              <h2 className="text-lg font-semibold text-ct-grayDark">Ajouter un utilisateur</h2>
              <p className="mt-1 text-sm text-ct-gray">
                Un courriel d&apos;invitation sera envoyé à cette adresse. Le profil sera créé avec le rôle sélectionné.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <p className="mt-2 text-[11px] font-mono text-rose-600">CT-MODAL-CREATE-USER-TRACE-V1</p>
              )}
            </div>

            <div className="px-6 py-5 space-y-4">
              {createErrorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <div className="font-semibold">Erreur</div>
                  <div className="mt-1">{createErrorMsg}</div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">Courriel (identifiant de connexion)</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  placeholder="ex: client@domaine.com"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">Nom complet (optionnel)</label>
                <input
                  type="text"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  placeholder="ex: Jean Tremblay"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">Rôle</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  >
                    <option value="client">client</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-ct-grayDark">Client associé (optionnel)</label>
                  <select
                    value={createClientId}
                    onChange={(e) => setCreateClientId(e.target.value)}
                    className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                  >
                    <option value="">Aucun</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || '(Sans nom)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-ct-gray">
                    Si un client est choisi, le compte sera lié à ce client dès la création.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-ct-grayLight px-6 py-4">
              <div className="flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={closeCreateModal} disabled={createSaving}>
                  Annuler
                </button>
                <button type="button" className="btn-primary" onClick={handleCreateUser} disabled={createSaving}>
                  {createSaving ? 'Création…' : 'Créer et inviter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER UTILISATEUR */}
      {showModal && editingUser && (
        <EditUserModal
          open={showModal}
          saving={saving}
          editFullName={editFullName}
          setEditFullName={setEditFullName}
          editRole={editRole}
          setEditRole={setEditRole}
          clients={clients}
          batiments={batiments}
          selectedClientIds={selectedClientIds}
          toggleClient={toggleClient}
          selectedBatimentIds={selectedBatimentIds}
          toggleBatiment={toggleBatiment}
          onClose={closeModal}
          onSave={handleSave}
          errorMsg={errorMsg}
          successMsg={successMsg}
          debugLabel={process.env.NODE_ENV === 'development' ? 'CT-MODAL-UTILISATEUR-TRACE-V2' : undefined}
        />
      )}
    </section>
  )
}
