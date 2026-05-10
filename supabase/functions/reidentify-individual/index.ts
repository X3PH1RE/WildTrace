import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Placeholder for CLIP/DINOv2 + Qdrant individual matching.
 * Invoke only when `eligible_for_reid` from classify-species is true.
 */
Deno.serve((_req: Request) =>
  new Response(
    JSON.stringify({
      status: "not_implemented",
      message: "Wire Qdrant + embedding workers; do not run on birds/insects per product rules.",
    }),
    { headers: { "Content-Type": "application/json" }, status: 501 },
  ));
