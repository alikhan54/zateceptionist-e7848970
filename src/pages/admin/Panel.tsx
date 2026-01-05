import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Users, Building2, Activity, Settings } from 'lucide-react';

export default function AdminPanel() {
  const stats = [
    { label: 'Total Tenants', value: '0', icon: Building2 },
    { label: 'Total Users', value: '0', icon: Users },
    { label: 'Active Sessions', value: '0', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Master administration dashboard</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stat.value}</p>
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
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <p className="font-medium">Create New Tenant</p>
              <p className="text-sm text-muted-foreground">Set up a new organization</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <p className="font-medium">Manage Feature Flags</p>
              <p className="text-sm text-muted-foreground">Toggle features globally</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors">
              <p className="font-medium">View System Logs</p>
              <p className="text-sm text-muted-foreground">Monitor system activity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Overall system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>API Status</span>
                <span className="text-chart-2">● Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Database</span>
                <span className="text-chart-2">● Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Voice AI</span>
                <span className="text-chart-2">● Operational</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Webhooks</span>
                <span className="text-chart-2">● Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
