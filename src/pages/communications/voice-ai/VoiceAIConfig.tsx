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
  Mic,
  Globe,
  CheckCircle,
  Loader2,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { VoiceSetupWizard } from "@/components/voice/VoiceSetupWizard";

// === Voice options (VAPI-compatible) ===
const VOICE_OPTIONS = [
  { id: "sarah", name: "Sarah", provider: "11labs", gender: "female", accent: "American", style: "Warm & Professional" },
  { id: "elliot", name: "Elliot", provider: "vapi", gender: "male", accent: "American", style: "Calm & Clear" },
  { id: "josh", name: "Josh", provider: "11labs", gender: "male", accent: "American", style: "Friendly & Casual" },
  { id: "rachel", name: "Rachel", provider: "11labs", gender: "female", accent: "American", style: "Energetic & Upbeat" },
  { id: "drew", name: "Drew", provider: "11labs", gender: "male", accent: "American", style: "Deep & Authoritative" },
  { id: "clyde", name: "Clyde", provider: "11labs", gender: "male", accent: "American", style: "Strong & Confident" },
  { id: "domi", name: "Domi", provider: "11labs", gender: "female", accent: "American", style: "Articulate & Precise" },
  { id: "dave", name: "Dave", provider: "11labs", gender: "male", accent: "British", style: "Conversational" },
  { id: "fin", name: "Fin", provider: "11labs", gender: "male", accent: "Irish", style: "Relaxed & Warm" },
  { id: "emily", name: "Emily", provider: "11labs", gender: "female", accent: "American", style: "Cheerful & Bright" },
];

// === Language options ===
const LANGUAGE_OPTIONS = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
];

