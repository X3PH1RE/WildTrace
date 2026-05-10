"use client";

import { useEffect, useMemo, useState } from "react";
import { BiodiversityMap } from "@/components/biodiversity-map";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Pin = { id: string; latitude: number; longitude: number };

export default function MapPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setNote("Configure Supabase env vars to plot sightings.");
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("sightings")
        .select("id, latitude, longitude")
        .order("created_at", { ascending: false })
        .limit(800);
      if (error) {
        setNote(error.message);
        return;
      }
      setPins(
        (data ?? []).map((row) => ({
          id: row.id,
          latitude: row.latitude,
          longitude: row.longitude,
        })),
      );
    })();
  }, []);

  const mapKey = useMemo(() => pins.map((p) => p.id).join("|"), [pins]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Live biodiversity map</h1>
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Mapbox + Turf clustering. Coordinates are obfuscated before render to protect sensitive
          species and citizen privacy.
        </p>
      </div>
      {note ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">{note}</p>
      ) : null}
      <BiodiversityMap key={mapKey} pins={pins} />
    </div>
  );
}
