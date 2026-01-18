// types/maps.ts
export interface GeoJSONPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number]
}

export interface LatLng {
  lat: number
  lng: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}
