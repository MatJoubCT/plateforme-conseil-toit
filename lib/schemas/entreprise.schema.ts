import { z } from 'zod'

/**
 * Regex pour téléphone (format flexible)
 */
const PHONE_REGEX = /^[\d\s\-\(\)\.+]+$/

/**
 * Types d'entreprises valides
 */
const VALID_TYPES = [
  'Couvreur',
  'Fournisseur',
  'Consultant',
  'Entrepreneur général',
  'Sous-traitant',
  'Autre'
] as const

/**
 * Schéma de validation pour URL (optionnel)
 */
const urlSchema = z
  .string()
  .url('Format d\'URL invalide (doit commencer par http:// ou https://)')
  .nullable()
  .optional()
  .or(z.literal(''))

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
    .max(100, 'Le type est trop long (max 100 caractères)')
    .refine(
      (val) => VALID_TYPES.includes(val as typeof VALID_TYPES[number]),
      { message: 'Type d\'entreprise invalide. Valeurs acceptées: ' + VALID_TYPES.join(', ') }
    ),

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

/**
 * Export des types valides pour utilisation dans les composants
 */
export const ENTREPRISE_TYPES = VALID_TYPES
