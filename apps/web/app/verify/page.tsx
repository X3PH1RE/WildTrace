"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  sighting_id: string;
  status: string;
  notes: string | null;
};

export default function VerifyPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("expert_reviews")
        .select("id, sighting_id, status, notes")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Expert verification</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Queue for moderators. Hook into Supabase auth roles + policies for reviewers only.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Pending / recent reviews</CardTitle>
          <CardDescription>Backed by the `expert_reviews` table.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">No review rows yet.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-sm font-medium">Sighting {r.sighting_id.slice(0, 8)}…</div>
                  <div className="text-xs text-zinc-500">
                    {r.status}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button">
                    Approve
                  </Button>
                  <Button variant="ghost" size="sm" type="button">
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
