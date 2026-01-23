import { describe, it, expect } from 'vitest';
import { m2ToFt2 } from '../units';

describe('m2ToFt2 - Unit Conversion', () => {
  it('devrait convertir des mètres carrés en pieds carrés', () => {
    // 1 m² = 10.7639 ft²
    expect(m2ToFt2(1)).toBe(11);
    expect(m2ToFt2(10)).toBe(108);
    expect(m2ToFt2(100)).toBe(1076);
  });

  it('devrait arrondir à l\'entier le plus proche', () => {
    // 1.5 m² = 16.14585 ft² ≈ 16 ft²
    expect(m2ToFt2(1.5)).toBe(16);

    // 2.3 m² = 24.75697 ft² ≈ 25 ft²
    expect(m2ToFt2(2.3)).toBe(25);
  });

  it('devrait gérer zéro', () => {
    expect(m2ToFt2(0)).toBe(0);
  });

  it('devrait retourner null pour null', () => {
    expect(m2ToFt2(null)).toBeNull();
  });

  it('devrait retourner null pour undefined', () => {
    expect(m2ToFt2(undefined)).toBeNull();
  });

  it('devrait gérer de grandes valeurs', () => {
    // 1000 m² = 10763.9 ft² ≈ 10764 ft²
    expect(m2ToFt2(1000)).toBe(10764);
  });

  it('devrait gérer de petites valeurs décimales', () => {
    // 0.5 m² = 5.38195 ft² ≈ 5 ft²
    expect(m2ToFt2(0.5)).toBe(5);

    // 0.1 m² = 1.07639 ft² ≈ 1 ft²
    expect(m2ToFt2(0.1)).toBe(1);
  });

  it('devrait utiliser le facteur de conversion correct (10.7639)', () => {
    // Vérifier que le facteur de conversion est précis
    const result = m2ToFt2(1);
    // 1 m² * 10.7639 = 10.7639 ft² ≈ 11 ft²
    expect(result).toBe(Math.round(10.7639));
  });

  it('devrait gérer des valeurs très précises', () => {
    // 50.5 m² = 543.57695 ft² ≈ 544 ft²
    expect(m2ToFt2(50.5)).toBe(544);
  });

  it('devrait convertir correctement des exemples réels', () => {
    // Exemple: bassin de 250 m²
    // 250 m² = 2690.975 ft² ≈ 2691 ft²
    expect(m2ToFt2(250)).toBe(2691);

    // Exemple: bassin de 100 m²
    // 100 m² = 1076.39 ft² ≈ 1076 ft²
    expect(m2ToFt2(100)).toBe(1076);
  });
});
