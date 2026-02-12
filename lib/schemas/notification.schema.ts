import { z } from 'zod'

export const NOTIFICATION_TYPES = [
  'intervention_added',
  'rapport_added',
  'garantie_added',
  'garantie_updated',
  'garantie_expiring',
  'client_login',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const createNotificationSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
  type: z.enum(NOTIFICATION_TYPES, { message: 'Type de notification invalide' }),
  title: z.string().min(1, 'Le titre est requis').max(200),
  message: z.string().min(1, 'Le message est requis').max(500),
  link: z.string().max(500).nullable().optional(),
})

export const markReadSchema = z.object({
  id: z.string().uuid('ID notification invalide'),
})

export const deleteNotificationSchema = z.object({
  id: z.string().uuid('ID notification invalide'),
})

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
