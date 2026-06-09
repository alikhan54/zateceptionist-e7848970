import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, Users, Activity, Shield, Zap, TrendingUp, AlertTriangle,
  Server, Database, Globe, Plus, Settings, RefreshCw, Eye, ArrowRight,
  MessageSquare
} from 'lucide-react';
import { useAdminStats, useAllTenants, useAuditLogs, useLifecycleSignals, LIFECYCLE_CONFIG, LifecycleStage } from '@/hooks/useAdminData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminStats();
  const { data: tenants, isLoading: tenantsLoading } = useAllTenants();
  const { data: recentLogs, isLoading: logsLoading } = useAuditLogs({ limit: 5 });
  const { data: lifecycle } = useLifecycleSignals();

  // Calculate plan distribution from real tenant data
  const planDistribution = tenants ? [
    { name: 'Enterprise', value: tenants.filter(t => t.plan === 'enterprise').length, color: 'hsl(var(--chart-1))' },
    { name: 'Professional', value: tenants.filter(t => t.plan === 'professional').length, color: 'hsl(var(--chart-2))' },
    { name: 'Growth', value: tenants.filter(t => t.plan === 'growth').length, color: 'hsl(var(--chart-3))' },
    { name: 'Starter', value: tenants.filter(t => t.plan === 'starter' || !t.plan).length, color: 'hsl(var(--chart-4))' },
  ].filter(p => p.value > 0) : [];

  // Real lifecycle distribution from derive_lifecycle_signals (one row per tenant).
  const lifecycleCounts = (lifecycle || []).reduce<Record<string, number>>((acc, l) => {
    acc[l.lifecycle_stage] = (acc[l.lifecycle_stage] || 0) + 1;
    return acc;
  }, {});
  const lifecycleTotal = lifecycle?.length || 0;
  const orderedStages = (Object.keys(LIFECYCLE_CONFIG) as LifecycleStage[])
    .sort((a, b) => LIFECYCLE_CONFIG[a].order - LIFECYCLE_CONFIG[b].order);
  const attentionCount = (lifecycleCounts['never_activated'] || 0)
    + (lifecycleCounts['at_risk'] || 0) + (lifecycleCounts['churned'] || 0);
  // Real "active this week" = tenants with a login in the last 7 days (true signal,
  // unlike the audit-log "Activity Today" which is structurally 0 since logging is stale).
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const activeThisWeek = (lifecycle || []).filter(
    (l) => l.last_active && new Date(l.last_active).getTime() >= weekAgo
  ).length;
  // Audit logging is effectively frozen (newest event is months old) — flag it honestly.
  const newestLog = recentLogs && recentLogs.length > 0 ? new Date(recentLogs[0].created_at) : null;
  const logsAreStale = newestLog ? (Date.now() - newestLog.getTime() > 14 * 24 * 60 * 60 * 1000) : false;

  const statCards = [
    { label: 'Active Tenants', value: stats?.activeTenants || 0, icon: Building2, color: 'text-blue-500', prefix: '', suffix: '' },
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-green-500', prefix: '', suffix: '' },
    { label: 'Active This Week', value: activeThisWeek, icon: Activity, color: 'text-purple-500', prefix: '', suffix: '' },
    { label: 'Potential MRR', value: stats?.mrr || 0, icon: TrendingUp, color: 'text-orange-500', prefix: '$', suffix: '' },
  ];

  const getLevelBadge = (level: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      success: { variant: 'default' },
      info: { variant: 'secondary' },
      warning: { variant: 'outline' },
      error: { variant: 'destructive' },
    };
    return <Badge variant={config[level]?.variant || 'secondary'} className="capitalize">{level}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Master Admin Panel</h1>
          </div>
          <p className="text-muted-foreground mt-1">Platform overview and system management</p>
        </div>
        <Button variant="outline" onClick={() => refetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Banner */}
      <Card className="bg-chart-2/10 border-chart-2/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-chart-2/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h3 className="font-semibold text-chart-2">All Systems Operational</h3>
                <p className="text-sm text-muted-foreground">Real-time data from Supabase</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/health')}>
              View Status Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stat.prefix}{stat.value.toLocaleString()}</div>
              )}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              {stat.label === 'Potential MRR' && (
                <p className="text-[10px] text-muted-foreground mt-0.5">plan-assigned · $0 collected (no payments yet)</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tenant Lifecycle — real signals from derive_lifecycle_signals. Answers
          "who needs attention?" not just "how many tenants". */}
      {lifecycleTotal > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tenant Lifecycle</CardTitle>
                <CardDescription>Derived from real sign-in activity &amp; onboarding · who needs attention</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tenants')}>
                View tenants <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Attention cohorts up top */}
            <div className="grid grid-cols-3 gap-3">
              {([
                { stage: 'never_activated' as LifecycleStage, label: 'Never activated' },
                { stage: 'at_risk' as LifecycleStage, label: 'At risk' },
                { stage: 'churned' as LifecycleStage, label: 'Churned' },
              ]).map(({ stage, label }) => (
                <div key={stage} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${stage === 'never_activated' ? 'text-red-500' : stage === 'at_risk' ? 'text-orange-500' : 'text-muted-foreground'}`} />
                    <span className="text-2xl font-bold">{lifecycleCounts[stage] || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>
            {/* Proportional bar across all stages */}
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
              {orderedStages.map((stage) => {
                const n = lifecycleCounts[stage] || 0;
                if (!n) return null;
                const pct = (n / lifecycleTotal) * 100;
                const color: Record<LifecycleStage, string> = {
                  active: '#16a34a', new: '#3b82f6', activating: '#06b6d4', silent: '#94a3b8',
                  at_risk: '#f97316', never_activated: '#ef4444', churned: '#9ca3af',
                };
                return <div key={stage} style={{ width: `${pct}%`, backgroundColor: color[stage] }} title={`${LIFECYCLE_CONFIG[stage].label}: ${n}`} />;
              })}
            </div>
            {/* Legend with counts */}
            <div className="flex flex-wrap gap-2">
              {orderedStages.map((stage) => (
                <Badge key={stage} variant="outline" className={LIFECYCLE_CONFIG[stage].className} title={LIFECYCLE_CONFIG[stage].hint}>
                  {LIFECYCLE_CONFIG[stage].label}: {lifecycleCounts[stage] || 0}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Distribution by Plan</CardTitle>
            <CardDescription>Breakdown of subscription plans</CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : planDistribution.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [`${value} tenants`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {planDistribution.map((plan) => (
                    <div key={plan.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: plan.color }} />
                      <span className="text-sm">{plan.name}: {plan.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No tenant data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  {logsAreStale && newestLog
                    ? `Audit log · no new events since ${newestLog.toLocaleDateString()}`
                    : 'Latest audit logs'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/logs')}>
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : recentLogs && recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{log.action}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.user_email || 'System'} • {log.tenant_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getLevelBadge(log.level)}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Button variant="outline" className="flex-col h-20 gap-2" onClick={() => navigate('/admin/tenants')}>
              <Building2 className="h-5 w-5" />
              Manage Tenants
            </Button>
            <Button variant="outline" className="flex-col h-20 gap-2" onClick={() => navigate('/admin/users')}>
              <Users className="h-5 w-5" />
              Manage Users
            </Button>
            <Button variant="outline" className="flex-col h-20 gap-2" onClick={() => navigate('/admin/features')}>
              <Zap className="h-5 w-5" />
              Feature Flags
            </Button>
            <Button variant="outline" className="flex-col h-20 gap-2" onClick={() => navigate('/admin/logs')}>
              <Activity className="h-5 w-5" />
              Audit Logs
            </Button>
            <Button variant="outline" className="flex-col h-20 gap-2" onClick={() => navigate('/admin/health')}>
              <Server className="h-5 w-5" />
              System Health
            </Button>
            <Button variant="outline" className="flex-col h-20 gap-2" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tenants */}
      {tenants && tenants.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Tenants</CardTitle>
                <CardDescription>Newly created organizations</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/tenants')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenants.slice(0, 4).map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tenant.company_name}</p>
                      <p className="text-sm text-muted-foreground">{tenant.email || tenant.tenant_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{tenant.plan || 'Starter'}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {tenant.users_count} users
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/tenants/${tenant.tenant_id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
