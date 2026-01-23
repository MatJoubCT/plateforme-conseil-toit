import { describe, it, expect } from 'vitest';
import { createMateriauSchema, updateMateriauSchema } from '../materiau.schema';

describe('Materiau Schema Validation', () => {
  describe('createMateriauSchema', () => {
    it('devrait valider un matériau complet valide', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        categorie: 'Membranes élastomériques',
        unite: 'pi²',
        prixUnitaire: 12.50,
        description: 'Membrane haute performance pour toitures plates',
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait valider un matériau avec champs optionnels vides', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait valider un matériau avec champs optionnels null', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        categorie: null,
        unite: null,
        prixUnitaire: null,
        description: null,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un nom vide', () => {
      const invalidMateriau = {
        nom: '',
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoire');
      }
    });

    it('devrait rejeter un nom trop long (> 200 caractères)', () => {
      const invalidMateriau = {
        nom: 'x'.repeat(201),
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
    });

    it('devrait accepter un nom de longueur maximale (200 caractères)', () => {
      const validMateriau = {
        nom: 'x'.repeat(200),
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une catégorie trop longue (> 100 caractères)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        categorie: 'x'.repeat(101),
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop longue');
      }
    });

    it('devrait accepter une catégorie de longueur maximale (100 caractères)', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        categorie: 'x'.repeat(100),
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une unité trop longue (> 50 caractères)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        unite: 'x'.repeat(51),
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop longue');
      }
    });

    it('devrait accepter une unité de longueur maximale (50 caractères)', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        unite: 'x'.repeat(50),
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un prix de 0', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prixUnitaire: 0,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un prix décimal', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prixUnitaire: 12.99,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un prix entier', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prixUnitaire: 25,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter le prix maximal (1,000,000)', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prixUnitaire: 1000000,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un prix négatif', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prixUnitaire: -10,
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('négatif');
      }
    });

    it('devrait rejeter un prix trop élevé (> 1,000,000)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prixUnitaire: 1000001,
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop élevé');
      }
    });

    it('devrait accepter une description de longueur raisonnable', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        description: 'x'.repeat(1000),
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une description trop longue (> 1000 caractères)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        description: 'x'.repeat(1001),
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop longue');
      }
    });

    it('devrait accepter des unités courantes', () => {
      const unites = ['pi²', 'm²', 'kg', 'lb', 'pi', 'm', 'unité', 'rouleau'];

      unites.forEach((unite) => {
        const materiau = {
          nom: 'Test',
          unite,
        };

        const result = createMateriauSchema.safeParse(materiau);
        expect(result.success).toBe(true);
      });
    });

    it('devrait accepter des catégories courantes', () => {
      const categories = [
        'Membranes élastomériques',
        'Isolants',
        'Pare-vapeur',
        'Drain',
        'Main d\'oeuvre',
      ];

      categories.forEach((categorie) => {
        const materiau = {
          nom: 'Test',
          categorie,
        };

        const result = createMateriauSchema.safeParse(materiau);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('updateMateriauSchema', () => {
    it('devrait valider une mise à jour complète valide', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nom: 'Membrane TPO',
        categorie: 'Membranes thermoplastiques',
        unite: 'm²',
        prixUnitaire: 15.75,
        description: 'Membrane blanche réfléchissante',
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait valider une mise à jour partielle', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        nom: 'Membrane TPO',
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        nom: 'Membrane TPO',
      };

      const result = updateMateriauSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un UUID invalide', () => {
      const invalidUpdate = {
        id: 'invalid-uuid',
        nom: 'Membrane TPO',
      };

      const result = updateMateriauSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait rejeter un ID vide', () => {
      const invalidUpdate = {
        id: '',
        nom: 'Membrane TPO',
      };

      const result = updateMateriauSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
