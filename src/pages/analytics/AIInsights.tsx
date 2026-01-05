import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

export default function AIInsights() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          AI Insights
        </h1>
        <p className="text-muted-foreground mt-1">AI-powered business recommendations</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-chart-2/50">
          <CardContent className="p-6">
            <TrendingUp className="h-8 w-8 text-chart-2 mb-3" />
            <h3 className="font-semibold mb-2">Growth Opportunities</h3>
            <p className="text-sm text-muted-foreground">AI-identified areas for growth</p>
          </CardContent>
        </Card>
        <Card className="border-chart-4/50">
          <CardContent className="p-6">
            <AlertTriangle className="h-8 w-8 text-chart-4 mb-3" />
            <h3 className="font-semibold mb-2">Risk Alerts</h3>
            <p className="text-sm text-muted-foreground">Potential issues detected</p>
          </CardContent>
        </Card>
        <Card className="border-primary/50">
          <CardContent className="p-6">
            <Lightbulb className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Recommendations</h3>
            <p className="text-sm text-muted-foreground">Actionable suggestions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Insights</CardTitle>
          <CardDescription>AI-generated business intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No insights available yet</p>
            <p className="text-sm">Insights will appear as data is collected</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
