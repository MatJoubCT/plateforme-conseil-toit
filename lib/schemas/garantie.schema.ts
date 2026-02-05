import { z } from 'zod'

/**
 * Schéma de validation pour la création d'une garantie
 */
export const createGarantieSchema = z.object({
  bassinId: z
    .string()
    .min(1, 'ID bassin requis')
    .uuid('ID bassin invalide'),

  typeGarantieId: z
    .string()
    .uuid('Type de garantie invalide')
    .nullable()
    .optional(),

  fournisseur: z
    .string()
    .max(200, 'Nom du fournisseur trop long (max 200 caractères)')
    .nullable()
    .optional(),

  numeroGarantie: z
    .string()
    .max(100, 'Numéro de garantie trop long (max 100 caractères)')
    .nullable()
    .optional(),

  dateDebut: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null

  dateFin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null

  statutId: z
    .string()
    .uuid('Statut invalide')
    .nullable()
    .optional(),

  couverture: z
    .string()
    .max(500, 'Description de la couverture trop longue (max 500 caractères)')
    .nullable()
    .optional(),

  commentaire: z
    .string()
    .max(2000, 'Commentaire trop long (max 2000 caractères)')
    .nullable()
    .optional(),

  fichierPdfUrl: z
    .string()
    .url('URL invalide')
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null
})

/**
 * Schéma de validation pour la mise à jour d'une garantie
 */
export const updateGarantieSchema = createGarantieSchema.extend({
  id: z
    .string()
    .min(1, 'ID garantie requis')
    .uuid('ID garantie invalide'),
})

/**
 * Schéma pour la suppression d'une garantie
 */
export const deleteGarantieSchema = z.object({
  id: z
    .string()
    .min(1, 'ID garantie requis')
    .uuid('ID garantie invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateGarantieInput = z.infer<typeof createGarantieSchema>
export type UpdateGarantieInput = z.infer<typeof updateGarantieSchema>
export type DeleteGarantieInput = z.infer<typeof deleteGarantieSchema>
