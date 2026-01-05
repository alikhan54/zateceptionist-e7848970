import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Users, Activity, Zap } from 'lucide-react';

export default function RealtimeDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Radio className="h-8 w-8 text-chart-2 animate-pulse" />
          Real-time Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Live business metrics</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-chart-2/50">
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto text-chart-2 mb-2" />
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Active Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Events/min</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 mx-auto text-chart-4 mb-2" />
            <p className="text-3xl font-bold">0ms</p>
            <p className="text-sm text-muted-foreground">Avg Response</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Radio className="h-6 w-6 mx-auto text-chart-3 mb-2" />
            <p className="text-3xl font-bold">100%</p>
            <p className="text-sm text-muted-foreground">Uptime</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Feed</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center text-muted-foreground">
          Real-time data stream will be displayed here
        </CardContent>
      </Card>
    </div>
  );
}
