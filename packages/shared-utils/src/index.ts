import type { RarityTier, SpeciesClassificationResult } from "@wildtrace/shared-types";

/** Taxa that may use embedding + Qdrant re-identification per product rules. */
const REID_ELIGIBLE_KEYWORDS = [
  "elephant",
  "tiger",
  "leopard",
  "turtle",
  "whale shark",
  "whale_shark",
  "tree",
  "sequoia",
  "redwood",
];

const REID_EXCLUDED_KEYWORDS = ["bird", "insect", "butterfly", "moth", "fish", "minnow"];

function normalize(text: string): string {
  return text.toLowerCase();
}

/** Whether re-ID pipeline should run (CLIP/DINOv2 + Qdrant). */
export function isEligibleForReidentification(params: {
  common_name: string;
  scientific_name: string;
}): boolean {
  const hay = normalize(`${params.common_name} ${params.scientific_name}`);
  if (REID_EXCLUDED_KEYWORDS.some((k) => hay.includes(k))) {
    return false;
  }
  return REID_ELIGIBLE_KEYWORDS.some((k) => hay.includes(k.replace(/_/g, " ")));
}

/** Public map display: jitter coordinates to avoid precise user locations. */
export function obfuscatePublicCoordinate(
  latitude: number,
  longitude: number,
  radiusMeters = 500,
): { latitude: number; longitude: number } {
  const earth = 111_320;
  const deg = radiusMeters / earth;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random();
  const dx = Math.cos(angle) * r * deg;
  const dy = Math.sin(angle) * r * deg;
  return { latitude: latitude + dy, longitude: longitude + dx };
}

/** Derive rarity tier bucket used for gamification (placeholder heuristics). */
export function deriveRarityFromClassification(input: {
  conservation_status: string;
  is_invasive: boolean;
}): RarityTier {
  const s = input.conservation_status.toLowerCase();
  if (
    s.includes("critically") ||
    s.includes("endangered") ||
    s.includes("vulnerable")
  ) {
    return input.is_invasive ? "Rare" : "Epic";
  }
  if (s.includes("near threatened") || s.includes("near-threatened")) {
    return "Rare";
  }
  if (input.is_invasive) {
    return "Uncommon";
  }
  return "Common";
}

/** Merge model output with shared eligibility + rarity rules. */
export function finalizeClassification(
  partial: Omit<SpeciesClassificationResult, "rarity_tier" | "eligible_for_reid">,
): SpeciesClassificationResult {
  const rarity_tier = deriveRarityFromClassification({
    conservation_status: partial.conservation_status,
    is_invasive: partial.is_invasive,
  });
  const eligible_for_reid = isEligibleForReidentification({
    common_name: partial.common_name,
    scientific_name: partial.scientific_name,
  });
  return { ...partial, rarity_tier, eligible_for_reid };
}
