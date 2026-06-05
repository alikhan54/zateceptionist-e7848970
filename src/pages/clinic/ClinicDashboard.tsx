import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useClinicPatients } from "@/hooks/useClinicPatients";
import { useClinicTreatments } from "@/hooks/useClinicTreatments";
import { useClinicProducts } from "@/hooks/useClinicProducts";
import { useHealthReports } from "@/hooks/useHealthReports";
import { useReviewQueue } from "@/hooks/useReviewQueue";
import { Users, Calendar, DollarSign, AlertTriangle, Syringe, Brain, ClipboardList, FileText, Bell, UserX, RefreshCw, Upload, Sparkles } from "lucide-react";
import { IndustryTab } from "@/components/pulse/IndustryTab";

export default function ClinicDashboard() {
  const { patients, stats: patientStats, isLoading: pLoading } = useClinicPatients();
  const { treatments, isLoading: tLoading } = useClinicTreatments();
  const { lowStockProducts, isLoading: prLoading } = useClinicProducts();
  const { stats: reportStats } = useHealthReports();
  const { stats: reviewStats } = useReviewQueue();
  const { tenantId, tenantConfig, isHealthcareClinic } = useTenant();
  const tenantUuid = tenantConfig?.id;

  const isLoading = pLoading || tLoading || prLoading;

  // Health-report layer is empty until reports are uploaded → show a guiding
  // empty-state instead of a bare "—"/0 trio. (Existing cards stay in place.)
  const healthEmpty = (reportStats.totalReports ?? 0) === 0;

  // ── Automations (live working-engine output, NOT the pre-3b artifact flags) ──
  // Reminders + follow-ups = REAL deliveries the engine enqueued to message_queue
  // (message_queue.tenant_id is a UUID column). No-shows = appointments.no_show_handled
  // (SLUG), honestly labelled "detected". Each is tenant-scoped + RLS-guarded.
  const { data: autoStats } = useQuery({
    queryKey: ["clinic_automation_stats", tenantId, tenantUuid],
    enabled: isHealthcareClinic && !!tenantId && !!tenantUuid,
    queryFn: async () => {
      const remindersP = supabase.from("message_queue" as any)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantUuid as string)
        .in("message_type", ["appointment_reminder_24h", "appointment_reminder_2h"]);
      const followupsP = supabase.from("message_queue" as any)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantUuid as string)
        .eq("message_type", "post_care_followup");
      const noShowsP = supabase.from("appointments" as any)
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId as string)
        .eq("no_show_handled", true);
      const [r, f, n] = await Promise.all([remindersP, followupsP, noShowsP]);
      return { reminders: r.count ?? 0, followups: f.count ?? 0, noShows: n.count ?? 0 };
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h1>
        <p className="text-muted-foreground">Healthcare & Aesthetics Management</p>
      </div>

      {/* Phase 11 Group A — Industry-specific Pulse tab (dispatches by tenant_config.industry).
          Renders only when industry has a tab — otherwise null. ADDITIVE; existing
          stat cards below are unchanged. */}
      <IndustryTab />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">{patientStats.vipPatients} VIP, {patientStats.goldPatients} Gold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treatments</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{treatments.length}</div>
            <p className="text-xs text-muted-foreground">Active services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats.newThisMonth}</div>
            <p className="text-xs text-muted-foreground">New patients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {patientStats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all patients</p>
          </CardContent>
        </Card>
      </div>

      {/* Automations — ADDITIVE, healthcare-clinic-gated. Live working-engine
          output (message_queue deliveries + no-show detection). Each card
          degrades to an honest empty-state when the engine hasn't run yet. */}
      {isHealthcareClinic && (
        <div>
          <div className="mb-3">
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              Automations
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
                <Sparkles className="h-3 w-3" />New
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">Reminders, no-show detection &amp; post-care follow-ups your AI handled automatically.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <AutomationCard
              title="Reminders sent" value={autoStats?.reminders ?? 0}
              sub="appointment reminders (24h + 2h)"
              emptyHint="Reminders appear here once appointments are booked."
              icon={<Bell className="h-4 w-4" />} tintClass="bg-sky-100 text-sky-700"
            />
            <AutomationCard
              title="Follow-ups sent" value={autoStats?.followups ?? 0}
              sub="post-care messages delivered"
              emptyHint="Post-care follow-ups appear after completed visits."
              icon={<RefreshCw className="h-4 w-4" />} tintClass="bg-emerald-100 text-emerald-700"
            />
            <AutomationCard
              title="No-shows detected" value={autoStats?.noShows ?? 0}
              sub="missed appointments flagged"
              emptyHint="Missed appointments are detected & flagged here."
              icon={<UserX className="h-4 w-4" />} tintClass="bg-amber-100 text-amber-700"
            />
          </div>
        </div>
      )}

      {/* Health Intelligence Row — cards kept; bare "—"/0 replaced with a real
          empty-state + CTA when no reports have been uploaded yet. */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {healthEmpty ? (
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><span className="inline-block h-1.5 w-6 rounded-full bg-border" />Not active yet</div>
            ) : (
              <>
                <div className={`text-2xl font-bold ${(reportStats.avgHealthScore || 0) >= 70 ? 'text-green-600' : (reportStats.avgHealthScore || 0) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {reportStats.avgHealthScore ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground">Across all patients</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <ClipboardList className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {healthEmpty ? (
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><span className="inline-block h-1.5 w-6 rounded-full bg-border" />Not active yet</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{reviewStats.pending}</div>
                <p className="text-xs text-muted-foreground">{reviewStats.urgent > 0 ? `${reviewStats.urgent} urgent` : "None urgent"}</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports This Month</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {healthEmpty ? (
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><span className="inline-block h-1.5 w-6 rounded-full bg-border" />Not active yet</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{reportStats.reportsThisMonth}</div>
                <p className="text-xs text-muted-foreground">{reportStats.totalReports} total reports</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {healthEmpty && (
        <div className="-mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-dashed px-4 py-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Upload className="h-4 w-4 shrink-0" />Upload reports to activate health insights — scores, reviews &amp; AI analysis.
          </p>
          <Link to="/clinic/health-reports">
            <Button size="sm"><Upload className="h-4 w-4 mr-1.5" />Upload report</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Patients</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : patients.length === 0 ? (
              <p className="text-muted-foreground text-sm">No patients yet</p>
            ) : (
              <div className="space-y-3">
                {patients.slice(0, 5).map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">{patient.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={patient.loyalty_tier === 'VIP' ? 'default' : 'outline'}>{patient.loyalty_tier}</Badge>
                      <span className="text-xs text-muted-foreground">{patient.total_visits} visits</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm">All products well-stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.brand}</p>
                    </div>
                    <Badge variant="destructive">{product.stock_quantity} left</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Treatment Menu</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {treatments.map((t) => (
              <div key={t.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm">{t.name}</h3>
                  <Badge variant="outline">{t.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{t.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span>{t.duration_minutes} min</span>
                  <span className="font-semibold">{t.currency} {t.price}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Live-automation signal card. Shows the real engine count, or a guiding
// empty-state (not a stark "0") when the engine hasn't produced anything yet.
function AutomationCard({
  title, value, sub, emptyHint, icon, tintClass,
}: { title: string; value: number; sub: string; emptyHint: string; icon: React.ReactNode; tintClass: string }) {
  const empty = !value || value === 0;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className={`h-8 w-8 rounded-md flex items-center justify-center ${tintClass}`}>{icon}</span>
      </CardHeader>
      <CardContent>
        {empty ? (
          <>
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2"><span className="inline-block h-1.5 w-6 rounded-full bg-border" />None yet</div>
            <p className="text-xs text-muted-foreground mt-1">{emptyHint}</p>
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
