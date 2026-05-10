"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { bbox } from "@turf/turf";
import type { FeatureCollection, Point } from "geojson";
import { obfuscatePublicCoordinate } from "@wildtrace/shared-utils";

type SightPin = { id: string; latitude: number; longitude: number };

export function BiodiversityMap({ pins }: { pins: SightPin[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const container = ref.current;
    if (!container || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [78.9629, 20.5937],
      zoom: 3,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    const collection: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: pins.map((p) => {
        const o = obfuscatePublicCoordinate(p.latitude, p.longitude, 900);
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [o.longitude, o.latitude],
          },
          properties: { id: p.id },
        };
      }),
    };

    map.on("load", () => {
      if (!map.getSource("sightings")) {
        map.addSource("sightings", {
          type: "geojson",
          data: collection,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "sightings",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#059669",
            "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 22],
            "circle-opacity": 0.85,
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "sightings",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "unclustered",
          type: "circle",
          source: "sightings",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#34d399",
            "circle-radius": 7,
            "circle-stroke-color": "#064e3b",
            "circle-stroke-width": 1,
          },
        });
      }

      if (collection.features.length > 0) {
        const box = bbox(collection);
        map.fitBounds(
          [
            [box[0], box[1]],
            [box[2], box[3]],
          ],
          { padding: 80, duration: 1200, maxZoom: 8 },
        );
      }
    });

    return () => {
      map.remove();
    };
  }, [pins]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        Set <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-900">NEXT_PUBLIC_MAPBOX_TOKEN</code>{" "}
        to enable the live Mapbox biodiversity layer (clustered, privacy-jittered pins).
      </div>
    );
  }

  return <div ref={ref} className="h-[520px] w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800" />;
}
