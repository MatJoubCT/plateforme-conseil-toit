import { z } from 'zod'

/**
 * Regex pour code hexadécimal (format: #RRGGBB)
 */
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

/**
 * Catégories valides pour les listes de choix
 */
export const CATEGORIES_VALIDES = [
  'etat_bassin',
  'duree_vie',
  'type_membrane',
  'type_toiture',
  'type_isolant',
] as const

/**
 * Schéma de validation pour la création d'un élément de liste
 */
export const createListeChoixSchema = z.object({
  categorie: z.enum(CATEGORIES_VALIDES),

  code: z
    .string()
    .min(1, 'Le code est obligatoire')
    .max(50, 'Le code est trop long (max 50 caractères)')
    .regex(/^[a-z0-9_]+$/, 'Le code doit contenir uniquement des lettres minuscules, chiffres et underscores')
    .nullable()
    .optional(),

  label: z
    .string().min(1, 'Le libellé est obligatoire')
    .min(1, 'Le libellé est obligatoire')
    .max(200, 'Le libellé est trop long (max 200 caractères)'),

  couleur: z
    .string()
    .regex(HEX_COLOR_REGEX, 'La couleur doit être au format hexadécimal (#RRGGBB, ex: #00A3FF)')
    .nullable()
    .optional(),

  ordre: z
    .number()
    .int('L\'ordre doit être un nombre entier')
    .nonnegative('L\'ordre ne peut pas être négatif')
    .nullable()
    .optional(),

  description: z
    .string()
    .max(500, 'La description est trop longue (max 500 caractères)')
    .nullable()
    .optional(),
})

/**
 * Schéma de validation pour la mise à jour d'un élément de liste
 */
export const updateListeChoixSchema = createListeChoixSchema.extend({
  id: z
    .string().min(1, 'ID élément requis')
    .uuid('ID élément invalide'),
})

/**
 * Schéma de validation pour la mise à jour de l'ordre
 */
export const updateOrdreSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid('ID élément invalide'),
      ordre: z.number().int().nonnegative(),
    })
  ),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateListeChoixInput = z.infer<typeof createListeChoixSchema>
export type UpdateListeChoixInput = z.infer<typeof updateListeChoixSchema>
export type UpdateOrdreInput = z.infer<typeof updateOrdreSchema>
export type CategorieValide = typeof CATEGORIES_VALIDES[number]
