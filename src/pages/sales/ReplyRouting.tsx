import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, Save, MessageSquare, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  negative: 'bg-red-500/15 text-red-400 border-red-500/30',
  booking: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  objection: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  question: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  unsubscribe: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  out_of_office: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  referral: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
};

const ACTION_OPTIONS = [
  { value: 'switch_sequence', label: 'Switch Sequence' },
  { value: 'pause_sequence', label: 'Pause Sequence' },
  { value: 'delay_sequence', label: 'Delay Sequence' },
  { value: 'stop_sequence', label: 'Stop Sequence' },
  { value: 'flag_for_review', label: 'Flag for Review' },
  { value: 'trigger_meeting', label: 'Trigger Meeting' },
  { value: 'continue', label: 'Continue' },
];

interface RuleRow {
  id: string;
  sentiment: string;
  action: string;
  delay_days: number | null;
  is_active: boolean;
}

export default function ReplyRouting() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [editedRules, setEditedRules] = useState<Record<string, Partial<RuleRow>>>({});

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['reply_routing_rules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('reply_routing_rules' as any)
        .select('*')
        .eq('tenant_id', tenantId);
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['reply_events', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('reply_events' as any)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<RuleRow> }) => {
      const { error } = await supabase
        .from('reply_routing_rules' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['reply_routing_rules'] });
      setEditedRules(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Rule saved');
    },
    onError: () => toast.error('Failed to save rule'),
  });

  const getEdited = (rule: any): any => ({
    ...rule,
    ...(editedRules[rule.id] || {}),
  });

  const updateField = (id: string, field: string, value: any) => {
    setEditedRules(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const hasChanges = (id: string) => !!editedRules[id];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30">
          <GitBranch className="text-purple-400" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Reply Routing Rules</h1>
          <p className="text-sm text-gray-400">Configure how detected reply sentiments trigger automated actions</p>
        </div>
      </div>

      {/* Rules Table */}
      <Card className="bg-[#111118] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-lg">Routing Rules</CardTitle>
          <CardDescription className="text-gray-400">Edit actions and toggles per sentiment type</CardDescription>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
            </div>
          ) : rules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No routing rules configured yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">Sentiment</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">Delay Days</TableHead>
                    <TableHead className="text-gray-400">Active</TableHead>
                    <TableHead className="text-gray-400 w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule: any) => {
                    const r = getEdited(rule);
                    return (
                      <TableRow key={rule.id} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell>
                          <Badge className={`${SENTIMENT_COLORS[r.sentiment] || 'bg-gray-500/15 text-gray-400'} border`}>
                            {r.sentiment}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={r.action}
                            onValueChange={(v) => updateField(rule.id, 'action', v)}
                          >
                            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTION_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {r.action === 'delay_sequence' ? (
                            <Input
                              type="number"
                              min={1}
                              max={30}
                              value={r.delay_days ?? ''}
                              onChange={(e) => updateField(rule.id, 'delay_days', parseInt(e.target.value) || null)}
                              className="w-20 bg-white/5 border-white/10 text-white"
                            />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={!!r.is_active}
                            onCheckedChange={(v) => updateField(rule.id, 'is_active', v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!hasChanges(rule.id)}
                            onClick={() => saveMutation.mutate({ id: rule.id, updates: editedRules[rule.id] })}
                            className={hasChanges(rule.id) ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600'}
                          >
                            <Save size={14} className="mr-1" /> Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reply Events */}
      <Card className="bg-[#111118] border-white/5">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-400" />
            Recent Reply Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
            </div>
          ) : events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No reply events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">Lead</TableHead>
                    <TableHead className="text-gray-400">Reply Preview</TableHead>
                    <TableHead className="text-gray-400">Sentiment</TableHead>
                    <TableHead className="text-gray-400">Action Taken</TableHead>
                    <TableHead className="text-gray-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev: any) => (
                    <TableRow key={ev.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="text-gray-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {ev.created_at ? formatDistanceToNow(new Date(ev.created_at), { addSuffix: true }) : '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {ev.lead_name || ev.lead_email || ev.lead_id?.slice(0, 8) || '—'}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-[250px] truncate">
                        {ev.reply_preview || ev.reply_snippet || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${SENTIMENT_COLORS[ev.detected_sentiment] || 'bg-gray-500/15 text-gray-400'} border`}>
                          {ev.detected_sentiment || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {ev.action_taken?.replace(/_/g, ' ') || '—'}
                      </TableCell>
                      <TableCell className="text-gray-500 max-w-[200px] truncate text-xs">
                        {ev.details || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}