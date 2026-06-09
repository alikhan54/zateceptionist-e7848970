// Hospital lab-report document intelligence (P6b FE) — wired to the P6a backend.
// Uploads to the PRIVATE clinic-phi bucket; inspection runs through the pool-immune
// medica-brief route (which drives MEDICA's inspect_lab_report tool). Tenant-scoped by RLS.
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { withLang } from "@/pages/hospital/i18n";

export interface LabFinding { test: string; value: string; unit?: string; ref_range?: string; flag?: string; }
export interface HospitalLabReport {
  id: string; tenant_id: string; order_id: string | null; patient_id: string | null;
  storage_path: string; file_name: string | null; status: string;
  findings: LabFinding[] | null; takeaway: string | null;
  extracted_via: string | null; model_used: string | null; created_at: string;
}

export function useHospitalLabReports(patientId?: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["hospital_lab_reports", tenantId, patientId ?? "all"],
    queryFn: async () => {
      if (!tenantId) return [];
      let q = supabase.from("hospital_lab_reports" as any).select("*").eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (patientId) q = q.eq("patient_id", patientId);
      const { data } = await q;
      return (data || []) as HospitalLabReport[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!tenantId) return;
    const ch = supabase.channel(`hlr_rt_${tenantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_lab_reports", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ["hospital_lab_reports", tenantId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tenantId, qc]);

  const upload = useMutation({
    mutationFn: async ({ file, orderId, patientId: pid }: { file: File; orderId?: string; patientId?: string }) => {
      const id = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const seg = (orderId || "adhoc").replace(/[^a-zA-Z0-9-]/g, "");
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
      const path = `${tenantId}/lab-reports/${seg}/${id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("clinic-phi").upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("hospital_lab_reports" as any).insert({
        id, tenant_id: tenantId, order_id: orderId || null, patient_id: pid || null,
        storage_path: path, file_name: file.name, status: "uploaded", uploaded_by: auth?.user?.id ?? null,
      }).select().single();
      if (error) throw error;
      return data as HospitalLabReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hospital_lab_reports", tenantId] }),
  });

  async function signedUrl(path: string): Promise<string | null> {
    const { data } = await supabase.storage.from("clinic-phi").createSignedUrl(path, 300);
    return data?.signedUrl ?? null;
  }

  return { reports, isLoading, upload, signedUrl, refetch: () => qc.invalidateQueries({ queryKey: ["hospital_lab_reports", tenantId] }) };
}

/**
 * MEDICA inspects a report via the pool-immune medica-brief route → MEDICA calls its
 * inspect_lab_report tool (PHI-gated extraction in the P6a backend), writes the structured
 * findings to the row, and returns a one-line clinical takeaway. Returns the takeaway prose;
 * the structured findings are re-read from the row (realtime / refetch).
 */
export async function inspectWithMedica(reportId: string, lang: "en" | "bn" = "en"): Promise<{ takeaway: string; agent_used?: string; priorComparedDate?: string }> {
  // The takeaway is MEDICA's prose (via medica-brief) → lang rides in the message; the
  // structured findings (from inspect-lab-report's Gemini) stay standard medical English.
  // The language is stated INLINE in the takeaway instruction (the trailing directive alone
  // was not reliably followed after the tool call) AND reinforced by withLang. en = byte-identical.
  //
  // Same-patient lab trend [18]: if THIS report's patient has a PRIOR inspected report
  // (SAME patient_id + SAME tenant — RLS scopes the tenant; the patient_id filter scopes the
  // patient), inject the prior findings so MEDICA's takeaway adds a same-patient trend note.
  // NO prior (or a patient-less report) → the message is BYTE-IDENTICAL to the single-report
  // takeaway below — no regression. Never compares across patients.
  let priorBlock = "";
  let priorComparedDate: string | undefined;
  try {
    const { data: cur } = await supabase
      .from("hospital_lab_reports" as any)
      .select("patient_id").eq("id", reportId).maybeSingle();
    const pid = (cur as any)?.patient_id;
    if (pid) {
      const { data: priors } = await supabase
        .from("hospital_lab_reports" as any)
        .select("file_name, created_at, findings")
        .eq("patient_id", pid)                 // SAME patient only (tenant scoped by RLS)
        .eq("status", "inspected")
        .neq("id", reportId)
        .order("created_at", { ascending: false })
        .limit(1);
      const prev = ((priors as any[]) || []).find((p) => Array.isArray(p.findings) && p.findings.length);
      if (prev) {
        priorComparedDate = String(prev.created_at).slice(0, 10);
        priorBlock =
          ` This SAME patient has a PRIOR inspected lab report (${prev.file_name || "previous"}, ${priorComparedDate}) ` +
          `with findings: ${JSON.stringify(prev.findings).slice(0, 1400)}. For any test appearing in BOTH the new report ` +
          `and this prior one, add a short same-patient TREND note (rising / falling, worsening / improving) comparing the ` +
          `new value to that prior value. Compare ONLY this same patient's reports.`;
      }
    }
  } catch { /* prior-fetch is best-effort — never blocks the single-report takeaway */ }

  const inBn = lang === "bn" ? " written IN BANGLA (বাংলায়)" : "";
  const base = priorBlock
    ? `Use your inspect_lab_report tool on lab report id ${reportId}. Then give a concise clinical takeaway (1-2 sentences)${inBn} ` +
      `highlighting the most important abnormal/critical value(s) for the clinician to act on, AND a same-patient trend note.${priorBlock} ` +
      `Do not diagnose or prescribe.`
    : `Use your inspect_lab_report tool on lab report id ${reportId}. Then give exactly ONE concise clinical ` +
      `takeaway sentence${inBn} highlighting the most important abnormal/critical value(s) for the clinician to act on. ` +
      `Do not diagnose or prescribe.`;
  const message = withLang(base, lang);
  const { data, error } = await supabase.functions.invoke("medica-brief", { body: { message } });
  if (error) throw error;
  if (!data?.response) throw new Error(data?.error || "MEDICA returned no response");
  return { takeaway: String(data.response).replace(/^\s*\*\*\[[^\]]*\]\*\*\s*/, "").trim(), agent_used: data.agent_used, priorComparedDate };
}

export function flagStatus(flag?: string): "critical" | "warning" | "normal" {
  const x = (flag || "").toUpperCase();
  if (["CRITICAL", "CRIT"].includes(x)) return "critical";
  if (["H", "L", "HIGH", "LOW", "ABN", "*", "A"].includes(x)) return "warning";
  return "normal";
}
