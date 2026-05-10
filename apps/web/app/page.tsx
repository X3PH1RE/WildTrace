"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function OverviewPage() {
  const [counts, setCounts] = useState<{ sightings: number; species: number; invasive: number }>({
    sightings: 0,
    species: 0,
    invasive: 0,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setReady(true);
      return;
    }
    void (async () => {
      const [{ count: sightings }, { count: species }, invasive] = await Promise.all([
        supabase.from("sightings").select("id", { count: "exact", head: true }),
        supabase.from("species").select("id", { count: "exact", head: true }),
        supabase.from("species").select("id", { count: "exact", head: true }).eq("is_invasive", true),
      ]);
      setCounts({
        sightings: sightings ?? 0,
        species: species ?? 0,
        invasive: invasive.count ?? 0,
      });
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading pulse…</div>;
  }

  const supabase = getSupabaseBrowser();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Live counts from PostgreSQL via Supabase. Wire service role analytics or scheduled jobs for
          population estimation and migration layers.
        </p>
        {!supabase ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            Add{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            and{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            to hydrate tiles.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Sightings" value={counts.sightings} caption="Citizen observations" />
        <MetricCard title="Species catalogued" value={counts.species} caption="Unique taxa" />
        <MetricCard title="Invasive taxa" value={counts.invasive} caption="Flagged watch-list" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>
            Mobile capture → Storage → Edge classify (Gemini) → regional validation → optional re-ID
            (Qdrant) → analytics here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Gemini runs only inside <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">supabase/functions/classify-species</code>.
          </p>
          <p>Public maps cluster and jitter coordinates — never expose precise endangered nests.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: number;
  caption: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{caption}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
      </CardHeader>
    </Card>
  );
}
