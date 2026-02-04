import { z } from 'zod'

/**
 * Schéma de validation pour la création d'un matériau
 *
 * Structure de la table materiaux:
 * - nom: string (requis)
 * - description: string | null
 * - categorie_id: UUID | null (FK → listes_choix)
 * - unite_id: UUID | null (FK → listes_choix)
 * - prix_cad: number (requis, défaut 0)
 * - manufacturier_entreprise_id: UUID | null (FK → entreprises)
 * - actif: boolean (défaut true)
 */
export const createMateriauSchema = z.object({
  nom: z
    .string()
    .min(1, 'Le nom du matériau est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),

  description: z
    .string()
    .max(1000, 'La description est trop longue (max 1000 caractères)')
    .nullable()
    .optional()
    .or(z.literal('')),

  categorie_id: z
    .string()
    .uuid('ID de catégorie invalide')
    .nullable()
    .optional()
    .or(z.literal('')),

  unite_id: z
    .string()
    .uuid('ID d\'unité invalide')
    .nullable()
    .optional()
    .or(z.literal('')),

  prix_cad: z
    .number()
    .nonnegative('Le prix ne peut pas être négatif')
    .max(1000000, 'Le prix est trop élevé (max 1,000,000)'),

  manufacturier_entreprise_id: z
    .string()
    .uuid('ID d\'entreprise invalide')
    .nullable()
    .optional()
    .or(z.literal('')),

  actif: z
    .boolean()
    .default(true),
})

/**
 * Schéma de validation pour la mise à jour d'un matériau
 * Tous les champs sont optionnels sauf l'ID
 */
export const updateMateriauSchema = createMateriauSchema.partial().extend({
  id: z
    .string()
    .min(1, 'ID matériau requis')
    .uuid('ID matériau invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateMateriauInput = z.infer<typeof createMateriauSchema>
export type UpdateMateriauInput = z.infer<typeof updateMateriauSchema>
