import "./polyfills";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anon);

if (__DEV__) {
  console.log(
    "[supabase] url:",
    url || "(missing)",
    "key length:",
    anon ? anon.length : 0,
  );
}

export const supabase = createClient(url ?? "", anon ?? "", {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
