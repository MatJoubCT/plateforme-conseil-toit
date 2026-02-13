import { z } from 'zod'

export const updateSelfProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom est trop long (max 100 caractères)')
    .trim(),
})

export type UpdateSelfProfileInput = z.infer<typeof updateSelfProfileSchema>
