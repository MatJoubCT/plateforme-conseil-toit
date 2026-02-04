import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateUUID,
  validatePassword,
  sanitizeError,
  logError,
  validateRedirectUrl,
  GENERIC_ERROR_MESSAGES,
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateUUID', () => {
    it('devrait valider un UUID v4 valide', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      ];

      validUUIDs.forEach((uuid) => {
        const result = validateUUID(uuid);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(uuid);
        }
      });
    });

    it('devrait rejeter un UUID invalide', () => {
      const result = validateUUID('invalid-uuid');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('invalide');
      }
    });

    it('devrait rejeter une chaîne vide', () => {
      const result = validateUUID('');

      expect(result.success).toBe(false);
    });

    it('devrait rejeter null', () => {
      const result = validateUUID(null);

      expect(result.success).toBe(false);
    });

    it('devrait rejeter undefined', () => {
      const result = validateUUID(undefined);

      expect(result.success).toBe(false);
    });

    it('devrait rejeter un nombre', () => {
      const result = validateUUID(123);

      expect(result.success).toBe(false);
    });

    it('devrait rejeter un UUID sans tirets', () => {
      const result = validateUUID('550e8400e29b41d4a716446655440000');

      expect(result.success).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('devrait accepter un mot de passe valide', () => {
      const validPasswords = [
        'MyP@ssw0rd123',
        'Secur3P@ssword!',
        'C0mpl3x!P@ssw0rd',
        'Abc123!@#$%^',
      ];

      validPasswords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(password);
        }
      });
    });

    it('devrait rejeter un mot de passe trop court (< 12 caractères)', () => {
      const result = validatePassword('Short1!');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Le mot de passe doit contenir au moins 12 caractères');
      }
    });

    it('devrait rejeter un mot de passe sans majuscule', () => {
      const result = validatePassword('myp@ssw0rd123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Le mot de passe doit contenir au moins une majuscule');
      }
    });

    it('devrait rejeter un mot de passe sans minuscule', () => {
      const result = validatePassword('MYP@SSW0RD123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Le mot de passe doit contenir au moins une minuscule');
      }
    });

    it('devrait rejeter un mot de passe sans chiffre', () => {
      const result = validatePassword('MyP@ssword!!!');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('Le mot de passe doit contenir au moins un chiffre');
      }
    });

    it('devrait rejeter un mot de passe sans caractère spécial', () => {
      const result = validatePassword('MyPassword123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(err => err.includes('caractère spécial'))).toBe(true);
      }
    });

    it('devrait retourner plusieurs erreurs pour un mot de passe très faible', () => {
      const result = validatePassword('weak');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(1);
      }
    });

    it('devrait accepter différents caractères spéciaux', () => {
      const passwords = [
        'MyP@ssw0rd123',
        'MyP#ssw0rd123',
        'MyP$ssw0rd123',
        'MyP%ssw0rd123',
        'MyP^ssw0rd123',
        'MyP&ssw0rd123',
        'MyP*ssw0rd123',
      ];

      passwords.forEach((password) => {
        const result = validatePassword(password);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('sanitizeError', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('devrait retourner le message d\'erreur détaillé en développement', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const error = new Error('Detailed error message');

      const result = sanitizeError(error);

      expect(result).toBe('Detailed error message');
    });

    it('devrait retourner une chaîne d\'erreur en développement', () => {
      vi.stubEnv('NODE_ENV', 'development');
      const error = 'String error message';

      const result = sanitizeError(error);

      expect(result).toBe('String error message');
    });

    it('devrait retourner un message générique en production pour une Error', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const error = new Error('Sensitive error details');

      const result = sanitizeError(error);

      expect(result).toBe(GENERIC_ERROR_MESSAGES.SERVER_ERROR);
      expect(result).not.toContain('Sensitive');
    });

    it('devrait retourner un message générique en production pour une chaîne', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const error = 'Sensitive error details';

      const result = sanitizeError(error);

      expect(result).toBe(GENERIC_ERROR_MESSAGES.SERVER_ERROR);
      expect(result).not.toContain('Sensitive');
    });

    it('devrait utiliser le message de fallback personnalisé', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const error = new Error('Some error');
      const customFallback = 'Custom error message';

      const result = sanitizeError(error, customFallback);

      expect(result).toBe(customFallback);
    });

    it('devrait gérer des types d\'erreur inconnus en production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const error = { some: 'object' };

      const result = sanitizeError(error);

      expect(result).toBe(GENERIC_ERROR_MESSAGES.SERVER_ERROR);
    });
  });

  describe('logError', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('devrait logger une erreur avec le contexte', () => {
      const error = new Error('Test error');
      const context = 'API /users/create';

      logError(context, error);

      expect(console.error).toHaveBeenCalledWith(`[${context}]`, error, undefined);
    });

    it('devrait logger une erreur avec des métadonnées', () => {
      const error = new Error('Test error');
      const context = 'API /users/create';
      const metadata = { userId: '123', action: 'create' };

      logError(context, error, metadata);

      expect(console.error).toHaveBeenCalledWith(`[${context}]`, error, metadata);
    });

    it('devrait logger une chaîne d\'erreur', () => {
      const error = 'String error';
      const context = 'Test context';

      logError(context, error);

      expect(console.error).toHaveBeenCalledWith(`[${context}]`, error, undefined);
    });
  });

  describe('validateRedirectUrl', () => {
    const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

    beforeEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    });

    afterEach(() => {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    });

    it('devrait accepter une URL de redirection valide vers /admin', () => {
      const result = validateRedirectUrl('/admin');

      expect(result).toBe('/admin');
    });

    it('devrait accepter une URL de redirection valide vers /client', () => {
      const result = validateRedirectUrl('/client');

      expect(result).toBe('/client');
    });

    it('devrait accepter une URL complète vers /admin', () => {
      const result = validateRedirectUrl('http://localhost:3000/admin');

      expect(result).toBe('/admin');
    });

    it('devrait accepter un sous-chemin de /admin', () => {
      const result = validateRedirectUrl('/admin/users');

      expect(result).toBe('/admin/users');
    });

    it('devrait accepter un sous-chemin de /client', () => {
      const result = validateRedirectUrl('/client/dashboard');

      expect(result).toBe('/client/dashboard');
    });

    it('devrait rejeter null', () => {
      const result = validateRedirectUrl(null);

      expect(result).toBeNull();
    });

    it('devrait rejeter undefined', () => {
      const result = validateRedirectUrl(undefined);

      expect(result).toBeNull();
    });

    it('devrait rejeter une chaîne vide', () => {
      const result = validateRedirectUrl('');

      expect(result).toBeNull();
    });

    it('devrait rejeter une URL vers un domaine externe', () => {
      const result = validateRedirectUrl('https://evil.com/admin');

      expect(result).toBeNull();
    });

    it('devrait rejeter une URL vers un chemin non autorisé', () => {
      const result = validateRedirectUrl('/unauthorized');

      expect(result).toBeNull();
    });

    it('devrait rejeter une URL vers la racine', () => {
      const result = validateRedirectUrl('/');

      expect(result).toBeNull();
    });

    it('devrait accepter des chemins personnalisés si fournis', () => {
      const result = validateRedirectUrl('/custom-path', ['/custom-path']);

      expect(result).toBe('/custom-path');
    });

    it('devrait rejeter un chemin non inclus dans les chemins autorisés', () => {
      const result = validateRedirectUrl('/admin', ['/client']);

      expect(result).toBeNull();
    });

    it('devrait gérer les URLs malformées', () => {
      const result = validateRedirectUrl('not a valid url');

      // Pourrait être accepté comme chemin relatif si autorisé, sinon rejeté
      expect([null, '/not a valid url']).toContain(result);
    });

    it('devrait empêcher les open redirects avec protocol-relative URLs', () => {
      const result = validateRedirectUrl('//evil.com/admin');

      expect(result).toBeNull();
    });
  });

  describe('GENERIC_ERROR_MESSAGES', () => {
    it('devrait contenir tous les messages d\'erreur génériques', () => {
      expect(GENERIC_ERROR_MESSAGES.AUTH_FAILED).toBeDefined();
      expect(GENERIC_ERROR_MESSAGES.UNAUTHORIZED).toBeDefined();
      expect(GENERIC_ERROR_MESSAGES.NOT_FOUND).toBeDefined();
      expect(GENERIC_ERROR_MESSAGES.INVALID_INPUT).toBeDefined();
      expect(GENERIC_ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
      expect(GENERIC_ERROR_MESSAGES.FORBIDDEN).toBeDefined();
      expect(GENERIC_ERROR_MESSAGES.RATE_LIMIT).toBeDefined();
    });

    it('devrait avoir des messages en français', () => {
      expect(GENERIC_ERROR_MESSAGES.AUTH_FAILED).toContain('authentification');
      expect(GENERIC_ERROR_MESSAGES.SERVER_ERROR).toContain('erreur');
    });
  });
});
