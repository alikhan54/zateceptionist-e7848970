import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, Download, TrendingUp, Users, Mail, MousePointer } from 'lucide-react';

export default function MarketingAnalytics() {
  const stats = [
    { label: 'Total Reach', value: '12.5K', icon: Users },
    { label: 'Engagement Rate', value: '4.2%', icon: TrendingUp },
    { label: 'Email Opens', value: '2,340', icon: Mail },
    { label: 'Click Rate', value: '3.8%', icon: MousePointer },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your marketing performance</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export Report</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            <PieChart className="h-16 w-16 opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Campaign Results</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            <TrendingUp className="h-16 w-16 opacity-50" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
