import { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Eye, Target, Lightbulb, BarChart3, Globe, Search, TrendingUp, CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CompetitorAnalysis() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['competitor_analysis', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('competitor_analysis')
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

  const addCompetitor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('competitor_analysis').insert({
        tenant_id: tenantConfig?.id,
        competitor_name: name,
        instagram_url: instagramUrl || null,
        website_url: websiteUrl || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor_analysis'] });
      toast({ title: '✨ Competitor Added!' });
      setIsCreateOpen(false);
      setName('');
      setInstagramUrl('');
      setWebsiteUrl('');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add competitor', variant: 'destructive' });
    },
  });

  const tracked = competitors.length;
  const analyzed = competitors.filter((c: any) => c.status === 'analyzed').length;
  const opportunities = competitors.reduce((sum: number, c: any) => sum + (c.opportunities?.length || 0), 0);
  const actionItems = competitors.reduce((sum: number, c: any) => sum + (c.action_items?.length || 0), 0);

  const statCards = [
    { label: 'Tracked', value: tracked, icon: Eye, color: 'text-purple-500' },
    { label: 'Analyzed', value: analyzed, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Opportunities', value: opportunities, icon: Lightbulb, color: 'text-amber-500' },
    { label: 'Action Items', value: actionItems, icon: Target, color: 'text-blue-500' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Competitor Intel</h1>
          <p className="text-muted-foreground">AI-powered competitor analysis and monitoring</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Competitor
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="stat-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {competitors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Competitors Tracked</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Add competitors to monitor their content, engagement, and strategies with AI analysis.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="marketing-gradient text-white mt-4">
              <Plus className="h-4 w-4 mr-2" /> Add Your First Competitor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {competitors.map((comp: any) => (
            <Card key={comp.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{comp.competitor_name}</h3>
                      <Badge variant={comp.status === 'analyzed' ? 'default' : 'secondary'}>
                        {comp.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {comp.website_url && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {comp.website_url}
                        </span>
                      )}
                      {comp.instagram_url && (
                        <span className="flex items-center gap-1">📸 {comp.instagram_url}</span>
                      )}
                      {comp.created_at && (
                        <span>Added {formatDistanceToNow(new Date(comp.created_at), { addSuffix: true })}</span>
                      )}
                    </div>
                    {comp.content_themes && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(Array.isArray(comp.content_themes) ? comp.content_themes : []).map((theme: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{theme}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {comp.engagement_rate != null && (
                      <div className="text-center">
                        <p className="font-semibold">{comp.engagement_rate}%</p>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                    )}
                    {comp.posting_frequency && (
                      <div className="text-center">
                        <p className="font-semibold">{comp.posting_frequency}</p>
                        <p className="text-xs text-muted-foreground">Posts/wk</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Competitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Competitor Name *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Instagram URL</Label>
              <Input value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/acme" />
            </div>
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://acme.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => addCompetitor.mutate()} disabled={!name.trim() || addCompetitor.isPending} className="marketing-gradient text-white">
              {addCompetitor.isPending ? 'Adding...' : 'Add Competitor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
