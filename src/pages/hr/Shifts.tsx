import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useShifts, Shift } from '@/hooks/useHR';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar, ChevronLeft, ChevronRight, Sun, Moon, Sunset, Coffee,
  CheckCircle2, Clock, AlertTriangle, Users
} from 'lucide-react';
import { format, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';

const SHIFT_COLORS: Record<string, string> = {
  morning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  afternoon: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  night: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  off: 'bg-muted text-muted-foreground',
};

const SHIFT_ICONS: Record<string, any> = {
  morning: Sun,
  afternoon: Sunset,
  night: Moon,
  off: Coffee,
};

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  scheduled: { variant: 'outline', label: 'Scheduled' },
  checked_in: { variant: 'default', label: 'On Shift' },
  completed: { variant: 'secondary', label: 'Done' },
  absent: { variant: 'destructive', label: 'Absent' },
};

export default function ShiftsPage() {
  const { isEnabled } = useFeatureFlags();
  const { t } = useTenant();
  const [deptFilter, setDeptFilter] = useState<string>('all');

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
    if (weekOffset > 0) return addWeeks(base, weekOffset);
    if (weekOffset < 0) return subWeeks(base, Math.abs(weekOffset));
    return base;
  }, [weekOffset]);

  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  const { data: shifts, isLoading } = useShifts(weekStartStr);

  if (!isEnabled('hr_module')) {
    return <Navigate to="/dashboard" replace />;
  }

  // Get unique departments for filter
  const departments = useMemo(() => {
    if (!shifts) return [];
    const depts = new Set(shifts.map(s => s.department_name || 'Unassigned'));
    return Array.from(depts).sort();
  }, [shifts]);

  // Group shifts by employee, filter by department
  const employeeShifts = useMemo(() => {
    if (!shifts) return [];
    const filtered = deptFilter === 'all'
      ? shifts
      : shifts.filter(s => (s.department_name || 'Unassigned') === deptFilter);

    const byEmployee = new Map<string, { name: string; department: string; days: Shift[] }>();
    filtered.forEach(s => {
      if (!byEmployee.has(s.employee_id)) {
        byEmployee.set(s.employee_id, { name: s.employee_name, department: s.department_name || 'Unassigned', days: [] });
      }
      byEmployee.get(s.employee_id)!.days.push(s);
    });

    return Array.from(byEmployee.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [shifts, deptFilter]);

  // Week summary stats
  const weekStats = useMemo(() => {
    if (!shifts) return { total: 0, onShift: 0, absent: 0, completed: 0 };
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = shifts.filter(s => s.date === today && s.shift_type !== 'off');
    return {
      total: todayShifts.length,
      onShift: todayShifts.filter(s => s.status === 'checked_in').length,
      absent: todayShifts.filter(s => s.status === 'absent').length,
      completed: todayShifts.filter(s => s.status === 'completed').length,
    };
  }, [shifts]);

  // Days of the week headers
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(currentWeekStart, i);
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE'), dayNum: format(d, 'd'), isToday: format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') };
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Shift Schedule
          </h1>
          <p className="text-muted-foreground mt-1">
            Weekly view of {t('staff')} shifts and attendance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Scheduled Today', value: weekStats.total, icon: Users, color: 'text-primary' },
          { label: 'On Shift', value: weekStats.onShift, icon: CheckCircle2, color: 'text-chart-2' },
          { label: 'Completed', value: weekStats.completed, icon: Clock, color: 'text-chart-3' },
          { label: 'Absent', value: weekStats.absent, icon: AlertTriangle, color: 'text-destructive' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {format(currentWeekStart, 'MMM d')} — {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
              </CardTitle>
              <CardDescription>{employeeShifts.length} {t('staffs')} scheduled</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
                This Week
              </Button>
              <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading shift data...</div>
          ) : employeeShifts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No {t('staffs')} found for this week</p>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                {/* Day headers */}
                <div className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 mb-2">
                  <div className="text-sm font-medium text-muted-foreground p-2">{t('staff')}</div>
                  {weekDays.map(d => (
                    <div
                      key={d.date}
                      className={`text-center p-2 rounded-lg text-sm ${
                        d.isToday ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      <div>{d.label}</div>
                      <div className="text-lg">{d.dayNum}</div>
                    </div>
                  ))}
                </div>

                {/* Employee rows */}
                {employeeShifts.map(emp => (
                  <div
                    key={emp.name}
                    className="grid grid-cols-[200px_repeat(7,1fr)] gap-1 mb-1 hover:bg-muted/30 rounded-lg transition-colors"
                  >
                    <div className="p-2 flex flex-col justify-center">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.department}</p>
                    </div>
                    {emp.days
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(shift => {
                        const ShiftIcon = SHIFT_ICONS[shift.shift_type] || Sun;
                        const colorClass = SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.morning;
                        const statusInfo = STATUS_BADGES[shift.status] || STATUS_BADGES.scheduled;

                        return (
                          <div
                            key={shift.id}
                            className={`p-2 rounded-lg text-center text-xs ${colorClass} ${
                              shift.status === 'absent' ? 'ring-1 ring-destructive/30' : ''
                            }`}
                          >
                            <ShiftIcon className="h-3.5 w-3.5 mx-auto mb-1" />
                            {shift.shift_type !== 'off' ? (
                              <>
                                <div className="font-medium">{shift.start_time}–{shift.end_time}</div>
                                {shift.status !== 'scheduled' && (
                                  <Badge variant={statusInfo.variant} className="mt-1 text-[10px] px-1 py-0">
                                    {statusInfo.label}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <div className="font-medium">Off</div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(SHIFT_COLORS).map(([type, cls]) => {
          const Icon = SHIFT_ICONS[type];
          return (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${cls}`}>
                <Icon className="h-3 w-3" />
              </div>
              <span className="capitalize">{type}</span>
            </div>
          );
        })}
        <span className="text-muted-foreground/50">|</span>
        {Object.entries(STATUS_BADGES).map(([status, info]) => (
          <div key={status} className="flex items-center gap-1.5">
            <Badge variant={info.variant} className="text-[10px] px-1 py-0">{info.label}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
