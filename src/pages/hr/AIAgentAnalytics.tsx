import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AIAgentAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Agent Analytics</h1>
        <p className="text-muted-foreground">Performance metrics and insights for your AI agents.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['Tasks Completed', 'Avg Response Time', 'Success Rate'].map((title) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">No data yet</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
