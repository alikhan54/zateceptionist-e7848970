import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Mail, Clock, Users, Play, Pause, 
  Sparkles, Target, Layers, BarChart3, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MarketingSequences() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', trigger_type: 'manual' });

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['marketing_sequences', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from('marketing_sequences' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('marketing_sequences table may not exist:', error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!tenantConfig?.id
  });

  const createSequence = useMutation({
    mutationFn: async (data: { name: string; description: string; trigger_type: string }) => {
      const { data: result, error } = await supabase
        .from('marketing_sequences' as any)
        .insert({ tenant_id: tenantConfig?.id, ...data, is_active: false })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_sequences'] });
      toast({ title: '✅ Sequence Created!' });
      setIsCreateOpen(false);
      setFormData({ name: '', description: '', trigger_type: 'manual' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const statItems = [
    { label: 'Total Sequences', value: sequences.length, icon: Layers, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Active', value: sequences.filter((s: any) => s.is_active).length, icon: Play, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Total Enrolled', value: sequences.reduce((sum: number, s: any) => sum + (s.enrolled_count || 0), 0), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Avg Conversion', value: `${sequences.length > 0 ? Math.round(sequences.reduce((sum: number, s: any) => sum + (s.conversion_rate || 0), 0) / sequences.length) : 0}%`, icon: Target, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold marketing-gradient-text">Marketing Sequences</h1>
          <p className="text-muted-foreground mt-1">Automated multi-step campaigns with personalization</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> New Sequence
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((stat, idx) => (
          <Card key={idx} className="stat-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sequences List */}
      {sequences.length === 0 ? (
        <Card>
          <div className="empty-state py-12">
            <Mail className="empty-state-icon" />
            <h3 className="font-semibold text-lg mb-2">No Sequences Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Create automated multi-step campaigns that send personalized messages based on contact behavior and timing.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Sequence
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences.map((sequence: any) => (
            <Card key={sequence.id} className="stat-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{sequence.name}</CardTitle>
                  <Badge variant={sequence.is_active ? 'default' : 'secondary'}>
                    {sequence.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <CardDescription>{sequence.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                  <div>
                    <p className="text-xl font-bold">{sequence.total_steps || 0}</p>
                    <p className="text-xs text-muted-foreground">Steps</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{sequence.enrolled_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Enrolled</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{sequence.conversion_rate || 0}%</p>
                    <p className="text-xs text-muted-foreground">Converted</p>
                  </div>
                </div>
                <Progress value={sequence.conversion_rate || 0} className="h-2 mb-3" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <BarChart3 className="h-3 w-3 mr-1" /> Stats
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Edit <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Marketing Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sequence Name</Label>
              <Input 
                placeholder="e.g., Welcome Series, Re-engagement" 
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="What does this sequence do?" 
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={formData.trigger_type} onValueChange={v => setFormData(prev => ({ ...prev, trigger_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Enrollment</SelectItem>
                  <SelectItem value="new_contact">New Contact Created</SelectItem>
                  <SelectItem value="tag_added">Tag Added</SelectItem>
                  <SelectItem value="form_submit">Form Submission</SelectItem>
                  <SelectItem value="purchase">After Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button 
              className="marketing-gradient text-white" 
              disabled={!formData.name.trim() || createSequence.isPending}
              onClick={() => createSequence.mutate(formData)}
            >
              {createSequence.isPending ? 'Creating...' : 'Create Sequence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
