import { Brain, Activity, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  useCustomer360,
  useSystemEvents,
  useRevenueAttribution,
  usePredictiveScores,
} from '@/hooks/useIntegrationHooks';

const CHANNEL_COLORS = {
  email: 'hsl(var(--chart-1))',
  whatsapp: 'hsl(var(--chart-2))',
  voice: 'hsl(var(--chart-3))',
  social: 'hsl(var(--chart-4))',
};

const SEVERITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

export default function Intelligence() {
  const { churnRisks, isLoading: loadingCustomers } = useCustomer360();
  const { events, isLoading: loadingEvents } = useSystemEvents({ limit: 50 });
  const { totalRevenue, channelROI, isLoading: loadingRevenue } = useRevenueAttribution();
  const { highRisk, scores, isLoading: loadingScores } = usePredictiveScores();

  const isLoading = loadingCustomers || loadingEvents || loadingRevenue || loadingScores;

  const pieData = Object.entries(channelROI)
    .filter(([, value]) => (value as number) > 0)
    .map(([channel, value]) => ({
      name: channel.charAt(0).toUpperCase() + channel.slice(1),
      value: value as number,
      color: CHANNEL_COLORS[channel as keyof typeof CHANNEL_COLORS] || 'hsl(var(--muted))',
    }));

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      loading: loadingRevenue,
    },
    {
      title: 'Churn Risks',
      value: churnRisks.length,
      icon: AlertTriangle,
      loading: loadingCustomers,
    },
    {
      title: 'System Events',
      value: events.length,
      icon: Activity,
      loading: loadingEvents,
    },
    {
      title: 'High-Risk Predictions',
      value: highRisk.length,
      icon: TrendingUp,
      loading: loadingScores,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intelligence Hub</h1>
          <p className="text-sm text-muted-foreground">Cross-system AI insights & predictions</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ title, value, icon: Icon, loading }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="churn">Churn Risks</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Attribution</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        {/* Activity Feed */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent System Events</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No events recorded yet.</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30"
                    >
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={SEVERITY_VARIANT[event.event_severity] ?? 'outline'}>
                            {event.event_source}
                          </Badge>
                          <span className="text-xs font-medium truncate">{event.event_action}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{event.event_summary}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Risks */}
        <TabsContent value="churn">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">High Churn Risk Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCustomers ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : churnRisks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No high-risk customers detected.</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {churnRisks.map((customer) => (
                    <div key={customer.id} className="rounded-lg border p-3 bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{customer.customer_id}</span>
                        <Badge variant="destructive">{customer.churn_risk_score}% risk</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Channel: {customer.preferred_channel || '—'}</span>
                        <span>·</span>
                        <span>LTV: ${(customer.lifetime_value || 0).toLocaleString()}</span>
                      </div>
                      <Progress value={customer.churn_risk_score} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Attribution */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <Skeleton className="h-64 w-full" />
              ) : pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No attribution data available.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions */}
        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Predictive Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScores ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : scores.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No predictions available.</p>
              ) : (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {scores.map((score) => (
                    <div key={score.id} className="rounded-lg border p-3 bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{score.prediction_type}</Badge>
                          <span className="text-xs text-muted-foreground">{score.entity_type}</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums">{score.score}%</span>
                      </div>
                      <Progress value={score.score} className="h-1.5" />
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Confidence: {Math.round(score.confidence * 100)}%</span>
                        {score.recommended_actions?.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{score.recommended_actions.length} action(s) suggested</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
