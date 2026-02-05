import { z } from 'zod'

/**
 * Schéma de validation pour la création d'un client
 */
export const createClientSchema = z.object({
  name: z
    .string().min(1, 'Le nom du client est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),
  type: z
    .string()
    .max(100, 'Le type est trop long (max 100 caractères)')
    .nullable()
    .optional(),
  address: z
    .string()
    .max(255, 'L\'adresse est trop longue (max 255 caractères)')
    .nullable()
    .optional(),
  city: z
    .string()
    .max(100, 'La ville est trop longue (max 100 caractères)')
    .nullable()
    .optional(),
  postal_code: z
    .string()
    .max(20, 'Le code postal est trop long (max 20 caractères)')
    .nullable()
    .optional(),
  contact_name: z
    .string()
    .max(200, 'Le nom du contact est trop long (max 200 caractères)')
    .nullable()
    .optional(),
  contact_email: z
    .string()
    .email('Format d\'email invalide')
    .max(255, 'L\'email est trop long (max 255 caractères)')
    .nullable()
    .optional()
    .or(z.literal('')),
  contact_phone: z
    .string()
    .max(50, 'Le téléphone est trop long (max 50 caractères)')
    .nullable()
    .optional(),
  notes: z
    .string()
    .nullable()
    .optional(),
})

/**
 * Schéma de validation pour la mise à jour d'un client
 */
export const updateClientSchema = createClientSchema.extend({
  id: z
    .string().min(1, 'ID client requis')
    .uuid('ID client invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
