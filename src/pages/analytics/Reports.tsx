import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart2, Plus, Download } from 'lucide-react';

export default function CustomReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground mt-1">Build custom analytics reports</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Report</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Reports</CardTitle>
          <CardDescription>Saved custom reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No custom reports created</p>
            <p className="text-sm">Create your first custom report</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
