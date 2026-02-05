import { z } from 'zod'

/**
 * Schéma de validation pour la surface (nombre positif)
 */
const surfaceSchema = z
  .number()
  .positive('La surface doit être supérieure à 0')
  .max(1000000, 'La surface est trop grande (max 1,000,000 m²)')
  .nullable()
  .optional()

/**
 * Schéma de validation pour l'année d'installation
 */
const yearSchema = z
  .number()
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
    .string().min(1, 'Le bâtiment est requis')
    .uuid('ID bâtiment invalide'),

  name: z
    .string().min(1, 'Le nom du bassin est obligatoire')
    .min(1, 'Le nom du bassin est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),

  surfaceM2: surfaceSchema,

  membraneTypeId: z
    .string()
    .uuid('Type de membrane invalide')
    .nullable()
    .optional(),

  couvreurId: z
    .string()
    .uuid('ID couvreur invalide')
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
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null

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
    .string().min(1, 'ID bassin requis')
    .uuid('ID bassin invalide'),
})

/**
 * Schéma de validation pour les interventions
 */
export const createInterventionSchema = z.object({
  bassinId: z
    .string()
    .min(1, 'ID bassin requis')
    .uuid('ID bassin invalide'),

  dateIntervention: z
    .string()
    .min(1, 'La date d\'intervention est obligatoire')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),

  typeInterventionId: z
    .string()
    .uuid('Type d\'intervention invalide')
    .nullable()
    .optional(),

  commentaire: z
    .string()
    .max(2000, 'Le commentaire est trop long (max 2000 caractères)')
    .nullable()
    .optional(),

  locationGeojson: z
    .object({
      type: z.literal('Point'),
      coordinates: z.array(z.number()).length(2),
    })
    .nullable()
    .optional(),
})

/**
 * Schéma de validation pour la mise à jour d'une intervention
 */
export const updateInterventionSchema = createInterventionSchema.extend({
  id: z
    .string()
    .min(1, 'ID intervention requis')
    .uuid('ID intervention invalide'),
})

/**
 * Schéma pour la suppression d'une intervention
 */
export const deleteInterventionSchema = z.object({
  id: z
    .string()
    .min(1, 'ID intervention requis')
    .uuid('ID intervention invalide'),
})

/**
 * Schéma pour l'upload de fichier d'intervention
 */
export const uploadInterventionFileSchema = z.object({
  interventionId: z
    .string()
    .min(1, 'ID intervention requis')
    .uuid('ID intervention invalide'),
  fileName: z
    .string()
    .max(255, 'Nom de fichier trop long (max 255 caractères)')
    .nullable()
    .optional(),
  mimeType: z
    .string()
    .max(100, 'Type MIME trop long')
    .nullable()
    .optional(),
})

/**
 * Schéma pour la suppression de fichier d'intervention
 */
export const deleteInterventionFileSchema = z.object({
  fileId: z
    .string()
    .min(1, 'ID fichier requis')
    .uuid('ID fichier invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateBassinInput = z.infer<typeof createBassinSchema>
export type UpdateBassinInput = z.infer<typeof updateBassinSchema>
export type CreateInterventionInput = z.infer<typeof createInterventionSchema>
export type UpdateInterventionInput = z.infer<typeof updateInterventionSchema>
export type DeleteInterventionInput = z.infer<typeof deleteInterventionSchema>
export type UploadInterventionFileInput = z.infer<typeof uploadInterventionFileSchema>
export type DeleteInterventionFileInput = z.infer<typeof deleteInterventionFileSchema>
