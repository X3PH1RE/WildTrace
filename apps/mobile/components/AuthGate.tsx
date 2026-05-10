import type { Session } from "@supabase/supabase-js";
import { Redirect, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthState = "loading" | "signed-in" | "signed-out";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState("signed-out");
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(data.session?.user ? "signed-in" : "signed-out");
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setState(session?.user ? "signed-in" : "signed-out");
      },
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const onSignIn = segments[0] === "sign-in";

  if (state === "signed-out" && !onSignIn) {
    return <Redirect href="/sign-in" />;
  }

  if (state === "signed-in" && onSignIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <>{children}</>;
}
