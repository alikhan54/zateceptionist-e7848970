import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useEmployees, useLeaveRequests, useAttendance, useDepartments } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedNumber } from '@/components/hr/AnimatedNumber';
import { 
  Users, UserCheck, CalendarDays, Briefcase, AlertTriangle, Clock, CheckCircle2, 
  TrendingUp, ArrowRight, Plus, DollarSign, Building2, Award, Activity, Sparkles,
  FileText, Bell, UserPlus, Heart, MapPin, Bot, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';

export default function HRDashboardPage() {
  const { tenantConfig, tenantId, t } = useTenant();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: leaveRequests } = useLeaveRequests('pending');
  const { data: attendance } = useAttendance();
  const { data: departments } = useDepartments();

  const { isEnabled } = useFeatureFlags();
  if (!isEnabled('hr_module')) {
    return <Navigate to="/dashboard" replace />;
  }

  const stats = {
    totalEmployees: employees?.length || 0,
    activeToday: attendance?.summary?.present || 0,
    onLeave: attendance?.summary?.on_leave || 0,
    openPositions: 0,
    pendingApprovals: leaveRequests?.length || 0,
    newHires: employees?.filter(e => {
      if (!e.date_of_joining) return false;
      const joinDate = new Date(e.date_of_joining);
      const now = new Date();
      return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    }).length || 0,
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting} 👋
          </h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {stats.pendingApprovals > 0 
              ? `${stats.pendingApprovals} leave requests need your attention today`
              : 'All clear — your team is running smoothly'}
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

      {/* KPI Cards with Animated Counters */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="group hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {t('staffs')}</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <AnimatedNumber value={stats.totalEmployees} />
            </div>
            <p className="text-xs text-chart-2 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +{stats.newHires} new this month
            </p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-chart-2/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-2">
              <AnimatedNumber value={stats.activeToday} />
            </div>
            {stats.totalEmployees > 0 && (
              <Progress value={(stats.activeToday / stats.totalEmployees) * 100} className="h-1.5 mt-2" />
            )}
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <AnimatedNumber value={stats.onLeave} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingApprovals} pending requests
            </p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-chart-4/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-chart-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              <AnimatedNumber value={departments?.length || 0} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active divisions</p>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-all duration-300 border-chart-4/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-chart-4/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-chart-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-chart-4">
              <AnimatedNumber value={stats.pendingApprovals} />
            </div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link to="/hr/leave">
                Review now <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content + Quick Actions sidebar */}
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Department Distribution */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Employee Distribution</CardTitle>
                    <CardDescription>By department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {departments && departments.length > 0 ? (
                      <div className="space-y-3">
                        {departments.map((dept, i) => {
                          const colors = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
                          const maxCount = Math.max(...departments.map(d => d.employee_count || 0), 1);
                          return (
                            <div key={dept.id} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{dept.name}</span>
                                <Badge variant="secondary">{dept.employee_count || 0}</Badge>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-1000 ${colors[i % colors.length]}`}
                                  style={{ width: `${((dept.employee_count || 0) / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No department data yet</p>
                        <Button variant="outline" size="sm" className="mt-3" asChild>
                          <Link to="/hr/departments">Create Department</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Employees */}
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Team Members</CardTitle>
                    <CardDescription>Latest additions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {employees && employees.length > 0 ? (
                      <ScrollArea className="h-[280px] pr-4">
                        <div className="space-y-2">
                          {employees.slice(0, 6).map((emp) => (
                            <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                              <div className="relative">
                                <Avatar className="h-10 w-10 ring-2 ring-background">
                                  <AvatarImage src={emp.profile_picture_url || undefined} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                {emp.employment_status === 'active' && (
                                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-chart-2 border-2 border-background" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {emp.position} • {emp.department_name || 'Unassigned'}
                                </p>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No employees yet</p>
                        <Button variant="outline" size="sm" className="mt-3" asChild>
                          <Link to="/hr/employees">Add First Employee</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Pending Approvals */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Pending Approvals
                    {(leaveRequests?.length || 0) > 0 && (
                      <Badge variant="destructive" className="animate-pulse">{leaveRequests?.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Items requiring your action</CardDescription>
                </CardHeader>
                <CardContent>
                  {leaveRequests && leaveRequests.length > 0 ? (
                    <div className="space-y-3">
                      {leaveRequests.slice(0, 5).map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-chart-4/10 text-chart-4 text-xs">
                                {(req.employee_name || 'E')[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{req.employee_name || 'Employee'}</p>
                              <p className="text-xs text-muted-foreground">
                                {req.leave_type} • {req.requested_days} day{(req.requested_days || 0) > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/20">
                            <Clock className="h-3 w-3 mr-1" />
                            pending
                          </Badge>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full" asChild>
                        <Link to="/hr/leave">View All Requests</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-10 w-10 mx-auto text-chart-2/50 mb-3" />
                      <p className="text-sm text-muted-foreground">All caught up! No pending approvals.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: 'Present', value: attendance?.summary?.present || 0, icon: CheckCircle2, color: 'chart-2' },
                  { label: 'Absent', value: attendance?.summary?.absent || 0, icon: AlertTriangle, color: 'destructive' },
                  { label: 'Late', value: attendance?.summary?.late || 0, icon: Clock, color: 'chart-4' },
                  { label: 'On Leave', value: attendance?.summary?.on_leave || 0, icon: CalendarDays, color: 'chart-3' },
                ].map((s) => (
                  <Card key={s.label} className={`bg-${s.color}/5 border-${s.color}/20 hover:shadow-md transition-shadow`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold"><AnimatedNumber value={s.value} /></p>
                          <p className="text-sm text-muted-foreground">{s.label}</p>
                        </div>
                        <s.icon className={`h-8 w-8 text-${s.color}/50`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle>Today's Records</CardTitle></CardHeader>
                <CardContent>
                  {attendance?.records && attendance.records.length > 0 ? (
                    <div className="space-y-2">
                      {attendance.records.slice(0, 10).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <span className="font-medium text-sm">{record.employee_name}</span>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{record.check_in_time || '-'}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>{record.check_out_time || '-'}</span>
                            <Badge variant="outline">{record.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No attendance data for today</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader><CardTitle>Workforce Overview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Total Headcount', value: stats.totalEmployees, color: 'text-primary' },
                        { label: 'New This Month', value: stats.newHires, color: 'text-chart-4' },
                        { label: 'Departments', value: departments?.length || 0, color: 'text-chart-3' },
                        { label: 'Active Today', value: stats.activeToday, color: 'text-chart-2' },
                      ].map((item) => (
                        <div key={item.label} className="p-4 bg-muted/50 rounded-lg text-center hover:bg-muted transition-colors">
                          <p className={`text-3xl font-bold ${item.color}`}>
                            <AnimatedNumber value={item.value} />
                          </p>
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader><CardTitle>Department Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    {departments && departments.length > 0 ? (
                      <div className="space-y-3">
                        {departments.map((dept) => {
                          const maxCount = Math.max(...departments.map(d => d.employee_count || 0), 1);
                          const percentage = ((dept.employee_count || 0) / maxCount) * 100;
                          return (
                            <div key={dept.id} className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span>{dept.name}</span>
                                <span className="font-medium">{dept.employee_count || 0}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No department data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-4">
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <TooltipProvider>
                {[
                  { icon: MapPin, label: 'Check In', description: 'Record attendance', href: '/hr/attendance' },
                  { icon: CalendarDays, label: 'Request Leave', description: 'Submit time off', href: '/hr/leave' },
                  { icon: DollarSign, label: 'Run Payroll', description: 'Process payments', href: '/hr/payroll' },
                  { icon: Bot, label: 'AI Assistant', description: 'Ask HR questions', href: '/hr/ai-assistant' },
                  { icon: ShieldCheck, label: 'Compliance', description: 'Check status', href: '/hr/compliance' },
                  { icon: Award, label: 'Performance', description: 'Reviews & goals', href: '/hr/performance' },
                ].map((action) => (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-auto py-3 hover:bg-primary/10 transition-colors"
                        asChild
                      >
                        <Link to={action.href}>
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <action.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium">{action.label}</p>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">{action.description}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Live Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-2" />
                Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(leaveRequests?.length || 0) > 0 || (employees?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {leaveRequests?.slice(0, 3).map((req) => (
                    <div key={req.id} className="flex items-start gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full bg-chart-4 mt-1.5 shrink-0" />
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{req.employee_name}</span> requested {req.leave_type} leave
                      </p>
                    </div>
                  ))}
                  {employees?.slice(0, 2).map((emp) => (
                    <div key={emp.id} className="flex items-start gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full bg-chart-2 mt-1.5 shrink-0" />
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{emp.full_name || emp.first_name}</span> joined the team
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Certifications expiring soon</p>
              </div>
              <div className="p-4 bg-chart-2/5 rounded-lg">
                <p className="text-2xl font-bold">0%</p>
                <p className="text-sm text-muted-foreground">HIPAA training completion</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">License renewals due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
