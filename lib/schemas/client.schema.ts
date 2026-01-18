import { z } from 'zod'

/**
 * Schéma de validation pour la création d'un client
 */
export const createClientSchema = z.object({
  name: z
    .string({ required_error: 'Le nom du client est obligatoire' })
    .min(1, 'Le nom du client est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),
})

/**
 * Schéma de validation pour la mise à jour d'un client
 */
export const updateClientSchema = createClientSchema.extend({
  id: z
    .string({ required_error: 'ID client requis' })
    .uuid('ID client invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
