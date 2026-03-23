import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Eye, Copy, Link, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LeadMagnet {
  id: string;
  tenant_id: string;
  title: string;
  subtitle?: string;
  magnet_type: string;
  hero_headline?: string;
  hero_subheadline?: string;
  cta_button_text?: string;
  page_content?: string;
  target_industry?: string;
  target_audience?: string;
  views: number;
  submissions: number;
  conversion_rate: number;
  is_active: boolean;
  slug?: string;
  form_fields: any[];
  thank_you_message?: string;
}

const TYPE_LABELS: Record<string, string> = {
  landing_page: "Landing Page",
  roi_calculator: "ROI Calculator",
  checklist: "Checklist",
  case_study: "Case Study",
  free_tool: "Free Tool",
};

export default function LeadMagnets() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [previewMagnet, setPreviewMagnet] = useState<LeadMagnet | null>(null);
  const [newMagnet, setNewMagnet] = useState({
    title: "", subtitle: "", magnet_type: "free_tool", target_industry: "",
    hero_headline: "", cta_button_text: "Get Started", page_content: "",
    slug: "",
  });

  const { data: magnets = [], isLoading } = useQuery({
    queryKey: ["lead_magnets", tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lead_magnets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LeadMagnet[];
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (magnet: typeof newMagnet) => {
      const slug = magnet.slug || magnet.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
      const { error } = await (supabase as any)
        .from("lead_magnets")
        .insert({ ...magnet, slug, tenant_id: tenantId, form_fields: [
          { name: "email", label: "Work Email", type: "email", required: true },
          { name: "name", label: "Full Name", type: "text", required: true },
          { name: "company", label: "Company", type: "text", required: false },
        ]});
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_magnets", tenantId] });
      toast.success("Lead magnet created");
      setShowCreateDialog(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("lead_magnets")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lead_magnets", tenantId] }),
  });

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/lm/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><FileText className="h-8 w-8" /> Lead Magnets</h1>
          <p className="text-muted-foreground mt-1">Create landing pages that capture inbound leads</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Create Lead Magnet</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Lead Magnet</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <Input placeholder="Title *" value={newMagnet.title} onChange={(e) => setNewMagnet({ ...newMagnet, title: e.target.value })} />
              <Input placeholder="Subtitle" value={newMagnet.subtitle} onChange={(e) => setNewMagnet({ ...newMagnet, subtitle: e.target.value })} />
              <Select value={newMagnet.magnet_type} onValueChange={(v) => setNewMagnet({ ...newMagnet, magnet_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_tool">Free Tool</SelectItem>
                  <SelectItem value="landing_page">Landing Page</SelectItem>
                  <SelectItem value="roi_calculator">ROI Calculator</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                  <SelectItem value="case_study">Case Study</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Hero Headline" value={newMagnet.hero_headline} onChange={(e) => setNewMagnet({ ...newMagnet, hero_headline: e.target.value })} />
              <Input placeholder="CTA Button Text" value={newMagnet.cta_button_text} onChange={(e) => setNewMagnet({ ...newMagnet, cta_button_text: e.target.value })} />
              <Input placeholder="Target Industry" value={newMagnet.target_industry} onChange={(e) => setNewMagnet({ ...newMagnet, target_industry: e.target.value })} />
              <Input placeholder="URL Slug (auto-generated if empty)" value={newMagnet.slug} onChange={(e) => setNewMagnet({ ...newMagnet, slug: e.target.value })} />
              <Textarea placeholder="Page Content (markdown)" rows={6} value={newMagnet.page_content} onChange={(e) => setNewMagnet({ ...newMagnet, page_content: e.target.value })} />
              <Button className="w-full" onClick={() => createMutation.mutate(newMagnet)} disabled={!newMagnet.title}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{magnets.length}</div><div className="text-xs text-muted-foreground">Total Magnets</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-blue-400">{magnets.reduce((s, m) => s + m.views, 0)}</div><div className="text-xs text-muted-foreground">Total Views</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-400">{magnets.reduce((s, m) => s + m.submissions, 0)}</div><div className="text-xs text-muted-foreground">Total Submissions</div></CardContent></Card>
      </div>

      {/* Magnet Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {magnets.map((magnet) => (
          <Card key={magnet.id} className={magnet.is_active ? "" : "opacity-60"}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{magnet.title}</CardTitle>
                  {magnet.subtitle && <p className="text-sm text-muted-foreground mt-1">{magnet.subtitle}</p>}
                </div>
                <Switch checked={magnet.is_active} onCheckedChange={(v) => toggleMutation.mutate({ id: magnet.id, is_active: v })} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline">{TYPE_LABELS[magnet.magnet_type] || magnet.magnet_type}</Badge>
                {magnet.target_industry && <Badge variant="outline" className="bg-blue-500/10 text-blue-400">{magnet.target_industry}</Badge>}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div><div className="text-lg font-semibold">{magnet.views}</div><div className="text-xs text-muted-foreground">Views</div></div>
                <div><div className="text-lg font-semibold text-green-400">{magnet.submissions}</div><div className="text-xs text-muted-foreground">Submissions</div></div>
                <div><div className="text-lg font-semibold text-amber-400">{magnet.views > 0 ? Math.round((magnet.submissions / magnet.views) * 100) : 0}%</div><div className="text-xs text-muted-foreground">Conv. Rate</div></div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewMagnet(magnet)}><Eye className="h-3 w-3 mr-1" /> Preview</Button>
                {magnet.slug && <Button variant="outline" size="sm" onClick={() => copyLink(magnet.slug!)}><Copy className="h-3 w-3 mr-1" /> Copy Link</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {magnets.length === 0 && (
        <Card><CardContent className="pt-8 pb-8 text-center text-muted-foreground">No lead magnets yet. Create your first one above.</CardContent></Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewMagnet} onOpenChange={() => setPreviewMagnet(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{previewMagnet?.hero_headline || previewMagnet?.title}</DialogTitle></DialogHeader>
          {previewMagnet?.hero_subheadline && <p className="text-muted-foreground">{previewMagnet.hero_subheadline}</p>}
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{previewMagnet?.page_content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
