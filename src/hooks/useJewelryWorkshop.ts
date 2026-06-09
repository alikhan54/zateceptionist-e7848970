/**
 * Jewelry Workshop / Karigar (Project JX, Phase 9).
 * Records gold issue / item receive / making payment via the jx_record_worker_txn RPC
 * (SECURITY INVOKER, atomic, CASH-BASIS). Per-karigar gold balance, making payable and
 * wastage% are COMPUTED here from jx_worker_txn — never stored. SLUG-keyed via
 * useTenant() + RLS. All gram math reuses calc.ts (pureWeight) — no re-implementation.
 *
 *   gold balance (fine g, still with karigar) = Σ issued fine − Σ received fine
 *   making payable                            = Σ receive making − Σ payments
 *   wastage%                                  = (Σ issued net − Σ received net) / Σ issued net
 *   anomaly                                   = wastage% > WASTAGE_ANOMALY_PCT (default 3%)
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { pureWeight, round2, round3 } from "@/lib/jewelry/calc";

/** Default wastage threshold (%) above which a karigar's return is flagged as an anomaly. */
export const WASTAGE_ANOMALY_PCT = 3;

export interface JxWorker { id: string; name: string | null; phone: string | null; default_making_rate: number | null; }
export interface JxWorkerTxn {
  id: string; worker_id: string | null; type: string | null; net_grams: number | null;
  karat: number | null; making_amount: number | null; item_id: string | null; txn_date: string | null; created_at: string;
}
export interface JxWorkerStat {
  worker: JxWorker;
  issuedFine: number; receivedFine: number; goldBalance: number;
  issuedNet: number; receivedNet: number; wastageGrams: number; wastagePct: number; anomaly: boolean;
  makingPayable: number; txnCount: number;
}

export interface WorkerTxnInput {
  type: "issue_gold" | "receive_item" | "making_payment";
  worker_id: string;
  net_grams?: number; karat?: number; fine_grams?: number;
  making_amount?: number; amount?: number; item_id?: string | null;
}

export function useJewelryWorkshop() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  // Distinct key from useJewelryWorkers (inventory) so the richer column set never clobbers that cache.
  const { data: workers = [], isLoading: lw } = useQuery({
    queryKey: ["jx_worker_full", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_worker" as any).select("id, name, phone, default_making_rate").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      return (data || []) as unknown as JxWorker[];
    },
  });

  const { data: txns = [], isLoading: lt } = useQuery({
    queryKey: ["jx_worker_txn", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jx_worker_txn" as any).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as JxWorkerTxn[];
    },
  });

  const stats = useMemo<JxWorkerStat[]>(() => {
    return workers.map((w) => {
      const wt = txns.filter((t) => t.worker_id === w.id);
      let issuedFine = 0, receivedFine = 0, issuedNet = 0, receivedNet = 0, recvMaking = 0, paid = 0;
      for (const t of wt) {
        const net = Number(t.net_grams) || 0;
        const fine = pureWeight(net, Number(t.karat) || 0);
        if (t.type === "issue") { issuedFine += fine; issuedNet += net; }
        else if (t.type === "receive") { receivedFine += fine; receivedNet += net; recvMaking += Number(t.making_amount) || 0; }
        else if (t.type === "payment") { paid += Number(t.making_amount) || 0; }
      }
      const wastageGrams = issuedNet - receivedNet;
      const wastagePct = issuedNet > 0 ? (wastageGrams / issuedNet) * 100 : 0;
      return {
        worker: w,
        issuedFine: round3(issuedFine), receivedFine: round3(receivedFine), goldBalance: round3(issuedFine - receivedFine),
        issuedNet: round3(issuedNet), receivedNet: round3(receivedNet), wastageGrams: round3(wastageGrams),
        wastagePct: round2(wastagePct), anomaly: wastagePct > WASTAGE_ANOMALY_PCT,
        makingPayable: round2(recvMaking - paid), txnCount: wt.length,
      };
    });
  }, [workers, txns]);

  const quickAddWorker = useMutation({
    mutationFn: async (w: { name: string; phone?: string; default_making_rate?: number }) => {
      const { data, error } = await supabase
        .from("jx_worker" as any).insert({ ...w, tenant_id: tenantId } as any).select("id, name, phone, default_making_rate").single();
      if (error) throw error;
      return data as unknown as JxWorker;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jx_worker_full", tenantId] });
      qc.invalidateQueries({ queryKey: ["jx_worker", tenantId] }); // inventory worker dropdown
    },
  });

  const recordTxn = useMutation({
    mutationFn: async (input: WorkerTxnInput) => {
      const { data, error } = await supabase.rpc("jx_record_worker_txn" as any, { p_payload: input as any });
      if (error) throw error;
      return data as unknown as { txn_id: string; txn_type: string; voucher_id?: string; gold_ledger_id?: string; fine_grams?: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jx_worker_txn", tenantId] });
      qc.invalidateQueries({ queryKey: ["jx_gold_ledger_position", tenantId] });
    },
  });

  const fetchWorkerTxns = async (workerId: string): Promise<JxWorkerTxn[]> => {
    const { data, error } = await supabase
      .from("jx_worker_txn" as any).select("*").eq("worker_id", workerId).eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as JxWorkerTxn[];
  };

  /** Fine grams for a gold movement (single math source = calc.ts). */
  const fineGrams = (netGrams: number, karat: number) => round3(pureWeight(netGrams, karat));

  return { workers, stats, txns, quickAddWorker, recordTxn, fetchWorkerTxns, fineGrams, isLoading: lw || lt };
}
