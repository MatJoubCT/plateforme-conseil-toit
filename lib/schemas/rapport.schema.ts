import { z } from 'zod';

/**
 * Schéma de validation pour les rapports
 */
export const createRapportSchema = z.object({
  bassin_id: z.string().uuid('ID bassin invalide'),
  type_id: z.string().uuid('Type de rapport invalide').nullable().optional(),
  date_rapport: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null
  numero_ct: z.string().nullable().optional(),
  titre: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  file_url: z
    .string()
    .url('URL de fichier invalide')
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null
});

export const updateRapportSchema = z.object({
  id: z.string().uuid('ID rapport invalide'),
  bassin_id: z.string().uuid('ID bassin invalide').optional(),
  type_id: z.string().uuid('Type de rapport invalide').nullable().optional(),
  date_rapport: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null
  numero_ct: z.string().nullable().optional(),
  titre: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  file_url: z
    .string()
    .url('URL de fichier invalide')
    .or(z.literal('')) // Accepter chaîne vide
    .nullable()
    .optional()
    .transform(val => val === '' ? null : val), // Convertir chaîne vide en null
});

export const deleteRapportSchema = z.object({
  id: z.string().uuid('ID rapport invalide'),
});

export type CreateRapportInput = z.infer<typeof createRapportSchema>;
export type UpdateRapportInput = z.infer<typeof updateRapportSchema>;
export type DeleteRapportInput = z.infer<typeof deleteRapportSchema>;
