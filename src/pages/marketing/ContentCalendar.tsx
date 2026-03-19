import { useState, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Clock, Edit2, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek } from 'date-fns';

const CONTENT_TYPES = [
  { value: 'social_post', label: 'Social Post', color: '#3b82f6', emoji: '📱' },
  { value: 'email_campaign', label: 'Email Campaign', color: '#22c55e', emoji: '📧' },
  { value: 'blog_post', label: 'Blog Post', color: '#a855f7', emoji: '📝' },
  { value: 'video', label: 'Video', color: '#ef4444', emoji: '🎥' },
  { value: 'ad', label: 'Ad', color: '#f97316', emoji: '📺' },
  { value: 'sequence', label: 'Sequence', color: '#06b6d4', emoji: '🔄' },
];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planned' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'blog', label: 'Blog' },
  { value: 'all', label: 'All Channels' },
];

type CalendarEntry = {
  id: string;
  tenant_id: string;
  title: string;
  content_type: string;
  status: string;
  scheduled_at: string;
  published_at: string | null;
  platform: string | null;
  content_preview: string | null;
  color: string;
  notes: string | null;
  created_at: string;
};

export default function ContentCalendar() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('social_post');
  const [formPlatform, setFormPlatform] = useState('instagram');
  const [formStatus, setFormStatus] = useState('planned');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formNotes, setFormNotes] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['marketing_calendar', tenantConfig?.id, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('marketing_calendar')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', monthEnd.toISOString())
        .order('scheduled_at');
      return (data || []) as CalendarEntry[];
    },
    enabled: !!tenantConfig?.id,
  });

  const createEntry = useMutation({
    mutationFn: async () => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      const scheduledAt = new Date(`${formDate}T${formTime}:00`).toISOString();
      const typeConfig = CONTENT_TYPES.find(t => t.value === formType);
      const { error } = await supabase.from('marketing_calendar').insert({
        tenant_id: tenantConfig.id,
        title: formTitle,
        content_type: formType,
        status: formStatus,
        scheduled_at: scheduledAt,
        platform: formPlatform,
        color: typeConfig?.color || '#6366f1',
        notes: formNotes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_calendar'] });
      resetForm();
      setIsCreateOpen(false);
      toast({ title: 'Content scheduled!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateEntry = useMutation({
    mutationFn: async () => {
      if (!editEntry) throw new Error('No entry');
      const scheduledAt = new Date(`${formDate}T${formTime}:00`).toISOString();
      const typeConfig = CONTENT_TYPES.find(t => t.value === formType);
      const { error } = await supabase.from('marketing_calendar').update({
        title: formTitle,
        content_type: formType,
        status: formStatus,
        scheduled_at: scheduledAt,
        platform: formPlatform,
        color: typeConfig?.color || '#6366f1',
        notes: formNotes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editEntry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_calendar'] });
      setEditEntry(null);
      resetForm();
      toast({ title: 'Entry updated!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_calendar').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_calendar'] });
      setEditEntry(null);
      toast({ title: 'Entry deleted' });
    },
  });

  const resetForm = () => {
    setFormTitle(''); setFormType('social_post'); setFormPlatform('instagram');
    setFormStatus('planned'); setFormDate(''); setFormTime('09:00'); setFormNotes('');
  };

  const openCreate = (day?: Date) => {
    resetForm();
    if (day) setFormDate(format(day, 'yyyy-MM-dd'));
    setIsCreateOpen(true);
  };

  const openEdit = (entry: CalendarEntry) => {
    const dt = new Date(entry.scheduled_at);
    setFormTitle(entry.title);
    setFormType(entry.content_type);
    setFormPlatform(entry.platform || 'instagram');
    setFormStatus(entry.status);
    setFormDate(format(dt, 'yyyy-MM-dd'));
    setFormTime(format(dt, 'HH:mm'));
    setFormNotes(entry.notes || '');
    setEditEntry(entry);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = startOfWeek(monthStart);
    const days = eachDayOfInterval({ start: firstDay, end: endOfMonth(currentMonth) });
    // Pad to full weeks
    while (days.length % 7 !== 0) {
      days.push(new Date(days[days.length - 1].getTime() + 86400000));
    }
    return days;
  }, [currentMonth, monthStart]);

  const getEntriesForDay = (day: Date) => entries.filter(e => isSameDay(new Date(e.scheduled_at), day));

  const stats = useMemo(() => ({
    total: entries.length,
    planned: entries.filter(e => e.status === 'planned').length,
    scheduled: entries.filter(e => e.status === 'scheduled').length,
    published: entries.filter(e => e.status === 'published').length,
  }), [entries]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-indigo-500" /> Content Calendar
          </h1>
          <p className="text-muted-foreground">Schedule and manage content across all channels</p>
        </div>
        <Button onClick={() => openCreate()} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> Schedule Content
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'This Month', value: stats.total, color: 'text-indigo-500' },
          { label: 'Planned', value: stats.planned, color: 'text-amber-500' },
          { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-500' },
          { label: 'Published', value: stats.published, color: 'text-green-500' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px">
            {calendarDays.map((day, idx) => {
              const dayEntries = getEntriesForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-1 border rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                    isCurrentMonth ? 'bg-background' : 'bg-muted/30 opacity-50'
                  } ${isToday ? 'ring-2 ring-indigo-500 ring-inset' : ''}`}
                  onClick={() => openCreate(day)}
                >
                  <div className="text-xs font-medium text-right px-1">
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {dayEntries.slice(0, 3).map(entry => {
                      const typeConfig = CONTENT_TYPES.find(t => t.value === entry.content_type);
                      return (
                        <div
                          key={entry.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: entry.color + '20', color: entry.color, borderLeft: `2px solid ${entry.color}` }}
                          onClick={(e) => { e.stopPropagation(); openEdit(entry); }}
                          title={`${entry.title} (${format(new Date(entry.scheduled_at), 'h:mm a')})`}
                        >
                          {typeConfig?.emoji} {entry.title}
                        </div>
                      );
                    })}
                    {dayEntries.length > 3 && (
                      <div className="text-[10px] text-muted-foreground text-center">+{dayEntries.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t">
            {CONTENT_TYPES.map(t => (
              <div key={t.value} className="flex items-center gap-1 text-xs">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: t.color }} />
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen || !!editEntry} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditEntry(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Edit Calendar Entry' : 'Schedule Content'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g., Q1 Product Launch Post" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={formPlatform} onValueChange={setFormPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <div>
              {editEntry && (
                <Button variant="outline" className="text-destructive" onClick={() => { if (confirm('Delete this entry?')) deleteEntry.mutate(editEntry.id); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditEntry(null); resetForm(); }}>Cancel</Button>
              <Button
                onClick={() => editEntry ? updateEntry.mutate() : createEntry.mutate()}
                disabled={!formTitle.trim() || !formDate}
                className="marketing-gradient text-white"
              >
                {editEntry ? 'Update' : 'Schedule'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
