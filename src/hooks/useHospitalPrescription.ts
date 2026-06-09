// HOSPITAL-RX — per-encounter doctor-signed prescription (additive `hospital_prescriptions`).
// One row per (tenant_id, visit_id); upsert on save. Tenant-scoped (RLS + `.eq(tenant_id)`); the
// page that uses it (Patient Journey) is doctor/admin-gated, so nurse/lab never reach a write.
// Only a SIGNED row (status='signed', signed_at set) is final/printable. `as any` (house pattern).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { RxItem } from "@/pages/hospital/hospitalShared";

export type RxStatus = "draft" | "signed";
export type RxSource = "manual" | "assisted";

export interface PrescriptionRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  visit_id: string;
  items: RxItem[];
  advice: string | null;
  follow_up: string | null;
  source: RxSource | null;
  authored_by: string | null;
  status: RxStatus;
  signed_at: string | null;
  lang: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveRxPayload {
  items: RxItem[];
  advice: string;
  follow_up: string;
  source: RxSource;
  status: RxStatus;     // 'draft' = save without signing; 'signed' = the SIGN step
  lang: string;
}

export function useHospitalPrescription(visitId?: string | null, patientId?: string | null) {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const qc = useQueryClient();
  const key = ["hospital_prescription", tenantId, visitId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospital_prescriptions" as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("visit_id", visitId)
        .maybeSingle();
      if (error) throw error;
      const row = data as any;
      if (row && !Array.isArray(row.items)) row.items = [];   // jsonb safety
      return (row as PrescriptionRow | null) ?? null;
    },
    enabled: !!tenantId && !!visitId,
  });

  const save = useMutation({
    mutationFn: async (p: SaveRxPayload) => {
      if (!tenantId || !visitId || !patientId) throw new Error("Missing encounter context");
      const signing = p.status === "signed";
      const row = {
        tenant_id: tenantId,
        patient_id: patientId,
        visit_id: visitId,
        items: p.items,
        advice: p.advice.trim() || null,
        follow_up: p.follow_up.trim() || null,
        source: p.source,
        status: p.status,
        authored_by: authUser?.id ?? null,           // the doctor (provenance + signature)
        signed_at: signing ? new Date().toISOString() : null,
        lang: p.lang,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("hospital_prescriptions" as any)
        .upsert(row as any, { onConflict: "tenant_id,visit_id" })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PrescriptionRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { rx: query.data ?? null, isLoading: query.isLoading, save };
}
