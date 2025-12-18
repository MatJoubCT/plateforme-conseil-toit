'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import EditUserModal, { BatimentRow, ClientRow } from '@/components/admin/users/EditUserModal'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

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

type ToastState = { type: 'success' | 'error'; message: string } | null

export default function AdminUtilisateursPage() {
  const [loading, setLoading] = useState(true)

  // messages (utilisés par le modal Modifier)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [users, setUsers] = useState<EditableUser[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])

  // Toast (UI pro)
  const [toast, setToast] = useState<ToastState>(null)
  const pushToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    window.setTimeout(() => setToast(null), 3500)
  }

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

  // Reset password (par utilisateur)
  const [resetLoadingByUserId, setResetLoadingByUserId] = useState<Record<string, boolean>>({})

  // Confirm dialog (reset password)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [confirmResetUserId, setConfirmResetUserId] = useState<string | null>(null)
  const confirmResetUser = useMemo(
    () => (confirmResetUserId ? users.find((u) => u.user_id === confirmResetUserId) : null),
    [confirmResetUserId, users],
  )

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

      const { data: ucData, error: ucError } = await supabaseBrowser.from('user_clients').select('user_id, client_id')

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

    // 1) Session + token (pour appeler l’API)
    const { data: sessionRes, error: sessionErr } = await supabaseBrowser.auth.getSession()
    if (sessionErr) {
      setErrorMsg(`Auth.getSession() a échoué : ${sessionErr.message}`)
      setSaving(false)
      return
    }
    const accessToken = sessionRes?.session?.access_token ?? ''
    if (!accessToken) {
      setErrorMsg('Session absente ou access_token manquant. Reconnecte-toi.')
      setSaving(false)
      return
    }

    const targetUserId = editingUser.user_id

    // 2) Mettre à jour le profil
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

    // 3) Accès via API (bypass RLS)
    try {
      const res = await fetch('/api/admin/users/update-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: targetUserId,
          selectedClientIds,
          selectedBatimentIds,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur update-access (API).')
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur lors de la mise à jour des accès (API).')
      setSaving(false)
      return
    }

    // 4) Mettre à jour l’UI
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
      pushToast('success', nextActive ? 'Utilisateur réactivé.' : 'Utilisateur suspendu.')
    } catch (err: any) {
      pushToast('error', err?.message ?? "Erreur lors de la mise à jour du statut de l'utilisateur.")
    }
  }

  // --- RESET PASSWORD (Dialog confirm) ---
  const requestResetPassword = (targetUserId: string) => {
    if (!targetUserId) return
    setConfirmResetUserId(targetUserId)
    setConfirmResetOpen(true)
  }

  const doResetPassword = async (targetUserId: string) => {
    if (!targetUserId) return

    // token (admin)
    const { data: sessionRes, error: sessionErr } = await supabaseBrowser.auth.getSession()
    if (sessionErr) {
      pushToast('error', `Auth.getSession() a échoué : ${sessionErr.message}`)
      return
    }
    const accessToken = sessionRes?.session?.access_token ?? ''
    if (!accessToken) {
      pushToast('error', 'Session absente ou access_token manquant. Reconnecte-toi.')
      return
    }

    setResetLoadingByUserId((prev) => ({ ...prev, [targetUserId]: true }))

    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: targetUserId }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur reset-password (API).')

      pushToast('success', 'Courriel de réinitialisation envoyé.')
    } catch (e: any) {
      pushToast('error', e?.message || 'Erreur lors de la réinitialisation.')
    } finally {
      setResetLoadingByUserId((prev) => ({ ...prev, [targetUserId]: false }))
    }
  }

  const confirmResetPassword = async () => {
    if (!confirmResetUserId) return
    const uid = confirmResetUserId
    setConfirmResetOpen(false)
    setConfirmResetUserId(null)
    await doResetPassword(uid)
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

      const clientLabel = createClientId ? clientsById.get(createClientId)?.name || 'Client' : null

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
      pushToast('success', "Utilisateur créé et invitation envoyée.")
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
      {/* TOAST */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 w-[min(420px,calc(100%-2rem))]">
          <div
            className={
              toast.type === 'success'
                ? 'rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg'
                : 'rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-lg'
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium">{toast.message}</div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs hover:bg-black/5"
                onClick={() => setToast(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG - RESET PASSWORD */}
      <Dialog
        open={confirmResetOpen}
        onOpenChange={(open) => {
          setConfirmResetOpen(open)
          if (!open) setConfirmResetUserId(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Cela envoie un courriel Supabase contenant un lien de réinitialisation.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 rounded-xl border border-ct-grayLight bg-white p-3 text-sm text-ct-grayDark">
            <div className="font-medium text-ct-grayDark">
              Utilisateur : {confirmResetUser?.full_name || '(Sans nom)'}
            </div>
            <div className="mt-1 text-ct-gray">
              Rôle : {confirmResetUser?.role || '—'}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setConfirmResetOpen(false)
                setConfirmResetUserId(null)
              }}
            >
              Annuler
            </button>
            <button type="button" className="btn-primary" onClick={confirmResetPassword}>
              Envoyer le courriel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              const resetLoading = !!resetLoadingByUserId[u.user_id]

              return (
                <tr key={u.id} className="transition-colors hover:bg-ct-primaryLight/10">
                  <td className="border border-ct-grayLight px-3 py-2">{u.full_name || '(Sans nom)'}</td>
                  <td className="border border-ct-grayLight px-3 py-2">{u.role || '—'}</td>
                  <td className="border border-ct-grayLight px-3 py-2">
                    {u.clientsLabels.length > 0 ? u.clientsLabels.join(', ') : 'Aucun'}
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
                      <button type="button" className="btn-secondary" onClick={() => openEditModal(u)}>
                        Modifier
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => requestResetPassword(u.user_id)}
                        disabled={resetLoading}
                        title="Envoie un courriel Supabase de réinitialisation"
                      >
                        {resetLoading ? 'Envoi…' : 'Réinitialiser MDP'}
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
          <div className="w-full max-w-lg mx-4 max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <header className="space-y-1">
              <h2 className="text-lg font-semibold text-ct-grayDark">Ajouter un utilisateur</h2>
              <p className="text-sm text-ct-gray">
                Un courriel d&apos;invitation sera envoyé à cette adresse. Le profil sera créé avec le rôle sélectionné.
              </p>
            </header>

            {createErrorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <div className="font-semibold">Erreur</div>
                <div className="mt-1">{createErrorMsg}</div>
              </div>
            )}

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
