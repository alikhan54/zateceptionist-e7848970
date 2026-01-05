import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Server, Database, Cpu, HardDrive, Wifi } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function SystemHealth() {
  const metrics = [
    { label: 'CPU Usage', value: 23, icon: Cpu },
    { label: 'Memory', value: 45, icon: Server },
    { label: 'Storage', value: 12, icon: HardDrive },
    { label: 'Network', value: 8, icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Health</h1>
        <p className="text-muted-foreground mt-1">Monitor system performance</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <metric.icon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{metric.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>All connected services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['API Gateway', 'Database', 'Redis Cache', 'Voice AI', 'Email Service', 'SMS Gateway'].map((service) => (
              <div key={service} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span>{service}</span>
                <span className="flex items-center gap-2 text-chart-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-chart-2"></span>
                  Healthy
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Last 24 hours</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            <Activity className="h-16 w-16 opacity-50" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
