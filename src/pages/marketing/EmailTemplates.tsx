import { useState, useMemo } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Search, Copy, Eye, Star, Filter, Layers, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'nurture', label: 'Nurture' },
];

const INDUSTRIES = [
  { value: 'all', label: 'All Industries' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare_clinic', label: 'Healthcare' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'construction', label: 'Construction' },
  { value: 'general', label: 'General' },
];

const CATEGORY_COLORS: Record<string, string> = {
  welcome: 'bg-green-100 text-green-800',
  promotion: 'bg-purple-100 text-purple-800',
  follow_up: 'bg-blue-100 text-blue-800',
  newsletter: 'bg-amber-100 text-amber-800',
  announcement: 'bg-red-100 text-red-800',
  nurture: 'bg-indigo-100 text-indigo-800',
};

type EmailTemplate = {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  html_content: string;
  category: string;
  industry: string;
  tags: string[];
  variables: string[];
  preview_text: string | null;
  is_responsive: boolean;
  is_global: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
};

export default function EmailTemplates() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [customizeTemplate, setCustomizeTemplate] = useState<EmailTemplate | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customVars, setCustomVars] = useState<Record<string, string>>({});

  // Fetch templates (global + tenant-specific)
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email_templates', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('email_template_library')
        .select('*')
        .or(`is_global.eq.true,tenant_id.eq.${tenantConfig.id}`)
        .order('usage_count', { ascending: false });
      return (data || []) as EmailTemplate[];
    },
    enabled: !!tenantConfig?.id,
  });

  // Clone template for tenant
  const cloneTemplate = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      if (!tenantConfig?.id) throw new Error('No tenant');
      const { error } = await supabase.from('email_template_library').insert({
        tenant_id: tenantConfig.id,
        name: `${template.name} (Custom)`,
        subject: customSubject || template.subject,
        html_content: applyVariables(template.html_content, customVars),
        category: template.category,
        industry: template.industry,
        tags: template.tags,
        variables: template.variables,
        preview_text: template.preview_text,
        is_responsive: template.is_responsive,
        is_global: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email_templates'] });
      setCustomizeTemplate(null);
      toast({ title: 'Template cloned to your library!' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const applyVariables = (html: string, vars: Record<string, string>) => {
    let result = html;
    Object.entries(vars).forEach(([key, value]) => {
      if (value) result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  };

  const openCustomize = (template: EmailTemplate) => {
    setCustomSubject(template.subject);
    const vars: Record<string, string> = {};
    (template.variables || []).forEach(v => { vars[v] = ''; });
    setCustomVars(vars);
    setCustomizeTemplate(template);
  };

  const filtered = useMemo(() => {
    return templates.filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (industryFilter !== 'all' && t.industry !== industryFilter) return false;
      return true;
    });
  }, [templates, search, categoryFilter, industryFilter]);

  const stats = useMemo(() => ({
    total: templates.length,
    global: templates.filter(t => t.is_global).length,
    custom: templates.filter(t => !t.is_global).length,
    categories: [...new Set(templates.map(t => t.category))].length,
  }), [templates]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-indigo-500" /> Email Template Library
          </h1>
          <p className="text-muted-foreground">Browse, preview, and customize professional email templates</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Templates', value: stats.total, color: 'text-indigo-500', icon: Layers },
          { label: 'Global Templates', value: stats.global, color: 'text-blue-500', icon: Star },
          { label: 'Custom Templates', value: stats.custom, color: 'text-green-500', icon: Sparkles },
          { label: 'Categories', value: stats.categories, color: 'text-amber-500', icon: Filter },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Template Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No templates found matching your filters.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold line-clamp-1">{template.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{template.subject}</p>
                  </div>
                  {template.is_global && (
                    <Badge variant="outline" className="text-[10px] shrink-0 ml-2">Global</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Mini preview */}
                <div className="bg-muted/50 rounded-md p-2 mb-3 h-32 overflow-hidden">
                  <div
                    className="transform scale-[0.25] origin-top-left w-[400%] pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: template.html_content.substring(0, 2000) }}
                  />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge className={CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800'}>
                    {template.category}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{template.industry}</Badge>
                </div>

                <div className="flex items-center gap-1 mb-3 flex-wrap">
                  {(template.variables || []).slice(0, 4).map(v => (
                    <Badge key={v} variant="secondary" className="text-[10px]">{`{{${v}}}`}</Badge>
                  ))}
                  {(template.variables || []).length > 4 && (
                    <Badge variant="secondary" className="text-[10px]">+{template.variables.length - 4}</Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setPreviewTemplate(template)}>
                    <Eye className="h-3 w-3 mr-1" /> Preview
                  </Button>
                  <Button size="sm" className="flex-1 marketing-gradient text-white" onClick={() => openCustomize(template)}>
                    <Copy className="h-3 w-3 mr-1" /> Use
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Subject:</span>
              <span className="text-muted-foreground">{previewTemplate?.subject}</span>
            </div>
            <div className="flex gap-2">
              <Badge className={CATEGORY_COLORS[previewTemplate?.category || ''] || ''}>{previewTemplate?.category}</Badge>
              <Badge variant="outline">{previewTemplate?.industry}</Badge>
              {previewTemplate?.is_responsive && <Badge variant="secondary">Responsive</Badge>}
            </div>
            <div className="border rounded-lg p-4 bg-white">
              <div dangerouslySetInnerHTML={{ __html: previewTemplate?.html_content || '' }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewTemplate(null)}>Close</Button>
            <Button className="marketing-gradient text-white" onClick={() => {
              if (previewTemplate) { openCustomize(previewTemplate); setPreviewTemplate(null); }
            }}>
              <Copy className="h-4 w-4 mr-2" /> Customize & Use
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customize Dialog */}
      <Dialog open={!!customizeTemplate} onOpenChange={(open) => { if (!open) setCustomizeTemplate(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Template: {customizeTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject Line</label>
              <Input value={customSubject} onChange={e => setCustomSubject(e.target.value)} />
            </div>
            {Object.keys(customVars).length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Template Variables</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(customVars).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-muted-foreground">{`{{${key}}}`}</label>
                      <Input
                        value={value}
                        onChange={e => setCustomVars(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={key.replace(/_/g, ' ')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizeTemplate(null)}>Cancel</Button>
            <Button
              className="marketing-gradient text-white"
              onClick={() => customizeTemplate && cloneTemplate.mutate(customizeTemplate)}
            >
              Clone to My Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
