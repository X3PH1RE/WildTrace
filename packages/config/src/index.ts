/** Central env keys — values come from Expo public env or Next public env at runtime. */
export const envKeys = {
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  supabaseAnonKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  mapboxToken: "NEXT_PUBLIC_MAPBOX_TOKEN",
} as const;

export const storageBuckets = {
  sightings: "sightings",
} as const;
