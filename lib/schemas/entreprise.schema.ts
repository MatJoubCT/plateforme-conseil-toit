import { z } from 'zod'

/**
 * Regex pour téléphone (format flexible)
 */
const PHONE_REGEX = /^[\d\s\-\(\)\.+]+$/

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
 * Schéma de validation pour la création d'une entreprise
 */
export const createEntrepriseSchema = z.object({
  type: z
    .string().min(1, 'Le type est obligatoire')
    .min(1, 'Le type est obligatoire')
    .max(100, 'Le type est trop long (max 100 caractères)'),

  nom: z
    .string().min(1, 'Le nom est obligatoire')
    .min(1, 'Le nom est obligatoire')
    .max(200, 'Le nom est trop long (max 200 caractères)'),

  telephone: phoneSchema,

  siteWeb: urlSchema,

  notes: z
    .string()
    .max(2000, 'Les notes sont trop longues (max 2000 caractères)')
    .nullable()
    .optional(),
})

/**
 * Schéma de validation pour la mise à jour d'une entreprise
 */
export const updateEntrepriseSchema = createEntrepriseSchema.extend({
  id: z
    .string().min(1, 'ID entreprise requis')
    .uuid('ID entreprise invalide'),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateEntrepriseInput = z.infer<typeof createEntrepriseSchema>
export type UpdateEntrepriseInput = z.infer<typeof updateEntrepriseSchema>
