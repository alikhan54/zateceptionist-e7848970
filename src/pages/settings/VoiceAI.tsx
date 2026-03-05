import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  Phone,
  Volume2,
  Settings2,
  Save,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Activity,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  DollarSign,
  RefreshCcw,
  Sparkles,
  Globe,
  PhoneForwarded,
  Voicemail,
  Bot,
  Zap,
} from "lucide-react";

export default function VoiceAISettings() {
  const { tenantId, tenantConfig } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // === TAB 1: AI Personality State ===
  const [personalityConfig, setPersonalityConfig] = useState({
    ai_name: "",
    voice_first_message: "",
    voice_assistant_prompt: "",
    voice_end_message: "",
    voicemail_message: "",
    industry_template: "",
  });
  const [personalityLoaded, setPersonalityLoaded] = useState(false);

  // === TAB 2: Outbound State ===
  const [outboundConfig, setOutboundConfig] = useState({
    voice_mode: "managed",
    vapi_api_key: "",
    vapi_assistant_id: "",
    vapi_phone_number: "",
    byo_vapi_api_key: "",
    byo_vapi_assistant_id: "",
    byo_vapi_phone_number: "",
  });
  const [outboundLoaded, setOutboundLoaded] = useState(false);

  // === TAB 3: Inbound State ===
  const [inboundConfig, setInboundConfig] = useState({
    voice_inbound_mode: "ai_assistant",
    voice_forward_number: "",
  });
  const [inboundLoaded, setInboundLoaded] = useState(false);

  // Load tenant config
  const { data: config } = useQuery({
    queryKey: ["voice-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("tenant_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) { console.error("[VoiceAISettings] Error:", error); return null; }
      return data;
    },
    enabled: !!tenantId,
  });

  // Populate personality tab
  useEffect(() => {
    if (config && !personalityLoaded) {
      setPersonalityConfig({
        ai_name: config.ai_name || "",
        voice_first_message: config.voice_first_message || "",
        voice_assistant_prompt: config.voice_assistant_prompt || "",
        voice_end_message: config.voice_end_message || "",
        voicemail_message: config.voicemail_message || "",
        industry_template: config.industry || "general",
      });
      setPersonalityLoaded(true);
    }
  }, [config, personalityLoaded]);

  // Populate outbound tab
  useEffect(() => {
    if (config && !outboundLoaded) {
      setOutboundConfig({
        voice_mode: config.voice_mode || "managed",
        vapi_api_key: config.vapi_api_key || "",
        vapi_assistant_id: config.vapi_assistant_id || "",
        vapi_phone_number: config.vapi_phone_number || "",
        byo_vapi_api_key: config.byo_vapi_api_key || "",
        byo_vapi_assistant_id: config.byo_vapi_assistant_id || "",
        byo_vapi_phone_number: config.byo_vapi_phone_number || "",
      });
      setOutboundLoaded(true);
    }
  }, [config, outboundLoaded]);

  // Populate inbound tab
  useEffect(() => {
    if (config && !inboundLoaded) {
      setInboundConfig({
        voice_inbound_mode: config.voice_inbound_mode || "ai_assistant",
        voice_forward_number: config.voice_forward_number || "",
      });
      setInboundLoaded(true);
    }
  }, [config, inboundLoaded]);

  // Load industry templates
  const { data: templates = [] } = useQuery({
    queryKey: ["voice-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_prompt_templates")
        .select("*")
        .eq("use_case", "general_inbound")
        .eq("is_active", true)
        .order("industry");
      if (error) { console.error("[VoiceAI] Templates error:", error); return []; }
      return data || [];
    },
  });

  // Selected template preview
  const selectedTemplate = templates.find(
    (t: any) => t.industry === personalityConfig.industry_template
  );

  // Credits
  const { data: credits } = useQuery({
    queryKey: ["voice-credits", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("voice_credits")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  // Credit transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ["voice-transactions", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("voice_credit_transactions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Recent calls (Tab 5)
  const { data: recentCalls = [] } = useQuery({
    queryKey: ["voice-recent", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("voice_usage")
        .select("id, call_id, direction, from_number, to_number, duration_seconds, total_cost, call_status, lead_name, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Phone numbers (for outbound tab summary)
  const { data: phoneNumbers = [] } = useQuery({
    queryKey: ["phone-numbers-summary", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from("tenant_phone_numbers")
        .select("phone_number, country_code, country_name, can_call_countries, is_active, label")
        .eq("tenant_id", tenantId);
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Call stats
  const { data: callStats } = useQuery({
    queryKey: ["voice-stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return { totalCalls: 0, inbound: 0, outbound: 0, totalDuration: 0, totalCost: 0 };
      const { data } = await supabase
        .from("voice_usage")
        .select("direction, duration_seconds, total_cost")
        .eq("tenant_id", tenantId);
      const calls = data || [];
      return {
        totalCalls: calls.length,
        inbound: calls.filter((c: any) => c.direction === "inbound").length,
        outbound: calls.filter((c: any) => c.direction === "outbound").length,
        totalDuration: calls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0),
        totalCost: calls.reduce((s: number, c: any) => s + (Number(c.total_cost) || 0), 0),
      };
    },
    enabled: !!tenantId,
  });

  const vapiConfigured = !!(config?.vapi_api_key && config?.vapi_assistant_id);

  // === Save mutations ===
  const savePersonality = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenant_config")
        .update({
          ai_name: personalityConfig.ai_name || null,
          voice_first_message: personalityConfig.voice_first_message || null,
          voice_assistant_prompt: personalityConfig.voice_assistant_prompt || null,
          voice_end_message: personalityConfig.voice_end_message || null,
          voicemail_message: personalityConfig.voicemail_message || null,
          industry: personalityConfig.industry_template || null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-settings"] });
      toast({ title: "Saved", description: "AI personality settings updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveOutbound = useMutation({
    mutationFn: async () => {
      const update: any = {
        voice_mode: outboundConfig.voice_mode || null,
        updated_at: new Date().toISOString(),
      };
      if (outboundConfig.voice_mode === "managed") {
        update.vapi_api_key = outboundConfig.vapi_api_key || null;
        update.vapi_assistant_id = outboundConfig.vapi_assistant_id || null;
        update.vapi_phone_number = outboundConfig.vapi_phone_number || null;
      } else if (outboundConfig.voice_mode === "byo_vapi") {
        update.byo_vapi_api_key = outboundConfig.byo_vapi_api_key || null;
        update.byo_vapi_assistant_id = outboundConfig.byo_vapi_assistant_id || null;
        update.byo_vapi_phone_number = outboundConfig.byo_vapi_phone_number || null;
      }
      const { error } = await supabase.from("tenant_config").update(update).eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-settings"] });
      toast({ title: "Saved", description: "Outbound settings updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const saveInbound = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenant_config")
        .update({
          voice_inbound_mode: inboundConfig.voice_inbound_mode || null,
          voice_forward_number: inboundConfig.voice_forward_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-settings"] });
      toast({ title: "Saved", description: "Inbound settings updated." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleAutoRecharge = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("voice_credits")
        .update({ auto_recharge_enabled: enabled })
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-credits"] });
      toast({ title: "Updated", description: "Auto-recharge setting changed." });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m ${seconds % 60}s`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  // Substitute template placeholders for preview
  const previewPrompt = (prompt: string) => {
    return prompt
      .replace(/\{\{ai_name\}\}/g, personalityConfig.ai_name || "AI Assistant")
      .replace(/\{\{company_name\}\}/g, config?.company_name || "Your Company")
      .replace(/\{\{city\}\}/g, config?.city || "your city")
      .replace(/\{\{specialty\}\}/g, config?.specialty || "general")
      .replace(/\{\{customer_term\}\}/g, "customer")
      .replace(/\{\{service_term\}\}/g, "appointment")
      .replace(/\{\{staff_term\}\}/g, "staff")
      .replace(/\{\{currency\}\}/g, config?.currency || "USD")
      .replace(/\{\{deposit_amount\}\}/g, config?.deposit_amount || "50");
  };

  const CREDIT_PACKAGES = [
    { name: "Starter", minutes: 100, price: 15, popular: false },
    { name: "Growth", minutes: 250, price: 30, popular: true },
    { name: "Business", minutes: 500, price: 50, popular: false },
    { name: "Enterprise", minutes: 1000, price: 80, popular: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice AI Settings</h1>
          <p className="text-muted-foreground">Configure your AI voice assistant</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/settings/phone-numbers")}>
            <Phone className="h-4 w-4 mr-2" /> Phone Numbers
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/communications/voice-calls")}>
            <Activity className="h-4 w-4 mr-2" /> Call Center
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <Card className={vapiConfigured
        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
        : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"
      }>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${vapiConfigured ? "bg-green-500" : "bg-amber-500"}`}>
                <Mic className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${vapiConfigured ? "text-green-800" : "text-amber-800"}`}>
                  {vapiConfigured ? "Voice AI Connected" : "Setup Required"}
                </h3>
                <p className={`text-sm ${vapiConfigured ? "text-green-600" : "text-amber-600"}`}>
                  {vapiConfigured
                    ? `${callStats?.totalCalls || 0} calls | ${formatDuration(callStats?.totalDuration || 0)} talk time | $${(callStats?.totalCost || 0).toFixed(2)} cost`
                    : "Configure voice settings to enable AI calls"}
                </p>
              </div>
            </div>
            <Badge className={vapiConfigured ? "bg-green-500 text-white" : "bg-amber-500 text-white"}>
              <Activity className="h-3 w-3 mr-1" />
              {vapiConfigured ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 5-Tab Interface */}
      <Tabs defaultValue="personality" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personality" className="flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" /> <span className="hidden sm:inline">AI Personality</span><span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="outbound" className="flex items-center gap-1.5">
            <PhoneOutgoing className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Outbound</span><span className="sm:hidden">Out</span>
          </TabsTrigger>
          <TabsTrigger value="inbound" className="flex items-center gap-1.5">
            <PhoneIncoming className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Inbound</span><span className="sm:hidden">In</span>
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Credits</span><span className="sm:hidden">$$</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">History</span><span className="sm:hidden">Log</span>
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: AI PERSONALITY ===================== */}
        <TabsContent value="personality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Industry Template</CardTitle>
              <CardDescription>Select a pre-built AI personality for your industry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={personalityConfig.industry_template}
                    onChange={(e) => setPersonalityConfig({ ...personalityConfig, industry_template: e.target.value })}
                  >
                    {templates.map((t: any) => (
                      <option key={t.industry} value={t.industry}>{t.display_name} ({t.voice_id})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>AI Name</Label>
                  <Input
                    placeholder="e.g. Sarah, Alex"
                    value={personalityConfig.ai_name}
                    onChange={(e) => setPersonalityConfig({ ...personalityConfig, ai_name: e.target.value })}
                  />
                </div>
              </div>
              {selectedTemplate && (
                <div className="space-y-2">
                  <Label>Template Preview</Label>
                  <div className="bg-muted/50 p-4 rounded-lg border text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {previewPrompt(selectedTemplate.system_prompt)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice Messages</CardTitle>
              <CardDescription>Customize what the AI says at key moments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>First Message (greeting)</Label>
                <Input
                  placeholder={selectedTemplate ? previewPrompt(selectedTemplate.first_message) : "Hi, this is..."}
                  value={personalityConfig.voice_first_message}
                  onChange={(e) => setPersonalityConfig({ ...personalityConfig, voice_first_message: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Call Message</Label>
                <Input
                  placeholder="Thank you for calling. Have a wonderful day!"
                  value={personalityConfig.voice_end_message}
                  onChange={(e) => setPersonalityConfig({ ...personalityConfig, voice_end_message: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Voicemail Message</Label>
                <Input
                  placeholder="Thank you for calling. Please leave a message..."
                  value={personalityConfig.voicemail_message}
                  onChange={(e) => setPersonalityConfig({ ...personalityConfig, voicemail_message: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Custom Prompt Override (optional)</Label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Override the industry template with a fully custom prompt..."
                  value={personalityConfig.voice_assistant_prompt}
                  onChange={(e) => setPersonalityConfig({ ...personalityConfig, voice_assistant_prompt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">If set, this overrides the industry template above.</p>
              </div>
              <Button onClick={() => savePersonality.mutate()} disabled={savePersonality.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {savePersonality.isPending ? "Saving..." : "Save Personality"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 2: OUTBOUND SETUP ===================== */}
        <TabsContent value="outbound" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PhoneOutgoing className="h-5 w-5" /> Voice Mode</CardTitle>
              <CardDescription>Choose how outbound calls are made</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: "managed", label: "Managed", desc: "We handle everything. Uses platform VAPI account.", icon: <Zap className="h-5 w-5" /> },
                  { value: "byo_vapi", label: "BYO VAPI", desc: "Bring your own VAPI account & assistant.", icon: <Settings2 className="h-5 w-5" /> },
                  { value: "disabled", label: "Disabled", desc: "No outbound voice calls.", icon: <AlertCircle className="h-5 w-5" /> },
                ].map((mode) => (
                  <div
                    key={mode.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      outboundConfig.voice_mode === mode.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setOutboundConfig({ ...outboundConfig, voice_mode: mode.value })}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {mode.icon}
                      <span className="font-medium">{mode.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{mode.desc}</p>
                  </div>
                ))}
              </div>

              {outboundConfig.voice_mode === "managed" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>VAPI API Key (Platform)</Label>
                    <Input
                      type="password"
                      placeholder="Platform VAPI key"
                      value={outboundConfig.vapi_api_key}
                      onChange={(e) => setOutboundConfig({ ...outboundConfig, vapi_api_key: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assistant ID</Label>
                    <Input
                      placeholder="e.g. 1238736d-..."
                      value={outboundConfig.vapi_assistant_id}
                      onChange={(e) => setOutboundConfig({ ...outboundConfig, vapi_assistant_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <Input
                      placeholder="e.g. a3b9b3e0-..."
                      value={outboundConfig.vapi_phone_number}
                      onChange={(e) => setOutboundConfig({ ...outboundConfig, vapi_phone_number: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {outboundConfig.voice_mode === "byo_vapi" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Your VAPI API Key</Label>
                    <Input
                      type="password"
                      placeholder="Your VAPI API key"
                      value={outboundConfig.byo_vapi_api_key}
                      onChange={(e) => setOutboundConfig({ ...outboundConfig, byo_vapi_api_key: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Assistant ID</Label>
                    <Input
                      placeholder="Your assistant ID"
                      value={outboundConfig.byo_vapi_assistant_id}
                      onChange={(e) => setOutboundConfig({ ...outboundConfig, byo_vapi_assistant_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Your Phone Number ID</Label>
                    <Input
                      placeholder="Your phone number ID"
                      value={outboundConfig.byo_vapi_phone_number}
                      onChange={(e) => setOutboundConfig({ ...outboundConfig, byo_vapi_phone_number: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <Button onClick={() => saveOutbound.mutate()} disabled={saveOutbound.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveOutbound.isPending ? "Saving..." : "Save Outbound Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Phone Numbers Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Phone Numbers</CardTitle>
              <CardDescription>Numbers registered for outbound calls</CardDescription>
            </CardHeader>
            <CardContent>
              {(phoneNumbers as any[]).length === 0 ? (
                <div className="text-center py-6">
                  <Phone className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-muted-foreground text-sm">No phone numbers configured</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate("/settings/phone-numbers")}>
                    Add Numbers
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(phoneNumbers as any[]).map((num: any) => (
                    <div key={num.phone_number} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="font-mono font-medium">{num.phone_number}</span>
                        {num.label && <span className="text-xs text-muted-foreground ml-2">({num.label})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {(num.can_call_countries || []).map((cc: string) => (
                          <Badge key={cc} variant="outline" className="text-xs">{cc}</Badge>
                        ))}
                        <Badge className={num.is_active ? "bg-green-100 text-green-800" : "bg-gray-100"}>
                          {num.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  <Button variant="link" size="sm" onClick={() => navigate("/settings/phone-numbers")}>
                    Manage Phone Numbers →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 3: INBOUND SETUP ===================== */}
        <TabsContent value="inbound" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PhoneIncoming className="h-5 w-5" /> Inbound Call Handling</CardTitle>
              <CardDescription>How incoming calls are handled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { value: "ai_assistant", label: "AI Assistant", desc: "AI answers and handles the call", icon: <Bot className="h-5 w-5" /> },
                  { value: "forward", label: "Forward to Phone", desc: "Forward to a phone number", icon: <PhoneForwarded className="h-5 w-5" /> },
                  { value: "voicemail", label: "Voicemail", desc: "Send to voicemail", icon: <Voicemail className="h-5 w-5" /> },
                  { value: "disabled", label: "Disabled", desc: "Don't accept inbound calls", icon: <AlertCircle className="h-5 w-5" /> },
                ].map((mode) => (
                  <div
                    key={mode.value}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      inboundConfig.voice_inbound_mode === mode.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                    onClick={() => setInboundConfig({ ...inboundConfig, voice_inbound_mode: mode.value })}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {mode.icon}
                      <span className="font-medium">{mode.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{mode.desc}</p>
                  </div>
                ))}
              </div>

              {inboundConfig.voice_inbound_mode === "forward" && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Forward to Number</Label>
                  <Input
                    placeholder="+1234567890"
                    value={inboundConfig.voice_forward_number}
                    onChange={(e) => setInboundConfig({ ...inboundConfig, voice_forward_number: e.target.value })}
                  />
                </div>
              )}

              <Button onClick={() => saveInbound.mutate()} disabled={saveInbound.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveInbound.isPending ? "Saving..." : "Save Inbound Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 4: CREDITS ===================== */}
        <TabsContent value="credits" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-3xl font-bold">{credits ? `${Number(credits.balance_minutes || 0).toFixed(0)} min` : "N/A"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {credits ? `$${Number(credits.balance_amount || 0).toFixed(2)} remaining` : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-3xl font-bold">${credits ? Number(credits.current_rate_per_minute || 0.15).toFixed(2) : "0.15"}</p>
                <p className="text-xs text-muted-foreground mt-1">per minute</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-Recharge</p>
                    <p className="text-lg font-bold">{credits?.auto_recharge_enabled ? "Enabled" : "Disabled"}</p>
                  </div>
                  <Switch
                    checked={credits?.auto_recharge_enabled || false}
                    onCheckedChange={(checked) => toggleAutoRecharge.mutate(checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Credit Packages */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Packages</CardTitle>
              <CardDescription>Purchase voice call minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {CREDIT_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`p-4 rounded-lg border-2 text-center ${
                      pkg.popular ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                  >
                    {pkg.popular && (
                      <Badge className="mb-2 bg-primary text-white">Most Popular</Badge>
                    )}
                    <h3 className="font-bold text-lg">{pkg.name}</h3>
                    <p className="text-3xl font-bold mt-2">${pkg.price}</p>
                    <p className="text-sm text-muted-foreground">{pkg.minutes} minutes</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${(pkg.price / pkg.minutes).toFixed(2)}/min
                    </p>
                    <Button variant={pkg.popular ? "default" : "outline"} size="sm" className="mt-3 w-full" disabled>
                      Coming Soon
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No transactions yet</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{tx.transaction_type || tx.type || "Credit"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${Number(tx.amount || 0) > 0 ? "text-green-600" : "text-red-600"}`}>
                          {Number(tx.amount || 0) > 0 ? "+" : ""}{Number(tx.minutes_amount || tx.amount || 0).toFixed(0)} min
                        </p>
                        <p className="text-xs text-muted-foreground">${Number(tx.dollar_amount || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 5: CALL HISTORY ===================== */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Calls</CardTitle>
                  <CardDescription>Latest voice call activity</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/communications/voice-calls")}>
                  View All Calls →
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No call data yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCalls.map((call: any) => (
                    <div key={call.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          call.direction === "inbound" ? "bg-blue-100" : "bg-green-100"
                        }`}>
                          {call.direction === "inbound" ? (
                            <PhoneIncoming className="h-4 w-4 text-blue-600" />
                          ) : (
                            <PhoneOutgoing className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {call.lead_name || (call.direction === "inbound" ? call.from_number : call.to_number)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(call.created_at)} &middot; {formatDuration(call.duration_seconds || 0)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          call.call_status === "completed" ? "bg-green-100 text-green-800" :
                          call.call_status === "failed" ? "bg-red-100 text-red-800" :
                          "bg-gray-100"
                        }
                      >
                        {call.call_status === "completed" ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {call.call_status || "initiated"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{callStats?.totalCalls || 0}</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{callStats?.inbound || 0} in</span>
                  <span>{callStats?.outbound || 0} out</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Talk Time</p>
                <p className="text-2xl font-bold">{formatDuration(callStats?.totalDuration || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">${(callStats?.totalCost || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Credit Balance</p>
                <p className="text-2xl font-bold">{credits ? `${Number(credits.balance_minutes || 0).toFixed(0)} min` : "N/A"}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
