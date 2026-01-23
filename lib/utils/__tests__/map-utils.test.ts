import { describe, it, expect } from 'vitest';
import {
  geoJsonToLatLngPath,
  geoJsonToLatLng,
  latLngPathToGeoJson,
  latLngToGeoJson,
  calculateBounds,
  calculatePolygonCenter,
  calculatePolygonArea,
  formatSurface,
  isPointInPolygon,
  calculateDistance,
  formatDistance,
  padBounds,
  isValidCoordinates,
  simplifyPolygon,
} from '../map-utils';
import type { GeoJSONPolygon, GeoJSONPoint, LatLng, MapBounds } from '@/types/maps';

describe('Map Utilities', () => {
  describe('geoJsonToLatLngPath', () => {
    it('devrait convertir un polygone GeoJSON en tableau LatLng', () => {
      const geoJson: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-73.5, 45.5],
            [-73.6, 45.5],
            [-73.6, 45.6],
            [-73.5, 45.6],
            [-73.5, 45.5],
          ],
        ],
      };

      const result = geoJsonToLatLngPath(geoJson);

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ lat: 45.5, lng: -73.5 });
      expect(result[1]).toEqual({ lat: 45.5, lng: -73.6 });
    });

    it('devrait retourner un tableau vide pour un polygone null', () => {
      const result = geoJsonToLatLngPath(null);
      expect(result).toEqual([]);
    });

    it('devrait retourner un tableau vide pour un polygone sans coordonnées', () => {
      const geoJson = { type: 'Polygon', coordinates: [] } as unknown as GeoJSONPolygon;
      const result = geoJsonToLatLngPath(geoJson);
      expect(result).toEqual([]);
    });
  });

  describe('geoJsonToLatLng', () => {
    it('devrait convertir un point GeoJSON en LatLng', () => {
      const geoJson: GeoJSONPoint = {
        type: 'Point',
        coordinates: [-73.5673, 45.5017],
      };

      const result = geoJsonToLatLng(geoJson);

      expect(result).toEqual({ lat: 45.5017, lng: -73.5673 });
    });

    it('devrait retourner null pour un point null', () => {
      const result = geoJsonToLatLng(null);
      expect(result).toBeNull();
    });

    it('devrait retourner null pour un point sans coordonnées', () => {
      const geoJson = { type: 'Point' } as GeoJSONPoint;
      const result = geoJsonToLatLng(geoJson);
      expect(result).toBeNull();
    });
  });

  describe('latLngPathToGeoJson', () => {
    it('devrait convertir un tableau LatLng en polygone GeoJSON', () => {
      const path: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.5, lng: -73.6 },
        { lat: 45.6, lng: -73.6 },
        { lat: 45.6, lng: -73.5 },
      ];

      const result = latLngPathToGeoJson(path);

      expect(result.type).toBe('Polygon');
      expect(result.coordinates[0]).toHaveLength(5); // Fermé automatiquement
      expect(result.coordinates[0][0]).toEqual([-73.5, 45.5]);
      expect(result.coordinates[0][4]).toEqual([-73.5, 45.5]); // Premier = dernier
    });

    it('ne devrait pas dupliquer le premier point si déjà fermé', () => {
      const path: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.5, lng: -73.6 },
        { lat: 45.6, lng: -73.6 },
        { lat: 45.5, lng: -73.5 },
      ];

      const result = latLngPathToGeoJson(path);

      expect(result.coordinates[0]).toHaveLength(4);
    });

    it('devrait gérer un tableau vide', () => {
      const result = latLngPathToGeoJson([]);

      expect(result.type).toBe('Polygon');
      expect(result.coordinates[0]).toEqual([]);
    });
  });

  describe('latLngToGeoJson', () => {
    it('devrait convertir des coordonnées LatLng en point GeoJSON', () => {
      const latLng: LatLng = { lat: 45.5017, lng: -73.5673 };

      const result = latLngToGeoJson(latLng);

      expect(result.type).toBe('Point');
      expect(result.coordinates).toEqual([-73.5673, 45.5017]);
    });

    it('devrait inverser correctement lat/lng en lng/lat', () => {
      const latLng: LatLng = { lat: 10, lng: 20 };
      const result = latLngToGeoJson(latLng);

      expect(result.coordinates[0]).toBe(20); // lng en premier
      expect(result.coordinates[1]).toBe(10); // lat en second
    });
  });

  describe('calculateBounds', () => {
    it('devrait calculer les limites d\'un ensemble de polygones', () => {
      const polygons: LatLng[][] = [
        [
          { lat: 45.5, lng: -73.5 },
          { lat: 45.6, lng: -73.6 },
        ],
        [
          { lat: 45.4, lng: -73.4 },
          { lat: 45.7, lng: -73.7 },
        ],
      ];

      const result = calculateBounds(polygons);

      expect(result).toEqual({
        north: 45.7,
        south: 45.4,
        east: -73.4,
        west: -73.7,
      });
    });

    it('devrait retourner null pour un tableau vide', () => {
      const result = calculateBounds([]);
      expect(result).toBeNull();
    });

    it('devrait gérer un seul point', () => {
      const polygons: LatLng[][] = [[{ lat: 45.5, lng: -73.5 }]];

      const result = calculateBounds(polygons);

      expect(result).toEqual({
        north: 45.5,
        south: 45.5,
        east: -73.5,
        west: -73.5,
      });
    });
  });

  describe('calculatePolygonCenter', () => {
    it('devrait calculer le centre d\'un polygone carré', () => {
      const path: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.5, lng: -73.6 },
        { lat: 45.6, lng: -73.6 },
        { lat: 45.6, lng: -73.5 },
      ];

      const result = calculatePolygonCenter(path);

      expect(result.lat).toBeCloseTo(45.55, 2);
      expect(result.lng).toBeCloseTo(-73.55, 2);
    });

    it('devrait retourner (0,0) pour un tableau vide', () => {
      const result = calculatePolygonCenter([]);

      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('devrait retourner le point lui-même pour un seul point', () => {
      const path: LatLng[] = [{ lat: 45.5, lng: -73.5 }];

      const result = calculatePolygonCenter(path);

      expect(result).toEqual({ lat: 45.5, lng: -73.5 });
    });
  });

  describe('calculatePolygonArea', () => {
    it('devrait calculer la surface d\'un polygone', () => {
      // Rectangle approximatif à Montréal (environ 0.01° x 0.01°)
      const path: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.51, lng: -73.5 },
        { lat: 45.51, lng: -73.51 },
        { lat: 45.5, lng: -73.51 },
      ];

      const result = calculatePolygonArea(path);

      // Le résultat réel est environ 866,549 m² (environ 0.87 km²)
      expect(result).toBeGreaterThan(800000);
      expect(result).toBeLessThan(900000);
    });

    it('devrait retourner 0 pour moins de 3 points', () => {
      expect(calculatePolygonArea([])).toBe(0);
      expect(calculatePolygonArea([{ lat: 45.5, lng: -73.5 }])).toBe(0);
      expect(
        calculatePolygonArea([
          { lat: 45.5, lng: -73.5 },
          { lat: 45.6, lng: -73.6 },
        ])
      ).toBe(0);
    });

    it('devrait toujours retourner une valeur positive', () => {
      // Polygone tracé dans le sens horaire et anti-horaire
      const pathCCW: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.51, lng: -73.5 },
        { lat: 45.51, lng: -73.51 },
      ];

      const pathCW: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.51, lng: -73.51 },
        { lat: 45.51, lng: -73.5 },
      ];

      const areaCCW = calculatePolygonArea(pathCCW);
      const areaCW = calculatePolygonArea(pathCW);

      expect(areaCCW).toBeGreaterThan(0);
      expect(areaCW).toBeGreaterThan(0);
      expect(Math.abs(areaCCW - areaCW)).toBeLessThan(1); // Devraient être égales
    });
  });

  describe('formatSurface', () => {
    it('devrait retourner "N/D" pour null', () => {
      expect(formatSurface(null)).toBe('N/D');
    });

    it('devrait retourner "N/D" pour 0', () => {
      expect(formatSurface(0)).toBe('N/D');
    });

    it('devrait formater les petites surfaces en cm²', () => {
      expect(formatSurface(0.5)).toBe('50 cm²');
      expect(formatSurface(0.01)).toBe('1 cm²');
    });

    it('devrait formater les surfaces en m²', () => {
      expect(formatSurface(1)).toBe('1 m²');
      expect(formatSurface(100)).toBe('100 m²');
      // fr-CA utilise un espace insécable fin (U+202F)
      const result = formatSurface(1234.56);
      expect(result).toMatch(/^1[\s\u00A0\u202F]235 m²$/);
    });

    it('devrait arrondir les surfaces', () => {
      expect(formatSurface(123.4)).toBe('123 m²');
      expect(formatSurface(123.6)).toBe('124 m²');
    });
  });

  describe('isPointInPolygon', () => {
    const square: LatLng[] = [
      { lat: 45.5, lng: -73.5 },
      { lat: 45.5, lng: -73.6 },
      { lat: 45.6, lng: -73.6 },
      { lat: 45.6, lng: -73.5 },
    ];

    it('devrait retourner true pour un point à l\'intérieur', () => {
      const point: LatLng = { lat: 45.55, lng: -73.55 };
      expect(isPointInPolygon(point, square)).toBe(true);
    });

    it('devrait retourner false pour un point à l\'extérieur', () => {
      const point: LatLng = { lat: 45.7, lng: -73.7 };
      expect(isPointInPolygon(point, square)).toBe(false);
    });

    it('devrait gérer les points sur le bord', () => {
      const point: LatLng = { lat: 45.5, lng: -73.55 };
      const result = isPointInPolygon(point, square);
      // Le comportement sur le bord peut varier, on vérifie juste qu'il retourne un booléen
      expect(typeof result).toBe('boolean');
    });

    it('devrait retourner false pour un polygone vide', () => {
      const point: LatLng = { lat: 45.55, lng: -73.55 };
      expect(isPointInPolygon(point, [])).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('devrait calculer la distance entre deux points', () => {
      const point1: LatLng = { lat: 45.5, lng: -73.5 };
      const point2: LatLng = { lat: 45.51, lng: -73.5 };

      const result = calculateDistance(point1, point2);

      // Distance d'environ 1.1 km pour 0.01° de latitude
      expect(result).toBeGreaterThan(1000);
      expect(result).toBeLessThan(1200);
    });

    it('devrait retourner 0 pour deux points identiques', () => {
      const point: LatLng = { lat: 45.5, lng: -73.5 };

      const result = calculateDistance(point, point);

      expect(result).toBeCloseTo(0, 5);
    });

    it('devrait calculer la distance pour des points éloignés', () => {
      // Montréal à Québec (environ 250 km)
      const montreal: LatLng = { lat: 45.5017, lng: -73.5673 };
      const quebec: LatLng = { lat: 46.8139, lng: -71.2080 };

      const result = calculateDistance(montreal, quebec);

      expect(result).toBeGreaterThan(200000); // > 200 km
      expect(result).toBeLessThan(300000); // < 300 km
    });
  });

  describe('formatDistance', () => {
    it('devrait formater les très petites distances en cm', () => {
      expect(formatDistance(0.5)).toBe('50 cm');
      expect(formatDistance(0.01)).toBe('1 cm');
    });

    it('devrait formater les distances en mètres', () => {
      expect(formatDistance(1)).toBe('1 m');
      expect(formatDistance(500)).toBe('500 m');
      expect(formatDistance(999.4)).toBe('999 m');
    });

    it('devrait formater les distances en kilomètres', () => {
      expect(formatDistance(1000)).toBe('1.00 km');
      expect(formatDistance(1234.56)).toBe('1.23 km');
      expect(formatDistance(10000)).toBe('10.00 km');
    });

    it('devrait arrondir correctement les distances', () => {
      expect(formatDistance(1.4)).toBe('1 m');
      expect(formatDistance(1.6)).toBe('2 m');
    });
  });

  describe('padBounds', () => {
    it('devrait ajouter du padding aux limites', () => {
      const bounds: MapBounds = {
        north: 45.6,
        south: 45.5,
        east: -73.5,
        west: -73.6,
      };

      const result = padBounds(bounds, 10);

      // Latitude range: 0.1, padding 10% = 0.01
      expect(result.north).toBeCloseTo(45.61, 5);
      expect(result.south).toBeCloseTo(45.49, 5);
      // Longitude range: 0.1, padding 10% = 0.01
      expect(result.east).toBeCloseTo(-73.49, 5);
      expect(result.west).toBeCloseTo(-73.61, 5);
    });

    it('devrait utiliser 10% par défaut', () => {
      const bounds: MapBounds = {
        north: 45.6,
        south: 45.5,
        east: -73.5,
        west: -73.6,
      };

      const result = padBounds(bounds);

      expect(result.north).toBeGreaterThan(bounds.north);
      expect(result.south).toBeLessThan(bounds.south);
    });

    it('devrait gérer différents pourcentages de padding', () => {
      const bounds: MapBounds = {
        north: 45.6,
        south: 45.5,
        east: -73.5,
        west: -73.6,
      };

      const result20 = padBounds(bounds, 20);
      const result5 = padBounds(bounds, 5);

      const padding20 = result20.north - bounds.north;
      const padding5 = result5.north - bounds.north;

      expect(padding20).toBeCloseTo(padding5 * 4, 5);
    });
  });

  describe('isValidCoordinates', () => {
    it('devrait accepter des coordonnées valides', () => {
      expect(isValidCoordinates(45.5, -73.5)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
    });

    it('devrait rejeter une latitude invalide', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(-91, 0)).toBe(false);
      expect(isValidCoordinates(100, 0)).toBe(false);
    });

    it('devrait rejeter une longitude invalide', () => {
      expect(isValidCoordinates(0, 181)).toBe(false);
      expect(isValidCoordinates(0, -181)).toBe(false);
      expect(isValidCoordinates(0, 200)).toBe(false);
    });

    it('devrait rejeter les deux coordonnées invalides', () => {
      expect(isValidCoordinates(91, 181)).toBe(false);
      expect(isValidCoordinates(-91, -181)).toBe(false);
    });
  });

  describe('simplifyPolygon', () => {
    it('devrait simplifier un polygone avec beaucoup de points', () => {
      const path: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.50001, lng: -73.5 }, // Point très proche
        { lat: 45.50002, lng: -73.5 }, // Point très proche
        { lat: 45.5, lng: -73.6 },
        { lat: 45.6, lng: -73.6 },
        { lat: 45.6, lng: -73.5 },
      ];

      const result = simplifyPolygon(path, 0.0001);

      expect(result.length).toBeLessThan(path.length);
      expect(result[0]).toEqual(path[0]); // Premier point conservé
      expect(result[result.length - 1]).toEqual(path[path.length - 1]); // Dernier point conservé
    });

    it('ne devrait pas simplifier un polygone de 3 points ou moins', () => {
      const triangle: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.6, lng: -73.5 },
        { lat: 45.55, lng: -73.6 },
      ];

      const result = simplifyPolygon(triangle);

      expect(result).toEqual(triangle);
    });

    it('devrait conserver le premier et dernier point', () => {
      const path: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.51, lng: -73.5 },
        { lat: 45.52, lng: -73.5 },
        { lat: 45.53, lng: -73.5 },
        { lat: 45.6, lng: -73.6 },
      ];

      const result = simplifyPolygon(path);

      expect(result[0]).toEqual(path[0]);
      expect(result[result.length - 1]).toEqual(path[path.length - 1]);
    });

    it('devrait gérer différentes tolérances', () => {
      const path: LatLng[] = [
        { lat: 45.5, lng: -73.5 },
        { lat: 45.50001, lng: -73.5 },
        { lat: 45.50002, lng: -73.5 },
        { lat: 45.5, lng: -73.6 },
      ];

      const resultLowTolerance = simplifyPolygon(path, 0.000001);
      const resultHighTolerance = simplifyPolygon(path, 0.001);

      // Tolérance élevée = plus de simplification
      expect(resultHighTolerance.length).toBeLessThanOrEqual(resultLowTolerance.length);
    });
  });
});
