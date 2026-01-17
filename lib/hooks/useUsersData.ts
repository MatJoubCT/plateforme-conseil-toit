import { useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabaseBrowser'

export type UserProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  role: string | null
  client_id: string | null
  is_active: boolean | null
}

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

export type UserClientRow = {
  user_id: string
  client_id: string
}

export type UserBatimentAccessRow = {
  user_id: string
  batiment_id: string
}

export type EditableUser = UserProfileRow & {
  clientsLabels: string[]
  batimentsLabels: string[]
}

/**
 * Hook personnalisé pour charger toutes les données utilisateurs
 * avec leurs relations (clients, bâtiments).
 *
 * Remplace la fonction dupliquée 4 fois dans la page utilisateurs.
 */
export function useUsersData() {
  const [users, setUsers] = useState<EditableUser[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [batiments, setBatiments] = useState<BatimentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Charge toutes les données utilisateurs avec leurs relations
   */
  const loadUsersData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const supabase = createBrowserClient()

    try {
      // 1. Charger les profils utilisateurs
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, full_name, role, client_id, is_active')
        .order('full_name', { ascending: true })

      if (profilesError) throw profilesError

      const profiles = (profilesData || []) as UserProfileRow[]

      // 2. Charger les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

      if (clientsError) throw clientsError

      const allClients = (clientsData || []) as ClientRow[]

      // 3. Charger les bâtiments
      const { data: batData, error: batError } = await supabase
        .from('batiments')
        .select('id, client_id, name, address, city, postal_code')
        .order('name', { ascending: true })

      if (batError) throw batError

      const allBatiments = (batData || []) as BatimentRow[]

      // 4. Charger les relations user_clients
      const { data: ucData, error: ucError } = await supabase
        .from('user_clients')
        .select('user_id, client_id')

      if (ucError) throw ucError

      const userClients = (ucData || []) as UserClientRow[]

      // 5. Charger les relations user_batiments_access
      const { data: ubaData, error: ubaError } = await supabase
        .from('user_batiments_access')
        .select('user_id, batiment_id')

      if (ubaError) throw ubaError

      const userBatiments = (ubaData || []) as UserBatimentAccessRow[]

      // 6. Créer les maps pour lookup rapide
      const clientsByIdMap = new Map<string, ClientRow>()
      allClients.forEach((c) => clientsByIdMap.set(c.id, c))

      const batById = new Map<string, BatimentRow>()
      allBatiments.forEach((b) => batById.set(b.id, b))

      // 7. Enrichir les profils avec les labels
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

      // 8. Mettre à jour les états
      setUsers(editable)
      setClients(allClients)
      setBatiments(allBatiments)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données')
      setLoading(false)
    }
  }, [])

  return {
    users,
    clients,
    batiments,
    loading,
    error,
    loadUsersData,
    setUsers,
    setClients,
    setBatiments,
  }
}
