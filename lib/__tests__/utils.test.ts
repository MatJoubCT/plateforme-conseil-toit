import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn - Class Name Utility', () => {
  it('devrait combiner des classes simples', () => {
    expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3');
  });

  it('devrait filtrer les valeurs falsy', () => {
    expect(cn('class1', false, 'class2', null, 'class3', undefined)).toBe('class1 class2 class3');
  });

  it('devrait gérer une seule classe', () => {
    expect(cn('single-class')).toBe('single-class');
  });

  it('devrait retourner une chaîne vide pour des valeurs falsy uniquement', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('devrait gérer des expressions conditionnelles', () => {
    const isActive = true;
    const isDisabled = false;

    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('devrait gérer un tableau vide', () => {
    expect(cn()).toBe('');
  });

  it('devrait filtrer les chaînes vides', () => {
    // Les chaînes vides sont filtrées par filter(Boolean)
    expect(cn('', 'class1', '')).toBe('class1');
  });

  it('devrait préserver l\'ordre des classes', () => {
    expect(cn('first', 'second', 'third')).toBe('first second third');
  });

  it('devrait gérer des classes avec des tirets et underscores', () => {
    expect(cn('bg-blue-500', 'text_center', 'hover:bg-red-500')).toBe(
      'bg-blue-500 text_center hover:bg-red-500'
    );
  });

  it('devrait permettre les expressions complexes', () => {
    const variant = 'primary';
    const size = 'lg';

    expect(cn('button', variant === 'primary' && 'button-primary', `button-${size}`)).toBe(
      'button button-primary button-lg'
    );
  });

  it('devrait gérer des valeurs répétées', () => {
    expect(cn('class1', 'class1', 'class2')).toBe('class1 class1 class2');
  });

  it('devrait filtrer tous les types falsy', () => {
    // filter(Boolean) filtre aussi le nombre 0
    expect(cn('class1', null, false, undefined, 'class2', 0 as unknown as string)).toBe(
      'class1 class2'
    );
  });
});
