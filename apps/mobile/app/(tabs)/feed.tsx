import { useQuery } from "@tanstack/react-query";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";

import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Row = {
  id: string;
  image_url: string;
  timestamp: string;
  species_id: string | null;
  latitude: number;
  longitude: number;
};

export default function FeedScreen() {
  const q = useQuery({
    queryKey: ["sightings-feed"],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sightings")
        .select("id, image_url, timestamp, species_id, latitude, longitude")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Row[];
    },
  });

  if (!isSupabaseConfigured) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="title">Community feed</ThemedText>
        <ThemedText style={styles.body}>
          Wire Supabase to stream recent citizen sightings.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Community feed</ThemedText>
      <ThemedText style={styles.sub}>Recent biodiversity contributions</ThemedText>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(item) => item.id}
        refreshing={q.isFetching}
        onRefresh={() => void q.refetch()}
        ListEmptyComponent={
          q.isLoading ? (
            <ThemedText>Loading…</ThemedText>
          ) : (
            <ThemedText>No sightings yet.</ThemedText>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image_url }} style={styles.thumb} />
            <Text style={styles.meta}>
              {new Date(item.timestamp).toLocaleString()} · Δ lat {item.latitude.toFixed(2)},
              lng {item.longitude.toFixed(2)}
            </Text>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  sub: { opacity: 0.75 },
  card: { marginBottom: 12, gap: 6 },
  thumb: { width: "100%", height: 160, borderRadius: 12, backgroundColor: "#111" },
  meta: { fontSize: 12, opacity: 0.8 },
  body: { textAlign: "center", marginTop: 8 },
});
