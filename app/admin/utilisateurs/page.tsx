'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import EditUserModal, {
  ClientRow,
  BatimentRow,
} from '@/components/admin/users/EditUserModal'

type UserProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  role: string | null
  is_active: boolean | null
  client_id?: string | null
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

  // Modal édition
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfileRow | null>(null)

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [selectedBatimentIds, setSelectedBatimentIds] = useState<string[]>([])

  const [editFullName, setEditFullName] = useState('')
  const [editRole, setEditRole] = useState('client')

  const [saving, setSaving] = useState(false)
  const [modalErrorMsg, setModalErrorMsg] = useState<string | null>(null)
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null)

  // Modal création
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createFullName, setCreateFullName] = useState('')
  const [createRole, setCreateRole] = useState('client')
  const [createSaving, setCreateSaving] = useState(false)

  // -------------------------
  // CHARGEMENT INITIAL
  // -------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Profils
      const { data: profilesData, error: profilesError } = await supabaseBrowser
        .from('user_profiles')
        .select('id, user_id, full_name, role, is_active, client_id')
        .order('full_name', { ascending: true })

      if (profilesError) {
        setErrorMsg(profilesError.message)
        setLoading(false)
        return
      }

      const profiles = (profilesData || []) as UserProfileRow[]

      // 2) Clients
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

      // 3) Bâtiments
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

      // 4) Liens user_clients
      const { data: ucData, error: ucError } = await supabaseBrowser
        .from('user_clients')
        .select('user_id, client_id')

      if (ucError) {
        setErrorMsg(ucError.message)
        setLoading(false)
        return
      }

      const userClients = (ucData || []) as UserClientRow[]

      // 5) Liens user_batiments_access
      const { data: ubaData, error: ubaError } = await supabaseBrowser
        .from('user_batiments_access')
        .select('user_id, batiment_id')

      if (ubaError) {
        setErrorMsg(ubaError.message)
        setLoading(false)
        return
      }

      const userBatiments = (ubaData || []) as UserBatimentAccessRow[]

      // 6) Construction libellés
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

  // -------------------------
  // MÉMOS
  // -------------------------
  const clientsById = useMemo(() => {
    const m = new Map<string, ClientRow>()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  // -------------------------
  // MODAL ÉDITION (EditUserModal)
  // -------------------------
  const openEditModal = async (user: EditableUser) => {
    setErrorMsg(null)
    setModalErrorMsg(null)
    setModalSuccessMsg(null)

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
    setModalErrorMsg(null)
    setModalSuccessMsg(null)
    setEditingUser(null)
    setSelectedClientIds([])
    setSelectedBatimentIds([])
    setEditFullName('')
    setEditRole('client')
  }

  const toggleClient = (clientId: string) => {
    setSelectedClientIds((prev) => {
      const isChecked = prev.includes(clientId)
      const next = isChecked ? prev.filter((x) => x !== clientId) : [...prev, clientId]

      // Bonus logique: si on enlève un client, on enlève aussi ses bâtiments cochés
      if (isChecked) {
        setSelectedBatimentIds((prevB) => {
          const nextB = prevB.filter((bid) => {
            const b = batiments.find((bb) => bb.id === bid)
            return b?.client_id !== clientId
          })
          return nextB
        })
      }

      return next
    })
  }

  // MICRO-AMÉLIORATION: si on coche un bâtiment, on coche son client automatiquement
  const toggleBatiment = (batimentId: string, clientId: string | null) => {
    setSelectedBatimentIds((prev) => {
      const isChecked = prev.includes(batimentId)
      const next = isChecked ? prev.filter((x) => x !== batimentId) : [...prev, batimentId]

      if (!isChecked && clientId) {
        setSelectedClientIds((prevC) => (prevC.includes(clientId) ? prevC : [...prevC, clientId]))
      }

      return next
    })
  }

  const handleSave = async () => {
    if (!editingUser) return

    setSaving(true)
    setModalErrorMsg(null)
    setModalSuccessMsg(null)

    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: editingUser.id,
          userId: editingUser.user_id,
          fullName: editFullName || null,
          role: editRole || null,
          selectedClientIds,
          selectedBatimentIds,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur API update')

      const updatedProfile = json.profile as UserProfileRow

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
            client_id: updatedProfile.client_id ?? u.client_id ?? null,
            is_active: updatedProfile.is_active ?? u.is_active,
            clientsLabels,
            batimentsLabels,
          }
        }),
      )

      setSaving(false)
      closeModal()
    } catch (e: any) {
      setModalErrorMsg(e?.message || 'Erreur inconnue')
      setSaving(false)
    }
  }

  // -------------------------
  // SUSPENSION / RÉACTIVATION
  // -------------------------
  const toggleUserActive = async (profileId: string, userId: string, currentActive: boolean | null) => {
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
      alert(
        "Erreur lors de la mise à jour du statut de l'utilisateur : " + (err?.message ?? 'Erreur inconnue'),
      )
    }
  }

  // -------------------------
  // CRÉATION D’UN UTILISATEUR
  // -------------------------
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName: fullName || null,
          role: createRole,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Erreur lors de la création de l'utilisateur.")

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
      alert("Erreur lors de la création de l'utilisateur : " + (err?.message ?? 'Erreur inconnue'))
    } finally {
      setCreateSaving(false)
    }
  }

  // -------------------------
  // RENDER
  // -------------------------
  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-ct-primary">Utilisateurs</h1>
        <p className="text-sm text-ct-gray">Chargement des utilisateurs…</p>
      </section>
    )
  }

  if (errorMsg) {
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

      {/* Tableau */}
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
                <tr key={u.id} className="hover:bg-ct-primaryLight/10 transition-colors">
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

      {/* Modal création */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg mx-4 max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-ct-grayDark">Ajouter un utilisateur</h2>
              <p className="text-sm text-ct-gray">
                Un courriel d&apos;invitation sera envoyé à cette adresse. Le profil sera créé avec le rôle sélectionné.
              </p>
            </header>

            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">Courriel (identifiant de connexion)</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-ct-grayDark">Nom complet (optionnel)</label>
                <input
                  type="text"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
                />
              </div>

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
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={closeCreateModal} disabled={createSaving}>
                Annuler
              </button>
              <button type="button" className="btn-primary" onClick={handleCreateUser} disabled={createSaving}>
                {createSaving ? 'Création…' : 'Créer et inviter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL ÉDITION : composant EditUserModal (le bon design) */}
      <EditUserModal
        open={showModal && !!editingUser}
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
        errorMsg={modalErrorMsg}
        successMsg={modalSuccessMsg}
        debugLabel="CT-MODAL-UTILISATEUR-TRACE-V2"
      />
    </section>
  )
}
