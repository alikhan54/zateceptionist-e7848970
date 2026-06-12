// HOSPITAL-RBAC [8] — per-user hospital role, app-level only (shared tenant RLS untouched).
// The hospital role lives in a SEPARATE additive marker (hr_employees.hospital_role via the user_id
// link; mirrored in users.preferences), NEVER in the shared user_roles.role. Platform admins and
// every NON-hospital tenant short-circuit to 'admin' synchronously → no query, byte-identical.
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";

// HOSPITAL-ROLES [Brief 10] — ADDITIVE nurse split (opd/ward/ot) + the SURGEON role. The legacy
// 'nurse' and 'doctor' entries are BYTE-IDENTICAL (Farzana's login behaves exactly as before);
// the new values only ADD pages. Same default-deny posture: unknown markers never restrict.
export type HospitalRole =
  | "doctor" | "nurse" | "lab" | "pharmacy" | "admin"
  | "opd_nurse" | "ward_nurse" | "ot_nurse" | "surgeon";

// Per-role allowed /hospital pages (admin = all). Home = where a wrong role is redirected.
// HOSPITAL-PORTAL — "/hospital/home" is ADDITIVE on every role (the portal renders the role's own
// home or falls through to its first page); existing page entries are untouched.
export const HOSPITAL_ROLE_PAGES: Record<HospitalRole, string[]> = {
  doctor: ["/hospital/journey", "/hospital/patients", "/hospital/pharmacy", "/hospital/lab", "/hospital/diagnostics", "/hospital/routines", "/hospital/home"],
  nurse: ["/hospital/nurse", "/hospital/beds", "/hospital/home"],
  lab: ["/hospital/lab", "/hospital/home"],
  pharmacy: ["/hospital/pharmacy", "/hospital/home"],
  opd_nurse: ["/hospital/nurse", "/hospital/home"],
  ward_nurse: ["/hospital/nurse", "/hospital/beds", "/hospital/routines", "/hospital/home"],
  ot_nurse: ["/hospital/ot", "/hospital/home"],
  surgeon: ["/hospital/journey", "/hospital/ot", "/hospital/home"],
  admin: ["/hospital/journey", "/hospital/patients", "/hospital/nurse", "/hospital/beds", "/hospital/pharmacy", "/hospital/lab", "/hospital/diagnostics", "/hospital/ot", "/hospital/routines", "/hospital/home"],
};
// Roles whose portal home has SHIPPED land on /hospital/home; the rest keep their existing landing
// (flipped per checkpoint as each home ships).
export const HOSPITAL_ROLE_HOME: Record<HospitalRole, string> = {
  doctor: "/hospital/home", nurse: "/hospital/nurse", lab: "/hospital/home", pharmacy: "/hospital/home",
  opd_nurse: "/hospital/home", ward_nurse: "/hospital/home", ot_nurse: "/hospital/ot", surgeon: "/hospital/ot",
  admin: "/hospital/journey",
};
const RESTRICTED = ["doctor", "nurse", "lab", "pharmacy", "opd_nurse", "ward_nurse", "ot_nurse", "surgeon"] as const;
export const isRestrictedHospitalRole = (r: HospitalRole | null | undefined): r is (typeof RESTRICTED)[number] =>
  !!r && (RESTRICTED as readonly string[]).includes(r);

// the explicit, restrictable markers — anything NOT in this set falls through to full-access 'admin'
// (the Brief-6 loadMarker leak class: a marker missing from this accept-list must NEVER restrict-or-admin
// by accident — new roles are added HERE in the same change that defines their pages)
const KNOWN_RESTRICTED = new Set<string>(RESTRICTED);

interface Marker { hospitalRole: HospitalRole; hrEmployeeId: string | null; }
const cache = new Map<string, Marker>();          // dedup across the sidebar / gate / layout / pages
const inflight = new Map<string, Promise<Marker>>();

async function loadMarker(userId: string): Promise<Marker> {
  // PRIMARY: hr_employees by the user_id link (the sanctioned marker; gives the hr id for the doctor filter).
  try {
    const { data } = await supabase.from("hr_employees" as any).select("id,hospital_role").eq("user_id", userId).maybeSingle();
    const r = (data as any)?.hospital_role;
    if (r === "admin" || KNOWN_RESTRICTED.has(r))
      return { hospitalRole: r, hrEmployeeId: (data as any)?.id ?? null };
  } catch { /* fall through to the mirror */ }
  // FALLBACK: users.preferences (always self-readable) — where the pharmacy marker lives.
  try {
    const { data } = await supabase.from("users" as any).select("preferences").eq("id", userId).maybeSingle();
    const p = ((data as any)?.preferences ?? {}) as Record<string, unknown>;
    const r = p.hospital_role as string | undefined;
    if (r === "admin" || (r && KNOWN_RESTRICTED.has(r)))
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
