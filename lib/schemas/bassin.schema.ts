import { z } from 'zod'

/**
 * Schéma de validation pour la surface (nombre positif)
 */
const surfaceSchema = z
  .number({
    invalid_type_error: 'La surface doit être un nombre',
  })
  .positive('La surface doit être supérieure à 0')
  .max(1000000, 'La surface est trop grande (max 1,000,000 m²)')
  .nullable()
  .optional()

/**
 * Schéma de validation pour l'année d'installation
 */
const yearSchema = z
  .number({
    invalid_type_error: 'L\'année doit être un nombre',
  })
  .int('L\'année doit être un nombre entier')
  .min(1900, 'L\'année doit être après 1900')
  .max(
    new Date().getFullYear() + 1,
    `L'année doit être avant ${new Date().getFullYear() + 1}`
  )
  .nullable()
  .optional()

/**
 * Schéma de validation pour la création d'un bassin
 */
export const createBassinSchema = z.object({
  batimentId: z
    .string({ required_error: 'Le bâtiment est requis' })
    .uuid('ID bâtiment invalide'),

  name: z
    .string({ required_error: 'Le nom du bassin est obligatoire' })
    .min(1, 'Le nom du bassin est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),

  surfaceM2: surfaceSchema,

  membraneTypeId: z
    .string()
    .uuid('Type de membrane invalide')
    .nullable()
    .optional(),

  etatId: z
    .string()
    .uuid('État invalide')
    .nullable()
    .optional(),

  dureeVieId: z
    .string()
    .uuid('Durée de vie invalide')
    .nullable()
    .optional(),

  dureeVieText: z
    .string()
    .max(100, 'Texte durée de vie trop long (max 100 caractères)')
    .nullable()
    .optional(),

  anneeInstallation: yearSchema,

  dateDerniereRefection: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .nullable()
    .optional()
    .or(z.literal('')),

  referenceInterne: z
    .string()
    .max(100, 'Référence interne trop longue (max 100 caractères)')
    .nullable()
    .optional(),

  notes: z
    .string()
    .max(2000, 'Les notes sont trop longues (max 2000 caractères)')
    .nullable()
    .optional(),

  polygoneGeojson: z
    .object({
      type: z.literal('Polygon'),
      coordinates: z.array(z.array(z.array(z.number()))),
    })
    .nullable()
    .optional(),
})

/**
 * Schéma de validation pour la mise à jour d'un bassin
 */
export const updateBassinSchema = createBassinSchema.extend({
  id: z
    .string({ required_error: 'ID bassin requis' })
    .uuid('ID bassin invalide'),
})

/**
 * Schéma de validation pour les interventions
 */
export const createInterventionSchema = z.object({
  bassinId: z
    .string({ required_error: 'ID bassin requis' })
    .uuid('ID bassin invalide'),

  dateIntervention: z
    .string({ required_error: 'La date d\'intervention est obligatoire' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),

  typeIntervention: z
    .string()
    .max(100, 'Type d\'intervention trop long (max 100 caractères)')
    .nullable()
    .optional(),

  description: z
    .string()
    .max(2000, 'La description est trop longue (max 2000 caractères)')
    .nullable()
    .optional(),

  cout: z
    .number()
    .nonnegative('Le coût ne peut pas être négatif')
    .max(10000000, 'Le coût est trop élevé')
    .nullable()
    .optional(),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateBassinInput = z.infer<typeof createBassinSchema>
export type UpdateBassinInput = z.infer<typeof updateBassinSchema>
export type CreateInterventionInput = z.infer<typeof createInterventionSchema>
