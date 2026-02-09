import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useLeaveBalance, useLeaveRequests, type LeaveBalance } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar as CalendarIcon,
  FileText,
  Users,
  Upload,
  TrendingUp,
  BarChart3,
  Download
} from 'lucide-react';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

// Mock data
const mockBalances: LeaveBalance[] = [
  { leave_type: 'Annual Leave', total_days: 20, used_days: 8, remaining_days: 12, pending_days: 2 },
  { leave_type: 'Sick Leave', total_days: 10, used_days: 3, remaining_days: 7, pending_days: 0 },
  { leave_type: 'Personal Leave', total_days: 5, used_days: 2, remaining_days: 3, pending_days: 1 },
  { leave_type: 'Parental Leave', total_days: 90, used_days: 0, remaining_days: 90, pending_days: 0 },
];

const mockRequests = [
  { id: '1', leave_type: 'Annual Leave', start_date: '2024-02-15', end_date: '2024-02-20', days: 4, reason: 'Family vacation', status: 'approved' },
  { id: '2', leave_type: 'Sick Leave', start_date: '2024-01-10', end_date: '2024-01-11', days: 2, reason: 'Medical appointment', status: 'approved' },
  { id: '3', leave_type: 'Annual Leave', start_date: '2024-03-01', end_date: '2024-03-05', days: 3, reason: 'Personal travel', status: 'pending' },
];

const mockPendingApprovals = [
  { id: '1', employee: 'Sarah Johnson', avatar: null, leave_type: 'Annual Leave', start_date: '2024-02-20', end_date: '2024-02-22', days: 3, reason: 'Family event', submitted: '2 days ago' },
  { id: '2', employee: 'Mike Chen', avatar: null, leave_type: 'Sick Leave', start_date: '2024-02-18', end_date: '2024-02-18', days: 1, reason: 'Doctor visit', submitted: 'Yesterday' },
  { id: '3', employee: 'Emily Davis', avatar: null, leave_type: 'Personal Leave', start_date: '2024-02-25', end_date: '2024-02-26', days: 2, reason: 'Moving house', submitted: 'Today' },
];

const mockTeamLeave = [
  { date: addDays(new Date(), 1), employees: ['Sarah J.', 'Mike C.'] },
  { date: addDays(new Date(), 3), employees: ['Emily D.'] },
  { date: addDays(new Date(), 5), employees: ['John S.', 'Lisa W.', 'Tom B.'] },
];

const leaveUsageData = [
  { month: 'Jan', used: 45, available: 200 },
  { month: 'Feb', used: 62, available: 190 },
  { month: 'Mar', used: 38, available: 175 },
  { month: 'Apr', used: 55, available: 160 },
  { month: 'May', used: 70, available: 145 },
  { month: 'Jun', used: 48, available: 130 },
];

const leaveTypeColors = [
  { type: 'Annual Leave', color: 'hsl(var(--chart-1))' },
  { type: 'Sick Leave', color: 'hsl(var(--chart-2))' },
  { type: 'Personal Leave', color: 'hsl(var(--chart-3))' },
  { type: 'Parental Leave', color: 'hsl(var(--chart-4))' },
];

