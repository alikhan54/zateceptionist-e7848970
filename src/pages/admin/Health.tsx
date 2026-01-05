import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Activity, Server, Database, Cpu, HardDrive, Wifi, RefreshCw, Bell,
  CheckCircle2, AlertTriangle, XCircle, Clock, Zap, Globe, MessageSquare,
  Phone, Mail, CloudOff, TrendingUp, TrendingDown, Settings
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';

const responseTimeData = [
  { time: '00:00', api: 45, db: 12, cache: 2 },
  { time: '04:00', api: 42, db: 10, cache: 2 },
  { time: '08:00', api: 68, db: 18, cache: 3 },
  { time: '12:00', api: 95, db: 25, cache: 4 },
  { time: '16:00', api: 82, db: 22, cache: 3 },
  { time: '20:00', api: 55, db: 15, cache: 2 },
];

const errorRateData = [
  { time: '00:00', rate: 0.1 },
  { time: '04:00', rate: 0.08 },
  { time: '08:00', rate: 0.15 },
  { time: '12:00', rate: 0.22 },
  { time: '16:00', rate: 0.18 },
  { time: '20:00', rate: 0.12 },
];

const uptimeData = [
  { day: 'Mon', uptime: 100 },
  { day: 'Tue', uptime: 100 },
  { day: 'Wed', uptime: 99.8 },
  { day: 'Thu', uptime: 100 },
  { day: 'Fri', uptime: 100 },
  { day: 'Sat', uptime: 100 },
  { day: 'Sun', uptime: 100 },
];

const queueData = [
  { queue: 'email', pending: 234, processing: 12, failed: 3 },
  { queue: 'sms', pending: 89, processing: 5, failed: 0 },
  { queue: 'voice', pending: 45, processing: 8, failed: 1 },
  { queue: 'webhooks', pending: 156, processing: 23, failed: 2 },
];

const services = [
  { name: 'API Gateway', status: 'healthy', latency: '23ms', uptime: '99.99%', icon: Globe },
  { name: 'PostgreSQL', status: 'healthy', latency: '8ms', uptime: '99.99%', icon: Database },
  { name: 'Redis Cache', status: 'healthy', latency: '2ms', uptime: '100%', icon: Zap },
  { name: 'Voice AI Service', status: 'healthy', latency: '145ms', uptime: '99.95%', icon: Phone },
  { name: 'Email Service', status: 'warning', latency: '320ms', uptime: '99.8%', icon: Mail },
  { name: 'SMS Gateway', status: 'healthy', latency: '89ms', uptime: '99.99%', icon: MessageSquare },
  { name: 'WhatsApp API', status: 'healthy', latency: '156ms', uptime: '99.97%', icon: MessageSquare },
  { name: 'AI Workers', status: 'healthy', latency: '890ms', uptime: '99.9%', icon: Cpu },
];

const recentIncidents = [
  { id: 1, title: 'Email service degradation', status: 'resolved', severity: 'minor', time: '14 days ago', duration: '23 min' },
  { id: 2, title: 'Database connection spike', status: 'resolved', severity: 'minor', time: '21 days ago', duration: '8 min' },
  { id: 3, title: 'Voice AI latency increase', status: 'resolved', severity: 'major', time: '32 days ago', duration: '1h 15min' },
];

const alertRules = [
  { id: 1, name: 'High Error Rate', condition: 'Error rate > 1%', enabled: true, channel: 'Slack, Email' },
  { id: 2, name: 'Service Down', condition: 'Any service unhealthy > 1min', enabled: true, channel: 'PagerDuty, Slack' },
  { id: 3, name: 'High Latency', condition: 'API latency > 500ms', enabled: true, channel: 'Slack' },
  { id: 4, name: 'Queue Backlog', condition: 'Queue size > 1000', enabled: false, channel: 'Email' },
  { id: 5, name: 'Database CPU', condition: 'DB CPU > 80%', enabled: true, channel: 'PagerDuty' },
];

