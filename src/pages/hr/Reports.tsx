import { useState, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useEmployees, useDepartments, useAttendance, useLeaveRequests } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart3,
  Download,
  Users,
  TrendingDown,
  PieChart,
  Calendar as CalendarIcon,
  FileText,
  Clock,
  Building2,
  DollarSign,
  Award
} from 'lucide-react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportsPage() {
  const { t } = useTenant();
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: leaveData } = useLeaveRequests();
  const [selectedReport, setSelectedReport] = useState('headcount');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [department, setDepartment] = useState('all');

  const employeeList = employees || [];
  const departmentList = departments || [];
  const leaveRequests = leaveData || [];

  const reportTypes = [
    { id: 'headcount', label: 'Headcount Report', icon: Users, description: 'Employee count by department and time' },
    { id: 'turnover', label: 'Turnover Analysis', icon: TrendingDown, description: 'Attrition rates and reasons' },
    { id: 'attendance', label: 'Attendance Summary', icon: Clock, description: 'Attendance patterns and trends' },
    { id: 'leave', label: 'Leave Utilization', icon: CalendarIcon, description: 'Leave usage by type and department' },
    { id: 'payroll', label: 'Payroll Summary', icon: DollarSign, description: 'Compensation distribution' },
    { id: 'diversity', label: 'Diversity Report', icon: PieChart, description: 'Workforce demographics' },
    { id: 'performance', label: 'Performance Distribution', icon: Award, description: 'Rating distribution analysis' },
  ];

  // Computed chart data from real hooks
  const headcountData = useMemo(() => {
    if (departmentList.length === 0) return [];
    return departmentList.map(d => ({ name: d.name, count: d.employee_count || 0 }));
  }, [departmentList]);

  const leaveUtilData = useMemo(() => {
    if (leaveRequests.length === 0) return [];
    const byType: Record<string, number> = {};
    leaveRequests.forEach(lr => {
      const t = lr.leave_type || 'other';
      byType[t] = (byType[t] || 0) + (lr.requested_days || 1);
    });
    return Object.entries(byType).map(([name, days]) => ({ name, days }));
  }, [leaveRequests]);

  const emptyChart = (message: string) => (
    <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
      <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
      <p>{message}</p>
      <p className="text-sm mt-1">Add employees and data to populate this report</p>
    </div>
  );

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px'
  };

  const renderChart = () => {
    switch (selectedReport) {
      case 'headcount':
        return headcountData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={headcountData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : emptyChart('No department headcount data yet');
      case 'leave':
        return leaveUtilData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={leaveUtilData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="days" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : emptyChart('No leave utilization data yet');
      default:
        return emptyChart('No data available for this report yet');
    }
  };

  const avgTenure = useMemo(() => {
    if (employeeList.length === 0) return '-';
    const now = new Date();
    const tenures = employeeList
      .filter(e => e.date_of_joining)
      .map(e => differenceInYears(now, parseISO(e.date_of_joining)));
    if (tenures.length === 0) return '-';
    const avg = tenures.reduce((a, b) => a + b, 0) / tenures.length;
    return `${avg.toFixed(1)} yrs`;
  }, [employeeList]);

  const terminatedCount = useMemo(() => {
    return employeeList.filter(e => e.employment_status === 'terminated').length;
  }, [employeeList]);

  const turnoverRate = useMemo(() => {
    if (employeeList.length === 0) return '0%';
    return `${((terminatedCount / employeeList.length) * 100).toFixed(1)}%`;
  }, [employeeList, terminatedCount]);

  const stats = [
    { label: 'Total Headcount', value: String(employeeList.length), icon: Users },
    { label: 'Turnover Rate', value: turnoverRate, icon: TrendingDown },
    { label: 'Avg Tenure', value: avgTenure, icon: Clock },
    { label: 'Departments', value: String(departmentList.length), icon: Building2 },
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
                  {departmentList.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
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
