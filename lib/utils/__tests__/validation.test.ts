import { describe, it, expect } from 'vitest';
import {
  validateLatitude,
  validateLongitude,
  validateCoordinates,
  validatePositiveNumber,
  validateYear,
  validateEmail,
} from '../validation';

describe('Form Validation Utilities', () => {
  describe('validateLatitude', () => {
    it('devrait accepter une latitude valide', () => {
      expect(validateLatitude('45.5')).toBe(45.5);
      expect(validateLatitude('0')).toBe(0);
      expect(validateLatitude('90')).toBe(90);
      expect(validateLatitude('-90')).toBe(-90);
    });

    it('devrait accepter une latitude avec espaces', () => {
      expect(validateLatitude('  45.5  ')).toBe(45.5);
    });

    it('devrait accepter une latitude décimale', () => {
      expect(validateLatitude('45.5017')).toBe(45.5017);
      expect(validateLatitude('-73.123456')).toBe(-73.123456);
    });

    it('devrait rejeter une latitude trop grande (> 90)', () => {
      expect(validateLatitude('91')).toBeNull();
      expect(validateLatitude('100')).toBeNull();
    });

    it('devrait rejeter une latitude trop petite (< -90)', () => {
      expect(validateLatitude('-91')).toBeNull();
      expect(validateLatitude('-100')).toBeNull();
    });

    it('devrait rejeter une chaîne vide', () => {
      expect(validateLatitude('')).toBeNull();
      expect(validateLatitude('   ')).toBeNull();
    });

    it('devrait rejeter null', () => {
      expect(validateLatitude(null)).toBeNull();
    });

    it('devrait rejeter undefined', () => {
      expect(validateLatitude(undefined)).toBeNull();
    });

    it('devrait gérer les chaînes non numériques', () => {
      expect(validateLatitude('abc')).toBeNull();
      // Note: parseFloat accepte '45.5x' et retourne 45.5 (validation leniente)
      // Pour une validation stricte, il faudrait vérifier que value === String(parseFloat(value))
      expect(validateLatitude('45.5x')).toBe(45.5);
    });
  });

  describe('validateLongitude', () => {
    it('devrait accepter une longitude valide', () => {
      expect(validateLongitude('-73.5')).toBe(-73.5);
      expect(validateLongitude('0')).toBe(0);
      expect(validateLongitude('180')).toBe(180);
      expect(validateLongitude('-180')).toBe(-180);
    });

    it('devrait accepter une longitude avec espaces', () => {
      expect(validateLongitude('  -73.5  ')).toBe(-73.5);
    });

    it('devrait accepter une longitude décimale', () => {
      expect(validateLongitude('-73.5673')).toBe(-73.5673);
      expect(validateLongitude('120.123456')).toBe(120.123456);
    });

    it('devrait rejeter une longitude trop grande (> 180)', () => {
      expect(validateLongitude('181')).toBeNull();
      expect(validateLongitude('200')).toBeNull();
    });

    it('devrait rejeter une longitude trop petite (< -180)', () => {
      expect(validateLongitude('-181')).toBeNull();
      expect(validateLongitude('-200')).toBeNull();
    });

    it('devrait rejeter une chaîne vide', () => {
      expect(validateLongitude('')).toBeNull();
      expect(validateLongitude('   ')).toBeNull();
    });

    it('devrait rejeter null', () => {
      expect(validateLongitude(null)).toBeNull();
    });

    it('devrait rejeter undefined', () => {
      expect(validateLongitude(undefined)).toBeNull();
    });

    it('devrait gérer les chaînes non numériques', () => {
      expect(validateLongitude('abc')).toBeNull();
      // Note: parseFloat accepte '-73.5x' et retourne -73.5 (validation leniente)
      expect(validateLongitude('-73.5x')).toBe(-73.5);
    });
  });

  describe('validateCoordinates', () => {
    it('devrait accepter des coordonnées valides', () => {
      const result = validateCoordinates('45.5', '-73.5');

      expect(result.latitude).toBe(45.5);
      expect(result.longitude).toBe(-73.5);
      expect(result.error).toBeNull();
    });

    it('devrait accepter null pour les deux coordonnées', () => {
      const result = validateCoordinates(null, null);

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toBeNull();
    });

    it('devrait accepter undefined pour les deux coordonnées', () => {
      const result = validateCoordinates(undefined, undefined);

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toBeNull();
    });

    it('devrait accepter des chaînes vides pour les deux coordonnées', () => {
      const result = validateCoordinates('', '');

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toBeNull();
    });

    it('devrait rejeter si latitude fournie sans longitude', () => {
      const result = validateCoordinates('45.5', '');

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toContain('latitude et la longitude');
    });

    it('devrait rejeter si longitude fournie sans latitude', () => {
      const result = validateCoordinates('', '-73.5');

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toContain('latitude et la longitude');
    });

    it('devrait rejeter si latitude invalide', () => {
      const result = validateCoordinates('91', '-73.5');

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toContain('invalides');
    });

    it('devrait rejeter si longitude invalide', () => {
      const result = validateCoordinates('45.5', '181');

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toContain('invalides');
    });

    it('devrait rejeter si les deux coordonnées sont invalides', () => {
      const result = validateCoordinates('91', '181');

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.error).toContain('invalides');
    });

    it('devrait afficher les plages valides dans le message d\'erreur', () => {
      const result = validateCoordinates('100', '200');

      expect(result.error).toContain('-90 à 90');
      expect(result.error).toContain('-180 à 180');
    });
  });

  describe('validatePositiveNumber', () => {
    it('devrait accepter un nombre positif', () => {
      expect(validatePositiveNumber('10')).toBe(10);
      expect(validatePositiveNumber('123.45')).toBe(123.45);
    });

    it('devrait accepter zéro', () => {
      expect(validatePositiveNumber('0')).toBe(0);
    });

    it('devrait accepter un nombre avec espaces', () => {
      expect(validatePositiveNumber('  10  ')).toBe(10);
    });

    it('devrait rejeter un nombre négatif', () => {
      expect(validatePositiveNumber('-10')).toBeNull();
      expect(validatePositiveNumber('-0.5')).toBeNull();
    });

    it('devrait rejeter une chaîne vide', () => {
      expect(validatePositiveNumber('')).toBeNull();
      expect(validatePositiveNumber('   ')).toBeNull();
    });

    it('devrait rejeter null', () => {
      expect(validatePositiveNumber(null)).toBeNull();
    });

    it('devrait rejeter undefined', () => {
      expect(validatePositiveNumber(undefined)).toBeNull();
    });

    it('devrait gérer les chaînes non numériques', () => {
      expect(validatePositiveNumber('abc')).toBeNull();
      // Note: parseFloat accepte '10x' et retourne 10 (validation leniente)
      expect(validatePositiveNumber('10x')).toBe(10);
    });
  });

  describe('validateYear', () => {
    const currentYear = new Date().getFullYear();

    it('devrait accepter une année valide', () => {
      expect(validateYear('2024')).toBe(2024);
      expect(validateYear('2000')).toBe(2000);
      expect(validateYear('1900')).toBe(1900);
    });

    it('devrait accepter l\'année actuelle', () => {
      expect(validateYear(currentYear.toString())).toBe(currentYear);
    });

    it('devrait accepter l\'année actuelle + 1', () => {
      expect(validateYear((currentYear + 1).toString())).toBe(currentYear + 1);
    });

    it('devrait accepter une année avec espaces', () => {
      expect(validateYear('  2024  ')).toBe(2024);
    });

    it('devrait rejeter une année trop ancienne (< 1900)', () => {
      expect(validateYear('1899')).toBeNull();
      expect(validateYear('1800')).toBeNull();
    });

    it('devrait rejeter une année future (> année actuelle + 1)', () => {
      expect(validateYear((currentYear + 2).toString())).toBeNull();
      expect(validateYear((currentYear + 10).toString())).toBeNull();
    });

    it('devrait rejeter une chaîne vide', () => {
      expect(validateYear('')).toBeNull();
      expect(validateYear('   ')).toBeNull();
    });

    it('devrait rejeter null', () => {
      expect(validateYear(null)).toBeNull();
    });

    it('devrait rejeter undefined', () => {
      expect(validateYear(undefined)).toBeNull();
    });

    it('devrait gérer les chaînes non numériques', () => {
      expect(validateYear('abc')).toBeNull();
      // Note: parseInt accepte '2024x' et retourne 2024 (validation leniente)
      expect(validateYear('2024x')).toBe(2024);
    });

    it('devrait gérer les nombres décimaux', () => {
      // parseInt('2024.5') retourne 2024 (tronque la partie décimale)
      expect(validateYear('2024.5')).toBe(2024);
    });
  });

  describe('validateEmail', () => {
    it('devrait accepter un email valide', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@example.com')).toBe(true);
      expect(validateEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('devrait accepter un email avec espaces (trimé)', () => {
      expect(validateEmail('  test@example.com  ')).toBe(true);
    });

    it('devrait rejeter un email sans @', () => {
      expect(validateEmail('testexample.com')).toBe(false);
    });

    it('devrait rejeter un email sans domaine', () => {
      expect(validateEmail('test@')).toBe(false);
    });

    it('devrait rejeter un email sans nom d\'utilisateur', () => {
      expect(validateEmail('@example.com')).toBe(false);
    });

    it('devrait rejeter un email sans extension', () => {
      expect(validateEmail('test@example')).toBe(false);
    });

    it('devrait rejeter un email avec espaces dans l\'adresse', () => {
      expect(validateEmail('test user@example.com')).toBe(false);
    });

    it('devrait rejeter une chaîne vide', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });

    it('devrait rejeter null', () => {
      expect(validateEmail(null)).toBe(false);
    });

    it('devrait rejeter undefined', () => {
      expect(validateEmail(undefined)).toBe(false);
    });

    it('devrait rejeter des emails multiples', () => {
      expect(validateEmail('test1@example.com, test2@example.com')).toBe(false);
    });

    it('devrait accepter des emails avec chiffres', () => {
      expect(validateEmail('user123@example123.com')).toBe(true);
    });

    it('devrait accepter des emails avec tirets et underscores', () => {
      expect(validateEmail('user-name_123@example.com')).toBe(true);
    });
  });
});
