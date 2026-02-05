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

    it('devrait accepter tous les champs optionnels', () => {
      const validClient = {
        name: 'Test Client',
        type: 'Municipal',
        address: '123 rue Test',
        city: 'Montréal',
        postal_code: 'H1A 1A1',
        contact_name: 'Jean Dupont',
        contact_email: 'jean@example.com',
        contact_phone: '514-123-4567',
        notes: 'Notes de test',
      };

      const result = createClientSchema.safeParse(validClient);
      expect(result.success).toBe(true);
    });

    it('devrait accepter les champs optionnels avec valeurs null', () => {
      const validClient = {
        name: 'Test Client',
        type: null,
        address: null,
        city: null,
        postal_code: null,
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        notes: null,
      };

      const result = createClientSchema.safeParse(validClient);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un email invalide', () => {
      const invalidClient = {
        name: 'Test Client',
        contact_email: 'invalid-email',
      };

      const result = createClientSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('email');
      }
    });

    it('devrait accepter une chaîne vide pour l\'email', () => {
      const validClient = {
        name: 'Test Client',
        contact_email: '',
      };

      const result = createClientSchema.safeParse(validClient);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter des champs trop longs', () => {
      const invalidClient = {
        name: 'Test Client',
        type: 'x'.repeat(101),
      };

      const result = createClientSchema.safeParse(invalidClient);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
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

    it('devrait valider une mise à jour avec tous les champs', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Client',
        type: 'Institutionnel',
        address: '456 avenue Update',
        city: 'Québec',
        postal_code: 'G1A 1A1',
        contact_name: 'Marie Tremblay',
        contact_email: 'marie@example.com',
        contact_phone: '418-987-6543',
        notes: 'Notes mises à jour',
      };

      const result = updateClientSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait valider une mise à jour avec des champs null', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Client',
        type: null,
        contact_email: null,
      };

      const result = updateClientSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });
  });
});
