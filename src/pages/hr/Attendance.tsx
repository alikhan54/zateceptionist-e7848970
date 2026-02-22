import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAttendance } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedNumber } from '@/components/hr/AnimatedNumber';
import { LiveClock } from '@/components/hr/LiveClock';
import { 
  Clock, MapPin, Users, UserCheck, UserX, AlertTriangle,
  CalendarDays, Download, Timer, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AttendancePage() {
  const { t } = useTenant();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterDepartment, setFilterDepartment] = useState('all');
  const { data, isLoading, checkIn, checkOut } = useAttendance(format(selectedDate, 'yyyy-MM-dd'));

  const handleCheckIn = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            checkIn.mutate({
              employee_id: 'current',
              location: { lat: position.coords.latitude, lng: position.coords.longitude }
            });
          },
          () => checkIn.mutate({ employee_id: 'current' })
        );
      } else {
        checkIn.mutate({ employee_id: 'current' });
      }
    } catch {
      toast.error('Failed to check in');
    }
  };

  const handleCheckOut = () => {
    checkOut.mutate({ employee_id: 'current' });
  };

  const stats = [
    { label: 'Present', value: data?.summary?.present || 0, icon: UserCheck, color: 'text-chart-2', bgColor: 'bg-chart-2/10' },
    { label: 'Absent', value: data?.summary?.absent || 0, icon: UserX, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'Late', value: data?.summary?.late || 0, icon: AlertTriangle, color: 'text-chart-4', bgColor: 'bg-chart-4/10' },
    { label: 'On Leave', value: data?.summary?.on_leave || 0, icon: CalendarDays, color: 'text-chart-3', bgColor: 'bg-chart-3/10' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
      absent: 'bg-destructive/10 text-destructive border-destructive/20',
      late: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
      half_day: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
      on_leave: 'bg-muted text-muted-foreground border-muted',
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.absent}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage {t('staff').toLowerCase()} attendance
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download attendance report</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Large Clock + Check In/Out */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <LiveClock />
            </div>
            <div className="flex items-center gap-3">
              <Button 
                size="lg" 
                onClick={handleCheckIn}
                disabled={checkIn.isPending}
                className="gap-2 h-14 px-8 text-base shadow-lg hover:shadow-xl transition-all"
              >
                <MapPin className="h-5 w-5" />
                {checkIn.isPending ? 'Checking in...' : 'Check In'}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleCheckOut}
                disabled={checkOut.isPending}
                className="gap-2 h-14 px-8 text-base"
              >
                <Timer className="h-5 w-5" />
                {checkOut.isPending ? 'Checking out...' : 'Check Out'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold"><AnimatedNumber value={stat.value} /></p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-2"><Users className="h-4 w-4" />Attendance List</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><CalendarDays className="h-4 w-4" />Calendar View</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2"><TrendingUp className="h-4 w-4" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Today's Attendance</CardTitle>
                <div className="flex items-center gap-2">
                  <Input 
                    type="date" 
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-auto"
                  />
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="hr">HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : data?.records && data.records.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('staff')}</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">{record.employee_name}</TableCell>
                        <TableCell>{record.check_in_time || '-'}</TableCell>
                        <TableCell>{record.check_out_time || '-'}</TableCell>
                        <TableCell>{record.work_hours ? `${record.work_hours}h` : (record.total_hours ? `${record.total_hours}h` : '-')}</TableCell>
                        <TableCell>
                          {record.overtime_hours ? (
                            <Badge variant="outline" className="bg-chart-4/10 text-chart-4">{record.overtime_hours}h OT</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-muted-foreground">No attendance records for this date</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('staffs')} will appear here when they check in
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Calendar</CardTitle>
              <CardDescription>View monthly attendance at a glance</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>Weekly attendance rate</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Trend data will populate with more attendance records</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>Late Arrivals</CardTitle>
                <CardDescription>Top late arrivals this month</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No late arrival data available yet</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
