import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

// clinic_* + ops_* are not in the generated DB types -> `as any` (house pattern).
export interface ClinicTreatmentOption {
  id: string; name: string; dosage_unit: string | null;
  default_dose: string | null; administration_method: string | null;
}
export interface OpsConsumable {
  id: string; sku: string | null; name: string;
  unit: string | null; current_stock: number | null; unit_cost: number | null;
}
export interface ConsumableLine { stockItemId: string; quantity: number; }
export interface AdministerInput {
  visitId: string; patientId: string; treatmentId: string;
  dose: string; doseUnit: string; administrationDetails: string; consumables: ConsumableLine[];
}

export function useClinicTreatmentsList() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_treatments_list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_treatments" as any)
        .select("id, name, dosage_unit, default_dose, administration_method")
        .eq("tenant_id", tenantId).eq("is_active", true).order("name");
      if (error) throw error;
      return (data || []) as unknown as ClinicTreatmentOption[];
    },
  });
}

export function useOpsConsumables() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["ops_consumables", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ops_inventory_items" as any)
        .select("id, sku, name, unit, current_stock, unit_cost")
        .eq("tenant_id", tenantId).eq("is_active", true).order("name");
      if (error) throw error;
      return (data || []) as unknown as OpsConsumable[];
    },
  });
}

export function useTreatmentRecipe(treatmentId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_treatment_recipe", tenantId, treatmentId],
    enabled: !!tenantId && !!treatmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_treatment_consumables" as any)
        .select("stock_item_id, default_quantity")
        .eq("tenant_id", tenantId).eq("treatment_id", treatmentId);
      if (error) throw error;
      return (data || []) as unknown as Array<{ stock_item_id: string; default_quantity: number }>;
    },
  });
}

// Encounter ledger: how many treatments each visit has (board badge + per-line model).
export function useVisitTreatmentCounts() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_visit_tx_counts", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_visit_treatments" as any).select("visit_id").eq("tenant_id", tenantId);
      if (error) throw error;
      const m = new Map<string, number>();
      for (const r of (data || []) as any[]) m.set(r.visit_id, (m.get(r.visit_id) || 0) + 1);
      return m;
    },
  });
}

// The committed ledger for a visit (read-only lines) + consumables.
export function useVisitAdministration(visitId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_visit_admin", tenantId, visitId],
    enabled: !!tenantId && !!visitId,
    queryFn: async () => {
      const [tx, cons] = await Promise.all([
        supabase.from("clinic_visit_treatments" as any).select("*").eq("tenant_id", tenantId).eq("visit_id", visitId).order("administered_at"),
        supabase.from("clinic_visit_consumables" as any).select("*, item:ops_inventory_items(name, sku, unit)").eq("tenant_id", tenantId).eq("visit_id", visitId),
      ]);
      if (tx.error) throw tx.error;
      if (cons.error) throw cons.error;
      return { treatments: (tx.data || []) as any[], consumables: (cons.data || []) as any[] };
    },
  });
}

