import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, Plus, DollarSign } from 'lucide-react';

export default function Expenses() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track business expenses</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-2xl font-bold">$0</p>
            <p className="text-sm text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Receipt className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">0</p>
            <p className="text-sm text-muted-foreground">Total Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto text-chart-4 mb-2" />
            <p className="text-2xl font-bold">$0</p>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No expenses recorded</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
