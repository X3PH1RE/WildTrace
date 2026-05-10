import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
import { classifyFromStorageUrl } from "@/lib/classification";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useWildtraceStore } from "@/lib/store";
import { persistSighting } from "@/lib/uploadSighting";
import type { SpeciesClassificationResult } from "@wildtrace/shared-types";

export default function ScanScreen() {
  const setLastScan = useWildtraceStore((s) => s.setLastScan);
  const cam = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locPermission, setLocPermission] = useState<Location.PermissionStatus | null>(
    null,
  );
  const [result, setResult] = useState<SpeciesClassificationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const ensureLocation = async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    setLocPermission(fg.status);
    if (fg.status !== Location.PermissionStatus.GRANTED) {
      Alert.alert(
        "Location required",
        "WildTrace needs GPS while scanning to map valid sightings.",
      );
      return false;
    }
    return true;
  };

  const runPipeline = async (uri: string) => {
    setBusy(true);
    setPreviewUri(uri);
    setResult(null);
    try {
      const ok = await ensureLocation();
      if (!ok) {
        setBusy(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const timestamp = new Date(position.timestamp).toISOString();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      let imageUrl = uri;
      if (isSupabaseConfigured) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No active session");
        const path = `${user.id}/${Date.now()}.jpg`;
        const res = await fetch(uri);
        const blob = await res.blob();
        const { error: upErr } = await supabase.storage
          .from("sightings")
          .upload(path, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (upErr) throw upErr;
        const { data: signed, error: signErr } = await supabase.storage
          .from("sightings")
          .createSignedUrl(path, 60 * 30);
        if (signErr || !signed) {
          throw signErr ?? new Error("Could not sign URL");
        }
        imageUrl = signed.signedUrl;
      }

      const species = await classifyFromStorageUrl({
        imageUrl,
        latitude: lat,
        longitude: lng,
        timestamp,
      });
      setResult(species);
      setLastScan(species);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Scan failed", message);
    } finally {
      setBusy(false);
    }
  };

  const onCapture = async () => {
    try {
      const photo = await cam.current?.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        await runPipeline(photo.uri);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Camera error", message);
    }
  };

  const onSave = async () => {
    if (!result || !previewUri) return;
    setBusy(true);
    try {
      const ok = await ensureLocation();
      if (!ok) return;
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const timestamp = new Date(position.timestamp).toISOString();
      let imageUrl = previewUri;
      if (isSupabaseConfigured) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No active session");
        const path = `${user.id}/saved-${Date.now()}.jpg`;
        const res = await fetch(previewUri);
        const blob = await res.blob();
        const { error: upErr } = await supabase.storage
          .from("sightings")
          .upload(path, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("sightings")
          .createSignedUrl(path, 60 * 60 * 24);
        if (!signed) throw new Error("Could not sign URL");
        imageUrl = signed.signedUrl;
      }
      await persistSighting({
        imageUrl,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp,
        species: result,
      });
      Alert.alert("Saved", "Sighting stored and profile XP updated.");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Save failed", message);
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText style={styles.body}>Camera access is required to scan wildlife.</ThemedText>
        <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Grant camera</Text>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedText type="title">Scan</ThemedText>
      <ThemedText style={styles.hint}>
        Location is required for coordinates on every sighting (privacy rules apply on public maps).
      </ThemedText>
      {locPermission && locPermission !== Location.PermissionStatus.GRANTED ? (
        <ThemedText style={styles.warn}>Location permission: {locPermission}</ThemedText>
      ) : null}

      <View style={styles.cameraWrap}>
        <CameraView ref={cam} style={styles.camera} facing="back" mute animateShutter />
      </View>

      <Pressable
        style={[styles.primaryBtn, busy && styles.disabled]}
        disabled={busy}
        onPress={() => void onCapture()}
      >
        <Text style={styles.primaryBtnText}>{busy ? "Working…" : "Capture & classify"}</Text>
      </Pressable>

      {busy ? <ActivityIndicator style={styles.spinner} /> : null}

      {previewUri ? (
        <View style={styles.previewRow}>
          <Text style={styles.label}>Preview</Text>
          <Image source={{ uri: previewUri }} style={styles.preview} />
        </View>
      ) : null}

      {result ? (
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle">{result.common_name}</ThemedText>
          <ThemedText style={styles.meta}>{result.scientific_name}</ThemedText>
          <ThemedText style={styles.meta}>
            Confidence: {(result.confidence * 100).toFixed(0)}% · {result.rarity_tier} ·{" "}
            {result.conservation_status}
          </ThemedText>
          <ThemedText style={styles.body}>{result.short_description}</ThemedText>
          <ThemedText style={styles.meta}>Role: {result.ecological_role}</ThemedText>
          <ThemedText style={styles.meta}>
            Invasive: {result.is_invasive ? "yes" : "no"} · Re-ID eligible:{" "}
            {result.eligible_for_reid ? "yes" : "no"}
          </ThemedText>
          <Pressable style={styles.secondaryBtn} onPress={() => void onSave()}>
            <Text style={styles.secondaryBtnText}>Save sighting</Text>
          </Pressable>
        </ThemedView>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  hint: { opacity: 0.75, marginBottom: 4 },
  warn: { color: "#b45309" },
  cameraWrap: {
    borderRadius: 16,
    overflow: "hidden",
    height: 280,
    backgroundColor: "#111",
  },
  camera: { flex: 1 },
  primaryBtn: {
    backgroundColor: "#166534",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.6 },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#166534",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#166534", fontWeight: "600" },
  spinner: { marginVertical: 8 },
  previewRow: { gap: 8 },
  label: { fontWeight: "600" },
  preview: { width: "100%", height: 180, borderRadius: 12, resizeMode: "cover" },
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meta: { fontSize: 13, opacity: 0.8 },
  body: { fontSize: 15, lineHeight: 22 },
});
