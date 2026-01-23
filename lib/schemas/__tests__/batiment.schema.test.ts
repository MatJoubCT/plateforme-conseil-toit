import { describe, it, expect } from 'vitest';
import { createBatimentSchema, updateBatimentSchema } from '../batiment.schema';

describe('Batiment Schema Validation', () => {
  describe('createBatimentSchema', () => {
    it('devrait valider un bâtiment valide complet', () => {
      const validBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        postalCode: 'H1A 1A1',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        latitude: 45.5017,
        longitude: -73.5673,
        notes: 'Test notes',
      };

      const result = createBatimentSchema.safeParse(validBatiment);
      expect(result.success).toBe(true);
    });

    it('devrait valider un bâtiment sans coordonnées', () => {
      const validBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        postalCode: 'H1A 1A1',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createBatimentSchema.safeParse(validBatiment);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un nom vide', () => {
      const invalidBatiment = {
        name: '',
        address: '123 Test Street',
        city: 'Montreal',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createBatimentSchema.safeParse(invalidBatiment);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une adresse vide', () => {
      const invalidBatiment = {
        name: 'Test Building',
        address: '',
        city: 'Montreal',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createBatimentSchema.safeParse(invalidBatiment);
      expect(result.success).toBe(false);
    });

    it('devrait valider un code postal canadien valide (avec espace)', () => {
      const validBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        postalCode: 'H1A 1A1',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createBatimentSchema.safeParse(validBatiment);
      expect(result.success).toBe(true);
    });

    it('devrait valider un code postal canadien valide (sans espace)', () => {
      const validBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        postalCode: 'H1A1A1',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createBatimentSchema.safeParse(validBatiment);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un code postal invalide', () => {
      const invalidBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        postalCode: '12345',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createBatimentSchema.safeParse(invalidBatiment);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait rejeter latitude sans longitude', () => {
      const invalidBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        latitude: 45.5017,
      };

      const result = createBatimentSchema.safeParse(invalidBatiment);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('latitude et la longitude');
      }
    });

    it('devrait rejeter longitude sans latitude', () => {
      const invalidBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        longitude: -73.5673,
      };

      const result = createBatimentSchema.safeParse(invalidBatiment);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une latitude hors limites', () => {
      const invalidBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        latitude: 100,
        longitude: -73.5673,
      };

      const result = createBatimentSchema.safeParse(invalidBatiment);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un clientId invalide', () => {
      const invalidBatiment = {
        name: 'Test Building',
        address: '123 Test Street',
        city: 'Montreal',
        clientId: 'invalid-uuid',
      };

      const result = createBatimentSchema.safeParse(invalidBatiment);
      expect(result.success).toBe(false);
    });
  });

  describe('updateBatimentSchema', () => {
    it('devrait valider une mise à jour valide', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Updated Building',
        address: '123 Updated Street',
        city: 'Montreal',
        clientId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = updateBatimentSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        name: 'Updated Building',
        address: '123 Updated Street',
        city: 'Montreal',
        clientId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = updateBatimentSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
