'use client'

import { useEffect, useMemo, useState, ChangeEvent } from 'react'
import { createBrowserClient, supabaseBrowser } from '@/lib/supabaseBrowser'
import { useUsersData } from '@/lib/hooks/useUsersData'
import type { UserProfileRow, ClientRow, BatimentRow, EditableUser } from '@/lib/hooks/useUsersData'
import EditUserModal from '@/components/admin/users/EditUserModal'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Users, UserPlus, Shield, KeyRound, Ban, CheckCircle2, X, Search, SlidersHorizontal } from 'lucide-react'

type ToastState = { type: 'success' | 'error'; message: string } | null

export default function AdminUtilisateursPage() {
  // Use the custom hook for data loading
  const { users, clients, batiments, loading, error: dataError, loadUsersData } = useUsersData()

  // messages (utilisés par le modal Modifier)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Recherche
  const [search, setSearch] = useState('')

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

  // Confirmation pour toggle actif/inactif
  const [confirmToggle, setConfirmToggle] = useState<{
    profileId: string
    userId: string
    currentState: boolean | null
    userName: string
  } | null>(null)

  // Load users data on mount
  useEffect(() => {
    loadUsersData()
  }, [loadUsersData])

  // Handle data loading errors
  useEffect(() => {
    if (dataError) {
      setErrorMsg(dataError)
    }
  }, [dataError])

  const clientsById = useMemo(() => {
    const m = new Map<string, ClientRow>()
    clients.forEach((c) => m.set(c.id, c))
    return m
  }, [clients])

  const toggleClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId) ? prev.filter((cid) => cid !== clientId) : [...prev, clientId],
    )
  }

  const toggleBatiment = (batimentId: string) => {
    setSelectedBatimentIds((prev) =>
      prev.includes(batimentId) ? prev.filter((bid) => bid !== batimentId) : [...prev, batimentId],
    )
  }

  const openEditModal = (user: UserProfileRow) => {
    setEditingUser(user)
    setEditFullName(user.full_name || '')
    setEditRole(user.role || 'client')
    setErrorMsg(null)
    setSuccessMsg(null)

    const ucs = users.find((u) => u.user_id === user.user_id)?.clientsLabels || []
    const ubas = users.find((u) => u.user_id === user.user_id)?.batimentsLabels || []

    const linkedClientIds = clients.filter((c) => ucs.includes(c.name || '')).map((c) => c.id)

    const linkedBatIds = batiments
      .filter((b) => {
        const label1 = b.name && b.city ? `${b.name} — ${b.city}` : null
        const label2 = b.name ? b.name : null
        return label1 ? ubas.includes(label1) : label2 ? ubas.includes(label2) : false
      })
      .map((b) => b.id)

    setSelectedClientIds(linkedClientIds)
    setSelectedBatimentIds(linkedBatIds)
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setEditingUser(null)
  }

  const handleSave = async () => {
    if (!editingUser) return
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const { error: updateError } = await supabaseBrowser
        .from('user_profiles')
        .update({
          full_name: editFullName.trim() || null,
          role: editRole,
        })
        .eq('id', editingUser.id)

      if (updateError) {
        console.error('Erreur update profile:', updateError)
        setErrorMsg(updateError.message)
        setSaving(false)
        return
      }

      const { error: deleteClientsError } = await supabaseBrowser
        .from('user_clients')
        .delete()
        .eq('user_id', editingUser.user_id)

      if (deleteClientsError) {
        console.error('Erreur delete user_clients:', deleteClientsError)
        setErrorMsg(deleteClientsError.message)
        setSaving(false)
        return
      }

      if (selectedClientIds.length > 0) {
        const inserts = selectedClientIds.map((cid) => ({
          user_id: editingUser.user_id,
          client_id: cid,
        }))
        const { error: insertClientsError } = await supabaseBrowser.from('user_clients').insert(inserts)

        if (insertClientsError) {
          console.error('Erreur insert user_clients:', insertClientsError)
          setErrorMsg(insertClientsError.message)
          setSaving(false)
          return
        }
      }

      const { error: deleteBatError } = await supabaseBrowser
        .from('user_batiments_access')
        .delete()
        .eq('user_id', editingUser.user_id)

      if (deleteBatError) {
        console.error('Erreur delete user_batiments_access:', deleteBatError)
        setErrorMsg(deleteBatError.message)
        setSaving(false)
        return
      }

      if (selectedBatimentIds.length > 0) {
        const insertsBat = selectedBatimentIds.map((bid) => ({
          user_id: editingUser.user_id,
          batiment_id: bid,
        }))
        const { error: insertBatError } = await supabaseBrowser.from('user_batiments_access').insert(insertsBat)

        if (insertBatError) {
          console.error('Erreur insert user_batiments_access:', insertBatError)
          setErrorMsg(insertBatError.message)
          setSaving(false)
          return
        }
      }

      setSuccessMsg('Modifications enregistrées.')
      setSaving(false)

      await loadUsersData()

      window.setTimeout(() => {
        setShowModal(false)
        setEditingUser(null)
      }, 1500)
    } catch (err: any) {
      console.error('Erreur inattendue save:', err)
      setErrorMsg(err.message || 'Erreur inattendue.')
      setSaving(false)
    }
  }

  const executeToggleUserActive = async () => {
    if (!confirmToggle) return

    const { profileId, currentState } = confirmToggle

    const supabase = createBrowserClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !currentState })
      .eq('id', profileId)

    if (error) {
      pushToast('error', `Erreur: ${error.message}`)
      setConfirmToggle(null)
      return
    }

    pushToast('success', currentState ? 'Utilisateur suspendu.' : 'Utilisateur réactivé.')
    setConfirmToggle(null)

    await loadUsersData()
  }

  const requestResetPassword = (userId: string) => {
    setConfirmResetUserId(userId)
    setConfirmResetOpen(true)
  }

  const handleConfirmResetPassword = async () => {
    const userId = confirmResetUserId
    if (!userId) return

    setResetLoadingByUserId((prev) => ({ ...prev, [userId]: true }))
    setConfirmResetOpen(false)
    setConfirmResetUserId(null)

    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        pushToast('error', data.error || 'Erreur inconnue.')
        setResetLoadingByUserId((prev) => ({ ...prev, [userId]: false }))
        return
      }

      pushToast('success', 'Courriel de réinitialisation envoyé!')
    } catch (err: any) {
      pushToast('error', err.message || 'Erreur réseau.')
    } finally {
      setResetLoadingByUserId((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const openCreateModal = () => {
    setCreateEmail('')
    setCreateFullName('')
    setCreateRole('client')
    setCreateClientId('')
    setCreateErrorMsg(null)
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    if (createSaving) return
    setShowCreateModal(false)
  }

  const handleCreateUser = async () => {
    if (!createEmail.trim()) {
      setCreateErrorMsg('Le courriel est obligatoire.')
      return
    }

    setCreateSaving(true)
    setCreateErrorMsg(null)

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail.trim(),
          fullName: createFullName.trim() || null,
          role: createRole,
          clientId: createClientId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCreateErrorMsg(data.error || 'Erreur lors de la création.')
        setCreateSaving(false)
        return
      }

      pushToast('success', 'Utilisateur créé. Invitation envoyée par courriel.')
      setCreateSaving(false)
      setShowCreateModal(false)

      await loadUsersData()
    } catch (err: any) {
      console.error('Erreur inattendue création:', err)
      setCreateErrorMsg(err.message || 'Erreur inattendue.')
      setCreateSaving(false)
    }
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  // Filtre des utilisateurs par nom
  const filteredUsers = users.filter((u) =>
    (u.full_name ?? '').toLowerCase().includes(search.trim().toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-ct-primary to-[#2d6ba8] shadow-lg animate-pulse" />
          </div>
          <p className="text-sm font-medium text-slate-600">Chargement des utilisateurs…</p>
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-6">
       {/* HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-ct-primary via-ct-primary-medium to-ct-primary-dark p-6 shadow-xl">
        {/* Décoration background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10">
          {/* Titre + actions */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
                  <p className="mt-0.5 text-sm text-white/70">
                    Gérez les comptes et permissions de vos utilisateurs
                  </p>
                </div>
              </div>

              {/* Stats rapides */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Users className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {users.length} utilisateur{users.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <CheckCircle2 className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {users.filter((u) => u.is_active === true).length} actif{users.filter((u) => u.is_active === true).length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                  <Ban className="h-4 w-4 text-white/70" />
                  <span className="text-sm text-white/90">
                    {users.filter((u) => u.is_active === false).length} suspendu{users.filter((u) => u.is_active === false).length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Bouton d'action */}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ct-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              <UserPlus className="h-4 w-4" />
              Ajouter un utilisateur
            </button>
          </div>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
              <SlidersHorizontal className="h-5 w-5 text-ct-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Recherche</h2>
              <p className="text-xs text-slate-500">Filtrez la liste des utilisateurs</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Rechercher un utilisateur</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Nom complet de l'utilisateur..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-10 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                style={{ paddingLeft: '3rem' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LISTE DES UTILISATEURS */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ct-primary/10">
              <Users className="h-5 w-5 text-ct-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Liste des utilisateurs</h2>
              <p className="text-xs text-slate-500">
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé
                {filteredUsers.length > 1 ? 's' : ''}.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Rôle
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Clients
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Bâtiments
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
                        <Users className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Aucun utilisateur trouvé</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {search ? 'Modifiez votre recherche pour voir plus de résultats.' : 'Aucun utilisateur enregistré.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.is_active ?? true
                  const resetLoading = resetLoadingByUserId[u.user_id] ?? false

                  return (
                    <tr key={u.id} className="group transition-colors hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ct-primary to-[#2d6ba8] text-sm font-semibold text-white shadow-sm">
                            {(u.full_name ?? 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800">
                              {u.full_name || '(Sans nom)'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        <span
                          className={
                            u.role === 'admin'
                              ? 'inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700'
                              : 'inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700'
                          }
                        >
                          <Shield
                            className={u.role === 'admin' ? 'h-3.5 w-3.5 text-purple-600' : 'h-3.5 w-3.5 text-blue-600'}
                          />
                          {u.role === 'admin' ? 'Admin' : 'Client'}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        {u.clientsLabels.length === 0 ? (
                          <span className="text-sm text-slate-400">Aucun</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {u.clientsLabels.slice(0, 2).map((c, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {c}
                              </span>
                            ))}
                            {u.clientsLabels.length > 2 && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                                +{u.clientsLabels.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        {u.batimentsLabels.length === 0 ? (
                          <span className="text-sm text-slate-400">Aucun</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {u.batimentsLabels.slice(0, 1).map((b, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                              >
                                {b}
                              </span>
                            ))}
                            {u.batimentsLabels.length > 1 && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                                +{u.batimentsLabels.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        <span
                          className={
                            isActive
                              ? 'inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
                              : 'inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700'
                          }
                        >
                          {isActive ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Ban className="h-3.5 w-3.5 text-rose-600" />
                          )}
                          {isActive ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            onClick={() => openEditModal(u)}
                          >
                            <Shield className="h-4 w-4 text-slate-500" />
                            Modifier
                          </button>

                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                            onClick={() => requestResetPassword(u.user_id)}
                            disabled={resetLoading}
                            title="Envoie un courriel Supabase de réinitialisation"
                          >
                            <KeyRound className="h-4 w-4 text-slate-500" />
                            {resetLoading ? 'Envoi…' : 'Réinitialiser MDP'}
                          </button>

                          <button
                            type="button"
                            className={
                              isActive
                                ? 'inline-flex items-center gap-2 rounded-xl border border-red-300/60 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-500/15'
                                : 'inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50'
                            }
                            onClick={() => setConfirmToggle({
                              profileId: u.id,
                              userId: u.user_id,
                              currentState: u.is_active,
                              userName: u.full_name || u.user_id
                            })}
                          >
                            {isActive ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            {isActive ? 'Suspendre' : 'Réactiver'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AJOUTER UTILISATEUR (inline) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Ajouter un utilisateur</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Un courriel d&apos;invitation sera envoyé à cette adresse. Le profil sera créé avec le rôle
                  sélectionné.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={createSaving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {createErrorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <div className="font-semibold">Erreur</div>
                  <div className="mt-1">{createErrorMsg}</div>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Courriel (identifiant de connexion) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Nom complet (optionnel)</label>
                  <input
                    type="text"
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Rôle</label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
                  >
                    <option value="client">client</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700">Client associé (optionnel)</label>
                  <select
                    value={createClientId}
                    onChange={(e) => setCreateClientId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm transition-colors focus:border-ct-primary focus:outline-none focus:ring-2 focus:ring-ct-primary/20"
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

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createSaving}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={createSaving}
                  className="rounded-xl bg-gradient-to-r from-ct-primary to-[#2d6ba8] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
                >
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

      {/* Dialog: Confirmation reset password */}
      <Dialog open={confirmResetOpen} onOpenChange={(open) => !open && setConfirmResetOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Un courriel de réinitialisation sera envoyé à{' '}
              <strong>{confirmResetUser?.full_name || 'cet utilisateur'}</strong>. Continuer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              onClick={() => setConfirmResetOpen(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-ct-primary to-[#2d6ba8] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
              onClick={handleConfirmResetPassword}
            >
              Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation toggle actif/inactif */}
      <ConfirmDialog
        open={!!confirmToggle}
        onOpenChange={() => setConfirmToggle(null)}
        onConfirm={executeToggleUserActive}
        title={
          confirmToggle?.currentState
            ? 'Suspendre cet utilisateur ?'
            : 'Réactiver cet utilisateur ?'
        }
        description={
          confirmToggle?.currentState
            ? `${confirmToggle?.userName} ne pourra plus se connecter jusqu'à ce que vous le réactiviez.`
            : `${confirmToggle?.userName} pourra à nouveau se connecter à la plateforme.`
        }
        confirmText={confirmToggle?.currentState ? 'Suspendre' : 'Réactiver'}
        confirmVariant={confirmToggle?.currentState ? 'danger' : 'primary'}
      />

      {/* Toast notifications */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-5 py-4 shadow-2xl backdrop-blur-sm transition-all ${
            toast.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Ban className="h-5 w-5 text-rose-600" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}
    </section>
  )
}
