import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Filter } from 'lucide-react';

export default function LeadPipeline() {
  const stages = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground mt-1">Manage your sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filter</Button>
          <Button><Plus className="h-4 w-4 mr-2" />Add Lead</Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4 overflow-x-auto">
        {stages.map((stage) => (
          <Card key={stage} className="min-w-[250px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stage}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No leads in this stage</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
