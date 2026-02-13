'use client'

import { useEffect, useRef, useState } from 'react'
import { Pencil, Check, X, KeyRound, ChevronDown, ChevronUp, LogOut } from 'lucide-react'
import { useApiMutation } from '@/lib/hooks/useApiMutation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'
import { validatePassword } from '@/lib/validation'

interface UserProfilePanelProps {
  userFullName: string
  onNameUpdated: (newName: string) => void
  onLogout: () => void
  avatarSize?: 'sm' | 'md'
}

function getInitials(name: string) {
  if (!name) return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export default function UserProfilePanel({
  userFullName,
  onNameUpdated,
  onLogout,
  avatarSize = 'md',
}: UserProfilePanelProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // --- Édition du nom ---
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(userFullName)

  // --- Mot de passe ---
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // --- Email (lecture seule) ---
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Garder nameValue en sync si le parent met à jour userFullName
  useEffect(() => {
    if (!editingName) setNameValue(userFullName)
  }, [userFullName, editingName])

  // Récupérer l'email une seule fois
  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null)
    })
  }, [])

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  // Mutation pour la mise à jour du nom
  const {
    mutate: updateNameApi,
    isLoading: savingName,
    error: nameApiError,
    resetError: resetNameError,
  } = useApiMutation({
    method: 'POST',
    endpoint: '/api/auth/profile/update',
    defaultErrorMessage: 'Erreur lors de la mise à jour du nom',
    onSuccess: (data) => {
      const newName = data.data?.full_name ?? nameValue
      setNameValue(newName)
      setEditingName(false)
      onNameUpdated(newName)
    },
  })

  const handleSaveName = () => {
    const trimmed = nameValue.trim()
    if (trimmed.length < 2) return
    resetNameError()
    void updateNameApi({ full_name: trimmed })
  }

  const handleCancelEdit = () => {
    setEditingName(false)
    setNameValue(userFullName)
    resetNameError()
  }

  // Changement de mot de passe côté client
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.success) {
      setPasswordError(validation.errors.join(' '))
      return
    }

    setSavingPassword(true)

    const { error } = await supabaseBrowser.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordError(error.message)
      setSavingPassword(false)
      return
    }

    setPasswordSuccess(true)
    setNewPassword('')
    setConfirmPassword('')
    setSavingPassword(false)

    setTimeout(() => setPasswordSuccess(false), 3000)
  }

  return (
    <div className="relative">
      {/* Bouton avatar */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex items-center justify-center rounded-full bg-gradient-to-br from-ct-primary to-[#2d6ba8] font-bold text-white cursor-pointer transition-all hover:ring-2 hover:ring-ct-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ct-primary ${
          avatarSize === 'sm'
            ? 'h-8 w-8 text-[10px] shadow-md'
            : 'h-10 w-10 text-sm shadow-lg ring-2 ring-slate-200'
        }`}
        aria-label="Menu profil"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {getInitials(userFullName)}
      </button>

      {/* Panneau profil */}
      {open && (
        <div
          ref={panelRef}
          className="profile-panel absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl sm:w-96"
        >
          {/* En-tête : avatar + nom + email */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ct-primary to-[#2d6ba8] text-sm font-bold text-white shadow-lg">
                {getInitials(nameValue)}
              </div>

              <div className="min-w-0 flex-1">
                {editingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-800 focus:border-ct-primary focus:outline-none focus:ring-1 focus:ring-ct-primary"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleSaveName()
                        }
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      disabled={savingName}
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={savingName || nameValue.trim().length < 2}
                      className="rounded-md p-1 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                      title="Enregistrer"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      title="Annuler"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {nameValue || 'Utilisateur'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(true)
                        resetNameError()
                      }}
                      className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      title="Modifier le nom"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {userEmail && (
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{userEmail}</span>
                )}
              </div>
            </div>

            {nameApiError && (
              <p className="mt-2 text-xs text-red-600">{nameApiError}</p>
            )}
          </div>

          {/* Section mot de passe */}
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((prev) => !prev)
                setPasswordError(null)
                setPasswordSuccess(false)
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <KeyRound className="h-4 w-4 text-slate-400" />
              <span className="flex-1 text-left">Changer le mot de passe</span>
              {showPasswordForm ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {showPasswordForm && (
              <form onSubmit={handlePasswordChange} className="mt-3 space-y-3 px-2 pb-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-ct-primary focus:outline-none focus:ring-1 focus:ring-ct-primary"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-ct-primary focus:outline-none focus:ring-1 focus:ring-ct-primary"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <p className="text-[11px] leading-relaxed text-slate-400">
                  Min. 12 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial
                </p>

                {passwordError && (
                  <p className="animate-shake text-xs text-red-600">{passwordError}</p>
                )}
                {passwordSuccess && (
                  <p className="text-xs text-emerald-600">Mot de passe modifié avec succès !</p>
                )}

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full rounded-lg bg-ct-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#183f61] disabled:opacity-60"
                >
                  {savingPassword ? 'Enregistrement…' : 'Mettre à jour'}
                </button>
              </form>
            )}
          </div>

          {/* Séparateur + déconnexion */}
          <div className="border-t border-slate-100 px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onLogout()
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
