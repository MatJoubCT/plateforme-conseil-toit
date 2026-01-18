/**
 * Utilitaires de validation pour les formulaires
 */

/**
 * Valide une latitude (doit être entre -90 et 90)
 * @param value - La valeur à valider
 * @returns Le nombre validé ou null si invalide
 */
export function validateLatitude(value: string | null | undefined): number | null {
  if (!value || value.trim() === '') return null

  const num = parseFloat(value.trim())

  // Vérifier que c'est un nombre valide
  if (isNaN(num)) return null

  // Vérifier la plage valide pour une latitude
  if (num < -90 || num > 90) return null

  return num
}

/**
 * Valide une longitude (doit être entre -180 et 180)
 * @param value - La valeur à valider
 * @returns Le nombre validé ou null si invalide
 */
export function validateLongitude(value: string | null | undefined): number | null {
  if (!value || value.trim() === '') return null

  const num = parseFloat(value.trim())

  // Vérifier que c'est un nombre valide
  if (isNaN(num)) return null

  // Vérifier la plage valide pour une longitude
  if (num < -180 || num > 180) return null

  return num
}

/**
 * Valide une paire de coordonnées GPS
 * @param lat - La latitude
 * @param lng - La longitude
 * @returns Un objet avec les coordonnées validées et un message d'erreur si invalide
 */
export function validateCoordinates(
  lat: string | null | undefined,
  lng: string | null | undefined
): {
  latitude: number | null
  longitude: number | null
  error: string | null
} {
  const latitude = validateLatitude(lat)
  const longitude = validateLongitude(lng)

  // Si l'un est fourni, l'autre doit l'être aussi
  if ((lat && lat.trim() !== '' && latitude === null) ||
      (lng && lng.trim() !== '' && longitude === null)) {
    return {
      latitude: null,
      longitude: null,
      error: 'Coordonnées GPS invalides. Latitude: -90 à 90, Longitude: -180 à 180'
    }
  }

  // Si l'un est fourni sans l'autre
  if ((latitude !== null && longitude === null) ||
      (latitude === null && longitude !== null)) {
    return {
      latitude: null,
      longitude: null,
      error: 'Vous devez fournir à la fois la latitude et la longitude'
    }
  }

  return {
    latitude,
    longitude,
    error: null
  }
}

/**
 * Valide qu'un nombre est positif
 * @param value - La valeur à valider
 * @returns Le nombre validé ou null si invalide
 */
export function validatePositiveNumber(value: string | null | undefined): number | null {
  if (!value || value.trim() === '') return null

  const num = parseFloat(value.trim())

  if (isNaN(num) || num < 0) return null

  return num
}

/**
 * Valide une année (entre 1900 et année actuelle + 1)
 * @param value - La valeur à valider
 * @returns L'année validée ou null si invalide
 */
export function validateYear(value: string | null | undefined): number | null {
  if (!value || value.trim() === '') return null

  const year = parseInt(value.trim(), 10)
  const currentYear = new Date().getFullYear()

  if (isNaN(year) || year < 1900 || year > currentYear + 1) return null

  return year
}

/**
 * Valide un email
 * @param value - La valeur à valider
 * @returns true si l'email est valide
 */
export function validateEmail(value: string | null | undefined): boolean {
  if (!value || value.trim() === '') return false

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value.trim())
}
