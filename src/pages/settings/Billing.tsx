import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Check, DollarSign, Receipt } from 'lucide-react';

export default function BillingSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your subscription and payments</p>
      </div>

      <Card className="border-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your active subscription</CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">Free</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-chart-2" />
              <span>Basic features</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-chart-2" />
              <span>Up to 3 team members</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-chart-2" />
              <span>1,000 API calls/month</span>
            </div>
          </div>
          <Button className="mt-4">Upgrade Plan</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payment method on file</p>
            <Button variant="outline" size="sm" className="mt-2">Add Payment Method</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>Your past invoices and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No billing history</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
