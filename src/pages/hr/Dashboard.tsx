import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useEmployees, useLeaveRequests, useAttendance, useDepartments } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserCheck, 
  CalendarDays, 
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Plus,
  DollarSign,
  Building2,
  Cake,
  Award,
  Activity,
  Sparkles,
  FileText,
  Bell,
  UserPlus,
  Timer,
  Heart
} from 'lucide-react';
import { format, addDays, differenceInDays, isToday, isTomorrow, isWithinInterval } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  AreaChart,
  Area
} from 'recharts';

// Mock data for visualization
const departmentDistribution = [
  { name: 'Engineering', value: 45, color: 'hsl(var(--chart-1))' },
  { name: 'Sales', value: 28, color: 'hsl(var(--chart-2))' },
  { name: 'Marketing', value: 18, color: 'hsl(var(--chart-3))' },
  { name: 'HR', value: 8, color: 'hsl(var(--chart-4))' },
  { name: 'Finance', value: 12, color: 'hsl(var(--chart-5))' },
];

const attendanceTrend = [
  { day: 'Mon', present: 95, late: 3, absent: 2 },
  { day: 'Tue', present: 92, late: 5, absent: 3 },
  { day: 'Wed', present: 88, late: 4, absent: 8 },
  { day: 'Thu', present: 94, late: 2, absent: 4 },
  { day: 'Fri', present: 85, late: 5, absent: 10 },
];

const employmentTypeData = [
  { name: 'Full-time', value: 78 },
  { name: 'Part-time', value: 12 },
  { name: 'Contract', value: 8 },
  { name: 'Intern', value: 2 },
];

const upcomingEvents = [
  { id: '1', type: 'birthday', name: 'Sarah Johnson', date: new Date(), department: 'Engineering' },
  { id: '2', type: 'anniversary', name: 'Mike Chen', date: addDays(new Date(), 2), years: 5, department: 'Sales' },
  { id: '3', type: 'birthday', name: 'Emily Davis', date: addDays(new Date(), 3), department: 'Marketing' },
  { id: '4', type: 'probation', name: 'David Kim', date: addDays(new Date(), 5), department: 'Engineering' },
  { id: '5', type: 'anniversary', name: 'Lisa Wang', date: addDays(new Date(), 7), years: 3, department: 'HR' },
];

const recentActivity = [
  { id: '1', action: 'New employee onboarded', user: 'Alex Martinez', time: '2 hours ago', type: 'hire' },
  { id: '2', action: 'Leave request approved', user: 'Sarah Johnson', time: '3 hours ago', type: 'leave' },
  { id: '3', action: 'Performance review completed', user: 'Mike Chen', time: '5 hours ago', type: 'performance' },
  { id: '4', action: 'Training enrolled', user: 'Emily Davis', time: 'Yesterday', type: 'training' },
  { id: '5', action: 'Document uploaded', user: 'HR Admin', time: 'Yesterday', type: 'document' },
];

const pendingApprovals = [
  { id: '1', type: 'Leave Request', employee: 'John Smith', days: 3, submitted: '2 days ago' },
  { id: '2', type: 'Expense Claim', employee: 'Sarah Chen', amount: '$450', submitted: 'Yesterday' },
  { id: '3', type: 'Training Request', employee: 'Mike Johnson', course: 'AWS Certification', submitted: '1 day ago' },
];

const aiAlerts = [
  { id: '1', type: 'attrition', severity: 'high', message: '3 employees showing high attrition risk signals', action: 'View Details' },
  { id: '2', type: 'compliance', severity: 'medium', message: '5 certifications expiring in the next 30 days', action: 'Review' },
  { id: '3', type: 'performance', severity: 'low', message: '12 performance reviews pending completion', action: 'Send Reminder' },
];

