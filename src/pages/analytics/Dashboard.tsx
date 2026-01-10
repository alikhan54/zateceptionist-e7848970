import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign, Users, Calendar, TrendingUp, Activity, Bot, User,
  MessageSquare, Phone, Mail, Download, RefreshCw, Flame, Thermometer, Snowflake,
} from 'lucide-react';
import { useDashboardStats, useRevenueAnalytics, useChannelAnalytics, useConversionFunnel } from '@/hooks/useAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: revenueData, isLoading: revenueLoading } = useRevenueAnalytics(period);
  const { data: channelData } = useChannelAnalytics();
  const { data: funnelData } = useConversionFunnel();

  const kpis = [
    { label: 'Total Revenue', value: `$${(stats?.dealsValue || 0).toLocaleString()}`, change: '+12%', icon: DollarSign, color: 'text-green-500' },
    { label: 'New Leads', value: stats?.newCustomersToday || 0, change: '+8%', icon: Users, color: 'text-blue-500' },
    { label: 'Bookings Made', value: stats?.appointmentsToday || 0, change: '+15%', icon: Calendar, color: 'text-purple-500' },
    { label: 'Conversion Rate', value: '24%', change: '+3%', icon: TrendingUp, color: 'text-orange-500' },
    { label: 'Health Score', value: '85/100', change: '', icon: Activity, color: 'text-primary' },
  ];

  const temperatureData = [
    { name: 'HOT', value: 15, icon: Flame, color: 'text-red-500 bg-red-500/10' },
    { name: 'WARM', value: 32, icon: Thermometer, color: 'text-orange-500 bg-orange-500/10' },
    { name: 'COLD', value: 28, icon: Snowflake, color: 'text-blue-500 bg-blue-500/10' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Command Center</h1>
          <p className="text-muted-foreground mt-1">The central nervous system of your business</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Updated {formatDistanceToNow(new Date(), { addSuffix: true })}</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                {kpi.change && <Badge variant="secondary" className="text-xs text-green-600">{kpi.change}</Badge>}
              </div>
              {statsLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">{kpi.value}</p>}
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Section */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Track your revenue trends</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {revenueLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4"><p className="text-sm text-muted-foreground">Revenue Collected</p><p className="text-2xl font-bold text-green-600">${(stats?.dealsValue || 0).toLocaleString()}</p></CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/20">
            <CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending Payments</p><p className="text-2xl font-bold text-yellow-600">$2,450</p></CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4"><p className="text-sm text-muted-foreground">Revenue Lost</p><p className="text-2xl font-bold text-red-600">$890</p></CardContent>
          </Card>
        </div>
      </div>

      {/* Funnel & Temperature */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Conversion Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {funnelData?.map((stage, i) => (
              <div key={stage.stage}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{stage.stage}</span>
                  <span className="font-medium">{stage.count}</span>
                </div>
                <Progress value={Math.max(10, 100 - i * 20)} className="h-3" />
              </div>
            )) || <Skeleton className="h-40 w-full" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Lead Temperature</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-around">
              {temperatureData.map((temp) => (
                <div key={temp.name} className={`text-center p-4 rounded-lg ${temp.color}`}>
                  <temp.icon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{temp.value}</p>
                  <p className="text-xs">{temp.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI & Channel Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>AI Performance</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <Bot className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">94%</p>
              <p className="text-xs text-muted-foreground">AI Response Rate</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">2.3s</p>
              <p className="text-xs text-muted-foreground">Avg Response Time</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">8%</p>
              <p className="text-xs text-muted-foreground">Escalation Rate</p>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold">4.7</p>
              <p className="text-xs text-muted-foreground">Satisfaction Score</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Channel Performance</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="conversations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
