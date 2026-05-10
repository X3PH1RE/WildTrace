import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ClassifyBody = {
  image_url: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    parts.push(String.fromCharCode.apply(null, sub as unknown as number[]));
  }
  return btoa(parts.join(""));
}

function extractJsonText(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  }
  return t;
}

function eligibleForReid(common: string, scientific: string): boolean {
  const hay = `${common} ${scientific}`.toLowerCase();
  const excluded =
    hay.includes("bird") ||
    hay.includes("insect") ||
    hay.includes("butterfly") ||
    hay.includes("fish") ||
    hay.includes("minnow");
  if (excluded) return false;
  const keys = [
    "elephant",
    "tiger",
    "leopard",
    "turtle",
    "whale shark",
    "tree",
    "sequoia",
    "redwood",
  ];
  return keys.some((k) => hay.includes(k));
}

function rarityFrom(
  conservation: string,
  invasive: boolean,
): "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" {
  const s = conservation.toLowerCase();
  if (s.includes("critically") || s.includes("endangered") || s.includes("vulnerable")) {
    return invasive ? "Rare" : "Epic";
  }
  if (s.includes("near")) return "Rare";
  if (invasive) return "Uncommon";
  return "Common";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model =
      Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash";
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as ClassifyBody;
    if (
      !body?.image_url ||
      typeof body.latitude !== "number" ||
      typeof body.longitude !== "number" ||
      !body.timestamp
    ) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imgRes = await fetch(body.image_url);
    if (!imgRes.ok) {
      return new Response(
        JSON.stringify({ error: "Could not fetch image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const arr = new Uint8Array(await imgRes.arrayBuffer());
    const b64 = uint8ToBase64(arr);
    const mime = imgRes.headers.get("content-type") ?? "image/jpeg";

    const prompt = `You are a biodiversity expert. Identify the primary wild organism in this image.
Context: latitude=${body.latitude}, longitude=${body.longitude}, time=${body.timestamp}.
Respond with ONLY valid JSON (no markdown) matching this shape:
{
  "common_name": string,
  "scientific_name": string,
  "confidence": number between 0 and 1,
  "is_invasive": boolean,
  "conservation_status": string (IUCN-style label),
  "short_description": string,
  "ecological_role": string
}
Use cautious confidence if uncertain. Mark invasive only when widely recognized as invasive in similar ecosystems.`;

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Classification failed", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiJson = (await geminiRes.json()) as {
      candidates?: {
        content?: { parts?: { text?: string }[] };
      }[];
    };
    const raw =
      geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const text = extractJsonText(raw);
    const parsed = JSON.parse(text) as {
      common_name: string;
      scientific_name: string;
      confidence: number;
      is_invasive: boolean;
      conservation_status: string;
      short_description: string;
      ecological_role: string;
    };

    const species = {
      common_name: parsed.common_name,
      scientific_name: parsed.scientific_name,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      is_invasive: !!parsed.is_invasive,
      conservation_status: parsed.conservation_status || "Unknown",
      short_description: parsed.short_description || "",
      ecological_role: parsed.ecological_role || "",
      rarity_tier: rarityFrom(
        parsed.conservation_status || "Unknown",
        !!parsed.is_invasive,
      ),
      eligible_for_reid: eligibleForReid(
        parsed.common_name,
        parsed.scientific_name,
      ),
    };

    return new Response(JSON.stringify({ species }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
