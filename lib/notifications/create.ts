import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { NotificationType } from '@/lib/schemas/notification.schema'
import { logger } from '@/lib/logger'

interface CreateNotificationsParams {
  userIds: string[]
  type: NotificationType
  title: string
  message: string
  link?: string | null
}

/**
 * Crée une notification pour chaque userId fourni.
 * Utilisé côté serveur (API routes) après une opération réussie.
 * Les erreurs sont loguées mais ne bloquent jamais l'opération principale.
 */
export async function createNotifications(params: CreateNotificationsParams): Promise<void> {
  const { userIds, type, title, message, link } = params

  if (userIds.length === 0) return

  const rows = userIds.map((userId) => ({
    user_id: userId,
    type,
    title,
    message,
    link: link ?? null,
    is_read: false,
  }))

  const { error } = await supabaseAdmin.from('notifications').insert(rows)

  if (error) {
    // Console.error pour toujours voir les erreurs (le logger dev-only n'affiche rien en production)
    console.error('[NOTIFICATIONS] Erreur insertion:', error.message, { type, count: userIds.length })
  }
}

/**
 * Résout les user_id des utilisateurs clients ayant accès à un client_id donné.
 * Vérifie les deux sources d'accès : user_profiles.client_id ET user_clients.
 */
export async function getClientUserIds(clientId: string): Promise<string[]> {
  // 1. Utilisateurs avec accès via user_clients (many-to-many)
  const { data: ucData, error: ucError } = await supabaseAdmin
    .from('user_clients')
    .select('user_id')
    .eq('client_id', clientId)

  if (ucError) {
    logger.error('Erreur résolution users client (user_clients)', { error: ucError.message, clientId })
  }

  // 2. Utilisateurs avec client_id primaire dans user_profiles
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('client_id', clientId)
    .eq('role', 'client')
    .eq('is_active', true)

  if (profileError) {
    logger.error('Erreur résolution users client (user_profiles)', { error: profileError.message, clientId })
  }

  const userIds = new Set<string>()
  for (const row of ucData || []) {
    if (row.user_id) userIds.add(row.user_id)
  }
  for (const row of profileData || []) {
    if (row.user_id) userIds.add(row.user_id)
  }

  return [...userIds]
}

/**
 * Résout les user_id de tous les administrateurs actifs.
 */
export async function getAdminUserIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'admin')
    .eq('is_active', true)

  if (error || !data) {
    logger.error('Erreur résolution admins', { error: error?.message })
    return []
  }

  return data.map((row) => row.user_id).filter(Boolean) as string[]
}

/**
 * Résout le client_id à partir d'un bassin_id en remontant via batiment.
 */
export async function getClientIdFromBassin(bassinId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('bassins')
    .select('batiment_id')
    .eq('id', bassinId)
    .single()

  if (error || !data?.batiment_id) return null

  const { data: batiment, error: batError } = await supabaseAdmin
    .from('batiments')
    .select('client_id')
    .eq('id', data.batiment_id)
    .single()

  if (batError || !batiment?.client_id) return null

  return batiment.client_id
}

/**
 * Récupère le nom du bassin et du bâtiment pour les messages de notification.
 */
export async function getBassinContext(bassinId: string): Promise<{
  bassinName: string
  batimentName: string
}> {
  const { data } = await supabaseAdmin
    .from('bassins')
    .select('name, batiments(name)')
    .eq('id', bassinId)
    .single()

  const bassinName = (data?.name as string) || 'Sans nom'
  const batimentRaw = data?.batiments as unknown as { name: string | null } | null
  const batimentName = batimentRaw?.name || 'Bâtiment inconnu'

  return { bassinName, batimentName }
}

/**
 * Helper complet : crée des notifications pour les clients ET les admins
 * à partir d'un bassin_id.
 */
export async function notifyForBassin(
  bassinId: string,
  params: { type: NotificationType; title: string; message: string; link?: string },
  options: { notifyClients?: boolean; notifyAdmins?: boolean } = {}
): Promise<void> {
  const { notifyClients = true, notifyAdmins = true } = options

  const allUserIds: string[] = []

  if (notifyClients) {
    const clientId = await getClientIdFromBassin(bassinId)
    if (clientId) {
      const clientUsers = await getClientUserIds(clientId)
      allUserIds.push(...clientUsers)
    }
  }

  if (notifyAdmins) {
    const adminUsers = await getAdminUserIds()
    allUserIds.push(...adminUsers)
  }

  // Dédupliquer
  const uniqueUserIds = [...new Set(allUserIds)]

  if (uniqueUserIds.length > 0) {
    await createNotifications({
      userIds: uniqueUserIds,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    })
  }
}
