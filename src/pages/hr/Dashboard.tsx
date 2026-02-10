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
  Award,
  Activity,
  Sparkles,
  FileText,
  Bell,
  UserPlus,
  Heart
} from 'lucide-react';
import { format } from 'date-fns';

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

  const stats = {
    totalEmployees: employees?.length || 0,
    activeToday: attendance?.summary?.present || 0,
    onLeave: attendance?.summary?.on_leave || 0,
    openPositions: 0,
    pendingApprovals: leaveRequests?.length || 0,
    newHires: employees?.filter(e => {
      const joinDate = new Date(e.date_of_joining);
      const now = new Date();
      return joinDate.getMonth() === now.getMonth() && joinDate.getFullYear() === now.getFullYear();
    }).length || 0,
    attritionRate: 0,
    avgTenure: 0
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

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {t('staffs')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-chart-2">
              +{stats.newHires} new this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeToday}</div>
            {stats.totalEmployees > 0 && (
              <Progress value={(stats.activeToday / stats.totalEmployees) * 100} className="h-1 mt-2" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onLeave}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingApprovals} pending requests
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openPositions}</div>
            <p className="text-xs text-muted-foreground">
              No active candidates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4">{stats.pendingApprovals}</div>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
              <Link to="/hr/leave">
                Review now <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
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
                {departments && departments.length > 0 ? (
                  <div className="space-y-3">
                    {departments.map((dept) => (
                      <div key={dept.id} className="flex items-center justify-between">
                        <span className="text-sm">{dept.name}</span>
                        <Badge variant="secondary">{dept.employee_count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No department data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Employees */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Employees</CardTitle>
                <CardDescription>Latest team members</CardDescription>
              </CardHeader>
              <CardContent>
                {employees && employees.length > 0 ? (
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-3">
                      {employees.slice(0, 5).map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {emp.first_name?.[0]}{emp.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {emp.position} • {emp.department_name || 'Unassigned'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No employees yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Approvals</CardTitle>
                <CardDescription>Items requiring your action</CardDescription>
              </CardHeader>
              <CardContent>
                {leaveRequests && leaveRequests.length > 0 ? (
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-3">
                      {leaveRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{req.employee_name || 'Employee'}</p>
                            <p className="text-xs text-muted-foreground">
                              {req.leave_type} • {req.requested_days} day{req.requested_days > 1 ? 's' : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-chart-4/10 text-chart-4">pending</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No pending approvals</p>
                  </div>
                )}
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
                    <p className="text-2xl font-bold">{attendance?.summary?.present || 0}</p>
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
                    <p className="text-2xl font-bold">{attendance?.summary?.absent || 0}</p>
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
                    <p className="text-2xl font-bold">{attendance?.summary?.late || 0}</p>
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
                    <p className="text-2xl font-bold">{attendance?.summary?.on_leave || 0}</p>
                    <p className="text-sm text-muted-foreground">On Leave</p>
                  </div>
                  <CalendarDays className="h-8 w-8 text-chart-3/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Details</CardTitle>
            </CardHeader>
            <CardContent>
              {attendance?.records && attendance.records.length > 0 ? (
                <div className="space-y-2">
                  {attendance.records.slice(0, 10).map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium text-sm">{record.employee_name}</span>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{record.check_in_time || '-'}</span>
                        <span>→</span>
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
            <Card>
              <CardHeader>
                <CardTitle>Workforce Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-chart-2">{stats.attritionRate}%</p>
                    <p className="text-sm text-muted-foreground">Attrition Rate</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-primary">{stats.avgTenure}y</p>
                    <p className="text-sm text-muted-foreground">Avg Tenure</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-chart-3">{stats.totalEmployees}</p>
                    <p className="text-sm text-muted-foreground">Total Headcount</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-chart-4">{stats.newHires}</p>
                    <p className="text-sm text-muted-foreground">New This Month</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {departments && departments.length > 0 ? (
                  <div className="space-y-3">
                    {departments.map((dept) => {
                      const maxCount = Math.max(...departments.map(d => d.employee_count), 1);
                      const percentage = (dept.employee_count / maxCount) * 100;
                      return (
                        <div key={dept.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{dept.name}</span>
                            <span className="font-medium">{dept.employee_count}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
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
