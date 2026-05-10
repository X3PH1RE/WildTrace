"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function InvasivePage() {
  const [rows, setRows] = useState<{ common_name: string; scientific_name: string }[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("species")
        .select("common_name, scientific_name")
        .eq("is_invasive", true)
        .limit(50);
      setRows((data as typeof rows) ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Invasive monitoring</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Surface species flagged `is_invasive` from Gemini + validation pipeline.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Watch list</CardTitle>
          <CardDescription>Pulls directly from the shared species catalogue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">No invasive species rows yet.</p>
          ) : (
            rows.map((r) => (
              <div key={r.scientific_name} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-500/10">
                <div className="font-semibold">{r.common_name}</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">{r.scientific_name}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
