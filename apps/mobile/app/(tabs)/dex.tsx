import { useQuery } from "@tanstack/react-query";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";

import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { SpeciesRecord } from "@wildtrace/shared-types";

export default function DexScreen() {
  const q = useQuery({
    queryKey: ["species-dex"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("species")
        .select("*")
        .order("common_name", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data as SpeciesRecord[];
    },
  });

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title">Pokédex</ThemedText>
        <ThemedText style={styles.body}>
          Connect Supabase to sync your regional species collection.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Pokédex</ThemedText>
      <ThemedText style={styles.sub}>Rarity tiers & conservation snapshot</ThemedText>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(item) => item.id}
        refreshing={q.isFetching}
        onRefresh={() => void q.refetch()}
        ListEmptyComponent={
          q.isLoading ? (
            <ThemedText>Loading…</ThemedText>
          ) : (
            <ThemedText>No species yet — scan to discover.</ThemedText>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row}>
            <Text style={styles.rowTitle}>{item.common_name}</Text>
            <Text style={styles.rowMeta}>{item.scientific_name}</Text>
            <Text style={styles.rowMeta}>
              {item.rarity_tier} · {item.conservation_status}
              {item.is_invasive ? " · invasive" : ""}
            </Text>
          </Pressable>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  sub: { opacity: 0.75, marginBottom: 8 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  rowTitle: { fontSize: 17, fontWeight: "600" },
  rowMeta: { fontSize: 13, opacity: 0.75 },
  body: { textAlign: "center", marginTop: 8 },
});
