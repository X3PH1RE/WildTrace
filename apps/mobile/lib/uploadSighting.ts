import type { SpeciesClassificationResult } from "@wildtrace/shared-types";

import { requireSession } from "@/lib/session";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function persistSighting(params: {
  imageUrl: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  species: SpeciesClassificationResult;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const user = await requireSession();

  const { data: speciesRow, error: speciesError } = await supabase
    .from("species")
    .upsert(
      {
        common_name: params.species.common_name,
        scientific_name: params.species.scientific_name,
        rarity_tier: params.species.rarity_tier,
        conservation_status: params.species.conservation_status,
        is_invasive: params.species.is_invasive,
        ecological_role: params.species.ecological_role,
        description: params.species.short_description,
      },
      { onConflict: "scientific_name" },
    )
    .select("id")
    .single();
  if (speciesError) {
    throw speciesError;
  }

  const { error: sightError } = await supabase.from("sightings").insert({
    user_id: user.id,
    species_id: speciesRow.id,
    image_url: params.imageUrl,
    latitude: params.latitude,
    longitude: params.longitude,
    timestamp: params.timestamp,
    confidence: params.species.confidence,
    is_verified: false,
  });
  if (sightError) {
    throw sightError;
  }

  const { data: profile } = await supabase
    .from("users")
    .select("xp")
    .eq("id", user.id)
    .single();
  const nextXp = (profile?.xp ?? 0) + 25;
  const nextLevel = Math.floor(nextXp / 500) + 1;
  await supabase
    .from("users")
    .update({ xp: nextXp, level: nextLevel })
    .eq("id", user.id);
}
