import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, Users, TrendingUp,
  Mail, Phone, Share2, FileText, Radar, Briefcase, Cog, ShieldCheck, ShieldAlert,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PolarAngleAxis,
} from 'recharts';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Severity = 'red' | 'yellow' | 'green';

interface Issue {
  severity?: Severity;
  type?: string;
  detail?: string;
  workflows?: Array<Record<string, unknown>>;
}

interface SacredSignal {
  workflow_id: string;
  name: string;
  active?: boolean;
  node_count_baseline?: number;
  node_count_current?: number;
  drift?: boolean;
  error?: string;
}

interface AuditRow {
  id: string;
  tenant_id: string;
  tenant_uuid: string;
  audit_date: string;
  audit_hour: number;
  overall_health: number | null;
  overall_status: Severity | null;
  sales_health: number | null;
  marketing_health: number | null;
  communication_health: number | null;
  voice_health: number | null;
  hr_health: number | null;
  operations_health: number | null;
  social_publishing_health: number | null;
  content_generation_health: number | null;
  lead_gen_health: number | null;
  total_leads: number | null;
  new_leads_24h: number | null;
  sequences_active: number | null;
  posts_scheduled: number | null;
  posts_published_24h: number | null;
  posts_failed_24h: number | null;
  voice_calls_24h: number | null;
  emails_sent_24h: number | null;
  content_generated_24h: number | null;
  competitors_total: number | null;
  sacred_workflow_signals: SacredSignal[] | null;
  issues_detected: Issue[] | null;
  improvement_suggestions: string[] | null;
  summary_markdown: string | null;
  raw_snapshot: Record<string, unknown> | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_COLOR: Record<Severity, string> = {
  green: 'hsl(142 70% 45%)',
  yellow: 'hsl(45 93% 55%)',
  red: 'hsl(0 75% 55%)',
};

const STATUS_BG: Record<Severity, string> = {
  green: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
  red: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400',
};

function statusIcon(s: Severity | null | undefined) {
  if (s === 'green') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (s === 'yellow') return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  if (s === 'red') return <XCircle className="h-4 w-4 text-red-600" />;
  return <Activity className="h-4 w-4 text-muted-foreground" />;
}

function healthColor(n: number | null | undefined): string {
  if (n == null) return 'hsl(var(--muted-foreground))';
  if (n >= 70) return STATUS_COLOR.green;
  if (n >= 40) return STATUS_COLOR.yellow;
  return STATUS_COLOR.red;
}

/** Next audit cron: 08:00, 14:00, 20:00 Asia/Karachi (UTC+5). */
function nextAuditAt(now: Date): Date {
  const karachiOffset = 5 * 60; // minutes
  const nowUtcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const nowKarachiMin = (nowUtcMin + karachiOffset) % (24 * 60);
  const cronMinutes = [8 * 60, 14 * 60, 20 * 60];
  let deltaMin = cronMinutes
    .map((m) => (m - nowKarachiMin + 24 * 60) % (24 * 60))
    .filter((d) => d > 0)
    .sort((a, b) => a - b)[0];
  if (deltaMin == null) deltaMin = 24 * 60 - nowKarachiMin + cronMinutes[0];
  const next = new Date(now.getTime() + deltaMin * 60 * 1000);
  return next;
}

function countdown(to: Date, now: Date): string {
  const diffMs = to.getTime() - now.getTime();
  if (diffMs <= 0) return 'any moment';
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AutonomousHealth() {
  const { tenantId } = useTenant();
  const { authUser } = useAuth();
  const queryClient = useQueryClient();
  const [now, setNow] = useState<Date>(new Date());
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Tick clock every 30s for countdown
  useEffect(() => {
    const h = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(h);
  }, []);

  const queryKey = ['autonomous-health', tenantId] as const;

  const {
    data: audits,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_audit_log')
        .select('*')
        .eq('tenant_id', tenantId as string)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
    refetchInterval: 60_000,
    enabled: !!tenantId,
  });

  // Realtime subscription: refetch on INSERT
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`tenant_audit_${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tenant_audit_log',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const latest = audits?.[0];
  const previous = audits?.[1];
  const isMasterAdmin = authUser?.role === 'master_admin';

  const lastRunDate = latest ? new Date(latest.created_at) : null;
  const nextRun = useMemo(() => nextAuditAt(now), [now]);

  const moduleCards = useMemo(() => {
    if (!latest) return [];
    const defs: Array<{
      key: keyof AuditRow;
      label: string;
      icon: typeof Users;
    }> = [
      { key: 'sales_health', label: 'Sales', icon: TrendingUp },
      { key: 'marketing_health', label: 'Marketing', icon: Radar },
      { key: 'communication_health', label: 'Communication', icon: Mail },
      { key: 'voice_health', label: 'Voice', icon: Phone },
      { key: 'hr_health', label: 'HR', icon: Briefcase },
      { key: 'operations_health', label: 'Operations', icon: Cog },
      { key: 'social_publishing_health', label: 'Social Publishing', icon: Share2 },
      { key: 'content_generation_health', label: 'Content Gen', icon: FileText },
      { key: 'lead_gen_health', label: 'Lead Gen', icon: Users },
    ];
    return defs.map((d) => {
      const curr = (latest[d.key] as number | null) ?? null;
      const prev = previous ? ((previous[d.key] as number | null) ?? null) : null;
      const delta = curr != null && prev != null ? curr - prev : 0;
      return { ...d, curr, prev, delta };
    });
  }, [latest, previous]);

  const sparkData = useMemo(() => {
    if (!audits) return [];
    return [...audits]
      .reverse()
      .slice(-14)
      .map((r) => ({
        ts: format(new Date(r.created_at), 'MM/dd HH:mm'),
        health: r.overall_health ?? 0,
      }));
  }, [audits]);

  const driftedSacred = (latest?.sacred_workflow_signals ?? []).filter(
    (s) => s?.drift === true
  );

  /* ---------------- Rendering ---------------- */

  if (!tenantId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No tenant selected.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-64 md:col-span-1" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-500/30">
          <CardContent className="p-6">
            <p className="text-red-600 font-medium">
              Failed to load audit data: {(error as Error).message}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Autonomous Health
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated audit of every module across your tenant. Updated every 8 hours.
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No audit runs yet for this tenant. The first audit will appear automatically
            after the next scheduled run at {format(nextRun, 'PPpp')} (in {countdown(nextRun, now)}).
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallStatus: Severity = (latest.overall_status as Severity) || 'green';
  const overallHealth = latest.overall_health ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Autonomous Health
          </h1>
          <p className="text-muted-foreground mt-1">
            Every module, audited automatically. Real-time updates via Supabase.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {lastRunDate && (
            <span>
              Last audit: <span className="font-medium text-foreground">
                {formatDistanceToNow(lastRunDate, { addSuffix: true })}
              </span>
            </span>
          )}
          <span>|</span>
          <span>
            Next: <span className="font-medium text-foreground">{countdown(nextRun, now)}</span>
          </span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overall gauge + summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className={`md:col-span-1 border-2 ${STATUS_BG[overallStatus]}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span>Overall Health</span>
              <Badge variant="outline" className={STATUS_BG[overallStatus]}>
                {statusIcon(overallStatus)}
                <span className="ml-1 uppercase">{overallStatus}</span>
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={[{ name: 'health', value: overallHealth, fill: STATUS_COLOR[overallStatus] }]}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background={{ fill: 'hsl(var(--muted))' }} cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <p className="text-center -mt-40 text-5xl font-bold pointer-events-none">
              {overallHealth}
              <span className="text-2xl text-muted-foreground">%</span>
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Latest Summary</CardTitle>
            <CardDescription>
              {format(new Date(latest.created_at), 'PPpp')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {latest.summary_markdown || 'No summary available.'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 9 Module Health Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Module Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
          {moduleCards.map((m) => {
            const c = m.curr ?? 0;
            const bg =
              c >= 70 ? 'bg-green-500/5 border-green-500/20' :
              c >= 40 ? 'bg-yellow-500/5 border-yellow-500/20' :
              'bg-red-500/5 border-red-500/20';
            return (
              <Card key={m.label} className={bg}>
                <CardContent className="p-3 text-center">
                  <m.icon className="h-5 w-5 mx-auto mb-1" style={{ color: healthColor(c) }} />
                  <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                  <p className="text-2xl font-bold" style={{ color: healthColor(c) }}>
                    {m.curr ?? '—'}
                  </p>
                  {m.delta !== 0 && previous && (
                    <p className={`text-[10px] ${m.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.delta > 0 ? '▲' : '▼'} {Math.abs(m.delta)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Metrics strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total Leads', value: latest.total_leads ?? 0 },
          { label: 'New 24h', value: latest.new_leads_24h ?? 0 },
          { label: 'Active Seqs', value: latest.sequences_active ?? 0 },
          { label: 'Posts Scheduled', value: latest.posts_scheduled ?? 0 },
          { label: 'Posts Published 24h', value: latest.posts_published_24h ?? 0 },
          { label: 'Competitors', value: latest.competitors_total ?? 0 },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{m.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground truncate">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Issues & Suggestions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Issues Detected ({(latest.issues_detected ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(latest.issues_detected ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues detected.</p>
            ) : (
              (latest.issues_detected ?? []).map((issue, i) => {
                const sev: Severity = issue.severity || 'yellow';
                return (
                  <div key={i} className={`p-3 rounded-md border ${STATUS_BG[sev]}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={STATUS_BG[sev]}>
                        {sev.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-sm">
                        {issue.type || 'unknown'}
                      </span>
                    </div>
                    <p className="text-xs">{issue.detail || ''}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Improvement Suggestions ({(latest.improvement_suggestions ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(latest.improvement_suggestions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No suggestions yet (LLM summary step may still be loading).
              </p>
            ) : (
              <ol className="list-decimal ml-5 space-y-2 text-sm">
                {(latest.improvement_suggestions ?? []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History sparkline */}
      {sparkData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Trend (last {sparkData.length} audits)</CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="ts" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="health"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sacred workflow sentinel — master_admin ONLY */}
      {isMasterAdmin && latest.sacred_workflow_signals && (
        <Card className={driftedSacred.length > 0 ? 'border-red-500/40 bg-red-500/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {driftedSacred.length > 0 ? (
                <ShieldAlert className="h-5 w-5 text-red-600" />
              ) : (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              )}
              Sacred Workflow Sentinel
              {driftedSacred.length > 0 && (
                <Badge variant="destructive">{driftedSacred.length} drifted</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Baseline node counts for the 6 protected workflows. Master admin only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm font-mono">
              {latest.sacred_workflow_signals.map((s) => {
                const drift = s.drift === true;
                return (
                  <div
                    key={s.workflow_id}
                    className={`p-2 rounded border flex items-center justify-between ${
                      drift ? STATUS_BG.red : 'bg-muted/40 border-transparent'
                    }`}
                  >
                    <div>
                      <span className="font-medium">{s.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({s.workflow_id})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.error ? (
                        <Badge variant="destructive">error: {s.error.slice(0, 30)}</Badge>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">
                            baseline: {s.node_count_baseline}
                          </span>
                          <span className={drift ? 'text-red-600 font-bold' : 'text-green-600'}>
                            current: {s.node_count_current}
                          </span>
                          <Badge variant={drift ? 'destructive' : 'secondary'}>
                            {drift ? 'DRIFT' : 'OK'}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit History</CardTitle>
          <CardDescription>Last {audits?.length ?? 0} audit runs</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Health</th>
                  <th className="p-3">New Leads</th>
                  <th className="p-3">Posts Pub</th>
                  <th className="p-3">Issues</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(audits ?? []).map((r) => {
                  const sev = (r.overall_status as Severity) || 'green';
                  const open = expandedRowId === r.id;
                  return (
                    <>
                      <tr key={r.id} className="border-t hover:bg-muted/20">
                        <td className="p-3">{format(new Date(r.created_at), 'MMM d, HH:mm')}</td>
                        <td className="p-3">
                          <Badge variant="outline" className={STATUS_BG[sev]}>
                            {statusIcon(sev)}
                            <span className="ml-1 uppercase">{sev}</span>
                          </Badge>
                        </td>
                        <td className="p-3 font-medium" style={{ color: healthColor(r.overall_health) }}>
                          {r.overall_health ?? '—'}%
                        </td>
                        <td className="p-3">{r.new_leads_24h ?? 0}</td>
                        <td className="p-3">{r.posts_published_24h ?? 0}</td>
                        <td className="p-3">{(r.issues_detected ?? []).length}</td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedRowId(open ? null : r.id)}
                          >
                            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </td>
                      </tr>
                      {open && (
                        <tr key={r.id + '-detail'} className="border-t bg-muted/10">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-2 text-xs">
                              <p className="text-muted-foreground">{r.summary_markdown}</p>
                              {(r.issues_detected ?? []).map((iss, i) => (
                                <div key={i} className={`inline-block mr-2 px-2 py-1 rounded border ${STATUS_BG[iss.severity || 'yellow']}`}>
                                  {iss.type}: {iss.detail}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
