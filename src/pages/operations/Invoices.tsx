import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, Plus, DollarSign, Send } from 'lucide-react';

export default function Invoices() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">Create and manage invoices</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-chart-4">$0</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-chart-2">$0</p>
            <p className="text-sm text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">$0</p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No invoices yet</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
