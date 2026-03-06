import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  GitBranch,
  Plus,
  Save,
  Trash2,
  Play,
  Pause,
  Phone,
  MessageSquare,
  Bot,
  PhoneForwarded,
  Voicemail,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  X,
  Settings2,
  Layers,
  Loader2,
  Sparkles,
  LayoutTemplate,
  Building2,
  Copy,
} from "lucide-react";

interface IVRNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  next?: string | null;
}

interface IVRFlow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  phone_number_id: string | null;
  nodes: IVRNode[];
  is_active: boolean;
  vapi_workflow_id: string | null;
  created_at: string;
  updated_at: string;
  is_default?: boolean;
  language?: string | null;
  industry?: string | null;
  version?: number | null;
}

interface IVRTemplate {
  id: string;
  industry: string;
  name: string;
  description: string | null;
  nodes: IVRNode[];
  trigger_type: string;
  is_active: boolean;
  created_at: string;
}

const NODE_TYPES = [
  { type: "greeting", label: "Greeting", icon: Phone, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", description: "Play a welcome message" },
  { type: "menu", label: "Menu", icon: Layers, color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", description: "DTMF menu with options" },
  { type: "ai_conversation", label: "AI Conversation", icon: Bot, color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", description: "AI handles the conversation" },
  { type: "transfer", label: "Transfer", icon: PhoneForwarded, color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", description: "Transfer to a phone number" },
  { type: "voicemail", label: "Voicemail", icon: Voicemail, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", description: "Send to voicemail" },
  { type: "sms", label: "Send SMS", icon: MessageSquare, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300", description: "Send an SMS to the caller" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", description: "Branch based on a condition" },
  { type: "end", label: "End Call", icon: Phone, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", description: "Hang up the call" },
];

const INDUSTRY_ICONS: Record<string, string> = {
  healthcare: "\u{1FA7A}", real_estate: "\u{1F3E0}", restaurant: "\u{1F37D}\u{FE0F}",
  salon: "\u{2702}\u{FE0F}", technology: "\u{1F4BB}", automotive: "\u{1F697}",
  legal: "\u{2696}\u{FE0F}", finance: "\u{1F4B0}", call_centre: "\u{1F4DE}",
  general: "\u{2B50}",
};

export default function VoiceIVRBuilder() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [editingFlow, setEditingFlow] = useState<IVRFlow | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState("all");

  // Fetch IVR flows (SLUG tenant_id)
  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["ivr-flows", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("ivr_flows")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) { console.error("[VoiceIVRBuilder] Error:", error); return []; }
      return (data || []) as IVRFlow[];
    },
    enabled: !!tenantId,
  });

  // Fetch IVR templates from database
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["ivr-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ivr_templates")
        .select("*")
        .eq("is_active", true)
        .order("industry", { ascending: true });
      if (error) { console.error("[VoiceIVRBuilder] Templates error:", error); return []; }
      return (data || []) as IVRTemplate[];
    },
  });

  const uniqueIndustries = [...new Set(templates.map((t) => t.industry))];
  const filteredTemplates = templateFilter === "all"
    ? templates
    : templates.filter((t) => t.industry === templateFilter);

  // Create flow
  const createFlow = useMutation({
    mutationFn: async ({ name, description, nodes }: { name: string; description: string; nodes: IVRNode[] }) => {
      const { data, error } = await supabase
        .from("ivr_flows")
        .insert({
          tenant_id: tenantId,
          name,
          description: description || null,
          nodes: nodes as any,
          is_active: false,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ivr-flows"] });
      setShowCreateForm(false);
      setShowTemplateGallery(false);
      setNewFlowName("");
      setNewFlowDescription("");
      if (data) {
        setSelectedFlow(data.id);
        setEditingFlow(data as IVRFlow);
      }
      toast({ title: "Flow created", description: "IVR flow has been created." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Save flow nodes
  const saveFlow = useMutation({
    mutationFn: async () => {
      if (!editingFlow) return;
      const { error } = await supabase
        .from("ivr_flows")
        .update({
          name: editingFlow.name,
          description: editingFlow.description,
          nodes: editingFlow.nodes as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingFlow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ivr-flows"] });
      toast({ title: "Saved", description: "IVR flow updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ivr_flows")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ivr-flows"] });
      toast({ title: "Updated", description: "Flow status changed." });
    },
  });

  // Delete flow
  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ivr_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ivr-flows"] });
      setSelectedFlow(null);
      setEditingFlow(null);
      toast({ title: "Deleted", description: "IVR flow deleted." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Duplicate flow
  const duplicateFlow = useMutation({
    mutationFn: async (flow: IVRFlow) => {
      const { data, error } = await supabase
        .from("ivr_flows")
        .insert({
          tenant_id: tenantId,
          name: `${flow.name} (Copy)`,
          description: flow.description,
          nodes: flow.nodes as any,
          is_active: false,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ivr-flows"] });
      toast({ title: "Duplicated", description: "Flow copied successfully." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Add node to editing flow
  const addNode = (type: string) => {
    if (!editingFlow) return;
    const nodeType = NODE_TYPES.find((n) => n.type === type);
    const newNode: IVRNode = {
      id: `n${Date.now()}`,
      type,
      label: nodeType?.label || type,
      config: {},
      next: null,
    };
    const updatedNodes = [...editingFlow.nodes, newNode];
    if (updatedNodes.length >= 2) {
      updatedNodes[updatedNodes.length - 2].next = newNode.id;
    }
    setEditingFlow({ ...editingFlow, nodes: updatedNodes });
  };

  // Remove node
  const removeNode = (nodeId: string) => {
    if (!editingFlow) return;
    const updated = editingFlow.nodes.filter((n) => n.id !== nodeId);
    updated.forEach((n) => { if (n.next === nodeId) n.next = null; });
    setEditingFlow({ ...editingFlow, nodes: updated });
  };

  // Update node config
  const updateNodeConfig = (nodeId: string, key: string, value: any) => {
    if (!editingFlow) return;
    const updated = editingFlow.nodes.map((n) =>
      n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n
    );
    setEditingFlow({ ...editingFlow, nodes: updated });
  };

  const updateNodeLabel = (nodeId: string, label: string) => {
    if (!editingFlow) return;
    const updated = editingFlow.nodes.map((n) => n.id === nodeId ? { ...n, label } : n);
    setEditingFlow({ ...editingFlow, nodes: updated });
  };

  // Move node up/down
  const moveNode = (index: number, direction: "up" | "down") => {
    if (!editingFlow) return;
    const nodes = [...editingFlow.nodes];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= nodes.length) return;
    [nodes[index], nodes[target]] = [nodes[target], nodes[index]];
    // Re-link next pointers
    nodes.forEach((n, i) => { n.next = i < nodes.length - 1 ? nodes[i + 1].id : null; });
    setEditingFlow({ ...editingFlow, nodes });
  };

  const selectFlow = (flow: IVRFlow) => {
    setSelectedFlow(flow.id);
    setEditingFlow({ ...flow });
  };

  // Create from template
  const createFromTemplate = (template: IVRTemplate) => {
    // Generate new IDs for each node to avoid conflicts
    const nodeIdMap: Record<string, string> = {};
    const newNodes = template.nodes.map((node) => {
      const newId = `n${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      nodeIdMap[node.id] = newId;
      return { ...node, id: newId };
    });
    // Update next pointers with new IDs
    newNodes.forEach((node) => {
      if (node.next && nodeIdMap[node.next]) {
        node.next = nodeIdMap[node.next];
      }
    });
    createFlow.mutate({
      name: template.name,
      description: template.description || "",
      nodes: newNodes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Flow List + Create */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {flows.length} IVR flow{flows.length !== 1 ? "s" : ""} configured
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowTemplateGallery(!showTemplateGallery); setShowCreateForm(false); }}>
            <LayoutTemplate className="h-4 w-4 mr-2" />
            {showTemplateGallery ? "Hide Templates" : "Template Gallery"}
          </Button>
          <Button size="sm" onClick={() => { setShowCreateForm(!showCreateForm); setShowTemplateGallery(false); }}>
            {showCreateForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {showCreateForm ? "Cancel" : "New Flow"}
          </Button>
        </div>
      </div>

      {/* Template Gallery */}
      {showTemplateGallery && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Industry Template Gallery
            </CardTitle>
            <CardDescription>
              Pre-built IVR flows optimized for your industry. Click to create a flow from any template.
            </CardDescription>
            {/* Industry filter pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant={templateFilter === "all" ? "default" : "outline"} size="sm" className="h-7 text-xs"
                onClick={() => setTemplateFilter("all")}>
                All ({templates.length})
              </Button>
              {uniqueIndustries.map((ind) => (
                <Button key={ind} variant={templateFilter === ind ? "default" : "outline"} size="sm" className="h-7 text-xs"
                  onClick={() => setTemplateFilter(ind)}>
                  {INDUSTRY_ICONS[ind] || "\u{2B50}"} {ind.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading templates...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">No templates found for this filter.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <div key={tpl.id}
                    className="p-4 rounded-lg border hover:border-primary/50 hover:shadow-md cursor-pointer transition-all group"
                    onClick={() => createFromTemplate(tpl)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{INDUSTRY_ICONS[tpl.industry] || "\u{2B50}"}</span>
                        <div>
                          <p className="font-medium text-sm">{tpl.name}</p>
                          <Badge variant="outline" className="text-[10px] capitalize mt-0.5">
                            <Building2 className="h-2.5 w-2.5 mr-0.5" />
                            {tpl.industry.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {(tpl.nodes || []).length} nodes
                      </Badge>
                    </div>
                    {tpl.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>
                    )}
                    {/* Node preview */}
                    <div className="flex items-center gap-1 mt-3 flex-wrap">
                      {(tpl.nodes || []).slice(0, 5).map((node, i) => {
                        const nt = NODE_TYPES.find((n) => n.type === node.type);
                        return (
                          <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${nt?.color || "bg-gray-100"}`}>
                              {node.type === "ai_conversation" ? "AI" : node.type}
                            </span>
                          </span>
                        );
                      })}
                      {(tpl.nodes || []).length > 5 && (
                        <span className="text-[10px] text-muted-foreground">+{(tpl.nodes || []).length - 5} more</span>
                      )}
                    </div>
                    <p className="text-xs text-primary font-medium mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to use this template &rarr;
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Empty IVR Flow</CardTitle>
            <CardDescription>Start from scratch — add nodes manually using the builder</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Flow Name</Label>
                <Input placeholder="e.g. Main Reception Flow" value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="e.g. Handles all inbound calls" value={newFlowDescription}
                  onChange={(e) => setNewFlowDescription(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => createFlow.mutate({ name: newFlowName || "New IVR Flow", description: newFlowDescription, nodes: [] })}
              disabled={createFlow.isPending}>
              {createFlow.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {createFlow.isPending ? "Creating..." : "Create Empty Flow"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Flow List */}
      {flows.length === 0 && !showCreateForm && !showTemplateGallery ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No IVR Flows</h3>
            <p className="text-muted-foreground mb-4">
              Create your first IVR flow to handle inbound calls with automated menus, AI conversations, and call routing.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setShowTemplateGallery(true)}>
                <LayoutTemplate className="h-4 w-4 mr-2" /> Browse Templates
              </Button>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create From Scratch
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        !editingFlow && flows.length > 0 && (
          <div className="space-y-3">
            {flows.map((flow) => (
              <Card key={flow.id}
                className={`cursor-pointer hover:border-primary/30 transition-colors ${selectedFlow === flow.id ? "border-primary" : ""}`}
                onClick={() => selectFlow(flow)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{flow.name}</p>
                          {flow.is_default && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Default</Badge>
                          )}
                          {flow.version && flow.version > 1 && (
                            <Badge variant="secondary" className="text-xs">v{flow.version}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(flow.nodes || []).length} nodes &middot; {flow.trigger_type || "inbound"} &middot; Created {new Date(flow.created_at).toLocaleDateString()}
                        </p>
                        {flow.description && <p className="text-xs text-muted-foreground mt-0.5">{flow.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); duplicateFlow.mutate(flow); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Badge className={flow.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-600"}>
                        {flow.is_active ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                        {flow.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Flow Editor */}
      {editingFlow && (
        <div className="space-y-4">
          {/* Editor Header */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedFlow(null); setEditingFlow(null); }}>
                    <ChevronRight className="h-4 w-4 mr-1 rotate-180" /> Back
                  </Button>
                  <div>
                    <Input className="font-medium text-lg border-none shadow-none p-0 h-auto"
                      value={editingFlow.name}
                      onChange={(e) => setEditingFlow({ ...editingFlow, name: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editingFlow.is_active}
                    onCheckedChange={(checked) => {
                      setEditingFlow({ ...editingFlow, is_active: checked });
                      toggleActive.mutate({ id: editingFlow.id, is_active: checked });
                    }} />
                  <span className="text-sm text-muted-foreground">{editingFlow.is_active ? "Active" : "Inactive"}</span>
                  <Button variant="outline" size="sm" onClick={() => saveFlow.mutate()} disabled={saveFlow.isPending}>
                    {saveFlow.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {saveFlow.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="destructive" size="sm"
                    onClick={() => { if (confirm("Delete this IVR flow?")) deleteFlow.mutate(editingFlow.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Node Palette */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Add Node</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-2">
                {NODE_TYPES.map((nt) => {
                  const Icon = nt.icon;
                  return (
                    <Button key={nt.type} variant="outline" size="sm" className="h-8" onClick={() => addNode(nt.type)}>
                      <Icon className="h-3.5 w-3.5 mr-1.5" /> {nt.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Flow Canvas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5" /> Flow Nodes
              </CardTitle>
              <CardDescription>
                {editingFlow.nodes.length} node{editingFlow.nodes.length !== 1 ? "s" : ""} in this flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingFlow.nodes.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No nodes yet. Add nodes from the palette above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editingFlow.nodes.map((node, idx) => {
                    const nodeType = NODE_TYPES.find((nt) => nt.type === node.type);
                    const Icon = nodeType?.icon || Settings2;
                    const isExpanded = expandedNode === node.id;

                    return (
                      <div key={node.id}>
                        <div className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${isExpanded ? "bg-muted/50 border-primary/30" : ""}`}
                          onClick={() => setExpandedNode(isExpanded ? null : node.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                              <div className={`h-8 w-8 rounded flex items-center justify-center ${nodeType?.color || "bg-gray-100"}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{node.label}</p>
                                <p className="text-xs text-muted-foreground">{nodeType?.description || node.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Move buttons */}
                              <div className="flex flex-col gap-0.5">
                                <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0}
                                  onClick={(e) => { e.stopPropagation(); moveNode(idx, "up"); }}>
                                  <ChevronRight className="h-3 w-3 -rotate-90" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5" disabled={idx === editingFlow.nodes.length - 1}
                                  onClick={(e) => { e.stopPropagation(); moveNode(idx, "down"); }}>
                                  <ChevronRight className="h-3 w-3 rotate-90" />
                                </Button>
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">{node.type}</Badge>
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Config */}
                        {isExpanded && (
                          <div className="ml-9 mr-2 mt-1 mb-2 p-4 bg-muted/30 rounded-lg border space-y-3">
                            <div className="space-y-2">
                              <Label>Node Label</Label>
                              <Input value={node.label} onChange={(e) => updateNodeLabel(node.id, e.target.value)} />
                            </div>

                            {(node.type === "greeting" || node.type === "end") && (
                              <div className="space-y-2">
                                <Label>Message</Label>
                                <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                  value={node.config.message || ""} onChange={(e) => updateNodeConfig(node.id, "message", e.target.value)} />
                              </div>
                            )}

                            {node.type === "ai_conversation" && (
                              <div className="space-y-2">
                                <Label>AI Prompt</Label>
                                <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                                  value={node.config.prompt || ""} onChange={(e) => updateNodeConfig(node.id, "prompt", e.target.value)}
                                  placeholder="Describe what the AI should do..." />
                              </div>
                            )}

                            {node.type === "transfer" && (
                              <>
                                <div className="space-y-2">
                                  <Label>Transfer to Number</Label>
                                  <Input placeholder="+1234567890" value={node.config.number || ""}
                                    onChange={(e) => updateNodeConfig(node.id, "number", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Transfer Message</Label>
                                  <Input placeholder="Transferring you now..." value={node.config.message || ""}
                                    onChange={(e) => updateNodeConfig(node.id, "message", e.target.value)} />
                                </div>
                              </>
                            )}

                            {node.type === "sms" && (
                              <div className="space-y-2">
                                <Label>SMS Message</Label>
                                <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                  value={node.config.message || ""} onChange={(e) => updateNodeConfig(node.id, "message", e.target.value)} />
                              </div>
                            )}

                            {node.type === "voicemail" && (
                              <div className="space-y-2">
                                <Label>Voicemail Greeting</Label>
                                <Input placeholder="Please leave a message after the tone..."
                                  value={node.config.message || ""} onChange={(e) => updateNodeConfig(node.id, "message", e.target.value)} />
                              </div>
                            )}

                            {node.type === "menu" && (
                              <div className="space-y-2">
                                <Label>Menu Prompt</Label>
                                <textarea className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                                  placeholder="Press 1 for Support, 2 for Sales..."
                                  value={node.config.prompt || ""} onChange={(e) => updateNodeConfig(node.id, "prompt", e.target.value)} />
                              </div>
                            )}

                            {node.type === "condition" && (
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Field</Label>
                                  <Input placeholder="e.g. lead_score" value={node.config.field || ""}
                                    onChange={(e) => updateNodeConfig(node.id, "field", e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Operator</Label>
                                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={node.config.operator || "=="} onChange={(e) => updateNodeConfig(node.id, "operator", e.target.value)}>
                                    <option value="==">equals</option>
                                    <option value="!=">not equals</option>
                                    <option value=">">greater than</option>
                                    <option value=">=">greater or equal</option>
                                    <option value="<">less than</option>
                                    <option value="<=">less or equal</option>
                                    <option value="contains">contains</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Value</Label>
                                  <Input placeholder="e.g. 70" value={node.config.value || ""}
                                    onChange={(e) => updateNodeConfig(node.id, "value", e.target.value)} />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                              <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Arrow to next node */}
                        {idx < editingFlow.nodes.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
