'use client'

import { useEffect } from 'react'

type CreateUserModalProps = {
  open: boolean
  saving: boolean

  email: string
  setEmail: (v: string) => void

  fullName: string
  setFullName: (v: string) => void

  role: string
  setRole: (v: string) => void

  onClose: () => void
  onCreate: () => void

  debugLabel?: string
}

export default function CreateUserModal({
  open,
  saving,
  email,
  setEmail,
  fullName,
  setFullName,
  role,
  setRole,
  onClose,
  onCreate,
  debugLabel,
}: CreateUserModalProps) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg mx-4 max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-ct-grayDark">
            Ajouter un utilisateur
          </h2>

          {debugLabel && (
            <p className="text-[11px] font-mono text-rose-600">{debugLabel}</p>
          )}

          <p className="text-sm text-ct-gray">
            Un courriel d&apos;invitation sera envoyé à cette adresse. Le profil sera créé avec le rôle sélectionné.
          </p>
        </header>

        <form
          className="space-y-3 text-sm"
          onSubmit={(e) => {
            e.preventDefault()
            if (saving) return
            onCreate()
          }}
        >
          <div className="space-y-1">
            <label className="block text-xs font-medium text-ct-grayDark">
              Courriel (identifiant de connexion)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-ct-grayDark">
              Nom complet (optionnel)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-ct-grayDark">
              Rôle
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
            >
              <option value="client">client</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Création…' : 'Créer et inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
