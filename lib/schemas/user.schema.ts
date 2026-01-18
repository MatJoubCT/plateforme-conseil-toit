import { z } from 'zod'

/**
 * Schéma de validation pour la création d'un utilisateur
 */
export const createUserSchema = z.object({
  email: z
    .string({ required_error: 'Le courriel est obligatoire' })
    .min(1, 'Le courriel est obligatoire')
    .email('Format de courriel invalide')
    .max(255, 'Le courriel est trop long (max 255 caractères)'),

  fullName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long (max 100 caractères)')
    .nullable()
    .optional(),

  role: z.enum(['admin', 'client'], {
    errorMap: () => ({ message: 'Le rôle doit être "admin" ou "client"' }),
  }),

  clientId: z
    .string()
    .uuid('ID client invalide')
    .nullable()
    .optional(),
})

/**
 * Schéma de validation pour la mise à jour d'un utilisateur
 */
export const updateUserSchema = z.object({
  userId: z
    .string({ required_error: 'ID utilisateur requis' })
    .uuid('ID utilisateur invalide'),

  profileId: z
    .string({ required_error: 'ID profil requis' })
    .uuid('ID profil invalide'),

  fullName: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long (max 100 caractères)')
    .nullable()
    .optional(),

  role: z
    .enum(['admin', 'client'], {
      errorMap: () => ({ message: 'Le rôle doit être "admin" ou "client"' }),
    })
    .nullable()
    .optional(),

  clientId: z
    .string()
    .uuid('ID client invalide')
    .nullable()
    .optional(),

  selectedClientIds: z
    .array(z.string().uuid('ID client invalide'))
    .default([]),

  selectedBatimentIds: z
    .array(z.string().uuid('ID bâtiment invalide'))
    .default([]),
})

/**
 * Schéma de validation pour toggle actif/inactif
 */
export const toggleUserActiveSchema = z.object({
  profileId: z
    .string({ required_error: 'ID profil requis' })
    .uuid('ID profil invalide'),

  isActive: z.boolean({
    required_error: 'État actif requis',
    invalid_type_error: 'isActive doit être un booléen',
  }),
})

/**
 * Schéma de validation pour réinitialisation mot de passe
 */
export const resetPasswordSchema = z.object({
  userId: z
    .string({ required_error: 'ID utilisateur requis' })
    .uuid('ID utilisateur invalide'),
})

/**
 * Schéma de validation pour mise à jour des accès utilisateur
 */
export const updateUserAccessSchema = z.object({
  userId: z
    .string({ required_error: 'ID utilisateur requis' })
    .uuid('ID utilisateur invalide'),

  selectedClientIds: z
    .array(z.string().uuid('ID client invalide'))
    .default([]),

  selectedBatimentIds: z
    .array(z.string().uuid('ID bâtiment invalide'))
    .default([]),
})

/**
 * Types TypeScript générés automatiquement
 */
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ToggleUserActiveInput = z.infer<typeof toggleUserActiveSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>
