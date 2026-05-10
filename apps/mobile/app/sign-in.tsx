import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Text as ThemedText, View as ThemedView } from "@/components/Themed";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from "@/lib/session";

export default function SignInScreen() {
  const [email, setEmail] = useState(TEST_USER_EMAIL);
  const [password, setPassword] = useState(TEST_USER_PASSWORD);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        "Not configured",
        "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in apps/mobile/.env, then restart the dev server.",
      );
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        throw new Error(
          `${error.message}\n\nTip: run supabase/seed_test_user.sql in the Supabase SQL Editor to create the test account.`,
        );
      }
      // Redirect happens automatically in AuthGate via onAuthStateChange.
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Sign in failed", message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <ThemedText type="title">WildTrace</ThemedText>
          <ThemedText style={styles.subtitle}>
            Sign in to start scanning wildlife.
          </ThemedText>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <Pressable
            style={[styles.primaryBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void onSubmit()}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Sign in</Text>
            )}
          </Pressable>

          <ThemedText style={styles.hint}>
            Test account is prefilled. Run{" "}
            <Text style={styles.code}>supabase/seed_test_user.sql</Text> in the
            Supabase SQL Editor if it doesn&apos;t exist yet.
          </ThemedText>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
  },
  subtitle: { opacity: 0.75, marginBottom: 12 },
  field: { gap: 6 },
  label: { fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  primaryBtn: {
    backgroundColor: "#166534",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.6 },
  hint: { opacity: 0.7, marginTop: 8, fontSize: 13, lineHeight: 19 },
  code: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 12,
  },
});
