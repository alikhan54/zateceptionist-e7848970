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
  Copy,
  Settings2,
  Layers,
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
}

const NODE_TYPES = [
  { type: "greeting", label: "Greeting", icon: Phone, color: "bg-blue-100 text-blue-700", description: "Play a welcome message" },
  { type: "menu", label: "Menu", icon: Layers, color: "bg-purple-100 text-purple-700", description: "DTMF menu with options" },
  { type: "ai_conversation", label: "AI Conversation", icon: Bot, color: "bg-green-100 text-green-700", description: "AI handles the conversation" },
  { type: "transfer", label: "Transfer", icon: PhoneForwarded, color: "bg-amber-100 text-amber-700", description: "Transfer to a phone number" },
  { type: "voicemail", label: "Voicemail", icon: Voicemail, color: "bg-red-100 text-red-700", description: "Send to voicemail" },
  { type: "sms", label: "Send SMS", icon: MessageSquare, color: "bg-indigo-100 text-indigo-700", description: "Send an SMS to the caller" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "bg-orange-100 text-orange-700", description: "Branch based on a condition" },
  { type: "end", label: "End Call", icon: Phone, color: "bg-gray-100 text-gray-700", description: "Hang up the call" },
];

const TEMPLATES = [
  {
    name: "Appointment Booking",
    description: "Greeting > AI collects appointment details > Confirms booking > End",
    nodes: [
      { id: "n1", type: "greeting", label: "Welcome", config: { message: "Thank you for calling. I'd be happy to help you schedule an appointment." }, next: "n2" },
      { id: "n2", type: "ai_conversation", label: "Book Appointment", config: { prompt: "Help the caller book an appointment. Collect their name, preferred date/time, and service needed." }, next: "n3" },
      { id: "n3", type: "sms", label: "Confirm SMS", config: { message: "Your appointment has been confirmed. We look forward to seeing you!" }, next: "n4" },
      { id: "n4", type: "end", label: "Goodbye", config: { message: "Thank you for booking. Goodbye!" } },
    ],
  },
  {
    name: "Lead Qualification",
    description: "Greeting > AI qualifies lead > Transfer hot leads > Voicemail others",
    nodes: [
      { id: "n1", type: "greeting", label: "Welcome", config: { message: "Hi there! Thanks for your interest. Let me connect you with our AI assistant." }, next: "n2" },
      { id: "n2", type: "ai_conversation", label: "Qualify Lead", config: { prompt: "Qualify this lead by asking about their needs, budget, and timeline." }, next: "n3" },
      { id: "n3", type: "condition", label: "Hot Lead?", config: { field: "lead_score", operator: ">=", value: "70" }, next: "n4" },
      { id: "n4", type: "transfer", label: "Transfer to Sales", config: { number: "", message: "Transferring you to our sales team now." } },
    ],
  },
  {
    name: "Customer Support",
    description: "Greeting > Menu (1: Support, 2: Sales, 3: Billing) > Route accordingly",
    nodes: [
      { id: "n1", type: "greeting", label: "Welcome", config: { message: "Welcome to customer support. Please listen to the following options." }, next: "n2" },
      { id: "n2", type: "menu", label: "Main Menu", config: { options: [{ key: "1", label: "Technical Support", next: "n3" }, { key: "2", label: "Sales", next: "n4" }, { key: "3", label: "Billing", next: "n5" }] }, next: null },
      { id: "n3", type: "ai_conversation", label: "Tech Support AI", config: { prompt: "Help the customer with their technical issue." } },
      { id: "n4", type: "transfer", label: "Sales Team", config: { number: "", message: "Connecting you to sales." } },
      { id: "n5", type: "ai_conversation", label: "Billing AI", config: { prompt: "Help the customer with billing questions." } },
    ],
  },
  {
    name: "Sales Inquiry",
    description: "Greeting > AI sales pitch > Collect contact > SMS follow-up > End",
    nodes: [
      { id: "n1", type: "greeting", label: "Welcome", config: { message: "Thanks for calling! I'd love to tell you about our services." }, next: "n2" },
      { id: "n2", type: "ai_conversation", label: "Sales Pitch", config: { prompt: "Present our services and answer any questions. Try to collect their email for follow-up." }, next: "n3" },
      { id: "n3", type: "sms", label: "Follow-up SMS", config: { message: "Thanks for your interest! Here's a link to learn more: [link]" }, next: "n4" },
      { id: "n4", type: "end", label: "Goodbye", config: { message: "Thanks for your time! We'll be in touch." } },
    ],
  },
];

