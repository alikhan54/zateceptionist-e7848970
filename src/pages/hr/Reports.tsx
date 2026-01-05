import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useHRReports } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3, 
  Download,
  Users,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  Building2,
  DollarSign,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';

export default function ReportsPage() {
  const { t } = useTenant();
  const { fetchReport } = useHRReports();
  const [selectedReport, setSelectedReport] = useState('headcount');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [department, setDepartment] = useState('all');

  const reportTypes = [
    { id: 'headcount', label: 'Headcount Report', icon: Users, description: 'Employee count by department and time' },
    { id: 'turnover', label: 'Turnover Analysis', icon: TrendingDown, description: 'Attrition rates and reasons' },
    { id: 'attendance', label: 'Attendance Summary', icon: Clock, description: 'Attendance patterns and trends' },
    { id: 'leave', label: 'Leave Utilization', icon: CalendarIcon, description: 'Leave usage by type and department' },
    { id: 'payroll', label: 'Payroll Summary', icon: DollarSign, description: 'Compensation distribution' },
    { id: 'diversity', label: 'Diversity Report', icon: PieChart, description: 'Workforce demographics' },
    { id: 'performance', label: 'Performance Distribution', icon: Award, description: 'Rating distribution analysis' },
  ];

  // Mock chart data
  const headcountData = [
    { name: 'Engineering', count: 45, growth: 12 },
    { name: 'Sales', count: 30, growth: 5 },
    { name: 'Marketing', count: 20, growth: 8 },
    { name: 'HR', count: 10, growth: 2 },
    { name: 'Finance', count: 15, growth: 3 },
    { name: 'Operations', count: 25, growth: 6 },
  ];

  const turnoverData = [
    { month: 'Jan', hired: 8, left: 3 },
    { month: 'Feb', hired: 5, left: 2 },
    { month: 'Mar', hired: 12, left: 4 },
    { month: 'Apr', hired: 6, left: 5 },
    { month: 'May', hired: 10, left: 3 },
    { month: 'Jun', hired: 8, left: 2 },
  ];

  const diversityData = [
    { name: 'Male', value: 55, color: 'hsl(var(--chart-1))' },
    { name: 'Female', value: 42, color: 'hsl(var(--chart-2))' },
    { name: 'Other', value: 3, color: 'hsl(var(--chart-3))' },
  ];

  const attendanceData = [
    { week: 'Week 1', present: 95, absent: 3, late: 2 },
    { week: 'Week 2', present: 92, absent: 5, late: 3 },
    { week: 'Week 3', present: 96, absent: 2, late: 2 },
    { week: 'Week 4', present: 94, absent: 4, late: 2 },
  ];

  const renderChart = () => {
    switch (selectedReport) {
      case 'headcount':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={headcountData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'turnover':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={turnoverData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="hired" stroke="hsl(var(--chart-2))" strokeWidth={2} />
              <Line type="monotone" dataKey="left" stroke="hsl(var(--destructive))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'diversity':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <RechartsPie>
              <Pie
                data={diversityData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {diversityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
        );
      case 'attendance':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }} 
              />
              <Legend />
              <Bar dataKey="present" stackId="a" fill="hsl(var(--chart-2))" />
              <Bar dataKey="late" stackId="a" fill="hsl(var(--chart-4))" />
              <Bar dataKey="absent" stackId="a" fill="hsl(var(--destructive))" />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            Select a report type to view data
          </div>
        );
    }
  };

  const stats = [
    { label: 'Total Headcount', value: '145', change: '+8%', trend: 'up', icon: Users },
    { label: 'Turnover Rate', value: '4.2%', change: '-1.5%', trend: 'down', icon: TrendingDown },
    { label: 'Avg Tenure', value: '2.4 yrs', change: '+0.3', trend: 'up', icon: Clock },
    { label: 'Open Positions', value: '12', change: '+4', trend: 'up', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">HR Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and insights for workforce management
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className={cn(
                    'text-xs flex items-center gap-1 mt-1',
                    stat.trend === 'up' ? 'text-chart-2' : 'text-destructive'
                  )}>
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Selection and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Report Type</Label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      <div className="flex items-center gap-2">
                        <report.icon className="h-4 w-4" />
                        {report.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[240px] justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      'Select date range'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button>Generate Report</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {reportTypes.find(r => r.id === selectedReport)?.label || 'Report'}
          </CardTitle>
          <CardDescription>
            {reportTypes.find(r => r.id === selectedReport)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Report Types Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.slice(0, 4).map((report) => (
          <Card 
            key={report.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              selectedReport === report.id && 'ring-2 ring-primary'
            )}
            onClick={() => setSelectedReport(report.id)}
          >
            <CardContent className="p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <report.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">{report.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>Automated report delivery settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Weekly Headcount Report</p>
                  <p className="text-sm text-muted-foreground">Every Monday at 9:00 AM</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="font-medium">Monthly Payroll Summary</p>
                  <p className="text-sm text-muted-foreground">1st of every month</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4">
            <FileText className="h-4 w-4 mr-2" />
            Schedule New Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
