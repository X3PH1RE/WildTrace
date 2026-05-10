import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

import { ensureSession } from "@/lib/session";

const client = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void ensureSession();
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
