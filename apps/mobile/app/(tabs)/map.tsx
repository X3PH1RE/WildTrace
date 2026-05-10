import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
import { obfuscatePublicCoordinate } from "@wildtrace/shared-utils";

export default function ExploreMapScreen() {
  const [region, setRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 8,
    longitudeDelta: 8,
  });
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== Location.PermissionStatus.GRANTED) {
        setReady(true);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const publicPt = obfuscatePublicCoordinate(
        pos.coords.latitude,
        pos.coords.longitude,
        800,
      );
      if (!active) return;
      setDemo(publicPt);
      setRegion({
        latitude: publicPt.latitude,
        longitude: publicPt.longitude,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      });
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <View style={styles.flex}>
      <ThemedText type="title" style={styles.pad}>
        Explore map
      </ThemedText>
      <ThemedText style={styles.pad}>
        Markers use obfuscated coordinates for privacy (public display rule).
      </ThemedText>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={region}
        showsUserLocation
        onRegionChangeComplete={setRegion}
      >
        {demo ? (
          <Marker
            coordinate={demo}
            title="Approximate biodiversity ping"
            description="Jittered for public maps"
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  map: { flex: 1 },
  pad: { paddingHorizontal: 16, marginBottom: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
