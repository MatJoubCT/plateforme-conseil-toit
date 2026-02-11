// types/database.ts
// Types centralisés pour les tables de la base de données.
// Chaque type représente une ligne telle que retournée par Supabase.

import type { GeoJSONPolygon, GeoJSONPoint } from './maps'

// ---------------------------------------------------------------------------
// Core tables
// ---------------------------------------------------------------------------

export type ClientRow = {
  id: string
  name: string | null
}

export type BatimentRow = {
  id: string
  client_id: string | null
  name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
}

export type BassinRow = {
  id: string
  batiment_id: string | null
  name: string | null
  membrane_type_id: string | null
  surface_m2: number | null
  annee_installation: number | null
  date_derniere_refection: string | null
  couvreur_id: string | null
  etat_id: string | null
  duree_vie_id: string | null
  duree_vie_text: string | null
  reference_interne: string | null
  notes: string | null
  polygone_geojson: GeoJSONPolygon | null
}

// ---------------------------------------------------------------------------
// Listes de choix (dropdowns dynamiques)
// ---------------------------------------------------------------------------

export type ListeChoix = {
  id: string
  categorie: string
  code?: string | null
  label: string | null
  couleur: string | null
  ordre?: number | null
}

// ---------------------------------------------------------------------------
// Garanties & Rapports
// ---------------------------------------------------------------------------

export type GarantieRow = {
  id: string
  bassin_id: string | null
  type_garantie_id: string | null
  fournisseur: string | null
  numero_garantie: string | null
  date_debut: string | null
  date_fin: string | null
  statut_id: string | null
  couverture: string | null
  commentaire: string | null
  fichier_pdf_url: string | null
}

export type RapportRow = {
  id: string
  bassin_id: string | null
  type_id: string | null
  date_rapport: string | null
  numero_ct: string | null
  titre: string | null
  description: string | null
  file_url: string | null
}

// ---------------------------------------------------------------------------
// Interventions
// ---------------------------------------------------------------------------

export type InterventionRow = {
  id: string
  bassin_id: string
  date_intervention: string
  type_intervention_id: string | null
  commentaire: string | null
  location_geojson: GeoJSONPoint | null
  created_at: string
}

export type InterventionFichierRow = {
  id: string
  intervention_id: string
  file_path: string
  file_name: string | null
  mime_type: string | null
  created_at: string
}

export type InterventionWithFiles = InterventionRow & {
  files: InterventionFichierRow[]
}

// ---------------------------------------------------------------------------
// Entreprises
// ---------------------------------------------------------------------------

export type EntrepriseRow = {
  id: string
  type: string | null
  nom: string | null
}

// ---------------------------------------------------------------------------
// Composition (lignes de matériaux d'un bassin)
// ---------------------------------------------------------------------------

export type CompositionLineRow = {
  id: string
  bassin_id: string
  materiau_id: string
  position: number
  quantite: number | null
  notes: string | null
  created_at: string
  materiau: {
    id: string
    nom: string
    prix_cad: number
    actif: boolean
    categorie_id: string | null
    manufacturier_entreprise_id: string | null
    manufacturier?: {
      id: string
      nom: string
    } | null
  } | null
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export type UserProfileRow = {
  id: string
  user_id: string
  role: string | null
  client_id: string | null
  full_name: string | null
}

export type UserClientRow = {
  client_id: string | null
}
