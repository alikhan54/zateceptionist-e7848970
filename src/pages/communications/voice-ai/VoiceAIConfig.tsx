import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  Sparkles,
  Bot,
  PhoneOutgoing,
  PhoneIncoming,
  PhoneForwarded,
  Voicemail,
  AlertCircle,
  Settings2,
  Zap,
} from "lucide-react";

export default function VoiceAIConfig() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // === Section A: Industry & Persona State ===
  const [personalityConfig, setPersonalityConfig] = useState({
    ai_name: "",
    voice_first_message: "",
    voice_assistant_prompt: "",
    voice_end_message: "",
    voicemail_message: "",
    industry_template: "",
  });
  const [personalityLoaded, setPersonalityLoaded] = useState(false);

  // === Section C: Outbound State ===
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

  // === Section D: Inbound State ===
  const [inboundConfig, setInboundConfig] = useState({
    voice_inbound_mode: "ai_assistant",
    voice_forward_number: "",
  });
  const [inboundLoaded, setInboundLoaded] = useState(false);

  // Load tenant config
  const { data: config } = useQuery({
    queryKey: ["voice-ai-config", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await supabase
        .from("tenant_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) { console.error("[VoiceAIConfig] Error:", error); return null; }
      return data;
    },
    enabled: !!tenantId,
  });

  // Populate Section A
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

  // Populate Section C
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

  // Populate Section D
  useEffect(() => {
    if (config && !inboundLoaded) {
      setInboundConfig({
        voice_inbound_mode: config.voice_inbound_mode || "ai_assistant",
        voice_forward_number: config.voice_forward_number || "",
      });
      setInboundLoaded(true);
    }
  }, [config, inboundLoaded]);

  // Industry templates
  const { data: templates = [] } = useQuery({
    queryKey: ["voice-prompt-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voice_prompt_templates")
        .select("*")
        .eq("use_case", "general_inbound")
        .eq("is_active", true)
        .order("industry");
      if (error) return [];
      return data || [];
    },
  });

  const selectedTemplate = templates.find(
    (t: any) => t.industry === personalityConfig.industry_template
  );

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
      queryClient.invalidateQueries({ queryKey: ["voice-ai-config"] });
      toast({ title: "Saved", description: "AI personality settings updated." });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
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
      const { error } = await supabase
        .from("tenant_config")
        .update(update)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-ai-config"] });
      toast({ title: "Saved", description: "Outbound settings updated." });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
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
      queryClient.invalidateQueries({ queryKey: ["voice-ai-config"] });
      toast({ title: "Saved", description: "Inbound settings updated." });
    },
    onError: (err: any) =>
      toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* ========== SECTION A: Industry & Persona ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Industry & Persona
          </CardTitle>
          <CardDescription>
            Select your industry template and customize the AI personality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Industry</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={personalityConfig.industry_template}
                onChange={(e) =>
                  setPersonalityConfig({
                    ...personalityConfig,
                    industry_template: e.target.value,
                  })
                }
              >
                {templates.length > 0 ? (
                  templates.map((t: any) => (
                    <option key={t.industry} value={t.industry}>
                      {t.display_name} ({t.voice_id})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="general">General</option>
                    <option value="technology">Technology</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="salon">Salon & Spa</option>
                    <option value="automotive">Automotive</option>
                    <option value="legal">Legal</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                    <option value="retail">Retail</option>
                    <option value="hospitality">Hospitality</option>
                    <option value="fitness">Fitness</option>
                    <option value="construction">Construction</option>
                    <option value="insurance">Insurance</option>
                    <option value="dental">Dental</option>
                    <option value="veterinary">Veterinary</option>
                    <option value="accounting">Accounting</option>
                    <option value="consulting">Consulting</option>
                    <option value="ecommerce">E-Commerce</option>
                  </>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label>AI Name</Label>
              <Input
                placeholder="e.g. Sarah, Alex"
                value={personalityConfig.ai_name}
                onChange={(e) =>
                  setPersonalityConfig({
                    ...personalityConfig,
                    ai_name: e.target.value,
                  })
                }
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

      {/* ========== SECTION B: Voice Messages ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" /> Voice Messages
          </CardTitle>
          <CardDescription>
            Customize what the AI says at key moments during calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>First Message (greeting)</Label>
            <Input
              placeholder={
                selectedTemplate
                  ? previewPrompt(selectedTemplate.first_message)
                  : "Hi, this is..."
              }
              value={personalityConfig.voice_first_message}
              onChange={(e) =>
                setPersonalityConfig({
                  ...personalityConfig,
                  voice_first_message: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>End Call Message</Label>
            <Input
              placeholder="Thank you for calling. Have a wonderful day!"
              value={personalityConfig.voice_end_message}
              onChange={(e) =>
                setPersonalityConfig({
                  ...personalityConfig,
                  voice_end_message: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Voicemail Message</Label>
            <Input
              placeholder="Thank you for calling. Please leave a message..."
              value={personalityConfig.voicemail_message}
              onChange={(e) =>
                setPersonalityConfig({
                  ...personalityConfig,
                  voicemail_message: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Custom Prompt Override (optional)</Label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
              placeholder="Override the industry template with a fully custom prompt..."
              value={personalityConfig.voice_assistant_prompt}
              onChange={(e) =>
                setPersonalityConfig({
                  ...personalityConfig,
                  voice_assistant_prompt: e.target.value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              If set, this overrides the industry template above.
            </p>
          </div>
          <Button
            onClick={() => savePersonality.mutate()}
            disabled={savePersonality.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {savePersonality.isPending ? "Saving..." : "Save Personality"}
          </Button>
        </CardContent>
      </Card>

      {/* ========== SECTION C: Outbound Settings ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneOutgoing className="h-5 w-5" /> Outbound Settings
          </CardTitle>
          <CardDescription>
            Choose how outbound AI calls are made
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                value: "managed",
                label: "Managed",
                desc: "We handle everything. Uses platform VAPI account.",
                icon: <Zap className="h-5 w-5" />,
              },
              {
                value: "byo_vapi",
                label: "BYO VAPI",
                desc: "Bring your own VAPI account & assistant.",
                icon: <Settings2 className="h-5 w-5" />,
              },
              {
                value: "disabled",
                label: "Disabled",
                desc: "No outbound voice calls.",
                icon: <AlertCircle className="h-5 w-5" />,
              },
            ].map((mode) => (
              <div
                key={mode.value}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  outboundConfig.voice_mode === mode.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
                onClick={() =>
                  setOutboundConfig({
                    ...outboundConfig,
                    voice_mode: mode.value,
                  })
                }
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
                  onChange={(e) =>
                    setOutboundConfig({
                      ...outboundConfig,
                      vapi_api_key: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Assistant ID</Label>
                <Input
                  placeholder="e.g. 1238736d-..."
                  value={outboundConfig.vapi_assistant_id}
                  onChange={(e) =>
                    setOutboundConfig({
                      ...outboundConfig,
                      vapi_assistant_id: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input
                  placeholder="e.g. a3b9b3e0-..."
                  value={outboundConfig.vapi_phone_number}
                  onChange={(e) =>
                    setOutboundConfig({
                      ...outboundConfig,
                      vapi_phone_number: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    setOutboundConfig({
                      ...outboundConfig,
                      byo_vapi_api_key: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Your Assistant ID</Label>
                <Input
                  placeholder="Your assistant ID"
                  value={outboundConfig.byo_vapi_assistant_id}
                  onChange={(e) =>
                    setOutboundConfig({
                      ...outboundConfig,
                      byo_vapi_assistant_id: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Your Phone Number ID</Label>
                <Input
                  placeholder="Your phone number ID"
                  value={outboundConfig.byo_vapi_phone_number}
                  onChange={(e) =>
                    setOutboundConfig({
                      ...outboundConfig,
                      byo_vapi_phone_number: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          <Button
            onClick={() => saveOutbound.mutate()}
            disabled={saveOutbound.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveOutbound.isPending ? "Saving..." : "Save Outbound Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* ========== SECTION D: Inbound Settings ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneIncoming className="h-5 w-5" /> Inbound Settings
          </CardTitle>
          <CardDescription>
            How incoming calls are handled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                value: "ai_assistant",
                label: "AI Assistant",
                desc: "AI answers and handles the call",
                icon: <Bot className="h-5 w-5" />,
              },
              {
                value: "forward",
                label: "Forward to Phone",
                desc: "Forward to a phone number",
                icon: <PhoneForwarded className="h-5 w-5" />,
              },
              {
                value: "voicemail",
                label: "Voicemail",
                desc: "Send to voicemail",
                icon: <Voicemail className="h-5 w-5" />,
              },
              {
                value: "disabled",
                label: "Disabled",
                desc: "Don't accept inbound calls",
                icon: <AlertCircle className="h-5 w-5" />,
              },
            ].map((mode) => (
              <div
                key={mode.value}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  inboundConfig.voice_inbound_mode === mode.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
                onClick={() =>
                  setInboundConfig({
                    ...inboundConfig,
                    voice_inbound_mode: mode.value,
                  })
                }
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
                onChange={(e) =>
                  setInboundConfig({
                    ...inboundConfig,
                    voice_forward_number: e.target.value,
                  })
                }
              />
            </div>
          )}

          <Button
            onClick={() => saveInbound.mutate()}
            disabled={saveInbound.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveInbound.isPending ? "Saving..." : "Save Inbound Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