export default function LeavePage() {
  const { t } = useTenant();
  const { toast } = useToast();
  const { data: balances, isLoading: balanceLoading } = useLeaveBalance();
  const { data: requests, isLoading: requestsLoading, requestLeave, approveLeave } = useLeaveRequests();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [coveragePerson, setCoveragePerson] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const displayBalances = balances && balances.length > 0 ? balances : mockBalances;
  const displayRequests = requests && requests.length > 0 ? requests : mockRequests;

  const handleSubmitLeave = () => {
    if (!leaveType || !dateRange?.from) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    
    requestLeave.mutate({
      leave_type: leaveType,
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
      is_half_day: isHalfDay,
      reason,
      requested_days: dateRange.to ? differenceInDays(dateRange.to, dateRange.from) + 1 : 1,
    });
    
    toast({ title: 'Leave request submitted successfully' });
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setLeaveType('');
    setDateRange(undefined);
    setIsHalfDay(false);
    setReason('');
    setCoveragePerson('');
  };

  const handleApprove = (id: string) => {
    approveLeave.mutate({ request_id: id, approved: true });
    toast({ title: 'Leave request approved' });
  };

  const handleReject = (id: string) => {
    approveLeave.mutate({ request_id: id, approved: false });
    toast({ title: 'Leave request rejected', variant: 'destructive' });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { class: string; icon: React.ReactNode }> = {
      pending: { 
        class: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
        icon: <Clock className="h-3 w-3" />
      },
      approved: { 
        class: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
        icon: <CheckCircle2 className="h-3 w-3" />
      },
      rejected: { 
        class: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: <XCircle className="h-3 w-3" />
      },
    };
    const style = styles[status] || styles.pending;
    return (
      <Badge variant="outline" className={cn('gap-1', style.class)}>
        {style.icon}
        {status}
      </Badge>
    );
  };

  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' },
  ];

  const totalDays = displayBalances.reduce((acc, b) => acc + b.total_days, 0);
  const usedDays = displayBalances.reduce((acc, b) => acc + b.used_days, 0);
  const pendingDays = displayBalances.reduce((acc, b) => acc + b.pending_days, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground mt-1">
            Request and manage time off
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Request Leave</DialogTitle>
                <DialogDescription>
                  Submit a new leave request for approval
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Leave Type *</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Range *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !dateRange && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, 'LLL dd, y')} -{' '}
                              {format(dateRange.to, 'LLL dd, y')}
                              <Badge variant="secondary" className="ml-auto">
                                {differenceInDays(dateRange.to, dateRange.from) + 1} days
                              </Badge>
                            </>
                          ) : (
                            format(dateRange.from, 'LLL dd, y')
                          )
                        ) : (
                          'Pick a date range'
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
                        disabled={(date) => date < new Date() || isWeekend(date)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="half-day" 
                    checked={isHalfDay} 
                    onCheckedChange={(checked) => setIsHalfDay(checked as boolean)} 
                  />
                  <Label htmlFor="half-day" className="text-sm font-normal">
                    Half day only (morning or afternoon)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Coverage Person (optional)</Label>
                  <Select value={coveragePerson} onValueChange={setCoveragePerson}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select who will cover" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">John Smith</SelectItem>
                      <SelectItem value="2">Sarah Chen</SelectItem>
                      <SelectItem value="3">Mike Johnson</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea
                    placeholder="Briefly describe the reason for your leave..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attachment (optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drop files here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Medical certificates, supporting documents (PDF, max 5MB)
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitLeave} disabled={requestLeave.isPending}>
                  {requestLeave.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Leave Balance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {balanceLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))
        ) : displayBalances.map((balance, index) => (
          <Card key={balance.leave_type} className="overflow-hidden">
            <div 
              className="h-1" 
              style={{ backgroundColor: leaveTypeColors[index]?.color || 'hsl(var(--primary))' }} 
            />
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{balance.leave_type}</span>
                {balance.pending_days > 0 && (
                  <Badge variant="outline" className="bg-chart-4/10 text-chart-4 text-xs">
                    {balance.pending_days} pending
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">{balance.remaining_days}</span>
                <span className="text-muted-foreground text-sm">/ {balance.total_days}</span>
              </div>
              <Progress 
                value={(balance.remaining_days / balance.total_days) * 100} 
                className="h-2 mt-3"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {balance.used_days} days used this year
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{totalDays}</p>
            <p className="text-sm text-muted-foreground">Total Allowance</p>
          </CardContent>
        </Card>
        <Card className="bg-chart-2/5 border-chart-2/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{usedDays}</p>
            <p className="text-sm text-muted-foreground">Days Used</p>
          </CardContent>
        </Card>
        <Card className="bg-chart-4/5 border-chart-4/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{pendingDays}</p>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="h-4 w-4" />
            My Requests
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Approvals
            {mockPendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {mockPendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Team Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Leave History</CardTitle>
              <CardDescription>Your submitted leave requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : displayRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.leave_type}</TableCell>
                        <TableCell>{request.start_date}</TableCell>
                        <TableCell>{request.end_date}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{request.days}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No leave requests yet</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Request Leave" to submit your first request
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Leave requests from your team awaiting your approval</CardDescription>
            </CardHeader>
            <CardContent>
              {mockPendingApprovals.length > 0 ? (
                <div className="space-y-4">
                  {mockPendingApprovals.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {request.employee.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.employee}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.leave_type} • {request.days} day{request.days > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.start_date} - {request.end_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">{request.reason}</p>
                          <p className="text-xs text-muted-foreground">Submitted {request.submitted}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleApprove(request.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No pending approvals</p>
                  <p className="text-sm text-muted-foreground">
                    Team leave requests will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Team Leave Calendar</CardTitle>
                <CardDescription>See who's on leave and when</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  className="rounded-md border"
                  modifiers={{
                    hasLeave: mockTeamLeave.map(l => l.date),
                  }}
                  modifiersStyles={{
                    hasLeave: { backgroundColor: 'hsl(var(--primary) / 0.1)', fontWeight: 'bold' },
                  }}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Leave</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {mockTeamLeave.map((item, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium text-sm">{format(item.date, 'EEEE, MMM d')}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.employees.map((emp, j) => (
                            <Badge key={j} variant="secondary">{emp}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Leave Usage Trend</CardTitle>
                <CardDescription>Monthly leave consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={leaveUsageData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="used" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leave Distribution</CardTitle>
                <CardDescription>By leave type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={displayBalances.map((b, i) => ({ name: b.leave_type, value: b.used_days }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {displayBalances.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={leaveTypeColors[index]?.color || 'hsl(var(--primary))'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {displayBalances.map((balance, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: leaveTypeColors[i]?.color || 'hsl(var(--primary))' }} 
                      />
                      <span className="text-xs text-muted-foreground">{balance.leave_type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Leave Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave Policy Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Annual Leave</h4>
              <p className="text-muted-foreground">20 days per year. Must be requested 7 days in advance for periods longer than 3 days.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Sick Leave</h4>
              <p className="text-muted-foreground">10 days per year. Medical certificate required for absences of 3+ consecutive days.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Personal Leave</h4>
              <p className="text-muted-foreground">5 days per year for personal matters. No carryover to next year.</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Parental Leave</h4>
              <p className="text-muted-foreground">90 days for primary caregivers. Must be taken within 12 months of birth/adoption.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
