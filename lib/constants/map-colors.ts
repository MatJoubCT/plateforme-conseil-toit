// lib/constants/map-colors.ts

/**
 * Constantes de couleurs pour les états de bassins
 * Ces couleurs correspondent à celles définies dans listes_choix
 */
export const ETAT_COLORS = {
  bon: '#28A745',
  surveiller: '#FFC107',
  planifier: '#FD7E14',
  urgent: '#DC3545',
  non_evalue: '#6C757D',
} as const

/**
 * Mapping des codes d'état vers leurs labels en français
 */
export const ETAT_LABELS = {
  bon: 'Bon',
  surveiller: 'À surveiller',
  planifier: 'Réfection à planifier',
  urgent: 'Urgent',
  non_evalue: 'Non évalué',
} as const

/**
 * Configuration par défaut pour les polygones
 */
export const DEFAULT_POLYGON_CONFIG = {
  fillOpacity: 0.4,
  strokeOpacity: 1,
  strokeWeight: 2,
  clickable: true,
  editable: false,
  draggable: false,
} as const

/**
 * Configuration pour les polygones en mode édition
 */
export const EDIT_POLYGON_CONFIG = {
  fillOpacity: 0.5,
  strokeOpacity: 1,
  strokeWeight: 3,
  clickable: true,
  editable: true,
  draggable: false,
} as const

/**
 * Couleurs pour les markers d'intervention par type
 */
export const INTERVENTION_MARKER_COLORS = {
  infiltration: '#3B82F6', // Bleu
  reparation: '#F59E0B', // Orange
  ajout: '#10B981', // Vert
  modification: '#8B5CF6', // Violet
  default: '#6B7280', // Gris
} as const

/**
 * Configuration de la carte Google Maps
 */
export const MAP_DEFAULT_OPTIONS = {
  mapTypeId: 'satellite' as google.maps.MapTypeId,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: true,
  mapTypeControl: true,
  rotateControl: false,
  tilt: 0,
  heading: 0,
  gestureHandling: 'greedy',
} as const

/**
 * Zoom par défaut selon le contexte
 */
export const MAP_ZOOM_LEVELS = {
  building: 18, // Vue d'un bâtiment spécifique
  bassin: 19, // Vue d'un bassin spécifique
  overview: 15, // Vue d'ensemble de plusieurs bâtiments
  city: 12, // Vue d'une ville
} as const

/**
 * Opacité pour différents états de polygone
 */
export const POLYGON_OPACITY = {
  default: 0.4,
  hover: 0.6,
  selected: 0.7,
  dimmed: 0.2, // Pour les polygones non sélectionnés
} as const

/**
 * Classes Tailwind pour les badges d'état
 */
export const ETAT_BADGE_CLASSES = {
  bon: 'bg-green-100 text-green-800 border-green-200',
  surveiller: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  planifier: 'bg-orange-100 text-orange-800 border-orange-200',
  urgent: 'bg-red-100 text-red-800 border-red-200',
  non_evalue: 'bg-gray-100 text-gray-800 border-gray-200',
} as const

/**
 * Icônes pour les types d'intervention (emoji ou caractères)
 */
export const INTERVENTION_ICONS = {
  infiltration: '💧',
  reparation: '🔧',
  ajout: '➕',
  modification: '✏️',
  default: '📍',
} as const
