import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

export default function Proposals() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground mt-1">Create and manage sales proposals</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Proposal</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No proposals yet</p>
            <p className="text-sm">Create your first proposal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
