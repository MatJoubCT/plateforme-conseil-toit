import { describe, it, expect } from 'vitest';
import { createMateriauSchema, updateMateriauSchema } from '../materiau.schema';

// Test UUIDs (valid v4 format)
const TEST_UUIDS = {
  categorie1: '550e8400-e29b-41d4-a716-446655440001',
  categorie2: '550e8400-e29b-41d4-a716-446655440002',
  unite1: '550e8400-e29b-41d4-a716-446655440011',
  unite2: '550e8400-e29b-41d4-a716-446655440012',
  manufacturier1: '550e8400-e29b-41d4-a716-446655440021',
  materiau1: '550e8400-e29b-41d4-a716-446655440031',
};

describe('Materiau Schema Validation', () => {
  describe('createMateriauSchema', () => {
    it('devrait valider un matériau complet valide', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        categorie_id: TEST_UUIDS.categorie1,
        unite_id: TEST_UUIDS.unite1,
        prix_cad: 12.50,
        description: 'Membrane haute performance pour toitures plates',
        manufacturier_entreprise_id: TEST_UUIDS.manufacturier1,
        actif: true,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait valider un matériau avec seulement les champs requis', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        actif: true,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait utiliser la valeur par défaut pour actif', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actif).toBe(true);
      }
    });

    it('devrait valider un matériau avec champs optionnels vides (chaînes vides)', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        categorie_id: '',
        unite_id: '',
        description: '',
        manufacturier_entreprise_id: '',
        actif: true,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait valider un matériau avec champs optionnels null', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        categorie_id: null,
        unite_id: null,
        description: null,
        manufacturier_entreprise_id: null,
        actif: false,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un nom vide', () => {
      const invalidMateriau = {
        nom: '',
        prix_cad: 12.50,
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
        prix_cad: 12.50,
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
        prix_cad: 12.50,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un categorie_id invalide (pas un UUID)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        categorie_id: 'not-a-uuid',
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait accepter un categorie_id UUID valide', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        categorie_id: TEST_UUIDS.categorie1,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un unite_id invalide (pas un UUID)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        unite_id: 'not-a-uuid',
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait accepter un unite_id UUID valide', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        unite_id: TEST_UUIDS.unite1,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un manufacturier_entreprise_id invalide (pas un UUID)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        manufacturier_entreprise_id: 'not-a-uuid',
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait accepter un manufacturier_entreprise_id UUID valide', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        manufacturier_entreprise_id: TEST_UUIDS.manufacturier1,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un prix de 0', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 0,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un prix décimal', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.99,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un prix entier', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 25,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait accepter le prix maximal (1,000,000)', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 1000000,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un prix négatif', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: -10,
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
        prix_cad: 1000001,
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop élevé');
      }
    });

    it('devrait rejeter si prix_cad est absent', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod retourne "Invalid input: expected number, received undefined" pour un nombre manquant
        expect(result.error.issues[0].message).toContain('expected number');
      }
    });

    it('devrait accepter une description de longueur raisonnable', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        description: 'x'.repeat(1000),
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une description trop longue (> 1000 caractères)', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        description: 'x'.repeat(1001),
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop longue');
      }
    });

    it('devrait accepter actif = true', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        actif: true,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actif).toBe(true);
      }
    });

    it('devrait accepter actif = false', () => {
      const validMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        actif: false,
      };

      const result = createMateriauSchema.safeParse(validMateriau);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actif).toBe(false);
      }
    });

    it('devrait rejeter actif avec valeur non-booléenne', () => {
      const invalidMateriau = {
        nom: 'Membrane EPDM',
        prix_cad: 12.50,
        actif: 'true' as any, // String au lieu de boolean
      };

      const result = createMateriauSchema.safeParse(invalidMateriau);
      expect(result.success).toBe(false);
    });

    it('devrait accepter plusieurs UUIDs de catégories différentes', () => {
      const categories = [
        TEST_UUIDS.categorie1,
        TEST_UUIDS.categorie2,
      ];

      categories.forEach((categorie_id) => {
        const materiau = {
          nom: 'Test',
          prix_cad: 10,
          categorie_id,
        };

        const result = createMateriauSchema.safeParse(materiau);
        expect(result.success).toBe(true);
      });
    });

    it('devrait accepter plusieurs UUIDs d\'unités différentes', () => {
      const unites = [
        TEST_UUIDS.unite1,
        TEST_UUIDS.unite2,
      ];

      unites.forEach((unite_id) => {
        const materiau = {
          nom: 'Test',
          prix_cad: 10,
          unite_id,
        };

        const result = createMateriauSchema.safeParse(materiau);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('updateMateriauSchema', () => {
    it('devrait valider une mise à jour complète valide', () => {
      const validUpdate = {
        id: TEST_UUIDS.materiau1,
        nom: 'Membrane TPO',
        categorie_id: TEST_UUIDS.categorie1,
        unite_id: TEST_UUIDS.unite1,
        prix_cad: 15.75,
        description: 'Membrane blanche réfléchissante',
        manufacturier_entreprise_id: TEST_UUIDS.manufacturier1,
        actif: true,
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait valider une mise à jour partielle (seulement nom et id)', () => {
      const validUpdate = {
        id: TEST_UUIDS.materiau1,
        nom: 'Membrane TPO',
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait valider une mise à jour partielle (prix seulement)', () => {
      const validUpdate = {
        id: TEST_UUIDS.materiau1,
        prix_cad: 20.00,
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait valider une mise à jour du statut actif seulement', () => {
      const validUpdate = {
        id: TEST_UUIDS.materiau1,
        actif: false,
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        nom: 'Membrane TPO',
        prix_cad: 15.75,
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

    it('devrait rejeter un nom vide dans une mise à jour', () => {
      const invalidUpdate = {
        id: TEST_UUIDS.materiau1,
        nom: '',
      };

      const result = updateMateriauSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoire');
      }
    });

    it('devrait rejeter un prix négatif dans une mise à jour', () => {
      const invalidUpdate = {
        id: TEST_UUIDS.materiau1,
        prix_cad: -5,
      };

      const result = updateMateriauSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('négatif');
      }
    });

    it('devrait rejeter un categorie_id invalide dans une mise à jour', () => {
      const invalidUpdate = {
        id: TEST_UUIDS.materiau1,
        categorie_id: 'not-a-uuid',
      };

      const result = updateMateriauSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait accepter categorie_id null dans une mise à jour', () => {
      const validUpdate = {
        id: TEST_UUIDS.materiau1,
        categorie_id: null,
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait accepter tous les champs optionnels comme null', () => {
      const validUpdate = {
        id: TEST_UUIDS.materiau1,
        categorie_id: null,
        unite_id: null,
        description: null,
        manufacturier_entreprise_id: null,
      };

      const result = updateMateriauSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });
  });
});
