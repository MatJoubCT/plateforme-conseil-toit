import { describe, it, expect } from 'vitest'
import { mapEtatToStateBadge } from '../bassin-utils'

describe('mapEtatToStateBadge', () => {
  it('devrait retourner non_evalue pour null', () => {
    expect(mapEtatToStateBadge(null)).toBe('non_evalue')
  })

  it('devrait retourner non_evalue pour une chaîne vide', () => {
    expect(mapEtatToStateBadge('')).toBe('non_evalue')
  })

  it('devrait détecter "Urgent"', () => {
    expect(mapEtatToStateBadge('Urgent')).toBe('urgent')
  })

  it('devrait détecter "urgent" en minuscule', () => {
    expect(mapEtatToStateBadge('urgent')).toBe('urgent')
  })

  it('devrait détecter "Très bon" (avec accent)', () => {
    expect(mapEtatToStateBadge('Très bon')).toBe('tres_bon')
  })

  it('devrait détecter "Excellent"', () => {
    expect(mapEtatToStateBadge('Excellent')).toBe('tres_bon')
  })

  it('devrait détecter "Bon" (pas "Très bon")', () => {
    expect(mapEtatToStateBadge('Bon')).toBe('bon')
  })

  it('devrait détecter "À surveiller" (avec accent)', () => {
    expect(mapEtatToStateBadge('À surveiller')).toBe('a_surveille')
  })

  it('devrait détecter "Réfection à planifier"', () => {
    expect(mapEtatToStateBadge('Réfection à planifier')).toBe('planifier')
  })

  it('devrait détecter "Planification"', () => {
    expect(mapEtatToStateBadge('Planification')).toBe('planifier')
  })

  it('devrait retourner non_evalue pour un texte inconnu', () => {
    expect(mapEtatToStateBadge('Texte inconnu')).toBe('non_evalue')
  })

  it('devrait traiter "Très bon" AVANT "Bon"', () => {
    // "Très bon" contient "bon", mais doit matcher tres_bon
    expect(mapEtatToStateBadge('Très bon')).toBe('tres_bon')
  })

  it('devrait gérer les majuscules mixtes', () => {
    expect(mapEtatToStateBadge('URGENT')).toBe('urgent')
    expect(mapEtatToStateBadge('BON')).toBe('bon')
    expect(mapEtatToStateBadge('TRÈS BON')).toBe('tres_bon')
  })
})