// Active prepaid packages for a patient (coverage display + packages page).
export function usePatientPackages(patientId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_patient_packages", tenantId, patientId],
    enabled: !!tenantId && !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_patient_packages" as any)
        .select("id, treatment_id, sessions_purchased, sessions_remaining, status, payment_status, total_amount, amount_paid, purchase_date")
        .eq("tenant_id", tenantId).eq("patient_id", patientId).order("purchase_date");
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

// ENCOUNTER LEDGER — administer ONE treatment line. Per-line idempotent:
// committed lines are never touched again; only this NEW line decrements stock + (if
// covered) deducts ONE package session. Blocked once the visit is completed/locked.
export function useAdministerTreatment() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();
  const staffId = authUser?.id ?? null; // public.users.id

  return useMutation({
    mutationFn: async (input: AdministerInput) => {
      if (!tenantId) throw new Error("No tenant ID — are you logged in?");

      // FINALIZATION GUARD (per-visit, for completion — NOT per-line): once the visit is
      // locked, no further treatments can be added/decremented.
      const { data: visit, error: vErr } = await supabase
        .from("clinic_visits" as any).select("is_locked, current_status")
        .eq("id", input.visitId).eq("tenant_id", tenantId).single();
      if (vErr) throw vErr;
      if ((visit as any).is_locked) throw new Error("Visit is completed/locked — cannot add treatments.");

      // PACKAGE COVERAGE: does the patient have an active package for this treatment with
      // sessions left? (FIFO by purchase_date). Used to link + deduct ONE session.
      const { data: pkgs, error: pErr } = await supabase
        .from("clinic_patient_packages" as any)
        .select("id, sessions_remaining")
        .eq("tenant_id", tenantId).eq("patient_id", input.patientId)
        .eq("treatment_id", input.treatmentId).eq("status", "active")
        .gt("sessions_remaining", 0).order("purchase_date").limit(1);
      if (pErr) throw pErr;
      const coveringPkg = (pkgs && pkgs[0]) as any | undefined;

      // 1) the administered treatment line (each call = ONE new immutable line)
      const { error: tErr } = await supabase.from("clinic_visit_treatments" as any).insert({
        tenant_id: tenantId,
        visit_id: input.visitId,
        treatment_id: input.treatmentId,
        package_id: coveringPkg?.id ?? null,
        dose_administered: input.dose,
        dose_unit: input.doseUnit,
        administration_details: input.administrationDetails || null,
        sessions_deducted: coveringPkg ? 1 : 0,
        performed_by: staffId,
        doctor_staff_id: staffId,
        nurse_staff_id: staffId,
      } as any);
      if (tErr) throw tErr;

      // 2) consumable usage + ops decrement (cosmique-scoped; existing 420 mechanism)
      for (const line of input.consumables) {
        if (!line.stockItemId || !(line.quantity > 0)) continue;
        const { error: cErr } = await supabase.from("clinic_visit_consumables" as any).insert({
          tenant_id: tenantId, visit_id: input.visitId, stock_item_id: line.stockItemId,
          quantity_used: line.quantity, recorded_by: staffId,
        } as any);
        if (cErr) throw cErr;
        const { data: item, error: iErr } = await supabase
          .from("ops_inventory_items" as any).select("current_stock, unit_cost")
          .eq("id", line.stockItemId).eq("tenant_id", tenantId).single();
        if (iErr) throw iErr;
        const newStock = Math.max(0, Number((item as any).current_stock || 0) - Number(line.quantity));
        const { error: mErr } = await supabase.from("ops_inventory_movements" as any).insert({
          tenant_id: tenantId, item_id: line.stockItemId, movement_type: "out", quantity: line.quantity,
          unit_cost: (item as any).unit_cost ?? null, reference_type: "clinic_visit",
          reference_id: input.visitId, agent_name: "clinic-floor",
        } as any);
        if (mErr) throw mErr;
        const { error: uErr } = await supabase
          .from("ops_inventory_items" as any)
          .update({ current_stock: newStock, updated_at: new Date().toISOString() } as any)
          .eq("id", line.stockItemId).eq("tenant_id", tenantId);
        if (uErr) throw uErr;
      }

      // 3) PACKAGE SESSION DEDUCT — exactly once, here, as this line is created (committed
      // lines never re-run this). Optimistic concurrency: only update if remaining unchanged.
      if (coveringPkg) {
        const remaining = Number(coveringPkg.sessions_remaining);
        const next = remaining - 1;
        const { error: dErr } = await supabase
          .from("clinic_patient_packages" as any)
          .update({ sessions_remaining: next, status: next <= 0 ? "depleted" : "active", updated_at: new Date().toISOString() } as any)
          .eq("id", coveringPkg.id).eq("tenant_id", tenantId).eq("sessions_remaining", remaining);
        if (dErr) throw dErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_visits", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["clinic_visit_tx_counts", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["ops_consumables", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["clinic_visit_admin", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["clinic_patient_packages", tenantId] });
    },
  });
}

// ---------------- Packages (Phase 2c B) ----------------
export interface TemplateLineInput { treatmentId: string; sessions: number; isComplimentary: boolean; }

export function useClinicPackageTemplates() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_package_templates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_package_templates" as any)
        .select("*, lines:clinic_package_template_treatments(id, treatment_id, sessions, is_complimentary)")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useCreatePackageTemplate() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description: string; basePrice: number; lines: TemplateLineInput[] }) => {
      if (!tenantId) throw new Error("No tenant ID — are you logged in?");
      // one line per treatment (respects UNIQUE(tenant_id, template_id, treatment_id))
      const seen = new Set<string>();
      const lines = input.lines.filter((l) => l.treatmentId && !seen.has(l.treatmentId) && seen.add(l.treatmentId));
      if (lines.length === 0) throw new Error("Add at least one treatment line.");
      const { data: tpl, error: e1 } = await supabase.from("clinic_package_templates" as any).insert({
        tenant_id: tenantId, name: input.name, description: input.description || null,
        base_price: input.basePrice || 0, status: "active",
      } as any).select("id").single();
      if (e1) throw e1;
      const tplId = (tpl as any).id;
      const { error: e2 } = await supabase.from("clinic_package_template_treatments" as any).insert(
        lines.map((l) => ({
          tenant_id: tenantId, template_id: tplId, treatment_id: l.treatmentId,
          sessions: Math.max(1, Number(l.sessions) || 1), is_complimentary: !!l.isComplimentary,
        })) as any,
      );
      if (e2) throw e2;
      return tplId as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clinic_package_templates", tenantId] }),
  });
}

