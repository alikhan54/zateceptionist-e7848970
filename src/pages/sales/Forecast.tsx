import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  LineChart, TrendingUp, TrendingDown, Calendar, Target, DollarSign,
  ArrowUpRight, ArrowDownRight, Sparkles, AlertTriangle, CheckCircle2,
  BarChart3, Layers, RefreshCw, Settings2, Download, Info
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, Line, Legend
} from 'recharts';

export default function Forecasting() {
  const [period, setPeriod] = useState<'monthly' | 'quarterly'>('monthly');
  const [activeTab, setActiveTab] = useState('overview');
  const [scenario, setScenario] = useState('baseline');
  const [winRateAdjustment, setWinRateAdjustment] = useState([0]);

  // Mock forecast data
  const monthlyForecast = [
    { month: 'Jan', actual: 285000, forecast: 280000, target: 300000, pipeline: 450000 },
    { month: 'Feb', actual: 312000, forecast: 305000, target: 300000, pipeline: 520000 },
    { month: 'Mar', actual: 298000, forecast: 310000, target: 320000, pipeline: 480000 },
    { month: 'Apr', actual: null, forecast: 325000, target: 320000, pipeline: 550000, predicted: true },
    { month: 'May', actual: null, forecast: 340000, target: 340000, pipeline: 580000, predicted: true },
    { month: 'Jun', actual: null, forecast: 355000, target: 350000, pipeline: 610000, predicted: true },
  ];

  const quarterlyForecast = [
    { quarter: 'Q1', actual: 895000, forecast: 895000, target: 920000 },
    { quarter: 'Q2', actual: null, forecast: 1020000, target: 1010000, predicted: true },
    { quarter: 'Q3', actual: null, forecast: 1150000, target: 1100000, predicted: true },
    { quarter: 'Q4', actual: null, forecast: 1280000, target: 1200000, predicted: true },
  ];

  const scenarioData = {
    pessimistic: { revenue: 980000, probability: 70 },
    baseline: { revenue: 1120000, probability: 85 },
    optimistic: { revenue: 1350000, probability: 60 },
  };

  const pipelineBreakdown = [
    { stage: 'Commit', value: 245000, probability: 90, color: '#10b981' },
    { stage: 'Best Case', value: 380000, probability: 75, color: '#3b82f6' },
    { stage: 'Pipeline', value: 520000, probability: 50, color: '#8b5cf6' },
    { stage: 'Upside', value: 280000, probability: 25, color: '#f59e0b' },
  ];

  const aiInsights = [
    { type: 'positive', text: 'Q2 forecast looks strong. 3 enterprise deals likely to close.', confidence: 85 },
    { type: 'warning', text: '2 deals at risk due to competitor activity. Consider intervention.', confidence: 72 },
    { type: 'opportunity', text: 'Historical data suggests May will exceed target by 8%.', confidence: 78 },
  ];

  const historicalAccuracy = [
    { period: 'Q4 2023', forecast: 850000, actual: 875000, accuracy: 97 },
    { period: 'Q1 2024', forecast: 920000, actual: 895000, accuracy: 97 },
  ];

  const summaryStats = {
    ytdActual: 895000,
    ytdTarget: 920000,
    yearForecast: 4345000,
    yearTarget: 4230000,
    pipelineCoverage: 2.1,
    avgWinRate: 32,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Sales Forecasting
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered revenue predictions and scenario modeling</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary">YTD</Badge>
            </div>
            <p className="text-2xl font-bold">${(summaryStats.ytdActual / 1000).toFixed(0)}K</p>
            <p className="text-sm text-muted-foreground">of ${(summaryStats.ytdTarget / 1000).toFixed(0)}K target</p>
            <Progress value={(summaryStats.ytdActual / summaryStats.ytdTarget) * 100} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <Badge className="bg-green-500">+2.7%</Badge>
            </div>
            <p className="text-2xl font-bold">${(summaryStats.yearForecast / 1000000).toFixed(2)}M</p>
            <p className="text-sm text-muted-foreground">Full Year Forecast</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.pipelineCoverage}x</p>
            <p className="text-sm text-muted-foreground">Pipeline Coverage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{summaryStats.avgWinRate}%</p>
            <p className="text-sm text-muted-foreground">Avg Win Rate</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Forecast Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Analysis</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Modeling</TabsTrigger>
          <TabsTrigger value="accuracy">Historical Accuracy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
                <CardDescription>Actual vs Forecast vs Target</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={period === 'monthly' ? monthlyForecast : quarterlyForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={period === 'monthly' ? 'month' : 'quarter'} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`}
                    />
                    <Legend />
                    <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line 
                      type="monotone" 
                      dataKey="forecast" 
                      name="Forecast" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      name="Target" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiInsights.map((insight, i) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-lg text-sm ${
                      insight.type === 'positive' ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' :
                      insight.type === 'warning' ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800' :
                      'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {insight.type === 'positive' ? (
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                      ) : insight.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-600" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mt-0.5 text-blue-600" />
                      )}
                      <div className="flex-1">
                        <span>{insight.text}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-muted-foreground">Confidence:</span>
                          <Progress value={insight.confidence} className="h-1 w-16" />
                          <span className="text-xs font-medium">{insight.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Breakdown</CardTitle>
                <CardDescription>Weighted pipeline by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pipelineBreakdown.map((item) => (
                    <div key={item.stage}>
                      <div className="flex justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-medium">{item.stage}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">${(item.value / 1000).toFixed(0)}K</span>
                          <span className="text-muted-foreground ml-2">({item.probability}%)</span>
                        </div>
                      </div>
                      <Progress 
                        value={item.probability} 
                        className="h-3"
                        style={{ 
                          '--progress-background': item.color 
                        } as React.CSSProperties}
                      />
                    </div>
                  ))}
                  <div className="pt-4 border-t mt-4">
                    <div className="flex justify-between">
                      <span className="font-medium">Weighted Pipeline</span>
                      <span className="text-xl font-bold text-green-600">
                        ${Math.round(pipelineBreakdown.reduce((sum, item) => 
                          sum + (item.value * item.probability / 100), 0
                        ) / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pipeline Coverage</CardTitle>
                <CardDescription>Pipeline to quota ratio by period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="pipeline" 
                      name="Pipeline" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="target" 
                      name="Target" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Scenario Cards */}
            {Object.entries(scenarioData).map(([key, data]) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-all ${scenario === key ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setScenario(key)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant={
                      key === 'pessimistic' ? 'destructive' :
                      key === 'baseline' ? 'default' : 'secondary'
                    }>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{data.probability}% likely</span>
                  </div>
                  <p className="text-3xl font-bold mb-2">
                    ${(data.revenue / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {key === 'pessimistic' ? 'Conservative estimate with risks' :
                     key === 'baseline' ? 'Most likely outcome' : 'Best case scenario'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Scenario Adjustments */}
          <Card>
            <CardHeader>
              <CardTitle>Scenario Adjustments</CardTitle>
              <CardDescription>Adjust variables to see impact on forecast</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Win Rate Adjustment</Label>
                      <span className="text-sm font-medium">{winRateAdjustment[0] > 0 ? '+' : ''}{winRateAdjustment[0]}%</span>
                    </div>
                    <Slider
                      value={winRateAdjustment}
                      onValueChange={setWinRateAdjustment}
                      min={-20}
                      max={20}
                      step={1}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Include At-Risk Deals</Label>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Factor Seasonality</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Adjusted Forecast</h4>
                  <p className="text-3xl font-bold text-green-600 mb-2">
                    ${((scenarioData[scenario as keyof typeof scenarioData].revenue * (100 + winRateAdjustment[0]) / 100) / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {winRateAdjustment[0] !== 0 && (
                      <>
                        {winRateAdjustment[0] > 0 ? '+' : ''}
                        ${(scenarioData[scenario as keyof typeof scenarioData].revenue * winRateAdjustment[0] / 100 / 1000).toFixed(0)}K from baseline
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accuracy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historical Forecast Accuracy</CardTitle>
              <CardDescription>How accurate have our forecasts been?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historicalAccuracy.map((period) => (
                  <div key={period.period} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{period.period}</p>
                        <p className="text-sm text-muted-foreground">
                          Forecast: ${(period.forecast / 1000).toFixed(0)}K | 
                          Actual: ${(period.actual / 1000).toFixed(0)}K
                        </p>
                      </div>
                      <Badge className={period.accuracy >= 95 ? 'bg-green-500' : 'bg-yellow-500'}>
                        {period.accuracy}% Accurate
                      </Badge>
                    </div>
                    <Progress value={period.accuracy} className="h-2" />
                  </div>
                ))}
                
                <div className="p-4 bg-muted/50 rounded-lg mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Forecast Model Performance</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Our AI forecast model has maintained 97% average accuracy over the past 6 months. 
                    The model factors in deal stage, historical conversion rates, seasonality, and rep performance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
