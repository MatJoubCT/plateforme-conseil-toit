'use client'

import { useEffect } from 'react'
import type { ClientRow } from './EditUserModal'

type CreateUserModalProps = {
  open: boolean
  saving: boolean

  email: string
  setEmail: (v: string) => void

  fullName: string
  setFullName: (v: string) => void

  role: string
  setRole: (v: string) => void

  clientId: string
  setClientId: (v: string) => void

  clients: ClientRow[]

  errorMsg?: string | null

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
  clientId,
  setClientId,
  clients,
  errorMsg,
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        // fermer si clic sur l'overlay (pas sur le contenu)
        if (e.currentTarget === e.target && !saving) onClose()
      }}
    >
      <div className="w-full max-w-xl mx-4 max-h-[95vh] overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-ct-grayLight px-6 py-5">
          <h2 className="text-lg font-semibold text-ct-grayDark">Ajouter un utilisateur</h2>
          <p className="mt-1 text-sm text-ct-gray">
            Un courriel d&apos;invitation sera envoyé à cette adresse. Le profil sera créé avec le rôle sélectionné.
          </p>
          {debugLabel && <p className="mt-2 text-[11px] font-mono text-rose-600">{debugLabel}</p>}
        </div>

        <form
          className="px-6 py-5 space-y-4 overflow-y-auto"
          onSubmit={(e) => {
            e.preventDefault()
            if (saving) return
            onCreate()
          }}
        >
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <div className="font-semibold">Erreur</div>
              <div className="mt-1">{errorMsg}</div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-ct-grayDark">
              Courriel (identifiant de connexion)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              placeholder="ex: client@domaine.com"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-ct-grayDark">Nom complet (optionnel)</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              placeholder="ex: Jean Tremblay"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">Rôle</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-ct-grayLight px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ct-primary/60"
              >
                <option value="client">client</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-ct-grayDark">Client associé (optionnel)</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
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

          <div className="pt-2" />
        </form>

        <div className="border-t border-ct-grayLight px-6 py-4">
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="button" className="btn-primary" onClick={onCreate} disabled={saving}>
              {saving ? 'Création…' : 'Créer et inviter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
