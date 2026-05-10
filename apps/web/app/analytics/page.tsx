"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function AnalyticsPage() {
  const [data, setData] = useState<{ rarity: string; count: number }[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    void (async () => {
      const { data: rows } = await supabase.from("species").select("rarity_tier");
      const tally = new Map<string, number>();
      for (const r of rows ?? []) {
        const key = (r as { rarity_tier: string }).rarity_tier;
        tally.set(key, (tally.get(key) ?? 0) + 1);
      }
      setData(
        Array.from(tally.entries()).map(([rarity, count]) => ({
          rarity,
          count,
        })),
      );
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Species analytics</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Recharts view of rarity tier mixing. Extend with GBIF / iNaturalist validation overlays.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Rarity distribution</CardTitle>
          <CardDescription>Derived from the shared gamification tiers</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {data.length === 0 ? (
            <p className="text-sm text-zinc-500">No species rows yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="rarity" stroke="#71717a" />
                <YAxis stroke="#71717a" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
