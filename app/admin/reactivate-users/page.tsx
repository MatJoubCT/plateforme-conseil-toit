'use client'

import { useEffect, useState } from 'react'
import { UserCheck, UserX, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { logger } from '@/lib/logger'

interface UserProfile {
  user_id: string
  full_name: string
  role: string
  is_active: boolean
  email?: string
}

export default function ReactivateUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      // Utiliser l'endpoint API pour récupérer les utilisateurs avec leurs emails
      const response = await fetch('/api/admin/users/list')

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des utilisateurs')
      }

      const data = await response.json()
      setUsers(data.users || [])
      logger.log('✅ Utilisateurs récupérés:', data.users)
    } catch (err: any) {
      logger.error('❌ Erreur lors de la récupération des utilisateurs:', err)
      setError(err.message || 'Erreur lors de la récupération des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const reactivateUser = async (userId: string) => {
    setReactivating(userId)
    setError(null)
    setSuccessMsg(null)

    try {
      const response = await fetch('/api/admin/users/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réactivation')
      }

      setSuccessMsg('Utilisateur réactivé avec succès!')
      logger.log('✅ Utilisateur réactivé:', userId)

      // Rafraîchir la liste
      await fetchUsers()
    } catch (err: any) {
      logger.error('❌ Erreur lors de la réactivation:', err)
      setError(err.message || 'Erreur lors de la réactivation')
    } finally {
      setReactivating(null)
    }
  }

  const reactivateAll = async () => {
    setError(null)
    setSuccessMsg(null)

    const inactiveUsers = users.filter(u => !u.is_active)
    if (inactiveUsers.length === 0) {
      setSuccessMsg('Tous les utilisateurs sont déjà actifs!')
      return
    }

    try {
      const response = await fetch('/api/admin/users/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réactivation en masse')
      }

      setSuccessMsg(`${data.count} utilisateur(s) réactivé(s) avec succès!`)
      logger.log(`✅ ${data.count} utilisateurs réactivés`)

      // Rafraîchir la liste
      await fetchUsers()
    } catch (err: any) {
      logger.error('❌ Erreur lors de la réactivation en masse:', err)
      setError(err.message || 'Erreur lors de la réactivation en masse')
    }
  }

  const inactiveCount = users.filter(u => !u.is_active).length

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-slate-600">Chargement...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-slate-800">
            Gestion des Utilisateurs
          </h1>
          <p className="text-slate-600">
            Vérifiez et réactivez les utilisateurs désactivés
          </p>
        </div>

        {/* Statistiques */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                <p className="text-sm text-slate-600">Total Utilisateurs</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">
                  {users.filter(u => u.is_active).length}
                </p>
                <p className="text-sm text-slate-600">Actifs</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{inactiveCount}</p>
                <p className="text-sm text-slate-600">Inactifs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100/50 p-4 shadow-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-900">Erreur</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-green-100/50 p-4 shadow-md">
            <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div>
              <p className="font-bold text-green-900">Succès</p>
              <p className="text-sm text-green-800">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Bouton de réactivation en masse */}
        {inactiveCount > 0 && (
          <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-orange-900">
                  {inactiveCount} utilisateur(s) inactif(s) détecté(s)
                </p>
                <p className="text-sm text-orange-700">
                  Réactivez-les tous en un clic
                </p>
              </div>
              <button
                onClick={reactivateAll}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
              >
                <UserCheck className="h-4 w-4" />
                Réactiver Tous
              </button>
            </div>
          </div>
        )}

        {/* Liste des utilisateurs */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.user_id} className="transition-colors hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">
                    {user.full_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.is_active ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Actif
                        </>
                      ) : (
                        <>
                          <UserX className="h-3 w-3" />
                          Inactif
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {!user.is_active && (
                      <button
                        onClick={() => reactivateUser(user.user_id)}
                        disabled={reactivating === user.user_id}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {reactivating === user.user_id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Réactivation...
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3 w-3" />
                            Réactiver
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bouton de retour */}
        <div className="mt-6">
          <a
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
          >
            ← Retour au tableau de bord
          </a>
        </div>
      </div>
    </div>
  )
}
