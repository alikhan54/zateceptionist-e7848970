import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Phone, CheckCircle2, AlertTriangle } from "lucide-react";

/**
 * Phase 12.D — Banking Collections Pulse (MNT Halan + future).
 * Reads collections_cases + collection_attempts (per CLAUDE.md collections_* tables).
 */
export function BankingCollectionsPulseTab() {
  const { tenantId } = useTenant();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString();
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const { data: cases = [] } = useQuery({
    queryKey: ["bcpulse_cases", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("collections_cases" as any)
        .select("id,bucket,status,outstanding_amount,ptp_amount,ptp_status")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: contactsToday = [] } = useQuery({
    queryKey: ["bcpulse_contacts_today", tenantId, todayISO],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("collection_attempts" as any)
        .select("id,outcome,attempted_at")
        .eq("tenant_id", tenantId)
        .gte("attempted_at", todayISO)
        .lt("attempted_at", tomorrowISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: attempts7 = [] } = useQuery({
    queryKey: ["bcpulse_attempts_7", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase.from("collection_attempts" as any)
        .select("id,outcome,collected_amount,attempted_at")
        .eq("tenant_id", tenantId)
        .gte("attempted_at", sevenDaysAgoISO);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const stats = useMemo(() => {
    // DPD buckets — B1=1-30d, B2=31-60d, B3=61-90d, B4=91-180d
    const buckets: Record<string, number> = {};
    cases.forEach((c: any) => {
      const b = String(c.bucket || "unbucketed");
      buckets[b] = (buckets[b] || 0) + 1;
    });
    const top2Buckets = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([b, n]) => `${b}:${n}`).join(" · ");

    const contactRate = contactsToday.length;
    const contacted = contactsToday.filter((c: any) => /right_party|reached|spoke/i.test(String(c.outcome || ""))).length;
    const contactPct = contactsToday.length > 0 ? Math.round((contacted / contactsToday.length) * 100) : null;

    const ptpAttempts = attempts7.filter((a: any) => /ptp|promise/i.test(String(a.outcome || ""))).length;
    const ptpKept = attempts7.filter((a: any) => /ptp_kept|kept/i.test(String(a.outcome || ""))).length;
    const ptpKeptPct = ptpAttempts > 0 ? Math.round((ptpKept / ptpAttempts) * 100) : null;

    const collected7 = attempts7.reduce((s: number, a: any) => s + (a.collected_amount || 0), 0);

    return { totalCases: cases.length, top2Buckets, contactRate, contactPct, ptpKeptPct, collected7 };
  }, [cases, contactsToday, attempts7]);

  return (
    <Card className="border-rose-500/30 bg-gradient-to-br from-rose-500/5 to-transparent" data-testid="industry-tab-banking_collections">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2"><Coins className="h-5 w-5 text-rose-500" /> Collections Intelligence</h2>
            <p className="text-xs text-muted-foreground">DPD buckets · contact rate · PTP performance</p>
          </div>
          <Badge variant="outline" className="text-[10px]">banking_collections</Badge>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Widget testid="bcpulse-cases" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Active cases" value={stats.totalCases > 0 ? String(stats.totalCases) : "—"} hint={stats.totalCases === 0 ? "Not enough data yet" : (stats.top2Buckets || "by bucket")} />
          <Widget testid="bcpulse-contacts-today" icon={<Phone className="h-4 w-4 text-emerald-500" />} label="Contacts today" value={stats.contactRate > 0 ? String(stats.contactRate) : "—"} hint={stats.contactPct !== null ? `${stats.contactPct}% right-party` : "No attempts yet"} />
          <Widget testid="bcpulse-ptp-kept" icon={<CheckCircle2 className="h-4 w-4 text-sky-500" />} label="PTP kept (7d)" value={stats.ptpKeptPct !== null ? `${stats.ptpKeptPct}%` : "—"} hint={stats.ptpKeptPct === null ? "Not enough data" : "Promise-to-pay follow-through"} />
          <Widget testid="bcpulse-collected-7d" icon={<Coins className="h-4 w-4 text-violet-500" />} label="Collected (7d)" value={stats.collected7 > 0 ? `${stats.collected7.toLocaleString()}` : "—"} hint={stats.collected7 === 0 ? "No collections logged" : "Last 7 days"} />
        </div>
      </CardContent>
    </Card>
  );
}

function Widget({ testid, icon, label, value, hint }: { testid: string; icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background/60 px-3 py-2.5" data-testid={testid}>
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span></div>
      <div className="text-xl font-semibold truncate">{value}</div>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
    </div>
  );
}
