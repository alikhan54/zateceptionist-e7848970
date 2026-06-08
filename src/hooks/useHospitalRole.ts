// HOSPITAL-RBAC [8] — per-user hospital role, app-level only (shared tenant RLS untouched).
// The hospital role lives in a SEPARATE additive marker (hr_employees.hospital_role via the user_id
// link; mirrored in users.preferences), NEVER in the shared user_roles.role. Platform admins and
// every NON-hospital tenant short-circuit to 'admin' synchronously → no query, byte-identical.
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

export type HospitalRole = "doctor" | "nurse" | "lab" | "admin";

// Per-role allowed /hospital pages (admin = all). Home = where a wrong role is redirected.
export const HOSPITAL_ROLE_PAGES: Record<HospitalRole, string[]> = {
  doctor: ["/hospital/journey", "/hospital/patients", "/hospital/pharmacy", "/hospital/lab", "/hospital/diagnostics"],
  nurse: ["/hospital/nurse", "/hospital/beds"],
  lab: ["/hospital/lab"],
  admin: ["/hospital/journey", "/hospital/patients", "/hospital/nurse", "/hospital/beds", "/hospital/pharmacy", "/hospital/lab", "/hospital/diagnostics"],
};
export const HOSPITAL_ROLE_HOME: Record<HospitalRole, string> = {
  doctor: "/hospital/journey", nurse: "/hospital/nurse", lab: "/hospital/lab", admin: "/hospital/journey",
};
export const isRestrictedHospitalRole = (r: HospitalRole | null | undefined): r is "doctor" | "nurse" | "lab" =>
  r === "doctor" || r === "nurse" || r === "lab";

interface Marker { hospitalRole: HospitalRole; hrEmployeeId: string | null; }
const cache = new Map<string, Marker>();          // dedup across the sidebar / gate / layout / pages
const inflight = new Map<string, Promise<Marker>>();

async function loadMarker(userId: string): Promise<Marker> {
  // PRIMARY: hr_employees by the user_id link (the sanctioned marker; gives the hr id for the doctor filter).
  try {
    const { data } = await supabase.from("hr_employees" as any).select("id,hospital_role").eq("user_id", userId).maybeSingle();
    const r = (data as any)?.hospital_role;
    if (r === "doctor" || r === "nurse" || r === "lab" || r === "admin")
      return { hospitalRole: r, hrEmployeeId: (data as any)?.id ?? null };
  } catch { /* fall through to the mirror */ }
  // FALLBACK: users.preferences (always self-readable).
  try {
    const { data } = await supabase.from("users" as any).select("preferences").eq("id", userId).maybeSingle();
    const p = ((data as any)?.preferences ?? {}) as Record<string, unknown>;
    const r = p.hospital_role;
    if (r === "doctor" || r === "nurse" || r === "lab" || r === "admin")
      return { hospitalRole: r as HospitalRole, hrEmployeeId: (p.hr_employee_id as string) ?? null };
  } catch { /* fall through */ }
  // No marker → full-access hospital admin. ONLY explicit doctor/nurse/lab markers ever restrict.
  return { hospitalRole: "admin", hrEmployeeId: null };
}

export interface HospitalRoleInfo { hospitalRole: HospitalRole | null; hrEmployeeId: string | null; loading: boolean; }

export function useHospitalRole(): HospitalRoleInfo {
  const { authUser } = useAuth();
  const { isHospital } = useTenant();
  const role = authUser?.role as string | undefined;
  const userId = authUser?.id ?? null;
  // Synchronous short-circuits: non-hospital tenant OR platform admin → 'admin', NO query.
  const shortCircuit = !isHospital || role === "admin" || role === "master_admin";

  const [marker, setMarker] = useState<Marker | null>(() =>
    !userId ? null : shortCircuit ? { hospitalRole: "admin", hrEmployeeId: null } : cache.get(userId) ?? null,
  );

  useEffect(() => {
    let active = true;
    if (!userId) { setMarker(null); return; }
    if (shortCircuit) { setMarker({ hospitalRole: "admin", hrEmployeeId: null }); return; }
    const cached = cache.get(userId);
    if (cached) { setMarker(cached); return; }
    let p = inflight.get(userId);
    if (!p) {
      p = loadMarker(userId).then((m) => { cache.set(userId, m); inflight.delete(userId); return m; });
      inflight.set(userId, p);
    }
    p.then((m) => { if (active) setMarker(m); });
    return () => { active = false; };
  }, [userId, shortCircuit]);

  return { hospitalRole: marker?.hospitalRole ?? null, hrEmployeeId: marker?.hrEmployeeId ?? null, loading: !!userId && marker === null };
}
