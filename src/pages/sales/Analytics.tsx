import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Download } from 'lucide-react';

export default function SalesAnalytics() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-muted-foreground mt-1">Insights into your sales performance</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 opacity-50" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 opacity-50" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
