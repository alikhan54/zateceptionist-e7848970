import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Target,
  Users, Calendar, ArrowUpRight, ArrowDownRight, Trophy, Clock,
  CheckCircle2, XCircle, Filter, Briefcase
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, FunnelChart, Funnel, LabelList
} from 'recharts';

export default function SalesAnalytics() {
  const [dateRange, setDateRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('revenue');

  // Mock data
  const revenueData = [
    { month: 'Jan', revenue: 45000, target: 50000 },
    { month: 'Feb', revenue: 52000, target: 50000 },
    { month: 'Mar', revenue: 48000, target: 55000 },
    { month: 'Apr', revenue: 61000, target: 55000 },
    { month: 'May', revenue: 55000, target: 60000 },
    { month: 'Jun', revenue: 67000, target: 60000 },
  ];

  const sourceData = [
    { name: 'Website', value: 35, color: '#3b82f6' },
    { name: 'Referral', value: 25, color: '#10b981' },
    { name: 'Outbound', value: 20, color: '#8b5cf6' },
    { name: 'Events', value: 12, color: '#f59e0b' },
    { name: 'Partners', value: 8, color: '#ef4444' },
  ];

  const funnelData = [
    { stage: 'Leads', value: 1000, fill: '#3b82f6' },
    { stage: 'Qualified', value: 450, fill: '#6366f1' },
    { stage: 'Proposal', value: 180, fill: '#8b5cf6' },
    { stage: 'Negotiation', value: 80, fill: '#a855f7' },
    { stage: 'Won', value: 35, fill: '#10b981' },
  ];

  const repPerformance = [
    { name: 'Sarah Johnson', deals: 24, revenue: 285000, quota: 250000, avatar: '' },
    { name: 'Mike Chen', deals: 18, revenue: 198000, quota: 200000, avatar: '' },
    { name: 'Emily Davis', deals: 15, revenue: 165000, quota: 180000, avatar: '' },
    { name: 'Alex Thompson', deals: 12, revenue: 142000, quota: 150000, avatar: '' },
    { name: 'Jordan Lee', deals: 10, revenue: 118000, quota: 150000, avatar: '' },
  ];

  const winLossData = [
    { reason: 'Price too high', count: 15, type: 'loss' },
    { reason: 'Competitor chosen', count: 12, type: 'loss' },
    { reason: 'Budget constraints', count: 8, type: 'loss' },
    { reason: 'Product fit', count: 25, type: 'win' },
    { reason: 'Relationship', count: 18, type: 'win' },
    { reason: 'Pricing', count: 12, type: 'win' },
  ];

  const cycleData = [
    { stage: 'Lead', avgDays: 3 },
    { stage: 'Qualified', avgDays: 7 },
    { stage: 'Proposal', avgDays: 12 },
    { stage: 'Negotiation', avgDays: 8 },
    { stage: 'Closed', avgDays: 5 },
  ];

  const productMix = [
    { product: 'Enterprise', revenue: 185000, deals: 12 },
    { product: 'Professional', revenue: 124000, deals: 28 },
    { product: 'Starter', revenue: 45000, deals: 45 },
    { product: 'Add-ons', revenue: 32000, deals: 85 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep insights into your sales performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Total Revenue', value: '$386,000', change: '+12.5%', trend: 'up', icon: DollarSign },
          { title: 'Deals Won', value: '55', change: '+8', trend: 'up', icon: Trophy },
          { title: 'Win Rate', value: '32%', change: '-2.1%', trend: 'down', icon: Target },
          { title: 'Avg Deal Size', value: '$7,018', change: '+5.2%', trend: 'up', icon: Briefcase },
          { title: 'Sales Cycle', value: '35 days', change: '-3 days', trend: 'up', icon: Clock },
        ].map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className="h-5 w-5 text-muted-foreground" />
                <Badge variant={kpi.trend === 'up' ? 'default' : 'destructive'} className="text-xs">
                  {kpi.trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {kpi.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="performance">Rep Performance</TabsTrigger>
          <TabsTrigger value="winloss">Win/Loss</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue vs Target */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Target</CardTitle>
                <CardDescription>Monthly comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Target" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Source */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Source</CardTitle>
                <CardDescription>Lead source contribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Cumulative revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.2} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6 space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Lead to customer journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {funnelData.map((stage, i) => (
                    <div key={stage.stage}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{stage.stage}</span>
                        <span className="font-medium">{stage.value}</span>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={(stage.value / funnelData[0].value) * 100} 
                          className="h-8"
                        />
                        {i < funnelData.length - 1 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {Math.round((funnelData[i + 1].value / stage.value) * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sales Cycle */}
            <Card>
              <CardHeader>
                <CardTitle>Average Sales Cycle</CardTitle>
                <CardDescription>Days spent in each stage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cycleData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" />
                    <Tooltip />
                    <Bar dataKey="avgDays" name="Avg Days" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Rep Performance</CardTitle>
              <CardDescription>Individual performance against quota</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {repPerformance.map((rep, i) => (
                  <div key={rep.name} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-4 mb-3">
                      <span className={`text-lg font-bold w-6 ${
                        i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        #{i + 1}
                      </span>
                      <Avatar>
                        <AvatarImage src={rep.avatar} />
                        <AvatarFallback>{rep.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{rep.name}</p>
                        <p className="text-sm text-muted-foreground">{rep.deals} deals closed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">${(rep.revenue / 1000).toFixed(0)}K</p>
                        <p className="text-sm text-muted-foreground">of ${(rep.quota / 1000).toFixed(0)}K quota</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Quota Attainment</span>
                        <span className={`font-medium ${rep.revenue >= rep.quota ? 'text-green-600' : 'text-orange-500'}`}>
                          {Math.round((rep.revenue / rep.quota) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min((rep.revenue / rep.quota) * 100, 100)} 
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="winloss" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Win Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {winLossData.filter(d => d.type === 'win').map(item => (
                    <div key={item.reason} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.reason}</p>
                        <Progress value={(item.count / 25) * 100} className="h-2 mt-1" />
                      </div>
                      <span className="text-sm font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Loss Reasons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {winLossData.filter(d => d.type === 'loss').map(item => (
                    <div key={item.reason} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.reason}</p>
                        <Progress value={(item.count / 15) * 100} className="h-2 mt-1 [&>div]:bg-red-500" />
                      </div>
                      <span className="text-sm font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Mix Analysis</CardTitle>
              <CardDescription>Revenue and deals by product</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productMix}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product" />
                  <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="deals" name="Deals" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
