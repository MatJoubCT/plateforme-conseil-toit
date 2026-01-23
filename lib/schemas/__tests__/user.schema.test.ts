import { describe, it, expect } from 'vitest';
import {
  createUserSchema,
  updateUserSchema,
  toggleUserActiveSchema,
  resetPasswordSchema,
  updateUserAccessSchema,
} from '../user.schema';

describe('User Schema Validation', () => {
  describe('createUserSchema', () => {
    it('devrait valider un utilisateur admin valide', () => {
      const validUser = {
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'admin' as const,
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('devrait valider un utilisateur client valide', () => {
      const validUser = {
        email: 'client@example.com',
        fullName: 'Client User',
        role: 'client' as const,
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un email vide', () => {
      const invalidUser = {
        email: '',
        fullName: 'Test User',
        role: 'admin' as const,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un email invalide', () => {
      const invalidUser = {
        email: 'invalid-email',
        fullName: 'Test User',
        role: 'admin' as const,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait rejeter un email trop long', () => {
      const invalidUser = {
        email: 'x'.repeat(250) + '@example.com',
        fullName: 'Test User',
        role: 'admin' as const,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un nom trop court', () => {
      const invalidUser = {
        email: 'test@example.com',
        fullName: 'A',
        role: 'admin' as const,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un rôle invalide', () => {
      const invalidUser = {
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'superadmin', // Rôle non valide
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un clientId invalide', () => {
      const invalidUser = {
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'client' as const,
        clientId: 'invalid-uuid',
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('devrait valider une mise à jour valide', () => {
      const validUpdate = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        profileId: '550e8400-e29b-41d4-a716-446655440001',
        fullName: 'Updated Name',
        role: 'client' as const,
        clientId: '550e8400-e29b-41d4-a716-446655440002',
        selectedClientIds: ['550e8400-e29b-41d4-a716-446655440003'],
        selectedBatimentIds: ['550e8400-e29b-41d4-a716-446655440004'],
      };

      const result = updateUserSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait valider une mise à jour minimale', () => {
      const validUpdate = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        profileId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = updateUserSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans userId', () => {
      const invalidUpdate = {
        profileId: '550e8400-e29b-41d4-a716-446655440001',
        fullName: 'Updated Name',
      };

      const result = updateUserSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un userId invalide', () => {
      const invalidUpdate = {
        userId: 'invalid-uuid',
        profileId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = updateUserSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un tableau de clientIds invalides', () => {
      const invalidUpdate = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        profileId: '550e8400-e29b-41d4-a716-446655440001',
        selectedClientIds: ['invalid-uuid'],
      };

      const result = updateUserSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('toggleUserActiveSchema', () => {
    it('devrait valider un toggle valide (actif)', () => {
      const validToggle = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        isActive: true,
      };

      const result = toggleUserActiveSchema.safeParse(validToggle);
      expect(result.success).toBe(true);
    });

    it('devrait valider un toggle valide (inactif)', () => {
      const validToggle = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
        isActive: false,
      };

      const result = toggleUserActiveSchema.safeParse(validToggle);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un profileId invalide', () => {
      const invalidToggle = {
        profileId: 'invalid-uuid',
        isActive: true,
      };

      const result = toggleUserActiveSchema.safeParse(invalidToggle);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter sans isActive', () => {
      const invalidToggle = {
        profileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = toggleUserActiveSchema.safeParse(invalidToggle);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('devrait valider une réinitialisation valide', () => {
      const validReset = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = resetPasswordSchema.safeParse(validReset);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un userId invalide', () => {
      const invalidReset = {
        userId: 'invalid-uuid',
      };

      const result = resetPasswordSchema.safeParse(invalidReset);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserAccessSchema', () => {
    it('devrait valider une mise à jour d\'accès valide', () => {
      const validAccess = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        selectedClientIds: [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ],
        selectedBatimentIds: [
          '550e8400-e29b-41d4-a716-446655440003',
        ],
      };

      const result = updateUserAccessSchema.safeParse(validAccess);
      expect(result.success).toBe(true);
    });

    it('devrait valider avec des tableaux vides', () => {
      const validAccess = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        selectedClientIds: [],
        selectedBatimentIds: [],
      };

      const result = updateUserAccessSchema.safeParse(validAccess);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter des UUIDs invalides dans les tableaux', () => {
      const invalidAccess = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        selectedClientIds: ['invalid-uuid'],
      };

      const result = updateUserAccessSchema.safeParse(invalidAccess);
      expect(result.success).toBe(false);
    });
  });
});
