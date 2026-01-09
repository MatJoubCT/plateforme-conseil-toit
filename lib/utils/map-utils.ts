// lib/utils/map-utils.ts

import type { GeoJSONPolygon, GeoJSONPoint, LatLng, MapBounds } from '@/types/maps'

/**
 * Convertit un polygone GeoJSON en tableau de coordonnées Google Maps
 */
export function geoJsonToLatLngPath(polygon: GeoJSONPolygon | null): LatLng[] {
  if (!polygon?.coordinates?.[0]?.length) return []
  
  return polygon.coordinates[0].map(([lng, lat]) => ({
    lat,
    lng,
  }))
}

/**
 * Convertit un point GeoJSON en coordonnées Google Maps
 */
export function geoJsonToLatLng(point: GeoJSONPoint | null): LatLng | null {
  if (!point?.coordinates) return null
  
  const [lng, lat] = point.coordinates
  return { lat, lng }
}

/**
 * Convertit un tableau de coordonnées Google Maps en polygone GeoJSON
 */
export function latLngPathToGeoJson(path: LatLng[]): GeoJSONPolygon {
  const coordinates = path.map((point) => [point.lng, point.lat])
  
  // Fermer le polygone si ce n'est pas déjà fait
  if (coordinates.length > 0) {
    const first = coordinates[0]
    const last = coordinates[coordinates.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push([...first])
    }
  }
  
  return {
    type: 'Polygon',
    coordinates: [coordinates],
  }
}

/**
 * Convertit des coordonnées Google Maps en point GeoJSON
 */
export function latLngToGeoJson(latLng: LatLng): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: [latLng.lng, latLng.lat],
  }
}

/**
 * Calcule les limites (bounds) d'un ensemble de polygones
 */
export function calculateBounds(polygons: LatLng[][]): MapBounds | null {
  if (polygons.length === 0) return null
  
  let north = -90
  let south = 90
  let east = -180
  let west = 180
  
  polygons.forEach((polygon) => {
    polygon.forEach((point) => {
      north = Math.max(north, point.lat)
      south = Math.min(south, point.lat)
      east = Math.max(east, point.lng)
      west = Math.min(west, point.lng)
    })
  })
  
  return { north, south, east, west }
}

/**
 * Calcule le centre d'un polygone
 */
export function calculatePolygonCenter(path: LatLng[]): LatLng {
  if (path.length === 0) {
    return { lat: 0, lng: 0 }
  }
  
  let totalLat = 0
  let totalLng = 0
  
  path.forEach((point) => {
    totalLat += point.lat
    totalLng += point.lng
  })
  
  return {
    lat: totalLat / path.length,
    lng: totalLng / path.length,
  }
}

/**
 * Calcule la surface approximative d'un polygone en m²
 * Utilise la formule de Shoelace (approximation pour petites zones)
 */
export function calculatePolygonArea(path: LatLng[]): number {
  if (path.length < 3) return 0
  
  // Constantes pour la conversion
  const EARTH_RADIUS = 6371000 // en mètres
  
  let area = 0
  
  for (let i = 0; i < path.length; i++) {
    const j = (i + 1) % path.length
    
    const lat1 = (path[i].lat * Math.PI) / 180
    const lat2 = (path[j].lat * Math.PI) / 180
    const lng1 = (path[i].lng * Math.PI) / 180
    const lng2 = (path[j].lng * Math.PI) / 180
    
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  
  area = (area * EARTH_RADIUS * EARTH_RADIUS) / 2
  
  return Math.abs(area)
}

/**
 * Formate une surface en m² de manière lisible
 */
export function formatSurface(surfaceM2: number | null): string {
  if (surfaceM2 === null || surfaceM2 === 0) return 'N/D'
  
  if (surfaceM2 < 1) {
    return `${Math.round(surfaceM2 * 100)} cm²`
  }
  
  return `${Math.round(surfaceM2).toLocaleString('fr-CA')} m²`
}

/**
 * Vérifie si un point est à l'intérieur d'un polygone
 */
export function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat
    
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * Calcule la distance entre deux points en mètres
 */
export function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371000 // Rayon de la Terre en mètres
  
  const lat1 = (point1.lat * Math.PI) / 180
  const lat2 = (point2.lat * Math.PI) / 180
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180
  
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Formate une distance de manière lisible
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return `${Math.round(meters * 100)} cm`
  }
  
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  
  return `${(meters / 1000).toFixed(2)} km`
}

/**
 * Crée un padding autour des bounds pour un meilleur affichage
 */
export function padBounds(bounds: MapBounds, paddingPercent: number = 10): MapBounds {
  const latRange = bounds.north - bounds.south
  const lngRange = bounds.east - bounds.west
  
  const latPadding = (latRange * paddingPercent) / 100
  const lngPadding = (lngRange * paddingPercent) / 100
  
  return {
    north: bounds.north + latPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lngPadding,
    west: bounds.west - lngPadding,
  }
}

/**
 * Vérifie si des coordonnées sont valides
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

/**
 * Simplifie un polygone (réduit le nombre de points)
 * Utile pour les performances avec de gros polygones
 */
export function simplifyPolygon(path: LatLng[], tolerance: number = 0.00001): LatLng[] {
  if (path.length <= 3) return path
  
  // Algorithme Douglas-Peucker simplifié
  const simplified: LatLng[] = [path[0]]
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1]
    const current = path[i]
    const next = path[i + 1]
    
    const distance = perpendicularDistance(current, prev, next)
    
    if (distance > tolerance) {
      simplified.push(current)
    }
  }
  
  simplified.push(path[path.length - 1])
  
  return simplified
}

/**
 * Calcule la distance perpendiculaire d'un point par rapport à une ligne
 */
function perpendicularDistance(point: LatLng, lineStart: LatLng, lineEnd: LatLng): number {
  const dx = lineEnd.lng - lineStart.lng
  const dy = lineEnd.lat - lineStart.lat
  
  const mag = Math.sqrt(dx * dx + dy * dy)
  
  if (mag === 0) return 0
  
  const u = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (mag * mag)
  
  const closestPoint = {
    lng: lineStart.lng + u * dx,
    lat: lineStart.lat + u * dy,
  }
  
  return calculateDistance(point, closestPoint)
}
