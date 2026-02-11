import { describe, it, expect } from 'vitest';
import {
  createListeChoixSchema,
  updateListeChoixSchema,
  updateOrdreSchema,
  CATEGORIES_REFERENCE,
} from '../liste.schema';

describe('Liste Schema Validation', () => {
  describe('createListeChoixSchema', () => {
    it('devrait valider un élément de liste complet valide', () => {
      const validListe = {
        categorie: 'etat_bassin',
        code: 'urgent',
        label: 'Urgent',
        couleur: '#DC3545',
        ordre: 1,
        description: 'Intervention immédiate requise',
      };

      const result = createListeChoixSchema.safeParse(validListe);
      expect(result.success).toBe(true);
    });

    it('devrait valider un élément avec champs optionnels vides', () => {
      const validListe = {
        categorie: 'type_membrane',
        label: 'EPDM',
      };

      const result = createListeChoixSchema.safeParse(validListe);
      expect(result.success).toBe(true);
    });

    it('devrait valider un élément avec champs optionnels null', () => {
      const validListe = {
        categorie: 'duree_vie',
        label: '20-25 ans',
        code: null,
        couleur: null,
        ordre: null,
        description: null,
      };

      const result = createListeChoixSchema.safeParse(validListe);
      expect(result.success).toBe(true);
    });

    it('devrait accepter toutes les catégories valides', () => {
      CATEGORIES_REFERENCE.forEach((categorie: string) => {
        const liste = {
          categorie,
          label: 'Test Label',
        };

        const result = createListeChoixSchema.safeParse(liste);
        expect(result.success).toBe(true);
      });
    });

    it('devrait accepter toute catégorie valide (chaîne non vide)', () => {
      const validListe = {
        categorie: 'categorie_personnalisee',
        label: 'Test',
      };

      const result = createListeChoixSchema.safeParse(validListe);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une catégorie vide', () => {
      const invalidListe = {
        categorie: '',
        label: 'Test',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un label vide', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: '',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obligatoire');
      }
    });

    it('devrait rejeter un label trop long (> 200 caractères)', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'x'.repeat(201),
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
    });

    it('devrait accepter des codes valides (minuscules, chiffres, underscores)', () => {
      const codes = [
        'urgent',
        'a_surveiller',
        'bon_etat',
        'type_1',
        'etat_2024',
        'abc_123_xyz',
      ];

      codes.forEach((code) => {
        const liste = {
          categorie: 'etat_bassin',
          label: 'Test',
          code,
        };

        const result = createListeChoixSchema.safeParse(liste);
        expect(result.success).toBe(true);
      });
    });

    it('devrait rejeter un code avec majuscules', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        code: 'Urgent',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('minuscules');
      }
    });

    it('devrait rejeter un code avec espaces', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        code: 'a surveiller',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('minuscules');
      }
    });

    it('devrait rejeter un code avec caractères spéciaux', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        code: 'urgent!',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('minuscules');
      }
    });

    it('devrait rejeter un code avec tirets', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        code: 'a-surveiller',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('underscores');
      }
    });

    it('devrait rejeter un code trop long (> 50 caractères)', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        code: 'x'.repeat(51),
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('trop long');
      }
    });

    it('devrait accepter des couleurs hexadécimales valides', () => {
      const couleurs = [
        '#000000',
        '#FFFFFF',
        '#DC3545',
        '#28A745',
        '#FFC107',
        '#6C757D',
        '#007bff',
        '#aaBBcc',
      ];

      couleurs.forEach((couleur) => {
        const liste = {
          categorie: 'etat_bassin',
          label: 'Test',
          couleur,
        };

        const result = createListeChoixSchema.safeParse(liste);
        expect(result.success).toBe(true);
      });
    });

    it('devrait rejeter une couleur sans dièse', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        couleur: 'DC3545',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('hexadécimal');
      }
    });

    it('devrait rejeter une couleur trop courte', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        couleur: '#FFF',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('#RRGGBB');
      }
    });

    it('devrait rejeter une couleur trop longue', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        couleur: '#FFFFFF00',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('#RRGGBB');
      }
    });

    it('devrait rejeter une couleur avec caractères invalides', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        couleur: '#GGGGGG',
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('hexadécimal');
      }
    });

    it('devrait accepter un ordre de 0', () => {
      const validListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        ordre: 0,
      };

      const result = createListeChoixSchema.safeParse(validListe);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un ordre positif', () => {
      const validListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        ordre: 99,
      };

      const result = createListeChoixSchema.safeParse(validListe);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un ordre négatif', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        ordre: -1,
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('négatif');
      }
    });

    it('devrait rejeter un ordre décimal', () => {
      const invalidListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        ordre: 1.5,
      };

      const result = createListeChoixSchema.safeParse(invalidListe);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('entier');
      }
    });

    it('devrait ignorer les champs inconnus (ex: description)', () => {
      const validListe = {
        categorie: 'etat_bassin',
        label: 'Test',
        description: 'x'.repeat(500),
      };

      // Zod strips unknown keys by default
      const result = createListeChoixSchema.safeParse(validListe);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).description).toBeUndefined();
      }
    });
  });

  describe('updateListeChoixSchema', () => {
    it('devrait valider une mise à jour complète valide', () => {
      const validUpdate = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        categorie: 'etat_bassin',
        code: 'urgent',
        label: 'Urgent - Mise à jour',
        couleur: '#FF0000',
        ordre: 1,
        description: 'Description mise à jour',
      };

      const result = updateListeChoixSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une mise à jour sans ID', () => {
      const invalidUpdate = {
        categorie: 'etat_bassin',
        label: 'Test',
      };

      const result = updateListeChoixSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un UUID invalide', () => {
      const invalidUpdate = {
        id: 'invalid-uuid',
        categorie: 'etat_bassin',
        label: 'Test',
      };

      const result = updateListeChoixSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait rejeter un ID vide', () => {
      const invalidUpdate = {
        id: '',
        categorie: 'etat_bassin',
        label: 'Test',
      };

      const result = updateListeChoixSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('updateOrdreSchema', () => {
    it('devrait valider une mise à jour d\'ordre valide', () => {
      const validUpdate = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            ordre: 1,
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            ordre: 2,
          },
        ],
      };

      const result = updateOrdreSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait accepter un tableau vide', () => {
      const validUpdate = {
        items: [],
      };

      const result = updateOrdreSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter un UUID invalide dans les items', () => {
      const invalidUpdate = {
        items: [
          {
            id: 'invalid-uuid',
            ordre: 1,
          },
        ],
      };

      const result = updateOrdreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('invalide');
      }
    });

    it('devrait rejeter un ordre négatif dans les items', () => {
      const invalidUpdate = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            ordre: -1,
          },
        ],
      };

      const result = updateOrdreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un ordre décimal dans les items', () => {
      const invalidUpdate = {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            ordre: 1.5,
          },
        ],
      };

      const result = updateOrdreSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });
});
