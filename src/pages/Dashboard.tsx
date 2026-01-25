import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs mt-1">
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-destructive mr-1" />
          )}
          <span className={isPositive ? 'text-green-500' : 'text-destructive'}>
            {Math.abs(change)}%
          </span>
          <span className="text-muted-foreground ml-1">from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

// AI Agent Status Component
function AIAgentStatus({ name, status, actions }: { name: string; status: 'active' | 'idle' | 'error'; actions: number }) {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-muted-foreground',
    error: 'bg-destructive',
  };
  
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${statusColors[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {actions} actions
        </Badge>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { tenantConfig, tenantId, t } = useTenant();
  const [aiAutonomousMode, setAiAutonomousMode] = useState(false);

  // Debug logging for tenant assignment
  console.log('[Dashboard] Current tenant:', {
    tenantId: tenantId,
    uuid: tenantConfig?.id,
    company_name: tenantConfig?.company_name
  });

  const stats = [
    {
      title: `Total ${t('customers')}`,
      value: '1,248',
      change: 12.5,
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Conversations',
      value: '324',
      change: 8.2,
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      title: t('appointments'),
      value: '89',
      change: -3.1,
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      title: `Active ${t('leads')}`,
      value: '156',
      change: 24.3,
      icon: <TrendingUp className="h-5 w-5" />,
    },
  ];

  // Mock AI agents data
  const aiAgents = [
    { name: 'Sales AI', status: 'active' as const, actions: 47 },
    { name: 'Marketing AI', status: 'active' as const, actions: 23 },
    { name: 'HR AI', status: 'idle' as const, actions: 5 },
    { name: 'Support AI', status: 'active' as const, actions: 89 },
  ];

  // Mock AI suggestions
  const aiSuggestions = [
    { type: 'opportunity', message: 'LinkedIn leads convert 40% better - increase focus' },
    { type: 'warning', message: '3 customers may be at risk of churning' },
    { type: 'insight', message: 'Best time to contact: Tuesday 2pm' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {tenantConfig?.company_name || 'Your Business'}
        </p>
        {/* Debug info - remove in production */}
        <p className="text-xs text-muted-foreground/50 mt-1">
          Tenant: {tenantId} | UUID: {tenantConfig?.id?.slice(0, 8)}...
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* AI Command Center + Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* AI Command Center */}
        <Card className="lg:col-span-1 animate-fade-in border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                AI Command Center
              </CardTitle>
              <Badge variant={aiAutonomousMode ? 'default' : 'secondary'} className="text-xs">
                {aiAutonomousMode ? 'Autonomous' : 'Assisted'}
              </Badge>
            </div>
            <CardDescription>AI agents status & actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${aiAutonomousMode ? 'text-green-500' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">Autonomous Mode</span>
              </div>
              <Switch 
                checked={aiAutonomousMode} 
                onCheckedChange={setAiAutonomousMode}
              />
            </div>

            {/* Agent Statuses */}
            <div className="divide-y">
              {aiAgents.map((agent) => (
                <AIAgentStatus key={agent.name} {...agent} />
              ))}
            </div>

            {/* Today's Summary */}
            <div className="pt-2 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">164</p>
                  <p className="text-xs text-muted-foreground">AI Actions Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">12</p>
                  <p className="text-xs text-muted-foreground">Deals Closed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>What AI learned today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  {suggestion.type === 'opportunity' && (
                    <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  )}
                  {suggestion.type === 'warning' && (
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  )}
                  {suggestion.type === 'insight' && (
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm">{suggestion.message}</p>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4" size="sm">
              View All Insights
            </Button>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Latest messages from all channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">Sample Contact {i}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      Last message preview here...
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">2h ago</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
        <CardHeader>
          <CardTitle>Upcoming {t('appointments')}</CardTitle>
          <CardDescription>Your schedule for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">Meeting with Client {i}</p>
                  <p className="text-sm text-muted-foreground">
                    {9 + i}:00 AM - {10 + i}:00 AM
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
