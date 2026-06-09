// 420 hospital — MEDICA doctor-brief delivery (pool-immune; NOT n8n).
// The FE (P4) calls this for the doctor's "anything I should know about this patient?" brief.
// Clones the extract-emirates-id security envelope.
//
// SECURITY:
//  - Requires a valid Supabase session JWT (re-verified here; deploy with verify_jwt=true).
//  - Derives tenant_id + industry SERVER-SIDE from public.users (by auth_id) + tenant_config.
//    A browser-set tenant_id in the body is IGNORED -> no cross-tenant spoofing.
//  - The brain key (LANGGRAPH_API_KEY) stays server-side (Deno.env) — never returned to / reachable
//    by the browser. Posts to the brain via the public lg tunnel (pool-immune; bypasses n8n).
//
// SECRETS: LANGGRAPH_API_KEY (brain X-API-Key). Optional BRAIN_URL (default = lg tunnel).
//   supabase secrets set LANGGRAPH_API_KEY=... --project-ref fncfbywkemsxwuiowxxe
// Deploy:  supabase functions deploy medica-brief --project-ref fncfbywkemsxwuiowxxe
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BRAIN_URL = (Deno.env.get("BRAIN_URL") || "https://lg.zatesystems.com").replace(/\/$/, "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // --- AUTH: require a valid Supabase session JWT (defense-in-depth; gateway also enforces) ---
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const user = userData.user;

    // --- DERIVE tenant_id + industry SERVER-SIDE (NEVER trust a browser-set tenant_id) ---
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: urow } = await admin
      .from("users").select("tenant_id, role").eq("auth_id", user.id).limit(1).maybeSingle();
    const tenantId = urow?.tenant_id;
    if (!tenantId) return json({ error: "No tenant for this user" }, 403);
    const { data: trow } = await admin
      .from("tenant_config").select("industry").eq("tenant_id", tenantId).limit(1).maybeSingle();
    const industry = trow?.industry ?? "";

    // --- brain key stays server-side ---
    const brainKey = Deno.env.get("LANGGRAPH_API_KEY");
    if (!brainKey) return json({ error: "Brief not configured (missing LANGGRAPH_API_KEY)" }, 503);

    const { message } = await req.json().catch(() => ({}));
    if (!message || typeof message !== "string") return json({ error: "message is required" }, 400);

    // --- POST to the brain /omega/channel with agent_preference=medica (pool-immune; NOT n8n) ---
    const resp = await fetch(`${BRAIN_URL}/omega/channel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": brainKey },
      body: JSON.stringify({
        message,
        tenant_id: tenantId,   // server-derived — any body tenant_id is ignored
        industry,              // server-derived
        agent_preference: "medica",
        channel: "web",
        sender_type: urow?.role === "admin" ? "admin" : "staff",
        sender_identifier: user.email ?? user.id,
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("brain error", resp.status, t.slice(0, 200));
      return json({ error: `Brief service error (${resp.status})` }, 502);
    }
    const out = await resp.json();
    // Return ONLY the brief to the caller — never the brain key.
    return json({ success: true, agent_used: out.agent_used, response: out.response, tenant_id: tenantId });
  } catch (err) {
    console.error("medica-brief error:", err);
    return json({ error: (err as Error).message || "Unexpected error" }, 500);
  }
});
