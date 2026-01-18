import { z } from 'zod'

/**
 * Schéma de validation pour le prix
 */
const prixSchema = z
  .number({
    invalid_type_error: 'Le prix doit être un nombre',
  })
  .nonnegative('Le prix ne peut pas être négatif')
  .max(1000000, 'Le prix est trop élevé (max 1,000,000)')
  .nullable()
  .optional()

/**
 * Schéma de validation pour la création d'un matériau
 */
export const createMateriauSchema = z.object({
  nom: z
    .string({ required_error: 'Le nom du matériau est obligatoire' })
    .min(1, 'Le nom du matériau est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),

  categorie: z
    .string()
    .max(100, 'La catégorie est trop longue (max 100 caractères)')
    .nullable()
    .optional(),

  unite: z
    .string()
    .max(50, 'L\'unité est trop longue (max 50 caractères)')
    .nullable()
    .optional(),

  prixUnitaire: prixSchema,

  description: z
    .string()
    .max(1000, 'La description est trop longue (max 1000 caractères)')
    .nullable()
    .optional(),
})

/**
 * Schéma de validation pour la mise à jour d'un matériau
 */
export const updateMateriauSchema = createMateriauSchema.extend({
  id: z
    .string({ required_error: 'ID matériau requis' })
    .uuid('ID matériau invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateMateriauInput = z.infer<typeof createMateriauSchema>
export type UpdateMateriauInput = z.infer<typeof updateMateriauSchema>
