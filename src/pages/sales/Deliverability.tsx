import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import {
  ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Mail, Activity, Flame,
} from 'lucide-react';
import { format } from 'date-fns';

const healthColors: Record<string, string> = {
  healthy: 'bg-green-500/15 text-green-400 border-green-500/30',
  warming: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  throttled: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  paused: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const overallHealthConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  excellent: { color: 'text-green-400', icon: CheckCircle },
  good: { color: 'text-blue-400', icon: ShieldCheck },
  warning: { color: 'text-yellow-400', icon: AlertTriangle },
  critical: { color: 'text-red-400', icon: Flame },
};

function getOverallHealth(deliveryRate: number, bounceRate: number, spamScore: number) {
  if (deliveryRate > 97 && bounceRate < 1 && spamScore < 2) return 'excellent';
  if (deliveryRate > 95 && bounceRate < 2 && spamScore < 3) return 'good';
  if (deliveryRate > 90 && bounceRate < 5 && spamScore < 5) return 'warning';
  return 'critical';
}

function rateColor(val: number, goodThresh: number, warnThresh: number, invert = false) {
  if (invert) return val < goodThresh ? 'text-green-400' : val < warnThresh ? 'text-yellow-400' : 'text-red-400';
  return val > goodThresh ? 'text-green-400' : val > warnThresh ? 'text-yellow-400' : 'text-red-400';
}

export default function Deliverability() {
  const { tenantId } = useTenant();

  const { data: metrics = [] } = useQuery({
    queryKey: ['deliverability_metrics', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('deliverability_metrics' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('metric_date', { ascending: false })
        .limit(30);
      return ((data || []) as any[]).reverse();
    },
    enabled: !!tenantId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['sending_accounts_deliv', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('sending_accounts' as any)
        .select('*')
        .eq('tenant_id', tenantId);
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  const { data: warmup } = useQuery({
    queryKey: ['email_warmup_deliv', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from('email_warmup_status' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!tenantId,
  });

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;
  const prev = metrics.length > 1 ? metrics[metrics.length - 2] : null;

  const deliveryRate = latest?.delivery_rate ?? 0;
  const bounceRate = latest?.bounce_rate ?? 0;
  const openRate = latest?.open_rate ?? 0;
  const replyRate = latest?.reply_rate ?? 0;
  const spamScore = latest?.spam_score ?? 0;
  const overall = getOverallHealth(deliveryRate, bounceRate, spamScore);
  const HealthIcon = overallHealthConfig[overall]?.icon || ShieldCheck;

  const openTrend = prev ? openRate - (prev.open_rate ?? 0) : 0;
  const replyTrend = prev ? replyRate - (prev.reply_rate ?? 0) : 0;

  const riskFactors: string[] = latest?.spam_risk_factors || [];
  const criticalFactors = riskFactors.filter((f: string) =>
    /blacklist|spf fail|dkim fail|high bounce|spam trap/i.test(f)
  );
  const warningFactors = riskFactors.filter((f: string) => !criticalFactors.includes(f));

  const dailyLimit = warmup?.current_daily_limit || latest?.daily_limit || 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Deliverability Dashboard</h1>
          <p className="text-muted-foreground">Monitor email health, reputation, and inbox placement</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Delivery Rate</p>
            <p className={`text-2xl font-bold ${rateColor(deliveryRate, 95, 90)}`}>{deliveryRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Bounce Rate</p>
            <p className={`text-2xl font-bold ${rateColor(bounceRate, 2, 5, true)}`}>{bounceRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Open Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{openRate.toFixed(1)}%</p>
              {openTrend !== 0 && (
                <span className={`flex items-center text-xs ${openTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {openTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(openTrend).toFixed(1)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Reply Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{replyRate.toFixed(1)}%</p>
              {replyTrend !== 0 && (
                <span className={`flex items-center text-xs ${replyTrend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {replyTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(replyTrend).toFixed(1)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Spam Score</p>
            <p className={`text-2xl font-bold ${rateColor(spamScore, 3, 5, true)}`}>{spamScore.toFixed(1)}/10</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Overall Health</p>
            <div className="flex items-center gap-2">
              <HealthIcon className={`h-5 w-5 ${overallHealthConfig[overall]?.color}`} />
              <span className={`text-lg font-bold capitalize ${overallHealthConfig[overall]?.color}`}>{overall}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Volume Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">30-Day Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="metric_date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => { try { return format(new Date(v), 'MMM d'); } catch { return v; } }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <ReferenceLine y={dailyLimit} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="Limit" />
                  <Area type="monotone" dataKey="delivered" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="bounced" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="opened" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="replied" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rate Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rate Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="metric_date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => { try { return format(new Date(v), 'MMM d'); } catch { return v; } }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="delivery_rate" name="Delivery" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bounce_rate" name="Bounce" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="open_rate" name="Open" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="reply_rate" name="Reply" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Health */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Account Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((acc: any) => (
                <div key={acc.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{acc.email_address}</span>
                    </div>
                    <Badge variant="outline" className={healthColors[acc.health_status] || ''}>
                      {acc.health_status}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Health Score</span>
                      <span>{acc.health_score ?? 0}%</span>
                    </div>
                    <Progress value={acc.health_score || 0} className="h-2" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Sent Today</span>
                      <span>{acc.sent_today || 0} / {acc.daily_limit}</span>
                    </div>
                    <Progress
                      value={acc.daily_limit ? ((acc.sent_today || 0) / acc.daily_limit) * 100 : 0}
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Bounce Rate</span>
                    <span className={rateColor(acc.bounce_rate || 0, 2, 5, true)}>
                      {(acc.bounce_rate || 0).toFixed(1)}%
                    </span>
                  </div>

                  {acc.health_status === 'warming' && warmup && (
                    <div className="flex items-center gap-1 text-xs text-blue-400">
                      <Flame className="h-3 w-3" />
                      Day {warmup.current_day || 1} of warmup
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" /> Risk Factors
            </CardTitle>
            <CardDescription>Issues that may impact your deliverability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {criticalFactors.map((f, i) => (
                <Badge key={`c-${i}`} variant="outline" className="bg-red-500/15 text-red-400 border-red-500/30">
                  {f}
                </Badge>
              ))}
              {warningFactors.map((f, i) => (
                <Badge key={`w-${i}`} variant="outline" className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">
                  {f}
                </Badge>
              ))}
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Recommendations</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                {criticalFactors.length > 0 && (
                  <li>Critical: Address blacklist/authentication issues immediately to prevent further reputation damage.</li>
                )}
                {warningFactors.some(f => /content|subject/i.test(f)) && (
                  <li>Review email content and subject lines — avoid spam trigger words and excessive links.</li>
                )}
                {bounceRate > 2 && (
                  <li>High bounce rate detected. Clean your email list and verify addresses before sending.</li>
                )}
                {spamScore > 3 && (
                  <li>Spam score is elevated. Ensure SPF, DKIM, and DMARC records are properly configured.</li>
                )}
                {deliveryRate < 95 && (
                  <li>Delivery rate is below target. Consider reducing send volume and warming up gradually.</li>
                )}
                {riskFactors.length > 0 && criticalFactors.length === 0 && bounceRate <= 2 && spamScore <= 3 && deliveryRate >= 95 && (
                  <li>Minor issues detected. Monitor trends and maintain good sending practices.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
