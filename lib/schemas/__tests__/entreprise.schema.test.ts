import { describe, it, expect } from 'vitest';
import { createEntrepriseSchema, updateEntrepriseSchema } from '../entreprise.schema';

describe('Entreprise Schema Validation', () => {
  describe('createEntrepriseSchema', () => {
    it('devrait valider une entreprise valide complète', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        telephone: '514-555-1234',
        site_web: 'https://www.example.com',
        notes: 'Excellente entreprise',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait valider une entreprise avec champs optionnels vides', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait valider une entreprise avec champs optionnels null', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        telephone: null,
        site_web: null,
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
        // Le message peut varier selon la version de Zod
        const message = result.error.issues[0].message;
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('devrait rejeter un nom vide', () => {
      const invalidEntreprise = {
        type: 'entrepreneur_general',
        nom: '',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoire');
      }
    });

    it('devrait rejeter un type invalide', () => {
      const invalidEntreprise = {
        type: 'type_invalide',
        nom: 'Construction ABC Inc.',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Le message peut être soit le message personnalisé, soit le message par défaut de Zod
        const message = result.error.issues[0].message;
        expect(message.length).toBeGreaterThan(0);
      }
    });

    it('devrait accepter tous les types valides', () => {
      const validTypes = ['couvreur', 'fournisseur', 'consultant', 'entrepreneur_general', 'sous_traitant', 'autre'];

      validTypes.forEach((type) => {
        const entreprise = {
          type,
          nom: 'Construction ABC Inc.',
        };

        const result = createEntrepriseSchema.safeParse(entreprise);
        expect(result.success).toBe(true);
      });
    });

    it('devrait rejeter un nom trop long (> 200 caractères)', () => {
      const invalidEntreprise = {
        type: 'entrepreneur_general',
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
          type: 'entrepreneur_general',
          nom: 'Construction ABC Inc.',
          telephone,
        };

        const result = createEntrepriseSchema.safeParse(entreprise);
        expect(result.success).toBe(true);
      });
    });

    it('devrait rejeter un téléphone trop court (< 10 caractères)', () => {
      const invalidEntreprise = {
        type: 'entrepreneur_general',
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
        type: 'entrepreneur_general',
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
        type: 'entrepreneur_general',
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
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        site_web: 'https://www.example.com',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.site_web).toBe('https://www.example.com');
      }
    });

    it('devrait accepter des URLs valides HTTP', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        site_web: 'http://www.example.com',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.site_web).toBe('http://www.example.com');
      }
    });

    it('devrait accepter une chaîne vide pour site_web', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        site_web: '',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.site_web).toBeNull();
      }
    });

    it('devrait accepter une URL sans protocole et ajouter https:// automatiquement', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        site_web: 'www.example.com',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.site_web).toBe('https://www.example.com');
      }
    });

    it('devrait accepter une URL sans www et ajouter https:// automatiquement', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        site_web: 'example.com',
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.site_web).toBe('https://example.com');
      }
    });

    it('devrait rejeter une URL complètement invalide', () => {
      const invalidEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        site_web: 'not a valid url at all',
      };

      const result = createEntrepriseSchema.safeParse(invalidEntreprise);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait accepter des notes de longueur raisonnable', () => {
      const validEntreprise = {
        type: 'entrepreneur_general',
        nom: 'Construction ABC Inc.',
        notes: 'x'.repeat(2000),
      };

      const result = createEntrepriseSchema.safeParse(validEntreprise);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter des notes trop longues (> 2000 caractères)', () => {
      const invalidEntreprise = {
        type: 'entrepreneur_general',
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
        type: 'entrepreneur_general',
        nom: 'Construction XYZ Inc.',
        telephone: '514-555-9999',
        site_web: 'https://www.newsite.com',
        notes: 'Mise à jour',
      };

      const result = updateEntrepriseSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        type: 'entrepreneur_general',
        nom: 'Construction XYZ Inc.',
      };

      const result = updateEntrepriseSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un UUID invalide', () => {
      const invalidUpdate = {
        id: 'invalid-uuid',
        type: 'entrepreneur_general',
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
        type: 'entrepreneur_general',
        nom: 'Construction XYZ Inc.',
      };

      const result = updateEntrepriseSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
