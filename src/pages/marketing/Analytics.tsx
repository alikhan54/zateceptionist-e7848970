import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, Users, Mail, MousePointer, Send, Eye, Target, Plus, Brain, AlertCircle, Clock, Globe, Search, Zap, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { subDays } from 'date-fns';

export default function MarketingAnalytics() {
  const [period, setPeriod] = useState('30d');
  const { campaigns: allCampaigns, isLoading, stats: allStats } = useMarketingCampaigns();
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id || null;

  // Wire the period filter — filter campaigns by date
  const periodDays = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const periodStart = subDays(new Date(), periodDays);
  const campaigns = allCampaigns.filter((c: any) => new Date(c.created_at) >= periodStart);

  // Cross-system queries
  const { data: socialStats } = useQuery({
    queryKey: ['analytics-social', tenantUuid, period],
    queryFn: async () => {
      if (!tenantUuid) return { published: 0, totalEngagement: 0 };
      const { data } = await supabase
        .from('social_posts')
        .select('status, likes, comments, shares')
        .eq('tenant_id', tenantUuid)
        .gte('created_at', periodStart.toISOString());
      const posts = data || [];
      const published = posts.filter((p: any) => p.status === 'published').length;
      const totalEngagement = posts.reduce((sum: number, p: any) => sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0), 0);
      return { published, totalEngagement };
    },
    enabled: !!tenantUuid,
  });

  const { data: competitorCount = 0 } = useQuery({
    queryKey: ['analytics-competitors', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return 0;
      const { count } = await supabase
        .from('competitor_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantUuid);
      return count || 0;
    },
    enabled: !!tenantUuid,
  });

  const { data: aiActivityCount = 0 } = useQuery({
    queryKey: ['analytics-ai-activity', tenantUuid, period],
    queryFn: async () => {
      if (!tenantUuid) return 0;
      const tc = tenantConfig as any;
      const slug = tc?.tenant_id || tenantUuid;
      const { count } = await supabase
        .from('system_events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', slug)
        .gte('created_at', periodStart.toISOString());
      return count || 0;
    },
    enabled: !!tenantUuid,
  });

  // Recalculate stats for the filtered period
  const stats = {
    total: campaigns.length,
    totalSent: campaigns.reduce((sum: number, c: any) => sum + (c.sent_count || 0), 0),
    totalDelivered: campaigns.reduce((sum: number, c: any) => sum + (c.delivered_count || 0), 0),
    totalOpened: campaigns.reduce((sum: number, c: any) => sum + (c.opened_count || 0), 0),
    avgOpenRate: campaigns.length > 0 ? Math.round(campaigns.reduce((sum: number, c: any) => sum + (c.open_rate || 0), 0) / campaigns.length) : 0,
    avgClickRate: campaigns.length > 0 ? Math.round(campaigns.reduce((sum: number, c: any) => sum + (c.click_rate || 0), 0) / campaigns.length) : 0,
  };

  const totalSent = stats.totalSent;
  const totalDelivered = stats.totalDelivered;
  const totalOpened = stats.totalOpened;
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  // Derive channel performance from campaigns
  const channelData = campaigns.reduce((acc: Record<string, { sent: number; opened: number; clicked: number }>, c: any) => {
    const type = c.type || 'other';
    if (!acc[type]) acc[type] = { sent: 0, opened: 0, clicked: 0 };
    acc[type].sent += c.sent_count || 0;
    acc[type].opened += c.opened_count || 0;
    acc[type].clicked += c.clicked_count || 0;
    return acc;
  }, {});

  const channelChartData = Object.entries(channelData).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    sent: (data as any).sent,
    opened: (data as any).opened,
    clicked: (data as any).clicked,
  }));

  const COLORS = ['hsl(var(--primary))', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

  const pieData = channelChartData.map(d => ({ name: d.name, value: d.sent })).filter(d => d.value > 0);

  // Campaign comparison
  const campaignCompare = campaigns.slice(0, 10).map((c: any) => ({
    name: c.name?.slice(0, 15) || 'Unnamed',
    sent: c.sent_count || 0,
    opened: c.opened_count || 0,
    clicked: c.clicked_count || 0,
  }));

  const statCards = [
    { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Send },
    { label: 'Delivery Rate', value: `${deliveryRate}%`, icon: TrendingUp },
    { label: 'Total Opened', value: totalOpened.toLocaleString(), icon: Mail },
    { label: 'Avg Open Rate', value: `${stats.avgOpenRate}%`, icon: Eye },
    { label: 'Avg Click Rate', value: `${stats.avgClickRate}%`, icon: MousePointer },
    { label: 'Campaigns', value: stats.total.toString(), icon: Target },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your marketing performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Marketing Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Marketing Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalSent > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="font-medium text-primary">Campaign Performance</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {totalSent.toLocaleString()} messages sent across {stats.total} campaigns with a {deliveryRate}% delivery rate.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-accent/50 border-accent">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Engagement</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stats.avgOpenRate}% average open rate and {stats.avgClickRate}% click rate across all campaigns.
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-secondary/50 border-secondary">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Top Channel</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {channelChartData.length > 0 ? `${channelChartData.sort((a, b) => b.sent - a.sent)[0]?.name || 'Email'} is your most active channel.` : 'Start sending campaigns to see channel insights.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <AlertCircle className="h-8 w-8 mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground font-medium">No marketing activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Send your first campaign or publish social posts to see AI-powered insights here.
              </p>
              <Button asChild variant="link" size="sm" className="mt-2">
                <Link to="/marketing/campaigns">Create a Campaign</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-System Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Cross-System Intelligence
          </CardTitle>
          <CardDescription>Metrics across all marketing channels and systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/20 text-center">
              <Send className="h-5 w-5 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{socialStats?.published ?? 0}</p>
              <p className="text-xs text-muted-foreground">Social Posts Published</p>
            </div>
            <div className="p-4 rounded-lg border bg-red-500/5 border-red-500/20 text-center">
              <Heart className="h-5 w-5 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{socialStats?.totalEngagement ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Social Engagement</p>
            </div>
            <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 text-center">
              <Search className="h-5 w-5 mx-auto mb-2 text-amber-500" />
              <p className="text-2xl font-bold">{competitorCount}</p>
              <p className="text-xs text-muted-foreground">Competitors Tracked</p>
            </div>
            <div className="p-4 rounded-lg border bg-purple-500/5 border-purple-500/20 text-center">
              <Zap className="h-5 w-5 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{aiActivityCount}</p>
              <p className="text-xs text-muted-foreground">AI Brain Actions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Channel Distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Target className="h-8 w-8 mb-2 opacity-50" />
                <p>No campaign data yet</p>
                <Button asChild variant="link" size="sm"><Link to="/marketing">Create a campaign</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Channel Performance</CardTitle></CardHeader>
          <CardContent className="h-64">
            {channelChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" />
                  <Bar dataKey="opened" fill="#22c55e" name="Opened" />
                  <Bar dataKey="clicked" fill="#3b82f6" name="Clicked" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Send className="h-8 w-8 mb-2 opacity-50" />
                <p>Send campaigns to see performance data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Campaign Comparison</CardTitle></CardHeader>
        <CardContent className="h-80">
          {campaignCompare.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignCompare} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="hsl(var(--primary))" name="Sent" />
                <Bar dataKey="opened" fill="#22c55e" name="Opened" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Plus className="h-8 w-8 mb-2 opacity-50" />
              <p>Create and send campaigns to see comparison data</p>
              <Button asChild variant="link" size="sm"><Link to="/marketing">Go to Marketing Hub</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
