import type { Session, User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const TEST_USER_EMAIL = "test@wildtrace.app";
export const TEST_USER_PASSWORD = "wildtrace123";

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithTestUser(): Promise<User> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env.",
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (error) {
    throw new Error(
      `Sign-in failed: ${error.message}. Run supabase/seed_test_user.sql in the Supabase SQL Editor to create the test account.`,
    );
  }
  if (!data.user) {
    throw new Error("Sign-in succeeded but returned no user.");
  }

  await ensureProfileRow(data.user.id);
  return data.user;
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

/**
 * Returns the active user. If there's no session yet, sign in as the test user.
 * Throws with a clear, actionable message if anything fails.
 */
export async function requireSession(): Promise<User> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env.",
    );
  }

  const session = await getCurrentSession();
  if (session?.user) {
    await ensureProfileRow(session.user.id);
    return session.user;
  }

  return signInWithTestUser();
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
