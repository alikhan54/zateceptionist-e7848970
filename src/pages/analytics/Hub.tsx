import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, TrendingUp, Users, DollarSign, ArrowUpRight } from 'lucide-react';

export default function AnalyticsHub() {
  const stats = [
    { label: 'Total Revenue', value: '$0', change: '+0%', icon: DollarSign },
    { label: 'Active Users', value: '0', change: '+0%', icon: Users },
    { label: 'Conversion Rate', value: '0%', change: '+0%', icon: TrendingUp },
    { label: 'Engagement', value: '0%', change: '+0%', icon: Activity },
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
                <span className="text-xs text-chart-2 flex items-center">
                  <ArrowUpRight className="h-3 w-3" />{stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
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
