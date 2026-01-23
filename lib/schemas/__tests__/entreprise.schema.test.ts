import { describe, it, expect } from 'vitest';
import { createEntrepriseSchema, updateEntrepriseSchema } from '../entreprise.schema';

describe('Entreprise Schema Validation', () => {
  describe('createEntrepriseSchema', () => {
    it('devrait valider une entreprise valide complète', () => {
      const validEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        telephone: '514-555-1234',
        siteWeb: 'https://www.example.com',
        notes: 'Excellente entreprise',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait valider une entreprise avec champs optionnels vides', () => {
      const validEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait valider une entreprise avec champs optionnels null', () => {
      const validEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        telephone: null,
        siteWeb: null,
        notes: null,
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un type vide', () => {
      const invalidEntreprise = {
        type: '',
        nom: 'Construction ABC Inc.',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoire');
      }
    });

    it('devrait rejeter un nom vide', () => {
      const invalidEntreprise = {
        type: 'Entrepreneur général',
        nom: '',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoire');
      }
    });

    it('devrait rejeter un type trop long (> 100 caractères)', () => {
      const invalidEntreprise = {
        type: 'x'.repeat(101),
        nom: 'Construction ABC Inc.',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
    });

    it('devrait rejeter un nom trop long (> 200 caractères)', () => {
      const invalidEntreprise = {
        type: 'Entrepreneur général',
        nom: 'x'.repeat(201),
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
    });

    it('devrait accepter différents formats de téléphone valides', () => {
      const formats = [
        '514-555-1234',
        '(514) 555-1234',
        '514.555.1234',
        '5145551234',
        '+1 514 555 1234',
        '1-800-555-1234',
      ];

      formats.forEach((telephone) => {
        const entreprise = {
          type: 'Entrepreneur général',
          nom: 'Construction ABC Inc.',
          telephone,
        };

        const result = createEntrepriseSchema.safeParse(entreprise);
        expect(result.success).toBe(true);
      });
    });

    it('devrait rejeter un téléphone trop court (< 10 caractères)', () => {
      const invalidEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        telephone: '123456789',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('au moins 10 chiffres');
      }
    });

    it('devrait rejeter un téléphone trop long (> 20 caractères)', () => {
      const invalidEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        telephone: '123456789012345678901',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
    });

    it('devrait rejeter un téléphone avec caractères invalides', () => {
      const invalidEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        telephone: '514-ABC-1234',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Format de téléphone invalide');
      }
    });

    it('devrait accepter des URLs valides HTTPS', () => {
      const validEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        siteWeb: 'https://www.example.com',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait accepter des URLs valides HTTP', () => {
      const validEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        siteWeb: 'http://www.example.com',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait accepter une chaîne vide pour siteWeb', () => {
      const validEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        siteWeb: '',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une URL sans protocole', () => {
      const invalidEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        siteWeb: 'www.example.com',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('http');
      }
    });

    it('devrait accepter des notes de longueur raisonnable', () => {
      const validEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        notes: 'x'.repeat(2000),
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter des notes trop longues (> 2000 caractères)', () => {
      const invalidEntreprise = {
        type: 'Entrepreneur général',
        nom: 'Construction ABC Inc.',
        notes: 'x'.repeat(2001),
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop longues');
      }
    });
  });

  describe('updateEntrepriseSchema', () => {
    it('devrait valider une mise à jour valide complète', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        type: 'Entrepreneur général',
        nom: 'Construction XYZ Inc.',
        telephone: '514-555-9999',
        siteWeb: 'https://www.newsite.com',
        notes: 'Mise à jour',
      };

      const result = updateEntrepriseSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        type: 'Entrepreneur général',
        nom: 'Construction XYZ Inc.',
      };

      const result = updateEntrepriseSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un UUID invalide', () => {
      const invalidUpdate = {
        id: 'invalid-uuid',
        type: 'Entrepreneur général',
        nom: 'Construction XYZ Inc.',
      };

      const result = updateEntrepriseSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait rejeter un ID vide', () => {
      const invalidUpdate = {
        id: '',
        type: 'Entrepreneur général',
        nom: 'Construction XYZ Inc.',
      };

      const result = updateEntrepriseSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