export default function VoiceIVRBuilder() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);
  const [editingFlow, setEditingFlow] = useState<IVRFlow | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  // Fetch IVR flows (SLUG tenant_id for ivr_flows table)
  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["ivr-flows", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("ivr_flows")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[VoiceIVRBuilder] Error:", error);
        return [];
      }
      return (data || []) as IVRFlow[];
    },
    enabled: !!tenantId,
  });

  // Create flow
  const createFlow = useMutation({
    mutationFn: async ({
      name,
      description,
      nodes,
    }: {
      name: string;
      description: string;
      nodes: IVRNode[];
    }) => {
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
      setNewFlowName("");
      setNewFlowDescription("");
      if (data) {
        setSelectedFlow(data.id);
        setEditingFlow(data as IVRFlow);
      }
      toast({ title: "Flow created", description: "IVR flow has been created." });
    },
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
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
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  // Toggle active
  const toggleActive = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
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
    onError: (err: any) =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
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
    // Auto-link previous node to new node
    if (updatedNodes.length >= 2) {
      updatedNodes[updatedNodes.length - 2].next = newNode.id;
    }
    setEditingFlow({ ...editingFlow, nodes: updatedNodes });
  };

  // Remove node
  const removeNode = (nodeId: string) => {
    if (!editingFlow) return;
    const updated = editingFlow.nodes.filter((n) => n.id !== nodeId);
    // Fix broken links
    updated.forEach((n) => {
      if (n.next === nodeId) n.next = null;
    });
    setEditingFlow({ ...editingFlow, nodes: updated });
  };

  // Update node config
  const updateNodeConfig = (
    nodeId: string,
    key: string,
    value: any
  ) => {
    if (!editingFlow) return;
    const updated = editingFlow.nodes.map((n) => {
      if (n.id === nodeId) {
        return { ...n, config: { ...n.config, [key]: value } };
      }
      return n;
    });
    setEditingFlow({ ...editingFlow, nodes: updated });
  };

  const updateNodeLabel = (nodeId: string, label: string) => {
    if (!editingFlow) return;
    const updated = editingFlow.nodes.map((n) =>
      n.id === nodeId ? { ...n, label } : n
    );
    setEditingFlow({ ...editingFlow, nodes: updated });
  };

  // Select a flow for editing
  const selectFlow = (flow: IVRFlow) => {
    setSelectedFlow(flow.id);
    setEditingFlow({ ...flow });
  };

  return (
    <div className="space-y-6">
      {/* Flow List + Create */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {flows.length} IVR flow{flows.length !== 1 ? "s" : ""} configured
        </p>
        <Button
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? (
            <X className="h-4 w-4 mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {showCreateForm ? "Cancel" : "New Flow"}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create IVR Flow</CardTitle>
            <CardDescription>
              Start from scratch or use a template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Flow Name</Label>
                <Input
                  placeholder="e.g. Main Reception Flow"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  placeholder="e.g. Handles all inbound calls"
                  value={newFlowDescription}
                  onChange={(e) => setNewFlowDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Templates */}
            <div>
              <Label className="mb-2 block">Quick Start Templates</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.name}
                    className="p-3 rounded-lg border hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() =>
                      createFlow.mutate({
                        name: tpl.name,
                        description: tpl.description,
                        nodes: tpl.nodes,
                      })
                    }
                  >
                    <p className="font-medium text-sm">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tpl.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() =>
                createFlow.mutate({
                  name: newFlowName || "New IVR Flow",
                  description: newFlowDescription,
                  nodes: [],
                })
              }
              disabled={createFlow.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              {createFlow.isPending ? "Creating..." : "Create Empty Flow"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Flow List */}
      {flows.length === 0 && !showCreateForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No IVR Flows</h3>
            <p className="text-muted-foreground mb-4">
              Create your first IVR flow to handle inbound calls with automated
              menus, AI conversations, and call routing.
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Your First Flow
            </Button>
          </CardContent>
        </Card>
      ) : (
        !editingFlow && (
          <div className="space-y-3">
            {flows.map((flow) => (
              <Card
                key={flow.id}
                className={`cursor-pointer hover:border-primary/30 transition-colors ${
                  selectedFlow === flow.id ? "border-primary" : ""
                }`}
                onClick={() => selectFlow(flow)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GitBranch className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{flow.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(flow.nodes || []).length} nodes &middot;{" "}
                          {flow.trigger_type} &middot; Created{" "}
                          {new Date(flow.created_at).toLocaleDateString()}
                        </p>
                        {flow.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {flow.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          flow.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }
                      >
                        {flow.is_active ? (
                          <Play className="h-3 w-3 mr-1" />
                        ) : (
                          <Pause className="h-3 w-3 mr-1" />
                        )}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFlow(null);
                      setEditingFlow(null);
                    }}
                  >
                    <ChevronRight className="h-4 w-4 mr-1 rotate-180" /> Back
                  </Button>
                  <div>
                    <Input
                      className="font-medium text-lg border-none shadow-none p-0 h-auto"
                      value={editingFlow.name}
                      onChange={(e) =>
                        setEditingFlow({
                          ...editingFlow,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingFlow.is_active}
                    onCheckedChange={(checked) => {
                      setEditingFlow({ ...editingFlow, is_active: checked });
                      toggleActive.mutate({
                        id: editingFlow.id,
                        is_active: checked,
                      });
                    }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {editingFlow.is_active ? "Active" : "Inactive"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveFlow.mutate()}
                    disabled={saveFlow.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveFlow.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteFlow.mutate(editingFlow.id)}
                  >
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
                    <Button
                      key={nt.type}
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={() => addNode(nt.type)}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      {nt.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Flow Canvas (linear node list) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5" /> Flow Nodes
              </CardTitle>
              <CardDescription>
                {editingFlow.nodes.length} node
                {editingFlow.nodes.length !== 1 ? "s" : ""} in this flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingFlow.nodes.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No nodes yet. Add nodes from the palette above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {editingFlow.nodes.map((node, idx) => {
                    const nodeType = NODE_TYPES.find(
                      (nt) => nt.type === node.type
                    );
                    const Icon = nodeType?.icon || Settings2;
                    const isExpanded = expandedNode === node.id;

                    return (
                      <div key={node.id}>
                        {/* Node Card */}
                        <div
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                            isExpanded ? "bg-muted/50 border-primary/30" : ""
                          }`}
                          onClick={() =>
                            setExpandedNode(isExpanded ? null : node.id)
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-muted-foreground w-6">
                                {idx + 1}
                              </span>
                              <div
                                className={`h-8 w-8 rounded flex items-center justify-center ${
                                  nodeType?.color || "bg-gray-100"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {node.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {nodeType?.description || node.type}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-xs capitalize"
                              >
                                {node.type}
                              </Badge>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Config */}
                        {isExpanded && (
                          <div className="ml-9 mr-2 mt-1 mb-2 p-4 bg-muted/30 rounded-lg border space-y-3">
                            <div className="space-y-2">
                              <Label>Node Label</Label>
                              <Input
                                value={node.label}
                                onChange={(e) =>
                                  updateNodeLabel(node.id, e.target.value)
                                }
                              />
                            </div>

                            {(node.type === "greeting" ||
                              node.type === "end") && (
                              <div className="space-y-2">
                                <Label>Message</Label>
                                <textarea
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                  value={node.config.message || ""}
                                  onChange={(e) =>
                                    updateNodeConfig(
                                      node.id,
                                      "message",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            )}

                            {node.type === "ai_conversation" && (
                              <div className="space-y-2">
                                <Label>AI Prompt</Label>
                                <textarea
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
                                  value={node.config.prompt || ""}
                                  onChange={(e) =>
                                    updateNodeConfig(
                                      node.id,
                                      "prompt",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Describe what the AI should do..."
                                />
                              </div>
                            )}

                            {node.type === "transfer" && (
                              <>
                                <div className="space-y-2">
                                  <Label>Transfer to Number</Label>
                                  <Input
                                    placeholder="+1234567890"
                                    value={node.config.number || ""}
                                    onChange={(e) =>
                                      updateNodeConfig(
                                        node.id,
                                        "number",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Transfer Message</Label>
                                  <Input
                                    placeholder="Transferring you now..."
                                    value={node.config.message || ""}
                                    onChange={(e) =>
                                      updateNodeConfig(
                                        node.id,
                                        "message",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </>
                            )}

                            {node.type === "sms" && (
                              <div className="space-y-2">
                                <Label>SMS Message</Label>
                                <textarea
                                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                  value={node.config.message || ""}
                                  onChange={(e) =>
                                    updateNodeConfig(
                                      node.id,
                                      "message",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            )}

                            {node.type === "voicemail" && (
                              <div className="space-y-2">
                                <Label>Voicemail Greeting</Label>
                                <Input
                                  placeholder="Please leave a message after the tone..."
                                  value={node.config.message || ""}
                                  onChange={(e) =>
                                    updateNodeConfig(
                                      node.id,
                                      "message",
                                      e.target.value
                                    )
                                  }
                                />
                              </div>
                            )}

                            {node.type === "condition" && (
                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Field</Label>
                                  <Input
                                    placeholder="e.g. lead_score"
                                    value={node.config.field || ""}
                                    onChange={(e) =>
                                      updateNodeConfig(
                                        node.id,
                                        "field",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Operator</Label>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={node.config.operator || "=="}
                                    onChange={(e) =>
                                      updateNodeConfig(
                                        node.id,
                                        "operator",
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="==">equals</option>
                                    <option value="!=">not equals</option>
                                    <option value=">">greater than</option>
                                    <option value=">=">
                                      greater or equal
                                    </option>
                                    <option value="<">less than</option>
                                    <option value="<=">less or equal</option>
                                    <option value="contains">contains</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Value</Label>
                                  <Input
                                    placeholder="e.g. 70"
                                    value={node.config.value || ""}
                                    onChange={(e) =>
                                      updateNodeConfig(
                                        node.id,
                                        "value",
                                        e.target.value
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNode(node.id);
                                }}
                              >
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
