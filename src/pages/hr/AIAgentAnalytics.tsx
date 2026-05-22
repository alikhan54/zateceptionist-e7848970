import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AskAIButton } from '@/components/hr/AskAIButton';
import { BarChart3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AIAgentAnalytics() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
    queryClient.invalidateQueries({ queryKey: ['ai-agent-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['ai-agent-tasks'] });
    toast.success('Metrics refreshed');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Agent Analytics</h1>
          <p className="text-muted-foreground">Performance metrics and insights for your AI agents.</p>
        </div>
        <div className="flex items-center gap-2">
          <AskAIButton
            message="Summarise the performance of our AI agent workforce: tasks completed, response times, success rates, and which agents need optimisation"
            label="AI Performance Review"
          />
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh Metrics
          </Button>
        </div>
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
