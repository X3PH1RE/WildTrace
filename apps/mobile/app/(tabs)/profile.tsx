import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { UserProfile } from "@wildtrace/shared-types";

export default function ProfileScreen() {
  const q = useQuery({
    queryKey: ["profile-me"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserProfile | null;
    },
  });

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title">Profile</ThemedText>
        <ThemedText style={styles.body}>Connect Supabase for XP, badges, and streaks.</ThemedText>
      </ThemedView>
    );
  }

  const p = q.data;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Profile</ThemedText>
      <View style={styles.grid}>
        <Stat label="Username" value={p?.username ?? "—"} />
        <Stat label="Level" value={String(p?.level ?? 1)} />
        <Stat label="XP" value={String(p?.xp ?? 0)} />
        <Stat label="Streak" value={String(p?.streak ?? 0)} />
      </View>
      <ThemedText style={styles.note}>
        Invasive alerts, badges, and streak logic layer on top of this progress core.
      </ThemedText>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  grid: { gap: 12 },
  stat: {
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  statLabel: { opacity: 0.7, fontSize: 13 },
  note: { opacity: 0.75, lineHeight: 20, marginTop: 8 },
  body: { textAlign: "center", marginTop: 8 },
});
