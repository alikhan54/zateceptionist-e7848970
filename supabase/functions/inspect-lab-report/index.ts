// 420 hospital — lab-report CLOUD extraction (Gemini Vision). The cloud half of P6a.
// Clones the extract-emirates-id security envelope. PHI tenants are REFUSED here (their
// extraction is on-box only, in the brain) — defense-in-depth with the brain tool's gate.
//
// AUTH (dual): a USER session JWT (the FE path → tenant derived server-side) OR the
// SERVICE-ROLE key (the brain server-to-server path → trusts the body tenant_id).
//
// SECRETS: GEMINI_API_KEY (Gemini key — Supabase secret, never in the browser/brain).
//   supabase secrets set GEMINI_API_KEY=... --project-ref fncfbywkemsxwuiowxxe
// Deploy:  supabase functions deploy inspect-lab-report --project-ref fncfbywkemsxwuiowxxe
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// PHI on-box gate — mirrors agents/graph.py is_phi_onbox (telehealth OR a PHI-onbox slug).
const PHI_ONBOX_TENANTS = ["tend"];
const isPhiOnbox = (tenantId: string, industry: string) =>
  industry === "telehealth" || PHI_ONBOX_TENANTS.includes(tenantId);

function jwtRole(token: string): string {
  try {
    const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return p.role || "";
  } catch { return ""; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.slice("Bearer ".length);

    const body = await req.json().catch(() => ({}));
    let tenantId = "";

    // --- AUTH: trusted service-role server call, OR a user session JWT ---
    if (jwtRole(token) === "service_role") {
      tenantId = String(body.tenant_id || "");           // trusted server-to-server (the brain)
      if (!tenantId) return json({ error: "tenant_id required for service call" }, 400);
    } else {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } });
      const { data: u, error: ue } = await userClient.auth.getUser();
      if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);
      const { data: urow } = await admin.from("users").select("tenant_id").eq("auth_id", u.user.id).limit(1).maybeSingle();
      tenantId = urow?.tenant_id || "";
      if (!tenantId) return json({ error: "No tenant for this user" }, 403);
    }

    const reportId = String(body.report_id || "");
    if (!reportId) return json({ error: "report_id required" }, 400);

    // industry + PHI gate
    const { data: tc } = await admin.from("tenant_config").select("industry").eq("tenant_id", tenantId).limit(1).maybeSingle();
    const industry = tc?.industry ?? "";
    if (industry !== "hospital") return json({ error: "not a hospital tenant" }, 403);
    if (isPhiOnbox(tenantId, industry))
      return json({ error: "PHI_onbox_refused", detail: "PHI tenants must extract on-box (local), not via cloud vision." }, 403);

    // fetch the report row (tenant-scoped) → storage_path
    const { data: rep } = await admin.from("hospital_lab_reports")
      .select("id,storage_path").eq("tenant_id", tenantId).eq("id", reportId).limit(1).maybeSingle();
    if (!rep?.storage_path) return json({ error: "lab report not found" }, 404);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "extraction not configured (missing GEMINI_API_KEY)" }, 503);

    // download the PRIVATE pdf (service role) → base64
    const { data: blob, error: de } = await admin.storage.from("clinic-phi").download(rep.storage_path);
    if (de || !blob) return json({ error: `could not read report (${de?.message || "no object"})` }, 404);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);

    const prompt = `You are reading a clinical laboratory report. Extract EVERY test result.
Return ONLY a JSON array; each item: {"test": string, "value": string, "unit": string, "ref_range": string, "flag": string}.
flag = "H" if above range, "L" if below range, "CRITICAL" if critically abnormal, else "".
If a field is unknown use "". Return ONLY the JSON array, no prose.`;

    const geminiBody = JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "application/pdf", data: b64 } }] }] });
    let resp: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {   // Gemini 2.5 Flash returns transient 503/429 under load — retry
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: geminiBody },
      );
      if (resp.ok || ![429, 500, 502, 503, 504].includes(resp.status)) break;
      await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
    }
    if (!resp || !resp.ok) { const t = resp ? await resp.text() : ""; console.error("gemini", resp?.status, t.slice(0, 200)); return json({ error: `vision provider error (${resp?.status ?? "no-response"})` }, 502); }
    const out = await resp.json();
    const raw: string = out?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "";
    const match = raw.match(/\[[\s\S]*\]/);
    let findings: any[] = [];
    try { findings = match ? JSON.parse(match[0]) : []; } catch { findings = []; }

    // write findings + PHI audit (service role)
    await admin.from("hospital_lab_reports").update({
      findings, extracted_via: "gemini-2.5-flash", model_used: "gemini-2.5-flash",
      status: "inspected", inspected_at: new Date().toISOString(),
    }).eq("tenant_id", tenantId).eq("id", reportId);

    return json({ success: true, report_id: reportId, extracted_via: "gemini-2.5-flash", model_used: "gemini-2.5-flash", findings });
  } catch (err) {
    console.error("inspect-lab-report error:", err);
    return json({ error: (err as Error).message || "Unexpected error" }, 500);
  }
});
