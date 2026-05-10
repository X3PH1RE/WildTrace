/** Shared species classification payload — keep in sync across mobile, web, and edge functions. */
export interface SpeciesClassificationResult {
  common_name: string;
  scientific_name: string;
  confidence: number;
  is_invasive: boolean;
  conservation_status: string;
  short_description: string;
  ecological_role: string;
  rarity_tier: RarityTier;
  eligible_for_reid: boolean;
}

export type RarityTier = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface GeoPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface SightingUpload {
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak: number;
  created_at: string;
}

export interface SpeciesRecord {
  id: string;
  common_name: string;
  scientific_name: string;
  rarity_tier: RarityTier;
  conservation_status: string;
  is_invasive: boolean;
  ecological_role: string | null;
  description: string | null;
}

export interface SightingRecord {
  id: string;
  user_id: string;
  species_id: string | null;
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  confidence: number | null;
  is_verified: boolean;
}

export interface IndividualRecord {
  id: string;
  species_id: string;
  embedding_reference: string | null;
  last_seen: string | null;
  known_locations: unknown;
}

export interface ExpertReviewRecord {
  id: string;
  sighting_id: string;
  reviewer_id: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
}

export interface ClassifySpeciesRequest {
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface ClassifySpeciesResponse {
  species: SpeciesClassificationResult;
}
