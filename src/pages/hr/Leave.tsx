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
import { format, differenceInDays, isWeekend } from 'date-fns';
import { DateRange } from 'react-day-picker';

export default function LeavePage() {
  const { t } = useTenant();
  const { toast } = useToast();
  const { data: balances, isLoading: balanceLoading } = useLeaveBalance();
  const { data: requests, isLoading: requestsLoading, requestLeave, approveLeave } = useLeaveRequests();
  const { data: pendingRequests } = useLeaveRequests('pending');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [coveragePerson, setCoveragePerson] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const displayBalances = balances || [];
  const displayRequests = requests || [];
  const displayPendingApprovals = pendingRequests || [];

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
    approveLeave.mutate({ leave_id: id, action: 'approve' });
    toast({ title: 'Leave request approved' });
  };

  const handleReject = (id: string) => {
    approveLeave.mutate({ leave_id: id, action: 'reject' });
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

  const totalDays = displayBalances.reduce((acc, b) => acc + (b.total_entitled || 0), 0);
  const usedDays = displayBalances.reduce((acc, b) => acc + (b.used || 0), 0);
  const pendingDays = displayBalances.reduce((acc, b) => acc + (b.pending || 0), 0);

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
        ) : displayBalances.length > 0 ? (
          displayBalances.map((balance, index) => {
            const colors = [
              'hsl(var(--chart-1))',
              'hsl(var(--chart-2))',
              'hsl(var(--chart-3))',
              'hsl(var(--chart-4))',
            ];
            return (
              <Card key={balance.leave_type_id || index} className="overflow-hidden">
                <div 
                  className="h-1" 
                  style={{ backgroundColor: colors[index % colors.length] }} 
                />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{balance.leave_type_name || balance.leave_type_id}</span>
                    {(balance.pending || 0) > 0 && (
                      <Badge variant="outline" className="bg-chart-4/10 text-chart-4 text-xs">
                        {balance.pending} pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{balance.remaining}</span>
                    <span className="text-muted-foreground text-sm">/ {balance.total_entitled}</span>
                  </div>
                  <Progress 
                    value={balance.total_entitled > 0 ? (balance.remaining / balance.total_entitled) * 100 : 0} 
                    className="h-2 mt-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {balance.used} days used this year
                  </p>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No leave balances available</p>
              <p className="text-sm text-muted-foreground">Leave balances will appear once configured</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Stats */}
      {displayBalances.length > 0 && (
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
      )}

      {/* Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="requests" className="gap-2">
            <FileText className="h-4 w-4" />
            My Requests
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Approvals
            {displayPendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {displayPendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Team Calendar
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
                          <Badge variant="secondary">{request.requested_days}</Badge>
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
              {displayPendingApprovals.length > 0 ? (
                <div className="space-y-4">
                  {displayPendingApprovals.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {(request.employee_name || 'E').split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.employee_name || 'Employee'}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.leave_type} • {request.requested_days} day{request.requested_days > 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.start_date} - {request.end_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">{request.reason}</p>
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
          <Card>
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
              />
            </CardContent>
          </Card>
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
