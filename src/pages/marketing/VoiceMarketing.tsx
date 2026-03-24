import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Phone, PhoneCall, Clock, TrendingUp, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { callWebhook, WEBHOOKS } from '@/lib/api/webhooks';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const PURPOSES = [
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'survey', label: 'Survey' },
  { value: 'winback', label: 'Win Back' },
  { value: 'nurture', label: 'Nurture' },
];

export default function VoiceMarketing() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCall, setNewCall] = useState({
    phone: '',
    name: '',
    purpose: '',
    script: '',
  });

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ['voice_marketing_calls', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig) return [];
      const { data } = await (supabase as any)
        .from('voice_marketing_calls')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!tenantConfig,
  });

  const makeCall = useMutation({
    mutationFn: async () => {
      if (!tenantConfig) throw new Error('No tenant');
      const res = await callWebhook(WEBHOOKS.VOICE_CALL, {
        phone: newCall.phone,
        name: newCall.name,
        purpose: newCall.purpose,
        script: newCall.script || undefined,
      }, tenantConfig.id);
      if (!res.success) throw new Error(res.error || 'Call failed');
      return res;
    },
    onSuccess: () => {
      toast({ title: 'Call initiated', description: `Calling ${newCall.name || newCall.phone}...` });
      setDialogOpen(false);
      setNewCall({ phone: '', name: '', purpose: '', script: '' });
      queryClient.invalidateQueries({ queryKey: ['voice_marketing_calls'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Call failed', description: err.message, variant: 'destructive' });
    },
  });

  // Stats
  const totalCalls = calls.length;
  const completedCalls = calls.filter((c: any) => c.status === 'completed');
  const successRate = totalCalls > 0
    ? Math.round((completedCalls.length / totalCalls) * 100)
    : 0;
  const avgDuration = completedCalls.length > 0
    ? Math.round(completedCalls.reduce((sum: number, c: any) => sum + (c.duration_seconds || 0), 0) / completedCalls.length)
    : 0;
  const positiveSentiment = completedCalls.length > 0
    ? Math.round((completedCalls.filter((c: any) => c.sentiment === 'positive').length / completedCalls.length) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Completed</Badge>;
      case 'failed': return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Failed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">In Progress</Badge>;
      default: return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">Pending</Badge>;
    }
  };

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Positive</Badge>;
      case 'negative': return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Negative</Badge>;
      case 'neutral': return <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/30">Neutral</Badge>;
      default: return <Badge variant="outline">--</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Phone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Voice Marketing</h1>
            <p className="text-muted-foreground">Automated voice outreach campaigns</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Voice Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <Input
                  placeholder="Lead name"
                  value={newCall.name}
                  onChange={(e) => setNewCall({ ...newCall, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone Number</label>
                <Input
                  placeholder="+1234567890"
                  value={newCall.phone}
                  onChange={(e) => setNewCall({ ...newCall, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Purpose</label>
                <Select value={newCall.purpose} onValueChange={(v) => setNewCall({ ...newCall, purpose: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Custom Script (optional)</label>
                <Textarea
                  placeholder="Enter a custom script for this call..."
                  value={newCall.script}
                  onChange={(e) => setNewCall({ ...newCall, script: e.target.value })}
                  rows={3}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => makeCall.mutate()}
                disabled={!newCall.phone || !newCall.purpose || makeCall.isPending}
              >
                {makeCall.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Calling...
                  </>
                ) : (
                  <>
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Call Now
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalCalls}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{successRate}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{avgDuration}s</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-bold">{positiveSentiment}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>Call Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No voice marketing calls yet.</p>
              <p className="text-sm">Click "New Call" to start your first campaign.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Lead</th>
                    <th className="pb-3 pr-4">Phone</th>
                    <th className="pb-3 pr-4">Purpose</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Duration</th>
                    <th className="pb-3 pr-4">Outcome</th>
                    <th className="pb-3 pr-4">Sentiment</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call: any) => (
                    <tr key={call.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 pr-4 font-medium">{call.lead_name || call.name || '--'}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{call.phone || '--'}</td>
                      <td className="py-3 pr-4 capitalize">{(call.purpose || '').replace('_', ' ')}</td>
                      <td className="py-3 pr-4">{getStatusBadge(call.status)}</td>
                      <td className="py-3 pr-4">{call.duration_seconds ? `${call.duration_seconds}s` : '--'}</td>
                      <td className="py-3 pr-4">{call.outcome || '--'}</td>
                      <td className="py-3 pr-4">{getSentimentBadge(call.sentiment)}</td>
                      <td className="py-3 text-muted-foreground">
                        {call.created_at ? format(new Date(call.created_at), 'MMM d, h:mm a') : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
