import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Mail,
  MessageSquare,
  Clock,
  Users,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Target,
  Layers,
  BarChart3,
  ArrowRight,
  Phone,
  Copy,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const stepTypeConfig: Record<string, { icon: any; color: string; label: string }> = {
  email: { icon: Mail, color: "text-blue-500", label: "Email" },
  whatsapp: { icon: MessageSquare, color: "text-green-500", label: "WhatsApp" },
  sms: { icon: Phone, color: "text-purple-500", label: "SMS" },
  wait: { icon: Clock, color: "text-amber-500", label: "Wait" },
};

const triggerLabels: Record<string, string> = {
  manual: "Manual Enrollment",
  new_lead: "New Lead Created",
  new_contact: "New Contact Created",
  score_threshold: "Lead Score Threshold",
  tag_added: "Tag Added",
  form_submit: "Form Submission",
  purchase_complete: "After Purchase",
  inactivity_trigger: "Inactivity Trigger",
  appointment_noshow: "Appointment No-Show",
};

export default function MarketingSequences() {
  const { tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statsSequence, setStatsSequence] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", description: "", trigger_type: "manual" });

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["marketing_sequences", tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data, error } = await supabase
        .from("marketing_sequences" as any)
        .select("*")
        .eq("tenant_id", tenantConfig.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("marketing_sequences:", error.message);
        return [];
      }
      return (data || []).map((s: any) => ({
        ...s,
        steps: typeof s.steps === "string" ? JSON.parse(s.steps) : s.steps || [],
      }));
    },
    enabled: !!tenantConfig?.id,
  });

  const createSequence = useMutation({
    mutationFn: async (data: { name: string; description: string; trigger_type: string }) => {
      const { data: result, error } = await supabase
        .from("marketing_sequences" as any)
        .insert({
          tenant_id: tenantConfig?.id,
          ...data,
          is_active: false,
          steps: "[]",
          enrolled_count: 0,
          completed_count: 0,
          conversion_rate: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] });
      toast({ title: "✅ Sequence Created!" });
      setIsCreateOpen(false);
      setFormData({ name: "", description: "", trigger_type: "manual" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleSequence = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("marketing_sequences" as any)
        .update({ is_active: !is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] });
      toast({ title: "Sequence Updated" });
    },
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_sequences" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] });
      toast({ title: "Sequence Deleted" });
    },
  });

  const duplicateSequence = useMutation({
    mutationFn: async (seq: any) => {
      const { error } = await supabase
        .from("marketing_sequences" as any)
        .insert({
          tenant_id: tenantConfig?.id,
          name: `${seq.name} (Copy)`,
          description: seq.description,
          trigger_type: seq.trigger_type,
          is_active: false,
          steps: JSON.stringify(seq.steps),
          enrolled_count: 0,
          completed_count: 0,
          conversion_rate: 0,
        })
        .select()
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] });
      toast({ title: "Sequence Duplicated" });
    },
  });

  const activeCount = sequences.filter((s: any) => s.is_active).length;
  const totalEnrolled = sequences.reduce((sum: number, s: any) => sum + (s.enrolled_count || 0), 0);
  const avgConversion =
    sequences.length > 0
      ? Math.round(
          (sequences.reduce((sum: number, s: any) => sum + (s.conversion_rate || 0), 0) / sequences.length) * 10,
        ) / 10
      : 0;

  const statItems = [
    {
      label: "Total Sequences",
      value: sequences.length,
      icon: Layers,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    { label: "Active", value: activeCount, icon: Play, color: "text-green-500", bg: "bg-green-500/10" },
    {
      label: "Total Enrolled",
      value: totalEnrolled.toLocaleString(),
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Avg Conversion",
      value: `${avgConversion}%`,
      icon: Target,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Marketing Sequences
          </h1>
          <p className="text-muted-foreground mt-1">Automated multi-step campaigns triggered by customer behavior</p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="h-4 w-4 mr-2" /> New Sequence
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
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

      {sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Sequences Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Create automated sequences to nurture leads and re-engage customers.
            </p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create First Sequence
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sequences.map((sequence: any) => {
            const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
            return (
              <Card
                key={sequence.id}
                className={`relative overflow-hidden transition-all hover:shadow-md ${sequence.is_active ? "border-green-500/30" : ""}`}
              >
                {sequence.is_active && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{sequence.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={sequence.is_active ? "default" : "secondary"} className="text-xs">
                          {sequence.is_active ? "● Active" : "Paused"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {triggerLabels[sequence.trigger_type] || sequence.trigger_type}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => toggleSequence.mutate({ id: sequence.id, is_active: sequence.is_active })}
                        >
                          {sequence.is_active ? (
                            <>
                              <Pause className="h-4 w-4 mr-2" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" /> Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatsSequence(sequence)}>
                          <BarChart3 className="h-4 w-4 mr-2" /> View Stats
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateSequence.mutate(sequence)}>
                          <Copy className="h-4 w-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this sequence? This cannot be undone."))
                              deleteSequence.mutate(sequence.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {sequence.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sequence.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-1 mb-4 overflow-hidden">
                    {steps.slice(0, 6).map((step: any, idx: number) => {
                      const cfg = stepTypeConfig[step.type] || stepTypeConfig.email;
                      const StepIcon = cfg.icon;
                      return (
                        <div key={idx} className="flex items-center">
                          <div
                            className={`p-1.5 rounded-md bg-muted ${cfg.color}`}
                            title={`Step ${idx + 1}: ${cfg.label}`}
                          >
                            <StepIcon className="h-3.5 w-3.5" />
                          </div>
                          {idx < steps.length - 1 && idx < 5 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 mx-0.5 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {steps.length > 6 && (
                      <span className="text-xs text-muted-foreground ml-1">+{steps.length - 6}</span>
                    )}
                    {steps.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">No steps configured</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div>
                      <p className="text-lg font-bold">{steps.length}</p>
                      <p className="text-[10px] text-muted-foreground">Steps</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{(sequence.enrolled_count || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Enrolled</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{sequence.conversion_rate || 0}%</p>
                      <p className="text-[10px] text-muted-foreground">Converted</p>
                    </div>
                  </div>
                  <Progress value={sequence.conversion_rate || 0} className="h-1.5 mb-3" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setStatsSequence(sequence)}>
                      <BarChart3 className="h-3 w-3 mr-1" /> Stats
                    </Button>
                    <Button
                      size="sm"
                      className={`flex-1 ${sequence.is_active ? "" : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"}`}
                      variant={sequence.is_active ? "outline" : "default"}
                      onClick={() => toggleSequence.mutate({ id: sequence.id, is_active: sequence.is_active })}
                    >
                      {sequence.is_active ? (
                        <>
                          <Pause className="h-3 w-3 mr-1" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" /> Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" /> Create Marketing Sequence
            </DialogTitle>
            <DialogDescription>Build an automated multi-step campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sequence Name</Label>
              <Input
                placeholder="e.g., Welcome Series, Hot Lead Nurture"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What does this sequence do?"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, trigger_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(triggerLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              disabled={!formData.name.trim() || createSequence.isPending}
              onClick={() => createSequence.mutate(formData)}
            >
              {createSequence.isPending ? "Creating..." : "Create Sequence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog - shows sequence performance and step breakdown */}
      <Dialog open={!!statsSequence} onOpenChange={() => setStatsSequence(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              {statsSequence?.name} - Performance
            </DialogTitle>
          </DialogHeader>
          {statsSequence && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {(statsSequence.enrolled_count || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total Enrolled</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {(statsSequence.completed_count || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Completed</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-3xl font-bold text-purple-600">{statsSequence.conversion_rate || 0}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-3xl font-bold text-amber-600">{(statsSequence.steps || []).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Steps</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-3">Sequence Steps</h4>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {(statsSequence.steps || []).map((step: any, idx: number) => {
                      const cfg = stepTypeConfig[step.type] || stepTypeConfig.email;
                      const StepIcon = cfg.icon;
                      const delayText =
                        step.delay_hours === 0
                          ? "Immediately"
                          : step.delay_hours < 24
                            ? `After ${step.delay_hours}h`
                            : `After ${Math.round(step.delay_hours / 24)}d`;
                      return (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                          <div className={`p-2 rounded-lg bg-background ${cfg.color}`}>
                            <StepIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                Step {idx + 1}: {cfg.label}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {delayText}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {step.subject || step.content?.slice(0, 60) || "No content"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Trigger: {triggerLabels[statsSequence.trigger_type] || statsSequence.trigger_type}</span>
                <span>
                  Created{" "}
                  {statsSequence.created_at
                    ? formatDistanceToNow(new Date(statsSequence.created_at), { addSuffix: true })
                    : "recently"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
