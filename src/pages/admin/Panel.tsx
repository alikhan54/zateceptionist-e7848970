import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, Users, Activity, Shield, Zap, TrendingUp, AlertTriangle,
  Server, Database, Globe, Plus, Settings, RefreshCw, Eye
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const errorRateData = [
  { time: '00:00', rate: 0.2 },
  { time: '04:00', rate: 0.1 },
  { time: '08:00', rate: 0.3 },
  { time: '12:00', rate: 0.5 },
  { time: '16:00', rate: 0.2 },
  { time: '20:00', rate: 0.1 },
  { time: '24:00', rate: 0.15 },
];

const apiCallsData = [
  { hour: '6am', calls: 1200 },
  { hour: '9am', calls: 4500 },
  { hour: '12pm', calls: 6200 },
  { hour: '3pm', calls: 5800 },
  { hour: '6pm', calls: 3200 },
  { hour: '9pm', calls: 1800 },
];

const recentSignups = [
  { id: 1, company: 'TechCorp Industries', email: 'admin@techcorp.com', plan: 'Enterprise', time: '5 min ago' },
  { id: 2, company: 'StartupXYZ', email: 'founder@startupxyz.io', plan: 'Growth', time: '23 min ago' },
  { id: 3, company: 'RetailPlus', email: 'ops@retailplus.com', plan: 'Professional', time: '1 hour ago' },
  { id: 4, company: 'HealthFirst', email: 'it@healthfirst.org', plan: 'Enterprise', time: '2 hours ago' },
];

const systemServices = [
  { name: 'API Gateway', status: 'healthy', latency: '23ms' },
  { name: 'Database', status: 'healthy', latency: '8ms' },
  { name: 'Redis Cache', status: 'healthy', latency: '2ms' },
  { name: 'Voice AI', status: 'healthy', latency: '145ms' },
  { name: 'Email Service', status: 'warning', latency: '320ms' },
  { name: 'SMS Gateway', status: 'healthy', latency: '89ms' },
];

const planDistribution = [
  { name: 'Enterprise', value: 35, color: 'hsl(var(--chart-1))' },
  { name: 'Professional', value: 45, color: 'hsl(var(--chart-2))' },
  { name: 'Growth', value: 15, color: 'hsl(var(--chart-3))' },
  { name: 'Starter', value: 5, color: 'hsl(var(--chart-4))' },
];

export default function AdminPanel() {
  const stats = [
    { label: 'Active Tenants', value: '156', change: '+12', icon: Building2, trend: 'up' },
    { label: 'Total Users', value: '2,847', change: '+89', icon: Users, trend: 'up' },
    { label: 'API Calls Today', value: '1.2M', change: '+15%', icon: Zap, trend: 'up' },
    { label: 'Active Sessions', value: '423', change: '-5', icon: Activity, trend: 'down' },
    { label: 'Monthly Revenue', value: '$48.5K', change: '+8%', icon: TrendingUp, trend: 'up' },
    { label: 'Error Rate', value: '0.12%', change: '-0.03%', icon: AlertTriangle, trend: 'down' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Master Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Platform overview and system management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Settings className="h-4 w-4 mr-2" />
            System Settings
          </Button>
        </div>
      </div>

      {/* System Health Banner */}
      <Card className="bg-chart-2/10 border-chart-2/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-chart-2/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <h3 className="font-semibold text-chart-2">All Systems Operational</h3>
                <p className="text-sm text-muted-foreground">Last incident: 14 days ago • Uptime: 99.98%</p>
              </div>
            </div>
            <Button variant="outline" size="sm">View Status Page</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
                <Badge variant={stat.trend === 'up' ? 'default' : 'secondary'} className="text-xs">
                  {stat.change}
                </Badge>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* API Calls Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>API Calls Today</CardTitle>
            <CardDescription>Hourly request volume across all tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={apiCallsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Tenants by subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {planDistribution.map((plan) => (
                <div key={plan.name} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: plan.color }} />
                  <span className="text-sm">{plan.name}: {plan.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Error Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Error Rate Trend</CardTitle>
            <CardDescription>24-hour error percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={errorRateData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* System Services */}
        <Card>
          <CardHeader>
            <CardTitle>System Services</CardTitle>
            <CardDescription>Real-time service status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemServices.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      service.status === 'healthy' ? 'bg-chart-2' : 'bg-yellow-500'
                    }`} />
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{service.latency}</span>
                    <Badge variant={service.status === 'healthy' ? 'default' : 'secondary'}>
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Signups & Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Signups */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Sign-ups</CardTitle>
                <CardDescription>New tenants in the last 24 hours</CardDescription>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSignups.map((signup) => (
                <div key={signup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{signup.company}</p>
                      <p className="text-sm text-muted-foreground">{signup.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{signup.plan}</Badge>
                    <span className="text-sm text-muted-foreground">{signup.time}</span>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Tenant
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Server className="h-4 w-4 mr-2" />
              System Health
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Database className="h-4 w-4 mr-2" />
              Database Backups
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Globe className="h-4 w-4 mr-2" />
              API Keys
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              View Audit Logs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Resource Usage</CardTitle>
          <CardDescription>Current resource consumption across all services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: 'CPU Usage', value: 34, max: 100 },
              { label: 'Memory', value: 6.2, max: 16, unit: 'GB' },
              { label: 'Storage', value: 245, max: 500, unit: 'GB' },
              { label: 'Bandwidth', value: 1.8, max: 5, unit: 'TB' },
            ].map((resource) => (
              <div key={resource.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{resource.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {resource.value}{resource.unit ? resource.unit : '%'} / {resource.max}{resource.unit || '%'}
                  </span>
                </div>
                <Progress value={(resource.value / resource.max) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
