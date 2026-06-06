/**
 * Jewelry BI report reads (Project JX, Phase 14). Additive, read-only, SLUG/RLS.
 * Stock valuation (cost + at live rate), sales register, order/delivery pipeline,
 * profit (value-add: making+polish+stone), slow movers, customer dues.
 * Karigar ledger reuses useJewelryWorkshop; gold position reuses useJewelry.useGoldPosition.
 * All money math reuses calc.ts (pureWeight).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useGoldRates } from "@/hooks/useJewelry";
import { pureWeight, round2, round3 } from "@/lib/jewelry/calc";

const num = (v: any): number => { const x = typeof v === "number" ? v : parseFloat(String(v ?? "")); return Number.isFinite(x) ? x : 0; };
const DAY = 86400000;

/** In-stock valuation: metal at live rate + making, plus cost basis. */
export function useStockValuation() {
  const { tenantId } = useTenant();
  const { latestByKarat } = useGoldRates();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["jx_stock_val", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("jx_item" as any)
        .select("tag_number,karat,net_weight,pure_weight,making_type,making_value,lacquer_value,item_cost,purchase_rate,group_item,created_at,status")
        .eq("tenant_id", tenantId).eq("status", "in_stock");
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  let metal = 0, making = 0, cost = 0; const byKarat: Record<number, { count: number; fine: number; value: number }> = {};
  for (const it of items) {
    const k = num(it.karat), net = num(it.net_weight);
    const fine = it.pure_weight != null ? num(it.pure_weight) : pureWeight(net, k);
    const rate = num(latestByKarat[k]?.rate_per_gram);
    const realRate = latestByKarat[k]?.source !== "placeholder" ? rate : 0;
    const mk = it.making_type === "per_gram" ? num(it.making_value) * net : num(it.making_value);
    const m = fine * realRate;
    metal += m; making += mk;
    cost += it.item_cost != null ? num(it.item_cost) : (num(it.purchase_rate) * net + mk);
    byKarat[k] = byKarat[k] || { count: 0, fine: 0, value: 0 };
    byKarat[k].count++; byKarat[k].fine = round3(byKarat[k].fine + fine); byKarat[k].value = round2(byKarat[k].value + m + mk);
  }
  return { count: items.length, metalValue: round2(metal), makingValue: round2(making), atRateValue: round2(metal + making), costValue: round2(cost), byKarat, isLoading };
}

/** Sales register — recent sales with received + balance. */
export function useSalesRegister(limit = 50) {
  const { tenantId } = useTenant();
  const { data = [], isLoading } = useQuery({
    queryKey: ["jx_sales_reg", tenantId, limit],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("jx_sale" as any)
        .select("sale_no,sale_date,net_bill,paid_cash,paid_card,paid_cheque,cash_balance,status")
        .eq("tenant_id", tenantId).order("sale_date", { ascending: false }).limit(limit);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const rows = data.map((s) => ({ sale_no: s.sale_no, date: s.sale_date, net_bill: num(s.net_bill), received: round2(num(s.paid_cash) + num(s.paid_card) + num(s.paid_cheque)), balance: num(s.cash_balance), status: s.status }));
  const totalNet = round2(rows.reduce((a, r) => a + r.net_bill, 0));
  return { rows, totalNet, count: rows.length, isLoading };
}

/** Order / delivery pipeline — counts + balances by status. */
export function useOrderPipeline() {
  const { tenantId } = useTenant();
  const { data = [], isLoading } = useQuery({
    queryKey: ["jx_pipeline", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("jx_order" as any).select("status,net_amount,balance,delivery_date").eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const by: Record<string, { count: number; net: number; balance: number }> = {};
  for (const o of data) { const s = o.status || "unknown"; by[s] = by[s] || { count: 0, net: 0, balance: 0 }; by[s].count++; by[s].net = round2(by[s].net + num(o.net_amount)); by[s].balance = round2(by[s].balance + num(o.balance)); }
  const rows = Object.entries(by).map(([status, v]) => ({ status, ...v }));
  return { rows, total: data.length, isLoading };
}

/** Profit (value-add): making + polish + stone margin over sold items (the margin over spot metal). */
export function useProfitSummary() {
  const { tenantId } = useTenant();
  const { data = [], isLoading } = useQuery({
    queryKey: ["jx_profit", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.from("jx_sale_item" as any).select("making,polish,stone_value,line_total,net_weight,total_weight").eq("tenant_id", tenantId);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  let making = 0, polish = 0, stone = 0, gross = 0, wastageG = 0;
  for (const r of data) { making += num(r.making); polish += num(r.polish); stone += num(r.stone_value); gross += num(r.line_total); wastageG += Math.max(0, num(r.total_weight) - num(r.net_weight)); }
  const valueAdd = round2(making + polish + stone);
  return { making: round2(making), polish: round2(polish), stone: round2(stone), valueAdd, gross: round2(gross), metalPassThrough: round2(gross - valueAdd), wastageGrams: round3(wastageG), itemsSold: data.length, isLoading };
}

/** Slow movers — in-stock items not sold and older than `days`. */
export function useSlowMovers(days = 60) {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_slow", tenantId, days],
    enabled: !!tenantId,
    queryFn: async () => {
      const [{ data: items }, { data: sold }] = await Promise.all([
        supabase.from("jx_item" as any).select("tag_number,karat,group_item,created_at,net_weight").eq("tenant_id", tenantId).eq("status", "in_stock"),
        supabase.from("jx_sale_item" as any).select("tag_number").eq("tenant_id", tenantId),
      ]);
      return { items: (items || []) as any[], soldTags: new Set((sold || []).map((s: any) => s.tag_number)) };
    },
  });
  const cutoff = Date.now() - days * DAY;
  const rows = (data?.items || []).filter((it) => !data!.soldTags.has(it.tag_number) && new Date(it.created_at).getTime() < cutoff)
    .map((it) => ({ tag: it.tag_number, karat: it.karat, collection: it.group_item, age_days: Math.floor((Date.now() - new Date(it.created_at).getTime()) / DAY) }))
    .sort((a, b) => b.age_days - a.age_days).slice(0, 15);
  return { rows, isLoading };
}

/** Customer dues — outstanding balance on non-delivered orders, by customer. */
export function useCustomerDues() {
  const { tenantId } = useTenant();
  const { data, isLoading } = useQuery({
    queryKey: ["jx_cust_dues", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [{ data: orders }, { data: custs }] = await Promise.all([
        supabase.from("jx_order" as any).select("customer_id,order_no,balance,status,delivery_date").eq("tenant_id", tenantId).neq("status", "delivered"),
        supabase.from("jx_customer" as any).select("id,name,phone").eq("tenant_id", tenantId),
      ]);
      return { orders: (orders || []) as any[], custs: (custs || []) as any[] };
    },
  });
  const nameById: Record<string, string> = {}; for (const c of data?.custs || []) nameById[c.id] = c.name || "—";
  const by: Record<string, { name: string; orders: number; balance: number }> = {};
  for (const o of data?.orders || []) { if (num(o.balance) <= 0) continue; const key = o.customer_id || "walk-in"; by[key] = by[key] || { name: nameById[o.customer_id] || "Walk-in", orders: 0, balance: 0 }; by[key].orders++; by[key].balance = round2(by[key].balance + num(o.balance)); }
  const rows = Object.values(by).sort((a, b) => b.balance - a.balance);
  const totalDue = round2(rows.reduce((a, r) => a + r.balance, 0));
  return { rows, totalDue, isLoading };
}