export default function HRDashboardPage() {
  const { tenantConfig, tenantId, t } = useTenant();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: leaveRequests } = useLeaveRequests('pending');
  const { data: attendance } = useAttendance();
  const { data: departments } = useDepartments();

  // Check feature flag
  if (!tenantConfig?.features?.hr_module) {
    return <Navigate to="/" replace />;
  }

  const mockStats = {
    totalEmployees: 156,
    activeToday: 142,
    onLeave: 8,
    openPositions: 12,
    pendingApprovals: 7,
    newHires: 5,
    attritionRate: 4.2,
    avgTenure: 3.2
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Cake className="h-4 w-4 text-pink-500" />;
      case 'anniversary': return <Award className="h-4 w-4 text-amber-500" />;
      case 'probation': return <Timer className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'hire': return <UserPlus className="h-4 w-4 text-chart-2" />;
      case 'leave': return <CalendarDays className="h-4 w-4 text-chart-3" />;
      case 'performance': return <TrendingUp className="h-4 w-4 text-chart-4" />;
      case 'training': return <Award className="h-4 w-4 text-primary" />;
      case 'document': return <FileText className="h-4 w-4 text-muted-foreground" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'medium': return 'text-chart-4 bg-chart-4/10 border-chart-4/20';
      case 'low': return 'text-chart-3 bg-chart-3/10 border-chart-3/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            HR Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your workforce with AI-powered insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/hr/employees">
              <Users className="h-4 w-4 mr-2" />
              View All {t('staffs')}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/hr/employees">
              <Plus className="h-4 w-4 mr-2" />
              Add {t('staff')}
            </Link>
          </Button>
        </div>
      </div>

      {/* AI Alerts Banner */}
      {aiAlerts.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI-Powered Insights</h3>
                <p className="text-sm text-muted-foreground">Proactive alerts requiring attention</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {aiAlerts.map((alert) => (
                <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    <Button variant="link" size="sm" className="h-auto p-0 mt-1">
                      {alert.action} <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {t('staffs')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalEmployees}</div>
            <p className="text-xs text-chart-2">
              +{mockStats.newHires} new this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeToday}</div>
            <Progress value={(mockStats.activeToday / mockStats.totalEmployees) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.onLeave}</div>
            <p className="text-xs text-muted-foreground">
              {(leaveRequests?.length || 3)} pending requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.openPositions}</div>
            <p className="text-xs text-chart-4">
              45 active candidates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4">{mockStats.pendingApprovals}</div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              Review now <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Employee Distribution</CardTitle>
                <CardDescription>By department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {departmentDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {departmentDistribution.slice(0, 4).map((dept, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="text-xs text-muted-foreground">{dept.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Events</CardTitle>
                <CardDescription>Birthdays, anniversaries & more</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{event.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.type === 'anniversary' ? `${event.years} year anniversary` : event.type}
                            {' • '}{event.department}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">
                            {isToday(event.date) ? 'Today' : isTomorrow(event.date) ? 'Tomorrow' : format(event.date, 'MMM d')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest HR actions</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.user}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals & Leave Calendar Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pending Approvals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Pending Approvals</CardTitle>
                  <CardDescription>Items requiring your action</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-chart-4/10 text-chart-4">
                  {pendingApprovals.length}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingApprovals.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {item.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{item.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.employee} • {item.submitted}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">Reject</Button>
                        <Button size="sm">Approve</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="w-full mt-4" asChild>
                  <Link to="/hr/leave">
                    View all pending requests <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Leave Calendar Mini */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Leave</CardTitle>
                <CardDescription>Who's out today and this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-3xl font-bold">8</p>
                      <p className="text-sm text-muted-foreground">Employees on leave today</p>
                    </div>
                    <CalendarDays className="h-10 w-10 text-primary opacity-50" />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Currently out:</p>
                    <div className="flex flex-wrap gap-2">
                      {['Sarah J.', 'Mike C.', 'Emily D.', 'John S.'].map((name, i) => (
                        <Badge key={i} variant="secondary">{name}</Badge>
                      ))}
                      <Badge variant="outline">+4 more</Badge>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/hr/leave">
                      View Leave Calendar <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-chart-2/5 border-chart-2/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">142</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-chart-2/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">6</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-destructive/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-chart-4/5 border-chart-4/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">5</p>
                    <p className="text-sm text-muted-foreground">Late</p>
                  </div>
                  <Clock className="h-8 w-8 text-chart-4/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-chart-3/5 border-chart-3/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-sm text-muted-foreground">On Leave</p>
                  </div>
                  <CalendarDays className="h-8 w-8 text-chart-3/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Attendance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceTrend}>
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="present" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Employment Type Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employmentTypeData.map((type, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{type.name}</span>
                        <span className="font-medium">{type.value}%</span>
                      </div>
                      <Progress value={type.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-chart-2">{mockStats.attritionRate}%</p>
                    <p className="text-sm text-muted-foreground">Attrition Rate</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-primary">{mockStats.avgTenure}y</p>
                    <p className="text-sm text-muted-foreground">Avg Tenure</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-chart-3">92%</p>
                    <p className="text-sm text-muted-foreground">Engagement Score</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-chart-4">4.2</p>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[
              { icon: UserPlus, label: `Add ${t('staff')}`, description: 'Onboard new team member', href: '/hr/employees' } as const,
              { icon: CheckCircle2, label: 'Approve Leave', description: 'Review pending requests', href: '/hr/leave' },
              { icon: DollarSign, label: 'Run Payroll', description: 'Process monthly payroll', href: '/hr/payroll' },
              { icon: Award, label: 'Start Review', description: 'Initiate performance review', href: '/hr/performance' },
              { icon: FileText, label: 'Upload Document', description: 'Add policy or template', href: '/hr/documents' },
              { icon: Briefcase, label: 'Post Job', description: 'Create job posting', href: '/hr/recruitment' },
              { icon: Heart, label: 'Add Benefit', description: 'Configure benefits', href: '/hr/employees' },
              { icon: Activity, label: 'View Reports', description: 'Generate HR reports', href: '/hr/reports' },
            ].map((action, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <Link to={action.href} className="block">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <action.icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium">{action.label}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Industry-specific widgets */}
      {tenantConfig?.industry === 'healthcare' && (
        <Card className="border-chart-4/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-chart-4" />
              Healthcare Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-chart-4/5 rounded-lg">
                <p className="text-2xl font-bold">5</p>
                <p className="text-sm text-muted-foreground">Certifications expiring soon</p>
              </div>
              <div className="p-4 bg-chart-2/5 rounded-lg">
                <p className="text-2xl font-bold">98%</p>
                <p className="text-sm text-muted-foreground">HIPAA training completion</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">License renewals due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
