import { z } from 'zod'

/**
 * Regex pour code postal canadien (format: A1A 1A1 ou A1A1A1)
 */
const CANADIAN_POSTAL_CODE_REGEX = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i

/**
 * Schéma de validation pour les coordonnées GPS
 */
const coordinatesSchema = z
  .object({
    latitude: z
      .number()
      .min(-90, 'La latitude doit être entre -90 et 90')
      .max(90, 'La latitude doit être entre -90 et 90')
      .nullable()
      .optional(),

    longitude: z
      .number()
      .min(-180, 'La longitude doit être entre -180 et 180')
      .max(180, 'La longitude doit être entre -180 et 180')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Si l'une est fournie, l'autre doit l'être aussi
      const hasLat = data.latitude !== null && data.latitude !== undefined
      const hasLng = data.longitude !== null && data.longitude !== undefined
      return hasLat === hasLng
    },
    {
      message: 'Vous devez fournir à la fois la latitude et la longitude',
    }
  )

/**
 * Schéma de validation pour la création d'un bâtiment
 */
export const createBatimentSchema = z
  .object({
    name: z
      .string().min(1, 'Le nom du bâtiment est obligatoire')
      .min(1, 'Le nom du bâtiment est obligatoire')
      .max(200, 'Le nom est trop long (max 200 caractères)'),

    address: z
      .string()
      .max(500, 'L\'adresse est trop longue (max 500 caractères)')
      .nullable()
      .optional()
      .or(z.literal('')),

    city: z
      .string()
      .max(100, 'La ville est trop longue (max 100 caractères)')
      .nullable()
      .optional()
      .or(z.literal('')),

    postalCode: z
      .string()
      .regex(CANADIAN_POSTAL_CODE_REGEX, 'Code postal invalide (format: A1A 1A1)')
      .nullable()
      .optional()
      .or(z.literal('')),

    clientId: z
      .string().min(1, 'Le client est requis')
      .uuid('ID client invalide'),

    latitude: z
      .number()
      .min(-90, 'Latitude invalide (-90 à 90)')
      .max(90, 'Latitude invalide (-90 à 90)')
      .nullable()
      .optional(),

    longitude: z
      .number()
      .min(-180, 'Longitude invalide (-180 à 180)')
      .max(180, 'Longitude invalide (-180 à 180)')
      .nullable()
      .optional(),

    notes: z
      .string()
      .max(2000, 'Les notes sont trop longues (max 2000 caractères)')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Vérifier cohérence coordonnées
      const hasLat = data.latitude !== null && data.latitude !== undefined
      const hasLng = data.longitude !== null && data.longitude !== undefined
      return hasLat === hasLng
    },
    {
      message: 'Vous devez fournir à la fois la latitude et la longitude',
      path: ['latitude'],
    }
  )

/**
 * Schéma de validation pour la mise à jour d'un bâtiment
 */
export const updateBatimentSchema = createBatimentSchema.extend({
  id: z
    .string().min(1, 'ID bâtiment requis')
    .uuid('ID bâtiment invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateBatimentInput = z.infer<typeof createBatimentSchema>
export type UpdateBatimentInput = z.infer<typeof updateBatimentSchema>
export type CoordinatesInput = z.infer<typeof coordinatesSchema>
