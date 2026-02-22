import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callWebhook } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import {
  Plus, Mail, MessageSquare, Clock, Users, Play, Pause, Trash2, Sparkles,
  Target, Layers, BarChart3, ArrowRight, Phone, Copy, MoreVertical, Info,
  Activity, Zap, CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const stepTypeConfig: Record<string, { icon: any; color: string; label: string; emoji: string }> = {
  email: { icon: Mail, color: "text-blue-500", label: "Email", emoji: "📧" },
  whatsapp: { icon: MessageSquare, color: "text-green-500", label: "WhatsApp", emoji: "💬" },
  sms: { icon: Phone, color: "text-purple-500", label: "SMS", emoji: "📱" },
  wait: { icon: Clock, color: "text-amber-500", label: "Wait", emoji: "⏳" },
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
  const [detailSequence, setDetailSequence] = useState<any>(null);
  const [detailTab, setDetailTab] = useState("steps");
  const [formData, setFormData] = useState({ name: "", description: "", trigger_type: "manual" });
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedSequenceForEnroll, setSelectedSequenceForEnroll] = useState<any>(null);

  // ─── Queries ───
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

  const { data: enrollments = [], refetch: refetchEnrollments } = useQuery({
    queryKey: ['sequence-enrollments', tenantConfig?.id],
    queryFn: async () => {
      if (!tenantConfig?.id) return [];
      const { data } = await supabase
        .from('sequence_enrollments' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .order('enrolled_at', { ascending: false })
        .limit(100);
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
      if (error) { console.warn("marketing_sequences:", error.message); return []; }
      return (data || []).map((s: any) => ({
        ...s,
        steps: typeof s.steps === "string" ? JSON.parse(s.steps) : s.steps || [],
      }));
    },
    enabled: !!tenantConfig?.id,
  });

  // Execution log from system_events
  const { data: executionLogs = [] } = useQuery({
    queryKey: ['sequence-execution-log', tenantConfig?.id, detailSequence?.id],
    queryFn: async () => {
      if (!tenantConfig?.id || !detailSequence?.id) return [];
      const { data } = await supabase
        .from('system_events' as any)
        .select('*')
        .eq('tenant_id', tenantConfig.id)
        .in('event_type', ['sequence_step_executed', 'sequence_enrollment'])
        .order('created_at', { ascending: false })
        .limit(30);
      // Filter by sequence_id in event_data
      return (data || []).filter((e: any) => {
        const ed = typeof e.event_data === 'string' ? JSON.parse(e.event_data) : e.event_data;
        return ed?.sequence_id === detailSequence.id || JSON.stringify(ed).includes(detailSequence.id);
      });
    },
    enabled: !!tenantConfig?.id && !!detailSequence?.id,
  });

  // ─── Mutations ───
  const createSequence = useMutation({
    mutationFn: async (data: { name: string; description: string; trigger_type: string }) => {
      const { data: result, error } = await supabase
        .from("marketing_sequences" as any)
        .insert({ tenant_id: tenantConfig?.id, ...data, is_active: false, steps: "[]", enrolled_count: 0, completed_count: 0, conversion_rate: 0 })
        .select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] }); toast({ title: "✅ Sequence Created!" }); setIsCreateOpen(false); setFormData({ name: "", description: "", trigger_type: "manual" }); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleSequence = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("marketing_sequences" as any).update({ is_active: !is_active, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] }); toast({ title: "Sequence Updated" }); },
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("marketing_sequences" as any).delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] }); toast({ title: "Sequence Deleted" }); },
  });

  const duplicateSequence = useMutation({
    mutationFn: async (seq: any) => {
      const { error } = await supabase.from("marketing_sequences" as any).insert({
        tenant_id: tenantConfig?.id, name: `${seq.name} (Copy)`, description: seq.description, trigger_type: seq.trigger_type,
        is_active: false, steps: JSON.stringify(seq.steps), enrolled_count: 0, completed_count: 0, conversion_rate: 0,
      }).select().single();
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing_sequences"] }); toast({ title: "Sequence Duplicated" }); },
  });

  const handleEnrollCustomer = async (customerId: string) => {
    if (!tenantConfig?.id || !selectedSequenceForEnroll) return;
    try {
      const result = await callWebhook('/ai-tool/enroll-sequence', {
        sequence_id: selectedSequenceForEnroll.id,
        lead_id: customerId,
        sequence_name: selectedSequenceForEnroll.name,
        reason: 'manual_enrollment_from_ui',
      }, tenantConfig.id);
      if (result.success) {
        toast({ title: "✅ Lead enrolled in sequence!", description: "AI Brain will execute the first step within 2 hours." });
        refetchEnrollments();
        setEnrollDialogOpen(false);
      } else {
        toast({ title: "Enrollment failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ─── Computed ───
  const activeCount = sequences.filter((s: any) => s.is_active).length;
  const totalEnrolled = sequences.reduce((sum: number, s: any) => sum + (s.enrolled_count || 0), 0);
  const totalCompleted = sequences.reduce((sum: number, s: any) => sum + (s.completed_count || 0), 0);
  const avgConversion = sequences.length > 0 ? Math.round(sequences.reduce((sum: number, s: any) => sum + (s.conversion_rate || 0), 0) / sequences.length * 10) / 10 : 0;

  // Enrollments for detail sequence
  const detailEnrollments = detailSequence ? enrollments.filter((e: any) => e.sequence_id === detailSequence.id || e.sequence_name === detailSequence.name) : [];

  if (isLoading) {
    return <div className="space-y-6 p-6"><Skeleton className="h-8 w-64" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div></div>;
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Info banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 flex items-center gap-3 text-sm">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>Sequences are executed by the AI Brain every 2 hours. The AI decides the best channel and timing based on lead engagement patterns. Manual enrollment available below.</span>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-purple-500" />Marketing Sequences</h1>
          <p className="text-muted-foreground mt-1">Automated multi-step campaigns triggered by customer behavior</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
          <Plus className="h-4 w-4 mr-2" /> New Sequence
        </Button>
      </div>

      {/* Global dashboard stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Sequences", value: sequences.length, icon: Layers, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Active", value: activeCount, icon: Play, color: "text-green-500", bg: "bg-green-500/10" },
          { label: "Total Enrolled", value: totalEnrolled.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Completed", value: totalCompleted.toLocaleString(), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Avg Conversion", value: `${avgConversion}%`, icon: Target, color: "text-amber-500", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
              <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sequence cards */}
      {sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No Sequences Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">Create automated sequences to nurture leads and re-engage customers.</p>
            <Button className="mt-4" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Create First Sequence</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sequences.map((sequence: any) => {
            const steps = Array.isArray(sequence.steps) ? sequence.steps : [];
            const seqEnrollments = enrollments.filter((e: any) => e.sequence_id === sequence.id || e.sequence_name === sequence.name);
            const activeEnrollments = seqEnrollments.filter((e: any) => e.status === 'active').length;
            const completedEnrollments = seqEnrollments.filter((e: any) => e.status === 'completed').length;

            return (
              <Card key={sequence.id} className={`relative overflow-hidden transition-all hover:shadow-md cursor-pointer ${sequence.is_active ? "border-green-500/30" : ""}`} onClick={() => { setDetailSequence(sequence); setDetailTab("steps"); }}>
                {sequence.is_active && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{sequence.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={sequence.is_active ? "default" : "secondary"} className="text-xs">{sequence.is_active ? "● Active" : "Paused"}</Badge>
                        <span className="text-xs text-muted-foreground">{triggerLabels[sequence.trigger_type] || sequence.trigger_type}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={e => e.stopPropagation()}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); toggleSequence.mutate({ id: sequence.id, is_active: sequence.is_active }); }}>
                          {sequence.is_active ? <><Pause className="h-4 w-4 mr-2" /> Pause</> : <><Play className="h-4 w-4 mr-2" /> Activate</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); duplicateSequence.mutate(sequence); }}><Copy className="h-4 w-4 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); if (confirm("Delete?")) deleteSequence.mutate(sequence.id); }}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {sequence.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sequence.description}</p>}
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Step flow */}
                  <div className="flex items-center gap-1 mb-3 overflow-hidden flex-wrap">
                    {steps.slice(0, 6).map((step: any, idx: number) => {
                      const cfg = stepTypeConfig[step.type] || stepTypeConfig.email;
                      const StepIcon = cfg.icon;
                      const hasBranching = step.conditions && Object.keys(step.conditions).length > 0;
                      return (
                        <div key={idx} className="flex items-center">
                          <div className="relative">
                            <div className={`p-1.5 rounded-md bg-muted ${cfg.color} ${hasBranching ? 'ring-2 ring-amber-500/50' : ''}`} title={`Step ${idx+1}: ${cfg.label}`}>
                              <StepIcon className="h-3.5 w-3.5" />
                            </div>
                            {hasBranching && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-background" />}
                          </div>
                          {idx < steps.length - 1 && idx < 5 && <ArrowRight className="h-3 w-3 mx-0.5 shrink-0 text-muted-foreground/40" />}
                        </div>
                      );
                    })}
                    {steps.length > 6 && <span className="text-xs text-muted-foreground ml-1">+{steps.length - 6}</span>}
                    {steps.length === 0 && <span className="text-xs text-muted-foreground italic">No steps configured</span>}
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div><p className="text-lg font-bold">{steps.length}</p><p className="text-[10px] text-muted-foreground">Steps</p></div>
                    <div><p className="text-lg font-bold">{(sequence.enrolled_count || 0).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Enrolled</p></div>
                    <div><p className="text-lg font-bold">{activeEnrollments}</p><p className="text-[10px] text-muted-foreground">Active</p></div>
                    <div><p className="text-lg font-bold">{sequence.conversion_rate || 0}%</p><p className="text-[10px] text-muted-foreground">CVR</p></div>
                  </div>
                  <Progress value={sequence.conversion_rate || 0} className="h-1.5 mb-3" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={e => { e.stopPropagation(); setSelectedSequenceForEnroll(sequence); setEnrollDialogOpen(true); }}>
                      <Users className="h-3 w-3 mr-1" /> Enroll
                    </Button>
                    <Button size="sm" className={`flex-1 ${sequence.is_active ? "" : "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"}`} variant={sequence.is_active ? "outline" : "default"}
                      onClick={e => { e.stopPropagation(); toggleSequence.mutate({ id: sequence.id, is_active: sequence.is_active }); }}>
                      {sequence.is_active ? <><Pause className="h-3 w-3 mr-1" />Pause</> : <><Play className="h-3 w-3 mr-1" />Activate</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── DETAIL VIEW DIALOG ─── */}
      <Dialog open={!!detailSequence} onOpenChange={() => setDetailSequence(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              {detailSequence?.name}
              <Badge variant={detailSequence?.is_active ? "default" : "secondary"} className="ml-2 text-xs">{detailSequence?.is_active ? "● Active" : "Paused"}</Badge>
            </DialogTitle>
            <DialogDescription>{triggerLabels[detailSequence?.trigger_type] || detailSequence?.trigger_type} • {(detailSequence?.steps || []).length} steps</DialogDescription>
          </DialogHeader>

          {detailSequence && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-blue-600">{(detailSequence.enrolled_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-green-600">{(detailSequence.completed_count || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-purple-600">{detailSequence.conversion_rate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-amber-600">{detailEnrollments.filter((e: any) => e.status === 'active').length}</p>
                  <p className="text-xs text-muted-foreground">Active Now</p>
                </div>
              </div>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex-1 flex flex-col min-h-0">
                <TabsList>
                  <TabsTrigger value="steps">Steps Pipeline</TabsTrigger>
                  <TabsTrigger value="enrollments">Enrollments ({detailEnrollments.length})</TabsTrigger>
                  <TabsTrigger value="log">Execution Log</TabsTrigger>
                </TabsList>

                {/* Steps Pipeline */}
                <TabsContent value="steps" className="flex-1 overflow-auto">
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2 p-1">
                      {(detailSequence.steps || []).map((step: any, idx: number) => {
                        const cfg = stepTypeConfig[step.type] || stepTypeConfig.email;
                        const StepIcon = cfg.icon;
                        const delayText = step.delay_hours === 0 ? "Immediately" : step.delay_hours < 24 ? `After ${step.delay_hours}h` : `After ${Math.round(step.delay_hours / 24)}d`;
                        const hasBranching = step.conditions && Object.keys(step.conditions).length > 0;

                        return (
                          <div key={idx}>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                              <div className="flex flex-col items-center">
                                <div className={`p-2 rounded-lg bg-background ${cfg.color} border`}><StepIcon className="h-4 w-4" /></div>
                                {idx < (detailSequence.steps || []).length - 1 && <div className="w-0.5 h-6 bg-border mt-1" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{cfg.emoji} Step {idx + 1}: {cfg.label}</span>
                                  <Badge variant="outline" className="text-[10px]">{delayText}</Badge>
                                  {hasBranching && <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">Branching</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.subject || step.content?.slice(0, 80) || "No content"}</p>
                                {/* Branching details */}
                                {hasBranching && (
                                  <div className="mt-1.5 space-y-0.5">
                                    {step.conditions.if_opened && <p className="text-[10px] text-green-600">↗️ If opened → Jump to Step {step.conditions.if_opened}</p>}
                                    {step.conditions.if_replied && <p className="text-[10px] text-blue-600">↗️ If replied → {step.conditions.if_replied === 'complete' ? 'Mark complete' : `Jump to Step ${step.conditions.if_replied}`}</p>}
                                    {step.conditions.no_engagement_after && <p className="text-[10px] text-orange-600">↗️ No engagement → {step.conditions.switch_channel ? `Switch to ${step.conditions.switch_channel}` : `Jump to Step ${step.conditions.no_engagement_after}`}</p>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(detailSequence.steps || []).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">No steps configured yet</p>
                          <p className="text-xs">Steps are added via the AI Brain or n8n workflows</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Enrollments */}
                <TabsContent value="enrollments" className="flex-1 overflow-auto">
                  {detailEnrollments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No enrollments yet</p>
                      <Button size="sm" className="mt-2" variant="outline" onClick={() => { setSelectedSequenceForEnroll(detailSequence); setEnrollDialogOpen(true); }}>
                        <Users className="h-3 w-3 mr-1" /> Enroll Lead
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Step</TableHead>
                            <TableHead>Enrolled At</TableHead>
                            <TableHead>Enrolled By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailEnrollments.map((e: any) => (
                            <TableRow key={e.id}>
                              <TableCell className="font-mono text-xs">{e.lead_id?.slice(0, 8)}...</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  e.status === 'active' ? 'bg-blue-500/15 text-blue-600 border-blue-500/30' :
                                  e.status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                                  e.status === 'paused' ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' :
                                  'bg-muted text-muted-foreground'
                                }>{e.status}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{e.current_step || 0}/{e.total_steps || '?'}</TableCell>
                              <TableCell className="text-xs">{e.enrolled_at ? formatDistanceToNow(new Date(e.enrolled_at), { addSuffix: true }) : '—'}</TableCell>
                              <TableCell className="text-xs">{e.enrolled_by || 'AI Brain'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </TabsContent>

                {/* Execution Log */}
                <TabsContent value="log" className="flex-1 overflow-auto">
                  {executionLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No execution events recorded yet</p>
                      <p className="text-xs">Events appear here as the AI Brain executes sequence steps</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-2 p-1">
                        {executionLogs.map((log: any) => {
                          const ed = typeof log.event_data === 'string' ? JSON.parse(log.event_data) : log.event_data || {};
                          const isExecution = log.event_type === 'sequence_step_executed';
                          return (
                            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border text-sm">
                              <div className={`p-1.5 rounded-md ${isExecution ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                                {isExecution ? <Zap className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">
                                  {isExecution
                                    ? `🤖 Step ${ed.step_number || '?'} executed for lead ${(ed.lead_id || '').slice(0, 8)}... via ${ed.channel || 'email'}`
                                    : `📧 Lead ${(ed.lead_id || '').slice(0, 8)}... enrolled ${ed.reason ? `(reason: ${ed.reason})` : ''}`
                                  }
                                </p>
                                {ed.ai_decision && <p className="text-[10px] text-muted-foreground mt-0.5">AI decision: {ed.ai_decision}</p>}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {log.created_at ? format(new Date(log.created_at), "MMM d, h:mm a") : ''}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Created {detailSequence.created_at ? formatDistanceToNow(new Date(detailSequence.created_at), { addSuffix: true }) : 'recently'}</span>
                <Button size="sm" variant="outline" onClick={() => { setSelectedSequenceForEnroll(detailSequence); setEnrollDialogOpen(true); }}>
                  <Users className="h-3 w-3 mr-1" /> Enroll Lead
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-500" /> Create Marketing Sequence</DialogTitle>
            <DialogDescription>Build an automated multi-step campaign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Sequence Name</Label><Input placeholder="e.g., Welcome Series" value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="What does this sequence do?" value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={formData.trigger_type} onValueChange={v => setFormData(prev => ({ ...prev, trigger_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(triggerLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white" disabled={!formData.name.trim() || createSequence.isPending} onClick={() => createSequence.mutate(formData)}>
              {createSequence.isPending ? "Creating..." : "Create Sequence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Customer Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-500" /> Enroll Lead</DialogTitle>
            <DialogDescription>Select a customer to enroll in "{selectedSequenceForEnroll?.name}"</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 py-2">
              {customers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No customers found</p>
              ) : (
                customers.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleEnrollCustomer(c.id)}>
                    <div>
                      <p className="font-medium text-sm">{c.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{c.phone_number || c.email || 'No contact'}</p>
                    </div>
                    <Button size="sm" variant="outline"><Users className="h-3 w-3 mr-1" /> Enroll</Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <p className="text-xs text-muted-foreground text-center">AI Brain will execute the first step within 2 hours of enrollment.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