export default function VoiceAIConfig() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // === Section A: Industry & Persona State ===
  const [personalityConfig, setPersonalityConfig] = useState({
    ai_name: "",
    voice_first_message: "",
    custom_system_prompt: "",
    voice_end_message: "",
    voicemail_message: "",
    industry_template: "",
    voice_id: "",
    voice_voice_name: "",
    primary_language: "en",
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
    byo_vapi_phone_number_id: "",
  });
  const [outboundLoaded, setOutboundLoaded] = useState(false);
  const [byoVerifying, setByoVerifying] = useState(false);
  const [byoVerifyResult, setByoVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);

  // === Section D: Inbound State ===
  const [inboundConfig, setInboundConfig] = useState({
    voice_inbound_mode: "ai_assistant",
    voice_forward_number: "",
  });
  const [inboundLoaded, setInboundLoaded] = useState(false);

  // VAPI sync state
  const [vapiSyncing, setVapiSyncing] = useState(false);

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
        custom_system_prompt: config.custom_system_prompt || "",
        voice_end_message: config.voice_end_message || "",
        voicemail_message: config.voicemail_message || "",
        industry_template: config.industry || "general",
        voice_id: config.voice_id || "",
        voice_voice_name: config.voice_voice_name || "",
        primary_language: config.primary_language || "en",
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
        byo_vapi_phone_number_id: config.byo_vapi_phone_number_id || "",
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

  // === VAPI Sync helper ===
  const syncToVAPI = async () => {
    if (!config?.vapi_assistant_id || config?.voice_mode === "byo_vapi") return;
    setVapiSyncing(true);
    try {
      await fetch("https://webhooks.zatesystems.com/webhook/voice/sync-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          assistant_id: config.vapi_assistant_id,
          updates: {
            first_message: personalityConfig.voice_first_message || undefined,
            system_prompt: personalityConfig.custom_system_prompt || (selectedTemplate?.system_prompt ? previewPrompt(selectedTemplate.system_prompt) : undefined),
            voice_id: personalityConfig.voice_id || undefined,
            voice_name: personalityConfig.voice_voice_name || undefined,
            language: personalityConfig.primary_language || "en",
            ai_name: personalityConfig.ai_name || undefined,
          },
        }),
      });
      toast({ title: "VAPI Synced", description: "Assistant updated on VAPI." });
    } catch {
      // Non-blocking — save still succeeded even if sync fails
      console.warn("[VoiceAIConfig] VAPI sync failed — changes saved locally");
    } finally {
      setVapiSyncing(false);
    }
  };

  // === BYO VAPI Verify ===
  const verifyByoVapi = async () => {
    if (!outboundConfig.byo_vapi_api_key) {
      setByoVerifyResult({ ok: false, message: "Please enter your VAPI API key first." });
      return;
    }
    setByoVerifying(true);
    setByoVerifyResult(null);
    try {
      const response = await fetch("https://webhooks.zatesystems.com/webhook/voice/verify-byo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          byo_api_key: outboundConfig.byo_vapi_api_key,
          byo_assistant_id: outboundConfig.byo_vapi_assistant_id || undefined,
          byo_phone_number_id: outboundConfig.byo_vapi_phone_number_id || undefined,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        setByoVerifyResult({
          ok: result.success !== false,
          message: result.message || (result.success !== false ? "Connection verified!" : "Verification failed."),
        });
      } else {
        setByoVerifyResult({ ok: false, message: "Could not verify. Check your credentials." });
      }
    } catch {
      setByoVerifyResult({ ok: false, message: "Connection failed. Check your API key." });
    } finally {
      setByoVerifying(false);
    }
  };

  // === Save mutations ===
  const savePersonality = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("tenant_config")
        .update({
          ai_name: personalityConfig.ai_name || null,
          voice_first_message: personalityConfig.voice_first_message || null,
          custom_system_prompt: personalityConfig.custom_system_prompt || null,
          voice_end_message: personalityConfig.voice_end_message || null,
          voicemail_message: personalityConfig.voicemail_message || null,
          industry: personalityConfig.industry_template || null,
          voice_id: personalityConfig.voice_id || null,
          voice_voice_name: personalityConfig.voice_voice_name || null,
          primary_language: personalityConfig.primary_language || "en",
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["voice-ai-config"] });
      toast({ title: "Saved", description: "AI personality settings updated." });
      // Attempt VAPI sync after saving
      await syncToVAPI();
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
      if (outboundConfig.voice_mode === "byo_vapi") {
        update.byo_vapi_api_key = outboundConfig.byo_vapi_api_key || null;
        update.byo_vapi_assistant_id = outboundConfig.byo_vapi_assistant_id || null;
        update.byo_vapi_phone_number_id = outboundConfig.byo_vapi_phone_number_id || null;
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

  const selectedVoice = VOICE_OPTIONS.find((v) => v.id === personalityConfig.voice_id);

  return (
    <div className="space-y-6">
      {/* ========== SECTION: Voice & Language ========== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" /> Voice & Language
          </CardTitle>
          <CardDescription>
            Choose the AI voice personality and primary language
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Language Selector — Pill buttons */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" /> Primary Language
            </Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() =>
                    setPersonalityConfig({
                      ...personalityConfig,
                      primary_language: lang.code,
                    })
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    personalityConfig.primary_language === lang.code
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <span>{lang.flag}</span>
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selector — Grid */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" /> AI Voice
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {VOICE_OPTIONS.map((voice) => (
                <div
                  key={voice.id}
                  onClick={() =>
                    setPersonalityConfig({
                      ...personalityConfig,
                      voice_id: voice.id,
                      voice_voice_name: voice.name,
                    })
                  }
                  className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                    personalityConfig.voice_id === voice.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-muted hover:border-muted-foreground/30"
                  }`}
                >
                  <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    voice.gender === "female" ? "bg-pink-100 text-pink-600" : "bg-blue-100 text-blue-600"
                  }`}>
                    <Mic className="h-4 w-4" />
                  </div>
                  <p className="font-medium text-sm">{voice.name}</p>
                  <p className="text-[10px] text-muted-foreground">{voice.accent}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{voice.style}</p>
                  {personalityConfig.voice_id === voice.id && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {selectedVoice && (
              <p className="text-xs text-muted-foreground">
                Selected: <strong>{selectedVoice.name}</strong> — {selectedVoice.style} ({selectedVoice.provider})
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
                      {t.display_name}
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
              value={personalityConfig.custom_system_prompt}
              onChange={(e) =>
                setPersonalityConfig({
                  ...personalityConfig,
                  custom_system_prompt: e.target.value,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              If set, this overrides the industry template above.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => savePersonality.mutate()}
              disabled={savePersonality.isPending || vapiSyncing}
            >
              {savePersonality.isPending || vapiSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {vapiSyncing ? "Syncing to VAPI..." : savePersonality.isPending ? "Saving..." : "Save & Sync"}
            </Button>
            {config?.voice_mode !== "byo_vapi" && config?.vapi_assistant_id && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" /> Will auto-sync to VAPI on save
              </p>
            )}
          </div>
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
            <div className="pt-4 border-t">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    ✓ Platform Configured
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    VAPI is managed by the platform. Contact support to change configuration.
                  </p>
                </div>
                <Badge className="ml-auto bg-green-500 text-white">Active</Badge>
              </div>
            </div>
          )}

          {outboundConfig.voice_mode === "byo_vapi" && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your VAPI API Key</Label>
                  <Input
                    type="password"
                    placeholder="Your VAPI API key"
                    value={outboundConfig.byo_vapi_api_key}
                    onChange={(e) => {
                      setOutboundConfig({
                        ...outboundConfig,
                        byo_vapi_api_key: e.target.value,
                      });
                      setByoVerifyResult(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Assistant ID</Label>
                  <Input
                    placeholder="Your assistant ID"
                    value={outboundConfig.byo_vapi_assistant_id}
                    onChange={(e) => {
                      setOutboundConfig({
                        ...outboundConfig,
                        byo_vapi_assistant_id: e.target.value,
                      });
                      setByoVerifyResult(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Phone Number ID</Label>
                  <Input
                    placeholder="Your phone number ID"
                    value={outboundConfig.byo_vapi_phone_number_id}
                    onChange={(e) => {
                      setOutboundConfig({
                        ...outboundConfig,
                        byo_vapi_phone_number_id: e.target.value,
                      });
                      setByoVerifyResult(null);
                    }}
                  />
                </div>
              </div>

              {/* Verify Connection Button */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={verifyByoVapi}
                  disabled={byoVerifying || !outboundConfig.byo_vapi_api_key}
                >
                  {byoVerifying ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  {byoVerifying ? "Verifying..." : "Verify Connection"}
                </Button>
                {byoVerifyResult && (
                  <div className={`flex items-center gap-1.5 text-sm ${
                    byoVerifyResult.ok ? "text-green-600" : "text-red-600"
                  }`}>
                    {byoVerifyResult.ok ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {byoVerifyResult.message}
                  </div>
                )}
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
