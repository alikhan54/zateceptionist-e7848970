import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GitBranch, Plus, Play } from 'lucide-react';

export default function ABTesting() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground mt-1">Optimize with data-driven experiments</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Test</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Tests</CardTitle>
          <CardDescription>Running experiments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active tests</p>
            <p className="text-sm">Create your first A/B test</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
