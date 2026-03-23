import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { AskAIButton } from '@/components/hr/AskAIButton';
import { CircularProgress } from '@/components/hr/CircularProgress';
import { AnimatedNumber } from '@/components/hr/AnimatedNumber';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, Mail, Phone, Building2, Calendar, Briefcase, DollarSign,
  FileText, Users, Star, Target, Award, Clock, MapPin, Shield,
  UserCircle, CreditCard, Globe, Heart, AlertTriangle, CheckCircle2,
  XCircle, Package, Receipt
} from 'lucide-react';
import { format, differenceInDays, differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantConfig } = useTenant();
  const tenantUuid = tenantConfig?.id;
  const [activeTab, setActiveTab] = useState('overview');

  const isUAE = ['UAE', 'UNITED ARAB EMIRATES', 'AE'].includes(
    (tenantConfig?.country || '').toUpperCase()
  );

  // ── Employee base data ──
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee-profile', tenantUuid, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_employees')
        .select('*')
        .eq('tenant_id', tenantUuid!)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!tenantUuid && !!id,
  });

  // ── Leave balances ──
  const { data: leaveBalances } = useQuery({
    queryKey: ['employee-leave-balances', tenantUuid, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_leave_balances')
        .select('*')
        .eq('tenant_id', tenantUuid!)
        .eq('employee_id', id!);
      return (data || []) as any[];
    },
    enabled: !!tenantUuid && !!id,
  });

  // ── Leave requests ──
  const { data: leaveRequests } = useQuery({
    queryKey: ['employee-leave-requests', tenantUuid, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_leave_requests')
        .select('*')
        .eq('tenant_id', tenantUuid!)
        .eq('employee_id', id!)
        .order('created_at', { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
    enabled: !!tenantUuid && !!id,
  });

  // ── Performance reviews ──
  const { data: reviews } = useQuery({
    queryKey: ['employee-reviews', tenantUuid, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_performance_reviews')
        .select('*')
        .eq('tenant_id', tenantUuid!)
        .eq('employee_id', id!)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!tenantUuid && !!id,
  });

  // ── Goals ──
  const { data: goals } = useQuery({
    queryKey: ['employee-goals', tenantUuid, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_goals')
        .select('*')
        .eq('tenant_id', tenantUuid!)
        .eq('employee_id', id!)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!tenantUuid && !!id,
  });

  // ── Documents ──
  const { data: documents } = useQuery({
    queryKey: ['employee-documents', tenantUuid, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_documents')
        .select('*')
        .eq('tenant_id', tenantUuid!)
        .eq('employee_id', id!)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!tenantUuid && !!id,
  });

  // ── Assets ──
  const { data: assets } = useQuery({
    queryKey: ['employee-assets', tenantUuid, id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_asset_assignments')
        .select('*')
        .eq('tenant_id', tenantUuid!)
        .eq('employee_id', id!);
      return (data || []) as any[];
    },
    enabled: !!tenantUuid && !!id,
  });

  // ── Helpers ──
  const fullName = employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim();

  const yearsOfService = useMemo(() => {
    if (!employee?.date_of_joining) return null;
    return differenceInYears(new Date(), new Date(employee.date_of_joining));
  }, [employee?.date_of_joining]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      active: { label: 'Active', className: 'bg-chart-2/10 text-chart-2 border-chart-2/20' },
      on_leave: { label: 'On Leave', className: 'bg-chart-4/10 text-chart-4 border-chart-4/20' },
      terminated: { label: 'Terminated', className: 'bg-destructive/10 text-destructive border-destructive/20' },
      probation: { label: 'Probation', className: 'bg-chart-3/10 text-chart-3 border-chart-3/20' },
    };
    const s = map[status] || { label: status, className: 'bg-muted' };
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { active: 'bg-chart-2', on_leave: 'bg-chart-4', terminated: 'bg-destructive', probation: 'bg-chart-3' };
    return colors[status] || 'bg-muted-foreground';
  };

  const getExpiryBadge = (dateStr: string | null | undefined) => {
    if (!dateStr) return <Badge variant="outline" className="bg-muted text-muted-foreground">N/A</Badge>;
    const days = differenceInDays(new Date(dateStr), new Date());
    if (days < 0) return <Badge variant="destructive" className="animate-pulse">Expired</Badge>;
    if (days <= 30) return <Badge variant="destructive">Expires in {days}d</Badge>;
    if (days <= 90) return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20" variant="outline">Expires in {days}d</Badge>;
    return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20" variant="outline">Valid</Badge>;
  };

  const getLeaveStatusBadge = (status: string) => {
    const map: Record<string, string> = { approved: 'bg-chart-2/10 text-chart-2', pending: 'bg-chart-4/10 text-chart-4', rejected: 'bg-destructive/10 text-destructive' };
    return <Badge variant="outline" className={map[status] || 'bg-muted'}>{status}</Badge>;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: employee?.salary_currency || 'USD', maximumFractionDigits: 0 }).format(amount);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
  };

  const totalLeaveUsed = (leaveBalances || []).reduce((acc, b) => acc + (b.used || b.used_days || 0), 0);
  const totalLeaveEntitled = (leaveBalances || []).reduce((acc, b) => acc + (b.total_entitled || b.entitled_days || b.total_days || 0), 0);
  const latestRating = reviews?.[0]?.overall_rating;
  const avgGoalProgress = goals?.length ? Math.round(goals.reduce((a, g) => a + (g.progress_percent || 0), 0) / goals.length) : 0;

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-10 w-32" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-6 p-1">
        <Button variant="ghost" onClick={() => navigate('/hr/employees')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Employees
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="font-medium text-muted-foreground">Employee not found</p>
            <p className="text-sm text-muted-foreground mt-1">This employee may have been removed or the link is incorrect.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Info Row helper ──
  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | null | undefined }) => (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-1">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate('/hr/employees')} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Employees
      </Button>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-background shadow-lg">
                <AvatarImage src={employee.profile_picture_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {employee.first_name?.[0]}{employee.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className={cn('absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-3 border-background', getStatusColor(employee.employment_status))} />
            </div>

            {/* Name & meta */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <p className="text-muted-foreground">{employee.position}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {getStatusBadge(employee.employment_status)}
                <Badge variant="secondary" className="rounded-full">{employee.department_name || 'Unassigned'}</Badge>
                {employee.employment_type && <Badge variant="outline">{employee.employment_type}</Badge>}
                {yearsOfService !== null && (
                  <span className="text-xs text-muted-foreground">
                    {yearsOfService === 0 ? '< 1 year' : `${yearsOfService} year${yearsOfService > 1 ? 's' : ''}`} of service
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {employee.company_email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${employee.company_email}`}><Mail className="h-3.5 w-3.5 mr-1.5" />Email</a>
                </Button>
              )}
              {(employee.phone || employee.mobile) && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${employee.phone || employee.mobile}`}><Phone className="h-3.5 w-3.5 mr-1.5" />Call</a>
                </Button>
              )}
              <AskAIButton
                message={`Give me a complete overview of ${fullName} — attendance record, leave balance, performance ratings, training progress, and compliance status`}
                label="AI Summary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
        </TabsList>

        {/* ═══ Overview ═══ */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Info</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <InfoRow icon={Mail} label="Email" value={employee.company_email} />
                <InfoRow icon={Phone} label="Phone" value={employee.phone || employee.mobile} />
                <InfoRow icon={Building2} label="Department" value={employee.department_name} />
                <InfoRow icon={Briefcase} label="Position" value={employee.position} />
                <InfoRow icon={Calendar} label="Joined" value={formatDate(employee.date_of_joining)} />
                <InfoRow icon={Clock} label="Type" value={employee.employment_type} />
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">At a Glance</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {totalLeaveEntitled > 0 ? Math.round(((totalLeaveEntitled - totalLeaveUsed) / totalLeaveEntitled) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Leave Balance</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-chart-2">
                    {latestRating ? `${latestRating}/5` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Latest Rating</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-chart-3">{avgGoalProgress}%</p>
                  <p className="text-xs text-muted-foreground">Goals Progress</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">{documents?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance alerts for UAE */}
          {isUAE && (
            <Card className="border-chart-4/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-chart-4" /> Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Visa</span>
                    {getExpiryBadge(employee.visa_expiry_date)}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Labor Card</span>
                    {getExpiryBadge(employee.labor_card_expiry)}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Medical</span>
                    {getExpiryBadge(employee.medical_insurance_expiry)}
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Work Permit</span>
                    {getExpiryBadge(employee.work_permit_expiry)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Personal ═══ */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2">
              <InfoRow icon={Mail} label="Work Email" value={employee.company_email} />
              <InfoRow icon={Mail} label="Personal Email" value={employee.personal_email} />
              <InfoRow icon={Phone} label="Phone" value={employee.phone} />
              <InfoRow icon={Phone} label="Mobile" value={employee.mobile} />
              <InfoRow icon={MapPin} label="Address" value={employee.address} />
              <InfoRow icon={Globe} label="Country" value={employee.country} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Emergency Contact</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2">
              <InfoRow icon={Heart} label="Contact Name" value={employee.emergency_contact_name} />
              <InfoRow icon={Phone} label="Contact Phone" value={employee.emergency_contact_phone} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Personal Details</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2">
              <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(employee.date_of_birth)} />
              <InfoRow icon={UserCircle} label="Gender" value={employee.gender} />
              <InfoRow icon={Globe} label="Nationality" value={employee.nationality} />
              <InfoRow icon={FileText} label="National ID" value={employee.national_id} />
              <InfoRow icon={FileText} label="Passport" value={employee.passport_number} />
            </CardContent>
          </Card>
          {isUAE && (
            <Card className="border-chart-4/20">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> UAE Documentation</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div><p className="text-xs text-muted-foreground">Visa Status</p><p className="text-sm font-medium">{employee.visa_status || '—'}</p></div>
                  {getExpiryBadge(employee.visa_expiry_date)}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div><p className="text-xs text-muted-foreground">Labor Card</p><p className="text-sm font-medium">{employee.labor_card_number || '—'}</p></div>
                  {getExpiryBadge(employee.labor_card_expiry)}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div><p className="text-xs text-muted-foreground">Work Permit</p><p className="text-sm font-medium">{employee.work_permit_number || '—'}</p></div>
                  {getExpiryBadge(employee.work_permit_expiry)}
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div><p className="text-xs text-muted-foreground">Medical Insurance</p><p className="text-sm font-medium">{employee.medical_insurance_provider || '—'}</p></div>
                  {getExpiryBadge(employee.medical_insurance_expiry)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Employment ═══ */}
        <TabsContent value="employment" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Job Details</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2">
              <InfoRow icon={Building2} label="Department" value={employee.department_name} />
              <InfoRow icon={Briefcase} label="Position" value={employee.position} />
              <InfoRow icon={Clock} label="Employment Type" value={employee.employment_type} />
              <InfoRow icon={Calendar} label="Date of Joining" value={formatDate(employee.date_of_joining)} />
              <InfoRow icon={UserCircle} label="Job Title" value={employee.job_title} />
              <InfoRow icon={Award} label="Onboarding Status" value={employee.onboarding_status} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Compensation & Banking</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-2">
              <InfoRow icon={DollarSign} label="Salary" value={employee.salary ? `${formatCurrency(employee.salary)}/year` : null} />
              <InfoRow icon={CreditCard} label="Currency" value={employee.salary_currency} />
              <InfoRow icon={CreditCard} label="Bank" value={employee.bank_name} />
              <InfoRow icon={CreditCard} label="IBAN" value={employee.iban_number} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Leave ═══ */}
        <TabsContent value="leave" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Leave Balances</CardTitle>
                <AskAIButton message={`Analyze leave usage for ${fullName} — remaining balance, patterns, and recommendations`} label="AI Analysis" />
              </div>
            </CardHeader>
            <CardContent>
              {(leaveBalances?.length || 0) > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {leaveBalances!.map((b: any) => {
                    const entitled = b.total_entitled || b.entitled_days || b.total_days || 0;
                    const used = b.used || b.used_days || 0;
                    const remaining = entitled - used;
                    const pct = entitled > 0 ? Math.round((remaining / entitled) * 100) : 0;
                    return (
                      <div key={b.id} className="p-4 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{b.leave_type_name || 'Leave'}</p>
                          <span className="text-xs text-muted-foreground">{remaining}/{entitled} days</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Used: {used}d</span>
                          <span>Pending: {b.pending || b.pending_days || 0}d</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No leave balance data available</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Recent Leave Requests</CardTitle></CardHeader>
            <CardContent>
              {(leaveRequests?.length || 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests!.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.leave_type}</TableCell>
                        <TableCell>{formatDate(r.start_date)}</TableCell>
                        <TableCell>{formatDate(r.end_date)}</TableCell>
                        <TableCell>{r.total_days || r.requested_days || '—'}</TableCell>
                        <TableCell>{getLeaveStatusBadge(r.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No leave requests found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Performance ═══ */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Performance Reviews</CardTitle>
                <AskAIButton message={`Summarize ${fullName}'s performance reviews, strengths, and areas for improvement`} label="AI Insights" />
              </div>
            </CardHeader>
            <CardContent>
              {(reviews?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {reviews!.map((r: any) => (
                    <div key={r.id} className="p-4 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{r.review_type || 'Review'}</Badge>
                          {getStatusBadge(r.status)}
                        </div>
                        {r.overall_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-chart-4 fill-chart-4" />
                            <span className="font-bold">{r.overall_rating}</span>
                            <span className="text-xs text-muted-foreground">/ {r.rating_scale || 5}</span>
                          </div>
                        )}
                      </div>
                      {r.strengths && <p className="text-sm"><span className="text-muted-foreground">Strengths: </span>{r.strengths}</p>}
                      {r.areas_for_improvement && <p className="text-sm"><span className="text-muted-foreground">Areas to improve: </span>{r.areas_for_improvement}</p>}
                      <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No performance reviews yet</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Goals</CardTitle></CardHeader>
            <CardContent>
              {(goals?.length || 0) > 0 ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {goals!.map((g: any) => (
                    <div key={g.id} className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{g.title}</p>
                        <Badge variant="outline">{g.status}</Badge>
                      </div>
                      {g.description && <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>}
                      <div className="flex items-center gap-3">
                        <CircularProgress value={g.progress_percent || 0} size={40} strokeWidth={4}>
                          <span className="text-[10px] font-bold">{g.progress_percent || 0}%</span>
                        </CircularProgress>
                        <div className="flex-1">
                          <Progress value={g.progress_percent || 0} className="h-2" />
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>{g.category || 'General'}</span>
                            {g.due_date && <span>Due: {formatDate(g.due_date)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No goals assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Documents ═══ */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Employee Documents</CardTitle>
                <AskAIButton message={`Check document status for ${fullName} — any missing or expiring documents?`} label="AI Check" />
              </div>
            </CardHeader>
            <CardContent>
              {(documents?.length || 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents!.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.title || d.name || 'Untitled'}</TableCell>
                        <TableCell>{d.document_type?.replace(/_/g, ' ')}</TableCell>
                        <TableCell><Badge variant="secondary">{d.category || 'general'}</Badge></TableCell>
                        <TableCell>{d.expiry_date ? getExpiryBadge(d.expiry_date) : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {d.is_verified ? (
                            <Badge className="bg-chart-2/10 text-chart-2" variant="outline"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                          ) : (
                            <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No documents uploaded for this employee</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Assets ═══ */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Asset Assignments</CardTitle></CardHeader>
            <CardContent>
              {(assets?.length || 0) > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets!.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.asset_name || a.name || '—'}</TableCell>
                        <TableCell>{a.asset_type || a.type || '—'}</TableCell>
                        <TableCell>{formatDate(a.assigned_date || a.created_at)}</TableCell>
                        <TableCell><Badge variant="outline">{a.status || 'assigned'}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No assets assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
