import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, Plus, Play, Pause } from 'lucide-react';

export default function Sequences() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Sequences</h1>
          <p className="text-muted-foreground mt-1">Automated outreach sequences</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Create Sequence</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sequences</CardTitle>
          <CardDescription>Manage your automated follow-up sequences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sequences created yet</p>
            <p className="text-sm">Create your first sequence to automate outreach</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
