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
  visitId: string; treatmentId: string; dose: string; doseUnit: string;
  administrationDetails: string; consumables: ConsumableLine[];
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
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
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
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as OpsConsumable[];
    },
  });
}

// Default consumables (recipe) for a treatment — pre-fills the selector when present.
export function useTreatmentRecipe(treatmentId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_treatment_recipe", tenantId, treatmentId],
    enabled: !!tenantId && !!treatmentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_treatment_consumables" as any)
        .select("stock_item_id, default_quantity")
        .eq("tenant_id", tenantId)
        .eq("treatment_id", treatmentId);
      if (error) throw error;
      return (data || []) as unknown as Array<{ stock_item_id: string; default_quantity: number }>;
    },
  });
}

// Visit ids that already have administered treatments (board badge + UI guard).
export function useAdministeredVisitIds() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_administered_visits", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_visit_treatments" as any)
        .select("visit_id")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.visit_id as string));
    },
  });
}

// What was administered for a visit (read-only recorded view in the dialog).
export function useVisitAdministration(visitId?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ["clinic_visit_admin", tenantId, visitId],
    enabled: !!tenantId && !!visitId,
    queryFn: async () => {
      const [tx, cons] = await Promise.all([
        supabase.from("clinic_visit_treatments" as any).select("*")
          .eq("tenant_id", tenantId).eq("visit_id", visitId),
        supabase.from("clinic_visit_consumables" as any)
          .select("*, item:ops_inventory_items(name, sku, unit)")
          .eq("tenant_id", tenantId).eq("visit_id", visitId),
      ]);
      if (tx.error) throw tx.error;
      if (cons.error) throw cons.error;
      return { treatments: (tx.data || []) as any[], consumables: (cons.data || []) as any[] };
    },
  });
}

export function useAdministerTreatment() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();
  const staffId = authUser?.id ?? null; // public.users.id (FK target for *_staff_id / performed_by / recorded_by)

  return useMutation({
    mutationFn: async (input: AdministerInput) => {
      if (!tenantId) throw new Error("No tenant ID — are you logged in?");

      // IDEMPOTENCY GUARD (the source app has none): if this visit already has any
      // administered treatment, block — re-administering would double-decrement stock.
      const { count, error: gErr } = await supabase
        .from("clinic_visit_treatments" as any)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("visit_id", input.visitId);
      if (gErr) throw gErr;
      if ((count ?? 0) > 0) {
        throw new Error("Treatment already administered for this visit — blocked to prevent double inventory decrement.");
      }

      // 1) the administered treatment (establishes the guard before any decrement)
      const { error: tErr } = await supabase.from("clinic_visit_treatments" as any).insert({
        tenant_id: tenantId,
        visit_id: input.visitId,
        treatment_id: input.treatmentId,
        dose_administered: input.dose,
        dose_unit: input.doseUnit,
        administration_details: input.administrationDetails || null,
        sessions_deducted: 1,
        performed_by: staffId,
        doctor_staff_id: staffId,
        nurse_staff_id: staffId,
      } as any);
      if (tErr) throw tErr;

      // 2) consumable usage + ops decrement (cosmique-scoped via .eq tenant_id on every write)
      for (const line of input.consumables) {
        if (!line.stockItemId || !(line.quantity > 0)) continue;

        // 2a) record usage
        const { error: cErr } = await supabase.from("clinic_visit_consumables" as any).insert({
          tenant_id: tenantId,
          visit_id: input.visitId,
          stock_item_id: line.stockItemId,
          quantity_used: line.quantity,
          recorded_by: staffId,
        } as any);
        if (cErr) throw cErr;

        // 2b) fresh, tenant-scoped read of the stock level
        const { data: item, error: iErr } = await supabase
          .from("ops_inventory_items" as any)
          .select("current_stock, unit_cost")
          .eq("id", line.stockItemId)
          .eq("tenant_id", tenantId)
          .single();
        if (iErr) throw iErr;
        const newStock = Math.max(0, Number((item as any).current_stock || 0) - Number(line.quantity));

        // 2c) audit movement (matches the DB convention: 'out', positive quantity)
        const { error: mErr } = await supabase.from("ops_inventory_movements" as any).insert({
          tenant_id: tenantId,
          item_id: line.stockItemId,
          movement_type: "out",
          quantity: line.quantity,
          unit_cost: (item as any).unit_cost ?? null,
          reference_type: "clinic_visit",
          reference_id: input.visitId,
          agent_name: "clinic-floor",
        } as any);
        if (mErr) throw mErr;

        // 2d) decrement stock — the existing 420 mechanism (absolute SET, scoped by id + tenant_id)
        const { error: uErr } = await supabase
          .from("ops_inventory_items" as any)
          .update({ current_stock: newStock, updated_at: new Date().toISOString() } as any)
          .eq("id", line.stockItemId)
          .eq("tenant_id", tenantId);
        if (uErr) throw uErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic_visits", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["clinic_administered_visits", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["ops_consumables", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["clinic_visit_admin", tenantId] });
    },
  });
}
