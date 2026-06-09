// Hospital staff directory for the clinical dropdowns (attending physician, nurse,
// pharmacist, reception). Reads hr_employees — which is UUID-tenant (tenant_id =
// tenant_config.id), the SAME pattern the HR module + clinic Doctors page use
// (RLS-readable by the authenticated tenant user). Roles are classified from
// job_title/position/department so the seeded BSH-* staff populate the right pickers.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface HospitalStaff {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  job_title?: string | null;
  position?: string | null;
  department?: string | null;
  role: "doctor" | "nurse" | "pharmacist" | "reception" | "other";
}

function classify(e: any): HospitalStaff["role"] {
  const hay = `${e.job_title || ""} ${e.position || ""} ${e.department || ""}`.toLowerCase();
  if (/nurse|nursing/.test(hay)) return "nurse";
  if (/pharmac/.test(hay)) return "pharmacist";
  if (/doctor|physician|cardiolog|surgeon|consultant|radiolog|medical officer|anaesth|anesth|registrar/.test(hay)) return "doctor";
  if (/recept|front\s?desk|admin|registration/.test(hay)) return "reception";
  return "other";
}

export function useHospitalStaff() {
  const { tenantConfig } = useTenant();
  const tenantUuid = (tenantConfig as any)?.id as string | undefined;

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["hospital_staff", tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data } = await supabase
        .from("hr_employees" as any)
        .select("id, first_name, last_name, full_name, job_title, position, department, employment_status")
        .eq("tenant_id", tenantUuid)
        .or("employment_status.eq.active,employment_status.is.null")
        .order("first_name");
      return ((data || []) as any[]).map((e) => ({
        id: e.id,
        name: (e.full_name && String(e.full_name).trim()) || `${e.first_name || ""} ${e.last_name || ""}`.trim() || "Unnamed",
        first_name: e.first_name, last_name: e.last_name,
        job_title: e.job_title, position: e.position, department: e.department,
        role: classify(e),
      })) as HospitalStaff[];
    },
    enabled: !!tenantUuid,
  });

  const byRole = useMemo(() => {
    const pick = (r: HospitalStaff["role"]) => staff.filter((s) => s.role === r);
    const doctors = pick("doctor");
    return {
      all: staff,
      // doctors picker also offers consultants/registrars; fall back to "all" if classification found none
      doctors: doctors.length ? doctors : staff,
      nurses: pick("nurse"),
      pharmacists: pick("pharmacist"),
      reception: pick("reception"),
    };
  }, [staff]);

  const byId = useMemo(() => {
    const m: Record<string, HospitalStaff> = {};
    staff.forEach((s) => { m[s.id] = s; });
    return m;
  }, [staff]);

  return { staff, isLoading, ...byRole, byId };
}
