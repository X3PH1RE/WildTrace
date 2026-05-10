import type {
  ClassifySpeciesResponse,
  SpeciesClassificationResult,
} from "@wildtrace/shared-types";

import { finalizeClassification } from "@wildtrace/shared-utils";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function classifyFromStorageUrl(params: {
  imageUrl: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}): Promise<SpeciesClassificationResult> {
  if (!isSupabaseConfigured) {
    return finalizeClassification({
      common_name: "Demo species",
      scientific_name: "Exemplum placeholder",
      confidence: 0.5,
      is_invasive: false,
      conservation_status: "Unknown",
      short_description:
        "Connect EXPO_PUBLIC_SUPABASE_URL and call the classify-species edge function for live AI results.",
      ecological_role: "Indicator (demo)",
    });
  }

  const { data, error } = await supabase.functions.invoke<ClassifySpeciesResponse>(
    "classify-species",
    {
      body: {
        image_url: params.imageUrl,
        latitude: params.latitude,
        longitude: params.longitude,
        timestamp: params.timestamp,
      },
    },
  );
  if (error) {
    throw error;
  }
  if (!data?.species) {
    throw new Error("Invalid classification response");
  }
  return data.species;
}
