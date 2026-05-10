import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export async function ensureSession(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await ensureProfileRow(session.user.id);
    return;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("Anonymous auth not available:", error.message);
    return;
  }
  if (data.user) {
    await ensureProfileRow(data.user.id);
  }
}

async function ensureProfileRow(userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;
  await supabase.from("users").insert({
    id: userId,
    username: `Explorer_${userId.slice(0, 6)}`,
  });
}
