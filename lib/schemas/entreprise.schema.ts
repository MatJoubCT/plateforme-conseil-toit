import { z } from 'zod'

/**
 * Regex pour téléphone (format flexible)
 */
const PHONE_REGEX = /^[\d\s\-\(\)\.+]+$/

/**
 * Types d'entreprises valides (suggestions pour l'UI)
 * Note: La validation finale est faite par la contrainte CHECK en BD
 */
export const ENTREPRISE_TYPES_OPTIONS = [
  { value: 'couvreur', label: 'Couvreur' },
  { value: 'fournisseur', label: 'Fournisseur' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'entrepreneur_general', label: 'Entrepreneur général' },
  { value: 'sous_traitant', label: 'Sous-traitant' },
  { value: 'autre', label: 'Autre' },
] as const

/**
 * Schéma de validation pour URL (optionnel)
 * Accepte les URLs avec ou sans protocole (ajoute https:// automatiquement si nécessaire)
 */
const urlSchema = z
  .union([z.string(), z.null(), z.literal('')])
  .transform((val) => {
    // Gestion des valeurs vides
    if (!val || val === '' || (typeof val === 'string' && val.trim() === '')) {
      return null
    }

    const trimmed = val.trim()

    // Si l'URL commence déjà par http:// ou https://, la retourner telle quelle
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }

    // Sinon, ajouter https://
    return `https://${trimmed}`
  })
  .refine(
    (val) => {
      // Null est accepté
      if (val === null) return true

      // Vérifier que c'est une URL valide
      try {
        new URL(val)
        return true
      } catch {
        return false
      }
    },
    { message: 'Format d\'URL invalide' }
  )
  .nullable()
  .optional()

/**
 * Schéma de validation pour téléphone (optionnel)
 */
const phoneSchema = z
  .string()
  .regex(PHONE_REGEX, 'Format de téléphone invalide')
  .min(10, 'Le téléphone doit contenir au moins 10 chiffres')
  .max(20, 'Le téléphone est trop long (max 20 caractères)')
  .nullable()
  .optional()
  .or(z.literal(''))

/**
 * Schéma de validation pour code postal (optionnel)
 */
const postalCodeSchema = z
  .string()
  .max(10, 'Le code postal est trop long (max 10 caractères)')
  .nullable()
  .optional()
  .or(z.literal(''))

/**
 * Schéma de validation pour la création d'une entreprise
 */
export const createEntrepriseSchema = z.object({
  type: z
    .string()
    .min(1, 'Le type est obligatoire')
    .max(100, 'Le type est trop long (max 100 caractères)'),

  nom: z
    .string()
    .min(1, 'Le nom est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),

  amcq_membre: z
    .boolean()
    .nullable()
    .optional(),

  source: z
    .string()
    .max(200, 'La source est trop longue (max 200 caractères)')
    .nullable()
    .optional()
    .or(z.literal('')),

  site_web: urlSchema,

  telephone: phoneSchema,

  adresse: z
    .string()
    .max(500, 'L\'adresse est trop longue (max 500 caractères)')
    .nullable()
    .optional()
    .or(z.literal('')),

  ville: z
    .string()
    .max(100, 'La ville est trop longue (max 100 caractères)')
    .nullable()
    .optional()
    .or(z.literal('')),

  province: z
    .string()
    .max(50, 'La province est trop longue (max 50 caractères)')
    .nullable()
    .optional()
    .or(z.literal('')),

  code_postal: postalCodeSchema,

  notes: z
    .string()
    .max(2000, 'Les notes sont trop longues (max 2000 caractères)')
    .nullable()
    .optional()
    .or(z.literal('')),

  actif: z
    .boolean()
    .default(true),
})

/**
 * Schéma de validation pour la mise à jour d'une entreprise
 */
export const updateEntrepriseSchema = createEntrepriseSchema.extend({
  id: z
    .string()
    .min(1, 'ID entreprise requis')
    .uuid('ID entreprise invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateEntrepriseInput = z.infer<typeof createEntrepriseSchema>
export type UpdateEntrepriseInput = z.infer<typeof updateEntrepriseSchema>