export default function SystemHealth() {
  const [selectedTab, setSelectedTab] = useState('overview');

  const metrics = [
    { label: 'CPU Usage', value: 34, max: 100, icon: Cpu, status: 'good' },
    { label: 'Memory', value: 6.2, max: 16, unit: 'GB', icon: Server, status: 'good' },
    { label: 'Storage', value: 245, max: 500, unit: 'GB', icon: HardDrive, status: 'good' },
    { label: 'Network I/O', value: 156, max: 1000, unit: 'MB/s', icon: Wifi, status: 'good' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'down': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-chart-2';
      case 'warning': return 'bg-yellow-500';
      case 'down': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-1">Monitor platform performance and services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="bg-chart-2/10 border-chart-2/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-chart-2/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-chart-2">All Systems Operational</h3>
                <p className="text-muted-foreground">7 of 8 services healthy • 1 with elevated latency</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">99.98%</p>
              <p className="text-sm text-muted-foreground">30-day uptime</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Resource Metrics */}
          <div className="grid md:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <Card key={metric.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <metric.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {metric.value}{metric.unit || '%'} / {metric.max}{metric.unit || '%'}
                    </span>
                  </div>
                  <Progress value={(metric.value / metric.max) * 100} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">{metric.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Response Time */}
            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
                <CardDescription>Average latency by service (24h)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={responseTimeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))' 
                        }} 
                      />
                      <Line type="monotone" dataKey="api" stroke="hsl(var(--primary))" strokeWidth={2} name="API" />
                      <Line type="monotone" dataKey="db" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Database" />
                      <Line type="monotone" dataKey="cache" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Cache" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
                <CardDescription>Percentage of failed requests (24h)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={errorRateData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))' 
                        }} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="hsl(var(--destructive))" 
                        fill="hsl(var(--destructive))" 
                        fillOpacity={0.2}
                        name="Error %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Uptime History */}
          <Card>
            <CardHeader>
              <CardTitle>Uptime History</CardTitle>
              <CardDescription>Daily uptime percentage (last 7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uptimeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis domain={[99, 100]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Bar dataKey="uptime" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Active Connections */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">423</p>
                <p className="text-sm text-muted-foreground">Active Connections</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">1.2M</p>
                <p className="text-sm text-muted-foreground">Requests Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">45ms</p>
                <p className="text-sm text-muted-foreground">Avg Response Time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((service) => (
              <Card key={service.name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        service.status === 'healthy' ? 'bg-chart-2/10' : 'bg-yellow-500/10'
                      }`}>
                        <service.icon className={`h-5 w-5 ${
                          service.status === 'healthy' ? 'text-chart-2' : 'text-yellow-500'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{service.name}</p>
                          {getStatusIcon(service.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">Uptime: {service.uptime}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{service.latency}</p>
                      <p className="text-xs text-muted-foreground">latency</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 flex-1 rounded-full ${getStatusColor(service.status)}`} />
                      <span className="text-xs text-muted-foreground capitalize">{service.status}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queues" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            {queueData.map((queue) => (
              <Card key={queue.queue}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg capitalize">{queue.queue} Queue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{queue.pending}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{queue.processing}</p>
                      <p className="text-sm text-muted-foreground">Processing</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">{queue.failed}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Progress value={(queue.processing / (queue.pending + queue.processing)) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Incidents</CardTitle>
                  <CardDescription>Past incidents and their resolution status</CardDescription>
                </div>
                <Button variant="outline" size="sm">View All History</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        incident.severity === 'minor' ? 'bg-yellow-500/10' : 'bg-destructive/10'
                      }`}>
                        <AlertTriangle className={`h-5 w-5 ${
                          incident.severity === 'minor' ? 'text-yellow-500' : 'text-destructive'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{incident.title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{incident.time}</span>
                          <span>•</span>
                          <span>Duration: {incident.duration}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={incident.severity === 'minor' ? 'secondary' : 'destructive'}>
                        {incident.severity}
                      </Badge>
                      <Badge variant="default" className="bg-chart-2">
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alert Rules</CardTitle>
                  <CardDescription>Configure monitoring and notification rules</CardDescription>
                </div>
                <Button size="sm">
                  <Bell className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alertRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Switch checked={rule.enabled} />
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        <p className="text-sm text-muted-foreground">{rule.condition}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{rule.channel}</Badge>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