// Sell a template to a patient: one clinic_patient_packages row per template treatment;
// the full bill + payment recorded on the FIRST (primary) row only (avoids SUM double-count).
export function useSellPackage() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();
  const staffId = authUser?.id ?? null;
  return useMutation({
    mutationFn: async (input: { patientId: string; templateId: string; amountPaid: number; paymentMethod: string }) => {
      if (!tenantId) throw new Error("No tenant ID — are you logged in?");
      const { data: tpl, error: te } = await supabase.from("clinic_package_templates" as any)
        .select("base_price, lines:clinic_package_template_treatments(treatment_id, sessions, is_complimentary)")
        .eq("id", input.templateId).eq("tenant_id", tenantId).single();
      if (te) throw te;
      const lines = ((tpl as any).lines || []) as any[];
      if (lines.length === 0) throw new Error("Template has no treatments.");
      const total = Number((tpl as any).base_price) || 0;
      const paid = Number(input.amountPaid) || 0;
      const payStatus = paid >= total ? "paid" : "pending";
      const created: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const primary = i === 0;
        const { data: pkg, error: pe } = await supabase.from("clinic_patient_packages" as any).insert({
          tenant_id: tenantId, patient_id: input.patientId, treatment_id: l.treatment_id,
          template_id: input.templateId,
          sessions_purchased: Math.max(1, Number(l.sessions) || 1),
          sessions_remaining: Math.max(1, Number(l.sessions) || 1),
          payment_status: l.is_complimentary ? "paid" : payStatus, status: "active",
          total_amount: primary ? total : 0, amount_paid: primary ? paid : 0,
          created_by: staffId, is_patient_initiated: false,
        } as any).select("id").single();
        if (pe) throw pe;
        created.push((pkg as any).id);
      }
      if (paid > 0) {
        const { error: payErr } = await supabase.from("clinic_package_payments" as any).insert({
          tenant_id: tenantId, package_id: created[0], amount: paid,
          payment_method: (input.paymentMethod || "cash").toLowerCase(),
        } as any);
        if (payErr) throw payErr;
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_patient_packages", tenantId] });
    },
  });
}
