import { useState, useCallback } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook } from "@/integrations/supabase/client";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedSequenceForEnroll, setSelectedSequenceForEnroll] = useState<any>(null);

  // Customers query for enrollment
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-for-enroll', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig) return [];
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone_number, email')
        .eq('tenant_id', tenantConfig.id || (tenantConfig as any).tenant_id)
        .limit(100);
      return data || [];
    },
    enabled: !!tenantConfig && enrollDialogOpen,
  });

  // Enrollments query
  const { data: enrollments = [], refetch: refetchEnrollments } = useQuery({
    queryKey: ['sequence-enrollments', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('sequence_enrollments' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('enrolled_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!tenantConfig?.id,
  });

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

  const handleEnrollCustomer = async (customerId: string) => {
    if (!tenantConfig?.id || !selectedSequenceForEnroll) return;
    try {
      const result = await callWebhook(
        '/ai-tool/enroll-sequence',
        {
          sequence_id: selectedSequenceForEnroll.id,
          lead_id: customerId,
          sequence_name: selectedSequenceForEnroll.name,
          reason: 'manual_enrollment_from_ui',
        },
        tenantConfig.id,
      );
      if (result.success) {
        toast({ title: "✅ Customer enrolled in sequence!" });
        refetchEnrollments();
        setEnrollDialogOpen(false);
      } else {
        toast({ title: "Enrollment failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

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
                  {/* Visual step flow with branching indicators */}
                  <div className="flex items-center gap-1 mb-4 overflow-hidden flex-wrap">
                    {steps.slice(0, 6).map((step: any, idx: number) => {
                      const cfg = stepTypeConfig[step.type] || stepTypeConfig.email;
                      const StepIcon = cfg.icon;
                      const hasBranching = step.conditions && Object.keys(step.conditions).length > 0;
                      return (
                        <div key={idx} className="flex items-center">
                          <div className="relative">
                            <div
                              className={`p-1.5 rounded-md bg-muted ${cfg.color} ${hasBranching ? 'ring-2 ring-amber-500/50' : ''}`}
                              title={`Step ${idx + 1}: ${cfg.label}${hasBranching ? ' (has branching)' : ''}`}
                            >
                              <StepIcon className="h-3.5 w-3.5" />
                            </div>
                            {hasBranching && (
                              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-background" title="Branching rules" />
                            )}
                          </div>
                          {idx < steps.length - 1 && idx < 5 && (
                            <ArrowRight className={`h-3 w-3 mx-0.5 shrink-0 ${hasBranching ? 'text-amber-500/60' : 'text-muted-foreground/40'}`} />
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
                  {/* Branching indicators for steps with conditions */}
                  {steps.some((s: any) => s.conditions && Object.keys(s.conditions).length > 0) && (
                    <div className="mb-3 space-y-1">
                      {steps.map((step: any, idx: number) => {
                        if (!step.conditions || Object.keys(step.conditions).length === 0) return null;
                        const c = step.conditions;
                        return (
                          <div key={idx} className="text-[10px] space-y-0.5">
                            {c.if_opened && (
                              <p className="text-green-600 flex items-center gap-1">↗️ Step {idx + 1}: If opened → Jump to Step {c.if_opened}</p>
                            )}
                            {c.if_replied && (
                              <p className="text-blue-600 flex items-center gap-1">↗️ Step {idx + 1}: If replied → {c.if_replied === 'complete' ? 'Mark complete' : `Jump to Step ${c.if_replied}`}</p>
                            )}
                            {c.no_engagement_after && (
                              <p className="text-orange-600 flex items-center gap-1">↗️ Step {idx + 1}: No engagement after {c.no_engagement_sends || 3} sends → {c.switch_channel ? `Switch to ${c.switch_channel}` : `Jump to Step ${c.no_engagement_after}`}</p>
                            )}
                            {c.if_read_no_reply && (
                              <p className="text-amber-600 flex items-center gap-1">↗️ Step {idx + 1}: Read but no reply → Jump to Step {c.if_read_no_reply}</p>
                            )}
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-muted-foreground mt-1 italic">💡 Behavioral branching lets the AI Brain route leads through different paths based on engagement.</p>
                    </div>
                  )}
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
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setSelectedSequenceForEnroll(sequence); setEnrollDialogOpen(true); }}
                    >
                      <Users className="h-3 w-3 mr-1" /> Enroll Customer
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

      {/* Active Enrollments Table */}
      {enrollments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> Active Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead ID</TableHead>
                  <TableHead>Sequence Name</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled By</TableHead>
                  <TableHead>Enrolled At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.lead_id?.slice(0, 8)}</TableCell>
                    <TableCell>{e.sequence_name || '—'}</TableCell>
                    <TableCell>{e.current_step || 0}/{e.total_steps || '?'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        e.status === 'active' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' :
                        e.status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                        e.status === 'paused' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                        'bg-muted text-muted-foreground'
                      }>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{e.enrolled_by || '—'}</TableCell>
                    <TableCell className="text-xs">{e.enrolled_at ? formatDistanceToNow(new Date(e.enrolled_at), { addSuffix: true }) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Enroll Customer Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" /> Enroll Customer
            </DialogTitle>
            <DialogDescription>
              Select a customer to enroll in "{selectedSequenceForEnroll?.name}"
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-2">
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No customers found</p>
              ) : (
                customers.map((c: any) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleEnrollCustomer(c.id)}
                  >
                    <div>
                      <p className="font-medium text-sm">{c.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{c.phone_number || c.email || 'No contact'}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Users className="h-3 w-3 mr-1" /> Enroll
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
