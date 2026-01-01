import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  MessageSquare,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

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
            <ArrowUpRight className="h-3 w-3 text-success mr-1" />
          ) : (
            <ArrowDownRight className="h-3 w-3 text-destructive mr-1" />
          )}
          <span className={isPositive ? 'text-success' : 'text-destructive'}>
            {Math.abs(change)}%
          </span>
          <span className="text-muted-foreground ml-1">from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { tenantConfig, t } = useTenant();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {tenantConfig?.business_name || 'Your Business'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
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

        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Upcoming {t('appointments')}</CardTitle>
            <CardDescription>Your schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
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
    </div>
  );
}
