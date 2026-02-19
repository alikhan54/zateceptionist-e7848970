import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketingCampaigns } from '@/hooks/useMarketingCampaigns';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, TrendingUp, Users, Mail, MousePointer, Send, Eye, Target, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MarketingAnalytics() {
  const [period, setPeriod] = useState('30d');
  const { campaigns, isLoading, stats } = useMarketingCampaigns();

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
