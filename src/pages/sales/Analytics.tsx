// ============================================================================
// SALES ANALYTICS — Real data from Supabase
// Replaces all hardcoded mock data with live queries
// ============================================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import {
  BarChart3, Download, TrendingUp, DollarSign, Target,
  Trophy, Clock, CheckCircle2, XCircle, Briefcase,
  ArrowUpRight, ArrowDownRight, Loader2, Inbox
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area
} from 'recharts';

// ============================================================================
// PIPELINE STAGES (matches Dashboard.tsx)
// ============================================================================

const PIPELINE_STAGES = [
  { id: 'PROS', name: 'Prospect', color: '#94a3b8' },
  { id: 'RES', name: 'Research', color: '#3b82f6' },
  { id: 'CONT', name: 'Contact', color: '#06b6d4' },
  { id: 'PITCH', name: 'Pitch', color: '#8b5cf6' },
  { id: 'OBJ', name: 'Objection', color: '#f97316' },
  { id: 'CLOSE', name: 'Closing', color: '#f59e0b' },
  { id: 'RET', name: 'Retained', color: '#10b981' },
];

const SOURCE_COLORS: Record<string, string> = {
  google_places: '#3b82f6',
  b2b: '#8b5cf6',
  b2c_intent: '#10b981',
  website: '#f59e0b',
  referral: '#ef4444',
  manual: '#6366f1',
  import: '#14b8a6',
  unknown: '#94a3b8',
};

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Inbox className="h-12 w-12 mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SalesAnalytics() {
  const { tenantId, tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const [activeTab, setActiveTab] = useState('revenue');

  // =====================================================
  // DATA QUERIES — ALL REAL
  // =====================================================

  // Fetch all leads — sales_leads uses SLUG
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['analytics', 'sales_leads', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('sales_leads')
        .select('id, lead_status, pipeline_stage, source, lead_temperature, temperature, sequence_status, created_at')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch all deals — deals uses SLUG
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['analytics', 'deals', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('id, value, stage, probability, won_reason, lost_reason, products, created_at, actual_close_date')
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch sequences — sequences uses UUID
  const { data: sequences = [] } = useQuery({
    queryKey: ['analytics', 'sequences', tenantUuid],
    queryFn: async () => {
      if (!tenantUuid) return [];
      const { data, error } = await supabase
        .from('sequences')
        .select('id, name, status, enrolled_count, steps')
        .eq('tenant_id', tenantUuid)
        .order('enrolled_count', { ascending: false });
      if (error) { console.log('sequences query error', error); return []; }
      return data || [];
    },
    enabled: !!tenantUuid,
  });

  // Fetch analytics_daily for historical trends
  const { data: dailyAnalytics = [] } = useQuery({
    queryKey: ['analytics', 'analytics_daily', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const { data, error } = await supabase
        .from('analytics_daily')
        .select('date, won_value, pipeline_value, deals_won, deals_lost, emails_sent, calls_made, conversion_rate')
        .eq('tenant_id', tenantId)
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });
      if (error) { console.log('analytics_daily error', error); return []; }
      return data || [];
    },
    enabled: !!tenantId,
  });

  const isLoading = leadsLoading || dealsLoading;

  // =====================================================
  // COMPUTED METRICS
  // =====================================================

  const kpis = useMemo(() => {
    const wonDeals = deals.filter(d => d.stage?.toLowerCase() === 'won');
    const lostDeals = deals.filter(d => d.stage?.toLowerCase() === 'lost');
    const totalRevenue = wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const dealsWon = wonDeals.length;
    const totalClosed = dealsWon + lostDeals.length;
    const winRate = totalClosed > 0 ? Math.round((dealsWon / totalClosed) * 100) : 0;
    const avgDealSize = dealsWon > 0 ? Math.round(totalRevenue / dealsWon) : 0;

    // Calculate average sales cycle from deals with actual_close_date
    const cycledDeals = wonDeals.filter(d => d.actual_close_date && d.created_at);
    let avgCycleDays = 0;
    if (cycledDeals.length > 0) {
      const totalDays = cycledDeals.reduce((sum, d) => {
        const created = new Date(d.created_at);
        const closed = new Date(d.actual_close_date!);
        return sum + Math.max(0, Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);
      avgCycleDays = Math.round(totalDays / cycledDeals.length);
    }

    return { totalRevenue, dealsWon, winRate, avgDealSize, avgCycleDays };
  }, [deals]);

  // Revenue by month from deals
  const revenueData = useMemo(() => {
    const wonDeals = deals.filter(d => d.stage?.toLowerCase() === 'won');
    const monthMap: Record<string, { revenue: number; count: number }> = {};

    wonDeals.forEach(d => {
      const date = new Date(d.actual_close_date || d.created_at);
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthMap[key]) monthMap[key] = { revenue: 0, count: 0 };
      monthMap[key].revenue += Number(d.value) || 0;
      monthMap[key].count += 1;
    });

    // Also use analytics_daily for months with no closed deals
    dailyAnalytics.forEach(a => {
      const date = new Date(a.date);
      const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!monthMap[key]) monthMap[key] = { revenue: 0, count: 0 };
      // Only add if we don't already have deal data for this month
      if (monthMap[key].revenue === 0) {
        monthMap[key].revenue += Number(a.won_value) || 0;
      }
    });

    return Object.entries(monthMap)
      .map(([month, data]) => ({ month, revenue: data.revenue }))
      .sort((a, b) => {
        // Sort chronologically
        const parseDate = (s: string) => new Date(Date.parse('1 ' + s));
        return parseDate(a.month).getTime() - parseDate(b.month).getTime();
      })
      .slice(-6); // last 6 months
  }, [deals, dailyAnalytics]);

  // Lead sources breakdown
  const sourceData = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    leads.forEach(l => {
      const src = l.source || 'unknown';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });

    return Object.entries(sourceMap)
      .map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value,
        color: SOURCE_COLORS[name] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads]);

  // Pipeline funnel from sales_leads
  const funnelData = useMemo(() => {
    const stageMap: Record<string, number> = {};
    leads.forEach(l => {
      const stage = l.pipeline_stage || 'PROS';
      stageMap[stage] = (stageMap[stage] || 0) + 1;
    });

    return PIPELINE_STAGES.map(stage => ({
      stage: stage.name,
      value: stageMap[stage.id] || 0,
      fill: stage.color,
    }));
  }, [leads]);

  // Win/Loss reasons from deals
  const winLossData = useMemo(() => {
    const reasons: { reason: string; count: number; type: 'win' | 'loss' }[] = [];

    const wonReasons: Record<string, number> = {};
    const lostReasons: Record<string, number> = {};

    deals.forEach(d => {
      if (d.stage?.toLowerCase() === 'won' && d.won_reason) {
        wonReasons[d.won_reason] = (wonReasons[d.won_reason] || 0) + 1;
      }
      if (d.stage?.toLowerCase() === 'lost' && d.lost_reason) {
        lostReasons[d.lost_reason] = (lostReasons[d.lost_reason] || 0) + 1;
      }
    });

    Object.entries(wonReasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => reasons.push({ reason, count, type: 'win' }));

    Object.entries(lostReasons)
      .sort((a, b) => b[1] - a[1])
      .forEach(([reason, count]) => reasons.push({ reason, count, type: 'loss' }));

    return reasons;
  }, [deals]);

  // Sequence performance (replaces fake "Rep Performance")
  const sequencePerformance = useMemo(() => {
    const activeSeqs = sequences.filter((s: any) => s.status === 'active');
    return activeSeqs.map((seq: any) => ({
      name: seq.name,
      enrolled: seq.enrolled_count || 0,
      steps: Array.isArray(seq.steps) ? seq.steps.length : 0,
      status: seq.status,
    }));
  }, [sequences]);

  // =====================================================
  // FORMAT HELPERS
  // =====================================================

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // =====================================================
  // LOADING STATE
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Loading analytics...</span>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep insights into your sales performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Total Revenue', value: formatCurrency(kpis.totalRevenue), icon: DollarSign, hasData: kpis.totalRevenue > 0 },
          { title: 'Deals Won', value: String(kpis.dealsWon), icon: Trophy, hasData: kpis.dealsWon > 0 },
          { title: 'Win Rate', value: kpis.winRate > 0 ? `${kpis.winRate}%` : '—', icon: Target, hasData: kpis.winRate > 0 },
          { title: 'Avg Deal Size', value: kpis.avgDealSize > 0 ? formatCurrency(kpis.avgDealSize) : '—', icon: Briefcase, hasData: kpis.avgDealSize > 0 },
          { title: 'Sales Cycle', value: kpis.avgCycleDays > 0 ? `${kpis.avgCycleDays} days` : '—', icon: Clock, hasData: kpis.avgCycleDays > 0 },
        ].map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className="h-5 w-5 text-muted-foreground" />
                {!kpi.hasData && (
                  <Badge variant="secondary" className="text-xs">No data</Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="winloss">Win/Loss</TabsTrigger>
          <TabsTrigger value="sources">Lead Sources</TabsTrigger>
        </TabsList>

        {/* ============= REVENUE TAB ============= */}
        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Month</CardTitle>
                <CardDescription>Won deal value over time</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueData.length === 0 ? (
                  <EmptyState message="No won deals yet. Revenue will appear here as deals close." />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Cumulative revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueData.length === 0 ? (
                  <EmptyState message="Revenue trend will appear after deals are closed." />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============= PIPELINE TAB ============= */}
        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>Lead distribution across pipeline stages ({leads.length} total leads)</CardDescription>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <EmptyState message="No leads yet. Generate leads to see your pipeline funnel." />
              ) : (
                <div className="space-y-4">
                  {funnelData.map((stage, i) => {
                    const maxVal = Math.max(...funnelData.map(s => s.value), 1);
                    return (
                      <div key={stage.stage}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{stage.stage}</span>
                          <span className="font-medium">{stage.value}</span>
                        </div>
                        <div className="relative">
                          <Progress
                            value={(stage.value / maxVal) * 100}
                            className="h-8"
                          />
                          {stage.value > 0 && leads.length > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {Math.round((stage.value / leads.length) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= SEQUENCES TAB (replaces fake Rep Performance) ============= */}
        <TabsContent value="sequences" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sequence Performance</CardTitle>
              <CardDescription>Active automation sequences and enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              {sequencePerformance.length === 0 ? (
                <EmptyState message="No active sequences. Create sequences to automate lead nurturing." />
              ) : (
                <div className="space-y-4">
                  {sequencePerformance.map((seq, i) => (
                    <div key={seq.name} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-4 mb-3">
                        <span className={`text-lg font-bold w-6 ${
                          i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                        }`}>
                          #{i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{seq.name}</p>
                          <p className="text-sm text-muted-foreground">{seq.steps} steps configured</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-600">{seq.enrolled}</p>
                          <p className="text-sm text-muted-foreground">enrolled</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Enrollment</span>
                          <Badge variant={seq.status === 'active' ? 'default' : 'secondary'}>
                            {seq.status}
                          </Badge>
                        </div>
                        <Progress
                          value={Math.min((seq.enrolled / Math.max(...sequencePerformance.map(s => s.enrolled), 1)) * 100, 100)}
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= WIN/LOSS TAB ============= */}
        <TabsContent value="winloss" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Win Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {winLossData.filter(d => d.type === 'win').length === 0 ? (
                  <EmptyState message="No won deals with reasons recorded yet." />
                ) : (
                  <div className="space-y-3">
                    {winLossData.filter(d => d.type === 'win').map(item => {
                      const maxWin = Math.max(...winLossData.filter(d => d.type === 'win').map(d => d.count), 1);
                      return (
                        <div key={item.reason} className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.reason}</p>
                            <Progress value={(item.count / maxWin) * 100} className="h-2 mt-1" />
                          </div>
                          <span className="text-sm font-bold">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Loss Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                {winLossData.filter(d => d.type === 'loss').length === 0 ? (
                  <EmptyState message="No lost deals with reasons recorded yet." />
                ) : (
                  <div className="space-y-3">
                    {winLossData.filter(d => d.type === 'loss').map(item => {
                      const maxLoss = Math.max(...winLossData.filter(d => d.type === 'loss').map(d => d.count), 1);
                      return (
                        <div key={item.reason} className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.reason}</p>
                            <Progress value={(item.count / maxLoss) * 100} className="h-2 mt-1 [&>div]:bg-red-500" />
                          </div>
                          <span className="text-sm font-bold">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============= LEAD SOURCES TAB (replaces fake Products) ============= */}
        <TabsContent value="sources" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Where your leads come from</CardDescription>
              </CardHeader>
              <CardContent>
                {sourceData.length === 0 ? (
                  <EmptyState message="No leads yet. Source distribution will appear here." />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {sourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source Breakdown</CardTitle>
                <CardDescription>Lead count by source</CardDescription>
              </CardHeader>
              <CardContent>
                {sourceData.length === 0 ? (
                  <EmptyState message="No data available." />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sourceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="value" name="Leads" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
