import { describe, it, expect } from 'vitest';
import { createBassinSchema, updateBassinSchema, createInterventionSchema } from '../bassin.schema';

describe('Bassin Schema Validation', () => {
  describe('createBassinSchema', () => {
    it('devrait valider un bassin valide minimal', () => {
      const validBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
      };

      const result = createBassinSchema.safeParse(validBassin);
      expect(result.success).toBe(true);
    });

    it('devrait valider un bassin valide complet', () => {
      const validBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        surfaceM2: 150.5,
        membraneTypeId: '550e8400-e29b-41d4-a716-446655440001',
        etatId: '550e8400-e29b-41d4-a716-446655440002',
        dureeVieId: '550e8400-e29b-41d4-a716-446655440003',
        dureeVieText: 'Custom lifespan',
        anneeInstallation: 2020,
        dateDerniereRefection: '2023-06-15',
        referenceInterne: 'REF-001',
        notes: 'Test notes',
        polygoneGeojson: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      const result = createBassinSchema.safeParse(validBassin);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un nom vide', () => {
      const invalidBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un batimentId invalide', () => {
      const invalidBassin = {
        batimentId: 'invalid-uuid',
        name: 'Bassin Test',
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une surface négative', () => {
      const invalidBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        surfaceM2: -10,
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('supérieure à 0');
      }
    });

    it('devrait rejeter une surface trop grande', () => {
      const invalidBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        surfaceM2: 2000000,
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une année avant 1900', () => {
      const invalidBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        anneeInstallation: 1899,
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une année future', () => {
      const invalidBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        anneeInstallation: new Date().getFullYear() + 10,
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un format de date invalide', () => {
      const invalidBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        dateDerniereRefection: '15/06/2023',
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait valider une date au format YYYY-MM-DD', () => {
      const validBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        dateDerniereRefection: '2023-06-15',
      };

      const result = createBassinSchema.safeParse(validBassin);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un GeoJSON invalide', () => {
      const invalidBassin = {
        batimentId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Bassin Test',
        polygoneGeojson: {
          type: 'Point', // Devrait être 'Polygon'
          coordinates: [0, 0],
        },
      };

      const result = createBassinSchema.safeParse(invalidBassin);
      expect(result.success).toBe(false);
    });
  });

  describe('updateBassinSchema', () => {
    it('devrait valider une mise à jour valide', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        batimentId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Updated Bassin',
      };

      const result = updateBassinSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        batimentId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Updated Bassin',
      };

      const result = updateBassinSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('createInterventionSchema', () => {
    it('devrait valider une intervention valide minimale', () => {
      const validIntervention = {
        bassinId: '550e8400-e29b-41d4-a716-446655440000',
        dateIntervention: '2023-06-15',
      };

      const result = createInterventionSchema.safeParse(validIntervention);
      expect(result.success).toBe(true);
    });

    it('devrait valider une intervention complète', () => {
      const validIntervention = {
        bassinId: '550e8400-e29b-41d4-a716-446655440000',
        dateIntervention: '2023-06-15',
        typeInterventionId: '550e8400-e29b-41d4-a716-446655440001',
        commentaire: 'Inspection annuelle',
      };

      const result = createInterventionSchema.safeParse(validIntervention);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une intervention sans date', () => {
      const invalidIntervention = {
        bassinId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = createInterventionSchema.safeParse(invalidIntervention);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un bassinId invalide', () => {
      const invalidIntervention = {
        bassinId: 'invalid-uuid',
        dateIntervention: '2023-06-15',
      };

      const result = createInterventionSchema.safeParse(invalidIntervention);
      expect(result.success).toBe(false);
    });
  });
});
