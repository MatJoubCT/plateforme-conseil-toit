import { describe, it, expect } from 'vitest';
import { createClientSchema, updateClientSchema } from '../client.schema';

describe('Client Schema Validation', () => {
  describe('createClientSchema', () => {
    it('devrait valider un client valide', () => {
      const validClient = {
        name: 'Test Client',
      };

      const result = createClientSchema.safeParse(validClient);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un nom vide', () => {
      const invalidClient = {
        name: '',
      };

      const result = createClientSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoire');
      }
    });

    it('devrait rejeter un nom trop long', () => {
      const invalidClient = {
        name: 'x'.repeat(201),
      };

      const result = createClientSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
    });

    it('devrait rejeter un objet sans nom', () => {
      const invalidClient = {};

      const result = createClientSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
    });
  });

  describe('updateClientSchema', () => {
    it('devrait valider une mise à jour valide', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Client',
      };

      const result = updateClientSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un UUID invalide', () => {
      const invalidUpdate = {
        id: 'invalid-uuid',
        name: 'Updated Client',
      };

      const result = updateClientSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        name: 'Updated Client',
      };

      const result = updateClientSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
