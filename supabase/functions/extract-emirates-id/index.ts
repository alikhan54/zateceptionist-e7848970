// 420 clinic — Emirates-ID / passport OCR via 420's OWN Gemini (server-side key).
// Re-homed from the source app's Lovable-gateway version. Keys NEVER touch the browser.
//
// AUTH: deploy with verify_jwt = true (Supabase default) so the gateway rejects anon callers,
// AND we re-verify the caller's JWT here (defense-in-depth). No open OCR endpoint.
//
// SECRET required: GEMINI_API_KEY  (set via: supabase secrets set GEMINI_API_KEY=... )
// Deploy:  supabase functions deploy extract-emirates-id --project-ref fncfbywkemsxwuiowxxe
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// data URL ("data:image/jpeg;base64,AAAA") -> { mimeType, base64 }
function splitDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if (m) return { mimeType: m[1], data: m[2] };
  return { mimeType: "image/jpeg", data: (dataUrl || "").replace(/^data:[^,]*,/, "") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // --- AUTH: require a valid Supabase session JWT ---
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "OCR not configured (missing GEMINI_API_KEY secret)" }, 503);

    const { frontImage, backImage, documentType, otherDocName } = await req.json();
    if (!frontImage) return json({ error: "Front image is required" }, 400);

    const docName = documentType === "emirates_id" ? "UAE Emirates ID card"
      : documentType === "passport" ? "passport"
      : (otherDocName || "identity document");

    const prompt = `Extract all information from this ${docName}. Return ONLY a JSON object with these fields:
- full_name: full name in English
- date_of_birth: YYYY-MM-DD
- emirates_id: Emirates ID number if visible (format 784-XXXX-XXXXXXX-X), else null
- nationality
- gender: Male or Female
- expiry_date: YYYY-MM-DD if visible, else null
- address: if visible on the back, else null
If a field is not readable, set it to null. Return ONLY the JSON object, no other text.`;

    const front = splitDataUrl(frontImage);
    const parts: any[] = [{ text: prompt }, { inline_data: { mime_type: front.mimeType, data: front.data } }];
    if (backImage) {
      const back = splitDataUrl(backImage);
      parts.push({ inline_data: { mime_type: back.mimeType, data: back.data } });
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }) },
    );
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini error:", resp.status, errText.slice(0, 300));
      return json({ error: `OCR provider error (${resp.status})` }, 502);
    }
    const out = await resp.json();
    const rawText: string = out?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "Could not extract data from image" }, 422);

    return json({ success: true, data: JSON.parse(match[0]) });
  } catch (err) {
    console.error("extract-emirates-id error:", err);
    return json({ error: (err as Error).message || "Unexpected error" }, 500);
  }
});
