"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export default function ContributorsPage() {
  const [rows, setRows] = useState<
    { id: string; username: string | null; xp: number; level: number }[]
  >([]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    void (async () => {
      const { data } = await supabase
        .from("users")
        .select("id, username, xp, level")
        .order("xp", { ascending: false })
        .limit(25);
      setRows((data as typeof rows) ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Contributors</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Gamified citizen scientists — XP and levels from shared profile rows.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Top explorers by XP</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Level</th>
                <th className="py-2">XP</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-zinc-500">
                    No contributor rows yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-3 pr-4">{r.username ?? r.id.slice(0, 8)}</td>
                    <td className="py-3 pr-4">{r.level}</td>
                    <td className="py-3">{r.xp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
