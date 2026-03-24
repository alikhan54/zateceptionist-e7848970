import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Zap, Bot, TrendingUp, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { format } from 'date-fns';

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500/15 text-green-600 border-green-500/30',
  B: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  C: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  D: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  F: 'bg-red-500/15 text-red-600 border-red-500/30',
};

export default function AutonomousMarketing() {
  const { tenantConfig } = useTenant();
  const [autonomousEnabled, setAutonomousEnabled] = useState(false);

  // Performance log with grades + recommendations
  const { data: perfLogs = [], isLoading: perfLoading } = useQuery({
    queryKey: ['marketing_performance_log', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig) return [];
      const { data } = await (supabase as any)
        .from('marketing_performance_log')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Action log
  const { data: actions = [], isLoading: actionsLoading } = useQuery({
    queryKey: ['autonomous_marketing_actions', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig) return [];
      const { data } = await (supabase as any)
        .from('autonomous_marketing_actions')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    perfLogs.forEach((log: any) => {
      const grade = (log.grade || '').toUpperCase();
      if (grade in dist) dist[grade]++;
    });
    return dist;
  }, [perfLogs]);

  // Recommendations
  const recommendations = useMemo(() => {
    return perfLogs
      .filter((log: any) => log.ai_recommendation)
      .slice(0, 10);
  }, [perfLogs]);

  const isLoading = perfLoading || actionsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Zap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Autonomous Marketing</h1>
          <p className="text-muted-foreground">AI-driven marketing decisions and actions</p>
        </div>
      </div>

      {/* Autonomous Mode Toggle */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Autonomous Mode</CardTitle>
                <CardDescription>
                  {autonomousEnabled
                    ? 'AI is making marketing decisions automatically'
                    : 'Enable to let AI auto-adjust posting, content mix, and counter competitor moves'}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={autonomousEnabled}
              onCheckedChange={setAutonomousEnabled}
            />
          </div>
        </CardHeader>
        {autonomousEnabled && (
          <CardContent>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 inline mr-2 text-primary" />
              Coming soon: auto-adjust posting schedules, content mix optimization, and counter-competitor moves based on real-time performance data.
            </div>
          </CardContent>
        )}
      </Card>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : perfLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No performance data yet.</p>
          ) : (
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Grade Distribution</h3>
              <div className="flex flex-wrap gap-3 mb-6">
                {Object.entries(gradeDistribution).map(([grade, count]) => (
                  <div key={grade} className="flex items-center gap-2">
                    <Badge className={GRADE_COLORS[grade] || ''}>
                      {grade}
                    </Badge>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground">AI Recommendations</h3>
                  <div className="space-y-3">
                    {recommendations.map((rec: any) => (
                      <div key={rec.id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm">{rec.ai_recommendation}</p>
                          {rec.grade && (
                            <Badge className={GRADE_COLORS[rec.grade?.toUpperCase()] || ''}>
                              {rec.grade}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.created_at ? format(new Date(rec.created_at), 'MMM d, h:mm a') : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Action Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No autonomous actions taken yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Trigger</th>
                    <th className="pb-3 pr-4">Details</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action: any) => (
                    <tr key={action.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-4 font-medium capitalize">
                        {(action.action_type || action.type || '--').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {action.trigger || action.trigger_reason || '--'}
                      </td>
                      <td className="py-3 pr-4 max-w-[300px] truncate">
                        {typeof action.details === 'object' ? JSON.stringify(action.details) : (action.details || '--')}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={action.status === 'completed' ? 'default' : 'outline'}>
                          {action.status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {action.created_at ? format(new Date(action.created_at), 'MMM d, h:mm a') : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
