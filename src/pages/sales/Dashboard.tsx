import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, Target, DollarSign, Users, ArrowUpRight, ArrowDownRight,
  Bot, Mail, Phone, RefreshCw, FileText, Sparkles, Play, Zap,
  ThermometerSun, Activity, Flame, Thermometer, Snowflake, Clock,
  BarChart3, Settings2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Pipeline stage configuration
const PIPELINE_STAGES = [
  { id: 'PROS', label: 'Prospect', phase: 'Discovery', color: 'bg-blue-500' },
  { id: 'RES', label: 'Research', phase: 'Discovery', color: 'bg-indigo-500' },
  { id: 'CONT', label: 'Contact', phase: 'Qualification', color: 'bg-purple-500' },
  { id: 'PITCH', label: 'Pitch', phase: 'Qualification', color: 'bg-pink-500' },
  { id: 'OBJ', label: 'Objection', phase: 'Closing', color: 'bg-orange-500' },
  { id: 'CLOSE', label: 'Closing', phase: 'Closing', color: 'bg-green-500' },
  { id: 'RET', label: 'Retained', phase: 'Retained', color: 'bg-emerald-500' },
];

export default function SalesDashboard() {
  const { tenantId } = useTenant();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch sales stats
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['sales-dashboard-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const [leadsRes, dealsRes, appointmentsRes] = await Promise.all([
        supabase.from('sales_leads').select('*').eq('tenant_id', tenantId),
        supabase.from('deals').select('*').eq('tenant_id', tenantId),
        supabase.from('appointments').select('*').eq('tenant_id', tenantId),
      ]);

      const leads = leadsRes.data || [];
      const deals = dealsRes.data || [];
      
      // Calculate stats
      const hotLeads = leads.filter((l: any) => l.temperature === 'hot' || l.score >= 80).length;
      const warmLeads = leads.filter((l: any) => l.temperature === 'warm' || (l.score >= 50 && l.score < 80)).length;
      const coldLeads = leads.filter((l: any) => l.temperature === 'cold' || l.score < 50).length;

      // Group deals by stage
      const stageDistribution: Record<string, number> = {};
      deals.forEach((d: any) => {
        const stage = d.stage || 'Lead';
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
      });

      return {
        totalLeads: leads.length,
        hotLeads,
        warmLeads,
        coldLeads,
        activeSequences: 3, // Mock
        emailsSent: 156, // Mock
        aiCallsMade: 42, // Mock
        stageDistribution,
        totalDeals: deals.length,
        pipelineValue: deals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
      };
    },
    enabled: !!tenantId,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const kpis = [
    { label: 'Total Leads', value: stats?.totalLeads || 0, change: '+12', trend: 'up', icon: Users, color: 'text-blue-500' },
    { label: 'Hot Leads', value: stats?.hotLeads || 0, change: '+5', trend: 'up', icon: Flame, color: 'text-red-500' },
    { label: 'Active Sequences', value: stats?.activeSequences || 0, change: '', trend: 'up', icon: Activity, color: 'text-purple-500' },
    { label: 'Emails Sent', value: stats?.emailsSent || 0, change: '+23', trend: 'up', icon: Mail, color: 'text-green-500' },
    { label: 'AI Calls Made', value: stats?.aiCallsMade || 0, change: '+8', trend: 'up', icon: Phone, color: 'text-orange-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Dashboard</h1>
          <p className="text-muted-foreground mt-1">AI-powered sales automation and lead management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Link>
          </Button>
          <Button asChild>
            <Link to="/sales/auto-leadgen">
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Leads
            </Link>
          </Button>
        </div>
      </div>

      {/* AI Assistant Banner */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Bot className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">AI Sales Assistant Active</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically nurturing {stats?.totalLeads || 0} leads across email and phone
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats?.emailsSent || 0}</p>
                <p className="text-xs text-muted-foreground">Emails Sent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats?.aiCallsMade || 0}</p>
                <p className="text-xs text-muted-foreground">Calls Made</p>
              </div>
              <Badge className="bg-green-500 text-white">
                <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                Running
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={cn('h-5 w-5', kpi.color)} />
                {kpi.change && (
                  <span className="text-xs text-green-600 flex items-center">
                    <ArrowUpRight className="h-3 w-3" />
                    {kpi.change}
                  </span>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold">{kpi.value}</p>
              )}
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sales Pipeline Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Pipeline</CardTitle>
              <CardDescription>Lead distribution by stage (Real Data)</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/sales/pipeline">View Pipeline</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Pipeline Visualization */}
          <div className="space-y-4">
            {/* Stage indicators */}
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {PIPELINE_STAGES.map((stage, index) => {
                const count = stats?.stageDistribution?.[stage.label] || 0;
                return (
                  <div key={stage.id} className="flex flex-col items-center min-w-[60px]">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
                      stage.color
                    )}>
                      {count}
                    </div>
                    <span className="text-xs font-medium mt-1">{stage.id}</span>
                    <span className="text-[10px] text-muted-foreground">{stage.label}</span>
                    {index < PIPELINE_STAGES.length - 1 && (
                      <div className="absolute left-1/2 w-8 h-0.5 bg-border -translate-y-1/2" style={{ top: '20px' }} />
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Phase labels */}
            <div className="flex justify-between border-t pt-3">
              <div className="flex-1 text-center">
                <Badge variant="outline" className="text-xs">Discovery</Badge>
              </div>
              <div className="flex-1 text-center">
                <Badge variant="outline" className="text-xs">Qualification</Badge>
              </div>
              <div className="flex-1 text-center">
                <Badge variant="outline" className="text-xs">Closing</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            AI Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/sales/auto-leadgen">
                <Sparkles className="h-6 w-6 text-purple-500" />
                <span>Generate Free Leads</span>
                <span className="text-xs text-muted-foreground">Google + Apify</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Mail className="h-6 w-6 text-blue-500" />
              <span>Send Email Blast</span>
              <span className="text-xs text-muted-foreground">To {stats?.hotLeads || 0} hot leads</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <Phone className="h-6 w-6 text-green-500" />
              <span>Start AI Calling</span>
              <span className="text-xs text-muted-foreground">VAPI voice calls</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2">
              <ThermometerSun className="h-6 w-6 text-orange-500" />
              <span>Re-score All Leads</span>
              <span className="text-xs text-muted-foreground">Update temperatures</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lead Temperature Distribution & Recent Campaigns */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Temperature Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Temperature Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'HOT', value: stats?.hotLeads || 0, icon: Flame, color: 'bg-red-500', textColor: 'text-red-500' },
                { label: 'WARM', value: stats?.warmLeads || 0, icon: Thermometer, color: 'bg-orange-500', textColor: 'text-orange-500' },
                { label: 'COLD', value: stats?.coldLeads || 0, icon: Snowflake, color: 'bg-blue-500', textColor: 'text-blue-500' },
              ].map((temp) => {
                const total = (stats?.hotLeads || 0) + (stats?.warmLeads || 0) + (stats?.coldLeads || 0);
                const percentage = total > 0 ? (temp.value / total) * 100 : 0;
                return (
                  <div key={temp.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <temp.icon className={cn('h-4 w-4', temp.textColor)} />
                        <span className="font-medium">{temp.label}</span>
                      </div>
                      <span className="font-bold">{temp.value}</span>
                    </div>
                    <Progress value={percentage} className={cn('h-2', temp.color)} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Lead Generation Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Lead Generation</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/sales/auto-leadgen">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.totalLeads === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No lead generation campaigns yet</p>
                <p className="text-sm mt-1">Click Generate Leads to get started</p>
                <Button className="mt-4" size="sm" asChild>
                  <Link to="/sales/auto-leadgen">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Leads
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Technology Startups</p>
                      <p className="text-xs text-muted-foreground">25 leads generated</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Intent Signal Monitor</p>
                      <p className="text-xs text-muted-foreground">12 high-intent leads</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Running</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
