// lib/utils/bassin-utils.ts
// Utilitaires partagés pour les bassins.

import type { BassinState } from '@/components/ui/StateBadge'

/** Mappe un libellé d'état (ex. "Très bon") en variante pour StateBadge. */
export function mapEtatToStateBadge(etat: string | null): BassinState {
  if (!etat) return 'non_evalue'

  // Normaliser pour gérer accents (très -> tres)
  const v = etat
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  // IMPORTANT: traiter "tres bon" AVANT "bon"
  if (v.includes('urgent')) return 'urgent'
  if (v.includes('tres bon') || v.includes('excellent')) return 'tres_bon'
  if (v.includes('bon')) return 'bon'
  if (v.includes('surveiller')) return 'a_surveille'
  if (v.includes('planifier') || v.includes('planification')) return 'planifier'

  return 'non_evalue'
}
