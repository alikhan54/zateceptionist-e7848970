import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, TrendingUp, Calendar } from 'lucide-react';

export default function Forecasting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Forecasting</h1>
        <p className="text-muted-foreground mt-1">AI-powered revenue predictions</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-chart-2 mb-2" />
            <p className="text-2xl font-bold">$0</p>
            <p className="text-sm text-muted-foreground">Predicted Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <Calendar className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">Q1 2024</p>
            <p className="text-sm text-muted-foreground">Forecast Period</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <LineChart className="h-8 w-8 mx-auto text-chart-4 mb-2" />
            <p className="text-2xl font-bold">85%</p>
            <p className="text-sm text-muted-foreground">Confidence Score</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast</CardTitle>
          <CardDescription>Projected revenue for the next 12 months</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center text-muted-foreground">
          <LineChart className="h-16 w-16 opacity-50" />
        </CardContent>
      </Card>
    </div>
  );
}
