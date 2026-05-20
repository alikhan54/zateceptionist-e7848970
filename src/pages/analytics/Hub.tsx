import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export default function AnalyticsHub() {
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Total Revenue — sum revenue_attribution.revenue_amount last 30d (tenant_id is UUID)
  const { data: totalRevenue = 0, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics-hub-revenue', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return 0;
      const { data, error } = await supabase
        .from('revenue_attribution')
        .select('revenue_amount')
        .eq('tenant_id', tenantUuid)
        .gte('created_at', thirtyDaysAgo);
      if (error) return 0;
      return (data || []).reduce(
        (sum: number, r: { revenue_amount: number | string | null }) =>
          sum + Number(r.revenue_amount || 0),
        0,
      );
    },
    enabled: !!tenantUuid,
  });

  // 2. Customers — total customers for tenant (tenant_id is SLUG)
  const { data: activeUsers = 0, isLoading: usersLoading } = useQuery({
    queryKey: ['analytics-hub-customers', tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!tenantId,
  });

  // 3. Lead Engagement Rate — (contacted + in_sequence + qualified + won) / total leads (tenant_id is SLUG)
  const { data: conversionRate = 0, isLoading: convLoading } = useQuery({
    queryKey: ['analytics-hub-conversion', tenantId],
    queryFn: async () => {
      if (!tenantId) return 0;
      const { data, error } = await supabase
        .from('sales_leads')
        .select('lead_status')
        .eq('tenant_id', tenantId);
      if (error || !data || data.length === 0) return 0;
      const engaged = data.filter((r: { lead_status: string | null }) =>
        ['contacted', 'in_sequence', 'qualified', 'won'].includes(r.lead_status || ''),
      ).length;
      return Math.round((engaged / data.length) * 100);
    },
    enabled: !!tenantId,
  });

  // 4. Posts Published — social_post_queue published last 30d (tenant_id is UUID)
  const { data: engagement = 0, isLoading: engLoading } = useQuery({
    queryKey: ['analytics-hub-engagement', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return 0;
      const { count, error } = await supabase
        .from('social_post_queue')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantUuid)
        .eq('status', 'published')
        .gte('created_at', thirtyDaysAgo);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!tenantUuid,
  });

  const stats = [
    {
      label: 'Total Revenue (30d)',
      value: `$${Number(totalRevenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      loading: revenueLoading,
      icon: DollarSign,
    },
    {
      label: 'Customers',
      value: Number(activeUsers).toLocaleString(),
      loading: usersLoading,
      icon: Users,
    },
    {
      label: 'Lead Engagement Rate',
      value: `${conversionRate}%`,
      loading: convLoading,
      icon: TrendingUp,
    },
    {
      label: 'Posts Published (30d)',
      value: Number(engagement).toLocaleString(),
      loading: engLoading,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Hub</h1>
        <p className="text-muted-foreground mt-1">Business insights and metrics</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              {stat.loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-2xl font-bold">{stat.value}</p>
              )}
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Key metrics over time</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Charts will be displayed here
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Activity feed will be displayed here
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
