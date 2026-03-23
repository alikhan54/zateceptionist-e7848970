import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Search, ChevronRight, Rocket, CheckCircle2, Loader2, XCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INDUSTRIES = [
  { value: "all", label: "All Industries" },
  { value: "technology", label: "Technology" },
  { value: "restaurant", label: "Restaurant" },
  { value: "healthcare_clinic", label: "Healthcare" },
  { value: "construction", label: "Construction" },
  { value: "real_estate", label: "Real Estate" },
  { value: "general", label: "General" },
];

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "launch", label: "Launch" },
  { value: "nurture", label: "Nurture" },
  { value: "engagement", label: "Engagement" },
  { value: "content", label: "Content" },
  { value: "referral", label: "Referral" },
  { value: "seasonal", label: "Seasonal" },
];

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

const actionTypeIcons: Record<string, string> = {
  create_sequence: "Sequence",
  create_campaign: "Campaign",
  create_content: "Content",
  create_social_posts: "Social",
  setup_automation: "Automation",
  create_landing_page: "Landing Page",
};

export default function Playbooks() {
  const { toast } = useToast();
  const { tenantConfig } = useTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);
  const [activationResults, setActivationResults] = useState<any[] | null>(null);

  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["marketing_playbooks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("marketing_playbooks")
        .select("*")
        .eq("is_active", true)
        .order("industry", { ascending: true });
      return data || [];
    },
  });

  const activatePlaybook = useMutation({
    mutationFn: async (playbook: any) => {
      if (!tenantConfig?.id) throw new Error("No tenant configured");
      const steps = playbook.steps || [];
      const created: { type: string; title: string; success: boolean; error?: string }[] = [];

      for (const step of steps) {
        const actionType = step.action_type;
        const stepTitle = step.title || actionType;
        try {
          if (actionType === "create_sequence") {
            await supabase.from("sequences" as any).insert({
              tenant_id: tenantConfig.id,
              name: `[Playbook] ${stepTitle}`,
              description: step.description || `Auto-created from playbook: ${playbook.name}`,
              industry: playbook.industry,
              temperature: "WARM",
              steps: step.action_config?.steps || [],
              is_active: false,
            });
            created.push({ type: "Sequence", title: stepTitle, success: true });
          } else if (actionType === "create_campaign") {
            await supabase.from("campaigns" as any).insert({
              tenant_id: tenantConfig.id,
              name: `[Playbook] ${stepTitle}`,
              description: step.description || `Auto-created from playbook: ${playbook.name}`,
              status: "draft",
              campaign_type: step.action_config?.campaign_type || "email",
            });
            created.push({ type: "Campaign", title: stepTitle, success: true });
          } else if (actionType === "create_content" || actionType === "create_social_posts") {
            await supabase.from("social_posts" as any).insert({
              tenant_id: tenantConfig.id,
              post_text: step.description || `[Playbook] ${stepTitle}`,
              platform: step.action_config?.platform || "instagram",
              status: "draft",
              hashtags: [],
              mentions: [],
              media_urls: [],
              likes_count: 0,
              comments_count: 0,
              shares_count: 0,
              impressions: 0,
              reach: 0,
              clicks: 0,
              engagement_rate: 0,
            });
            created.push({ type: "Social Post", title: stepTitle, success: true });
          } else if (actionType === "create_landing_page") {
            await supabase.from("landing_pages" as any).insert({
              tenant_id: tenantConfig.id,
              name: `[Playbook] ${stepTitle}`,
              slug: stepTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50),
              html_content: `<h1>${stepTitle}</h1><p>${step.description || ""}</p>`,
              status: "draft",
              template_type: "playbook",
            });
            created.push({ type: "Landing Page", title: stepTitle, success: true });
          } else {
            // Any other action_type -> calendar reminder
            await supabase.from("smart_tasks" as any).insert({
              tenant_id: tenantConfig.id,
              title: `[Playbook] ${stepTitle}`,
              description: step.description || `From playbook: ${playbook.name}`,
              status: "pending",
              priority: "medium",
              source: "playbook",
            });
            created.push({ type: "Task", title: stepTitle, success: true });
          }
        } catch (err: any) {
          created.push({ type: actionTypeIcons[actionType] || actionType, title: stepTitle, success: false, error: err.message });
        }
      }

      // Update usage_count
      await supabase
        .from("marketing_playbooks" as any)
        .update({ usage_count: (playbook.usage_count || 0) + 1 })
        .eq("id", playbook.id);

      return created;
    },
    onSuccess: (results) => {
      setActivationResults(results);
      const successCount = results.filter((r) => r.success).length;
      toast({ title: "Playbook Activated!", description: `Created ${successCount} draft item(s)` });
      queryClient.invalidateQueries({ queryKey: ["marketing_playbooks"] });
    },
    onError: (error: any) => {
      toast({ title: "Activation Failed", description: error.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    return playbooks.filter((p: any) => {
      if (industry !== "all" && p.industry !== industry) return false;
      if (category !== "all" && p.category !== category) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [playbooks, industry, category, search]);

  const steps = selectedPlaybook?.steps || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Marketing Playbooks</h1>
          <p className="text-muted-foreground">Pre-built automation recipes for every industry</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search playbooks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Industry Tabs */}
      <Tabs value={industry} onValueChange={setIndustry}>
        <TabsList className="flex-wrap h-auto gap-1">
          {INDUSTRIES.map(i => (
            <TabsTrigger key={i.value} value={i.value} className="text-xs">{i.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Grid */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Loading playbooks...</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No playbooks found matching your filters.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pb: any) => (
            <Card key={pb.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedPlaybook(pb)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base leading-tight">{pb.name}</CardTitle>
                  <Badge className={difficultyColors[pb.difficulty] || ""}>{pb.difficulty}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pb.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {pb.estimated_time_minutes}min</span>
                  <span>{(pb.steps || []).length} steps</span>
                  <Badge variant="outline" className="text-[10px]">{pb.category}</Badge>
                </div>
                {pb.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pb.tags.slice(0, 3).map((t: string) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedPlaybook} onOpenChange={v => { if (!v) { setSelectedPlaybook(null); setActivationResults(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedPlaybook && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> {selectedPlaybook.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={difficultyColors[selectedPlaybook.difficulty] || ""}>{selectedPlaybook.difficulty}</Badge>
                <Badge variant="outline">{selectedPlaybook.category}</Badge>
                <Badge variant="outline">{selectedPlaybook.industry}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {selectedPlaybook.estimated_time_minutes} min</span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{selectedPlaybook.description}</p>
              {selectedPlaybook.expected_results && (
                <p className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded mb-3">
                  <strong>Expected Results:</strong> {selectedPlaybook.expected_results}
                </p>
              )}

              <h4 className="font-semibold text-sm mt-4 mb-2">Steps</h4>
              <div className="space-y-3">
                {steps.map((step: any, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg border">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {step.step_number || i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">
                          <ChevronRight className="h-3 w-3 mr-0.5" />
                          {actionTypeIcons[step.action_type] || step.action_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activationResults ? (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-sm">Activation Results</h4>
                  {activationResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded border text-sm">
                      {r.success ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className="font-medium">{r.type}:</span>
                      <span className="text-muted-foreground truncate">{r.title}</span>
                      {r.error && <span className="text-xs text-destructive ml-auto">{r.error}</span>}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full mt-2" onClick={() => { setActivationResults(null); setSelectedPlaybook(null); }}>
                    Done
                  </Button>
                </div>
              ) : (
                <Button className="w-full mt-4" disabled={activatePlaybook.isPending} onClick={() => activatePlaybook.mutate(selectedPlaybook)}>
                  {activatePlaybook.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating...</> : <><Rocket className="h-4 w-4 mr-2" /> Activate Playbook</>}
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
